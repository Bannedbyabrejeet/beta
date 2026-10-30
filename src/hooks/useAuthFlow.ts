import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { securityEngine } from '../services/securityEngine';
import { AdminUser, TransactionalEmail } from '../types';
import { AuthBindings, AuthMode } from '../components/auth/types';

/**
 * Estado y lógica del portal de autenticación (login, alta, reset y pruebas).
 * Los componentes de `components/auth/` sólo se encargan de la presentación.
 */
export function useAuthFlow(
  onSuccessLogin: () => void,
  initialMode?: AuthMode
): AuthBindings {
  const [adminUser, setAdminUser] = useState<AdminUser>(securityEngine.getAdminUser());
  const [emails, setEmails] = useState<TransactionalEmail[]>(securityEngine.getEmails());
  
  // View mode: 'setup' (US-01.2), 'login' (US-01), 'forgot' (US-01.3), 'reset' (US-10)
  const [mode, setMode] = useState<'setup' | 'login' | 'forgot' | 'reset'>('login');

  // Form states
  const [identifier, setIdentifier] = useState<string>('admin');
  const [password, setPassword] = useState<string>('admin123');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Initial Setup states (US-01.2)
  const [setupUsername, setSetupUsername] = useState<string>('admin');
  const [setupEmail, setSetupEmail] = useState<string>('admin@bannedbyabrejeet.io');
  const [setupPassword, setSetupPassword] = useState<string>('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState<string>('');

  // Password recovery states (US-01.3 & US-10)
  const [forgotEmail, setForgotEmail] = useState<string>('admin@bannedbyabrejeet.io');
  const [activeResetToken, setActiveResetToken] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [tokenTtlSeconds, setTokenTtlSeconds] = useState<number>(0);

  // Messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeRedisCommand, setActiveRedisCommand] = useState<string>('HGETALL auth:admin');
  const [showInboxModal, setShowInboxModal] = useState<boolean>(false);

  // Synchronize with security engine
  useEffect(() => {
    const unsub = securityEngine.subscribe(() => {
      const user = securityEngine.getAdminUser();
      setAdminUser(user);
      setEmails(securityEngine.getEmails());

      // If user is not configured and current mode isn't setup, auto-redirect to setup (US-01.2)
      if (!user.isConfigured && mode !== 'setup') {
        setMode('setup');
      }
    });
    return unsub;
  }, [mode]);

  // Initial check on mount: If not configured, force US-01.2 (Cuenta Única)
  useEffect(() => {
    const user = securityEngine.getAdminUser();
    if (!user.isConfigured) {
      setMode('setup');
      setActiveRedisCommand('EXISTS auth:admin -> 0 (No admin found, redirecting to Setup)');
    } else if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  // Real-time countdown for reset token TTL
  useEffect(() => {
    if (!adminUser.tempResetExpiry) {
      setTokenTtlSeconds(0);
      return;
    }

    const updateTtl = () => {
      const remaining = Math.max(0, Math.floor((adminUser.tempResetExpiry! - Date.now()) / 1000));
      setTokenTtlSeconds(remaining);
    };

    updateTtl();
    const interval = setInterval(updateTtl, 1000);
    return () => clearInterval(interval);
  }, [adminUser.tempResetExpiry]);

  // =========================================================================
  // Handlers
  // =========================================================================

  // 1. Handle Login (US-01)
  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    setActiveRedisCommand(`HGETALL auth:admin && CHECK bcrypt.verify("${password}", password_hash)`);

    const result = await securityEngine.login(identifier, password);
    if (result.success) {
      setSuccessMessage('Sesión autenticada. Generando token JWT y redirigiendo...');
      setTimeout(() => {
        onSuccessLogin();
      }, 500);
    } else {
      // Must display exactly "Credenciales inválidas"
      setErrorMessage(result.message);
    }
  };

  // 2. Handle Initial Account Creation (US-01.2)
  const handleSetupSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!setupUsername.trim() || !setupEmail.trim() || !setupPassword.trim()) {
      setErrorMessage('Por favor complete todos los campos.');
      return;
    }

    if (setupPassword !== setupConfirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setActiveRedisCommand(`HSET auth:admin username "${setupUsername}" email "${setupEmail}" password_hash "$2b$12$..."`);

    const result = await securityEngine.registerInitialAdmin(setupUsername, setupEmail, setupPassword);
    if (result.success) {
      setSuccessMessage('Cuenta de administrador creada exitosamente. Redirigiendo a la pantalla de Login...');
      setIdentifier(setupUsername);
      setPassword('');
      setTimeout(() => {
        setMode('login');
        setSuccessMessage('Por favor inicie sesión con sus credenciales recién creadas.');
      }, 1200);
    } else {
      setErrorMessage(result.message);
    }
  };

  // 3. Handle Request Password Reset (US-01.3 & US-10)
  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!forgotEmail.trim()) {
      setErrorMessage('Ingrese un correo electrónico válido.');
      return;
    }

    const result = await securityEngine.requestPasswordReset(forgotEmail);
    if (result.success && result.token) {
      setActiveResetToken(result.token);
      setActiveRedisCommand(`SET auth:reset_token:${result.token} "${forgotEmail}" && EXPIRE auth:reset_token:${result.token} 900`);
      setSuccessMessage('Correo con token temporal enviado. Revise la bandeja de correo para continuar.');
      setShowInboxModal(true);
    } else {
      setErrorMessage(result.message);
    }
  };

  // 4. Handle Password Reset Confirmation (US-01.3 & US-10)
  const handleResetSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!activeResetToken.trim()) {
      setErrorMessage('Ingrese o pegue el token de recuperación.');
      return;
    }

    if (!newPassword.trim() || !confirmNewPassword.trim()) {
      setErrorMessage('Complete la nueva contraseña.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setActiveRedisCommand(`GET auth:reset_token:${activeResetToken} -> TTL check`);

    const result = await securityEngine.completePasswordReset(activeResetToken, newPassword);
    if (result.success) {
      setActiveRedisCommand(`HSET auth:admin password_hash "$2b$12$..." && DEL auth:reset_token:${activeResetToken}`);
      setSuccessMessage(result.message); // "Contraseña actualizada correctamente"
      setPassword('');
      setTimeout(() => {
        setMode('login');
        setSuccessMessage('Contraseña actualizada correctamente. Inicie sesión con su nueva clave.');
      }, 1500);
    } else {
      setErrorMessage(result.message);
    }
  };

  // Helper: Fast login with preset credentials for testing
  const handleFillValidCreds = () => {
    setIdentifier(adminUser.username || 'admin');
    setPassword(adminUser.password || 'admin123');
    setErrorMessage(null);
  };

  // Helper: Fast invalid login for testing
  const handleFillInvalidCreds = () => {
    setIdentifier('malicious_actor');
    setPassword('wrong_password_999');
    setErrorMessage(null);
  };

  // Helper: Simulate expired token for testing US-10
  const handleSimulateTtlExpire = () => {
    securityEngine.forceExpireResetToken();
    setActiveRedisCommand(`DEBUG: Simulated TTL expiration -> auth:reset_token:${activeResetToken} expired (TTL=0)`);
    setErrorMessage('Simulación: El token ha expirado en Redis (TTL = 0s).');
  };

  // Helper: Reset to unconfigured admin for testing US-01.2
  const handleTestUnconfigured = () => {
    securityEngine.resetToUnconfigured();
    setMode('setup');
    setSetupUsername('santiago_admin');
    setSetupEmail('santiago@bannedbyabrejeet.io');
    setSetupPassword('Abrejeet2026!');
    setSetupConfirmPassword('Abrejeet2026!');
    setErrorMessage(null);
    setSuccessMessage('Estado restablecido: No hay cuenta de administrador registrada en Redis.');
    setActiveRedisCommand('DEL auth:admin -> isConfigured: false (US-01.2 ready)');
  };


  return {
    adminUser,
    emails,
    mode,
    setMode,
    identifier,
    setIdentifier,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    setupUsername,
    setSetupUsername,
    setupEmail,
    setSetupEmail,
    setupPassword,
    setSetupPassword,
    setupConfirmPassword,
    setSetupConfirmPassword,
    forgotEmail,
    setForgotEmail,
    activeResetToken,
    setActiveResetToken,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    tokenTtlSeconds,
    errorMessage,
    setErrorMessage,
    successMessage,
    setSuccessMessage,
    activeRedisCommand,
    setActiveRedisCommand,
    showInboxModal,
    setShowInboxModal,
    handleLoginSubmit,
    handleSetupSubmit,
    handleForgotSubmit,
    handleResetSubmit,
    handleFillValidCreds,
    handleFillInvalidCreds,
    handleSimulateTtlExpire,
    handleTestUnconfigured
  };
}
