import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Lock,
  Mail,
  User,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Eye,
  EyeOff,
  Inbox,
  ExternalLink,
  Terminal,
  Database,
  Sparkles,
  ArrowLeft,
  Flame,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { securityEngine } from '../services/securityEngine';
import { AdminUser, TransactionalEmail } from '../types';

interface AuthPortalProps {
  onSuccessLogin: () => void;
  onCancel?: () => void;
  initialMode?: 'login' | 'setup' | 'forgot' | 'reset';
}

export const AuthPortal: React.FC<AuthPortalProps> = ({
  onSuccessLogin,
  onCancel,
  initialMode
}) => {
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
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    setActiveRedisCommand(`HGETALL auth:admin && CHECK bcrypt.verify("${password}", password_hash)`);

    const result = securityEngine.login(identifier, password);
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
  const handleSetupSubmit = (e: React.FormEvent) => {
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

    const result = securityEngine.registerInitialAdmin(setupUsername, setupEmail, setupPassword);
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
  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!forgotEmail.trim()) {
      setErrorMessage('Ingrese un correo electrónico válido.');
      return;
    }

    const result = securityEngine.requestPasswordReset(forgotEmail);
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
  const handleResetSubmit = (e: React.FormEvent) => {
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

    const result = securityEngine.completePasswordReset(activeResetToken, newPassword);
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

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8 relative">
      
      {/* Background Ambience Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* Main Form Container Card */}
      <div className="w-full max-w-md bg-[#0c0c0c] border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 relative backdrop-blur-xl">
        
        {/* Optional Return to Landing button */}
        {onCancel && (
          <div className="mb-4">
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a la Página Principal</span>
            </button>
          </div>
        )}

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <ShieldAlert className="w-6 h-6 text-emerald-400" />
          </div>
          
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {mode === 'setup' && 'Configuración de Administrador'}
            {mode === 'login' && 'Acceso al Dashboard'}
            {mode === 'forgot' && 'Restaurar Contraseña'}
            {mode === 'reset' && 'Nueva Contraseña'}
          </h1>
          
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {mode === 'setup' && 'Paso 1: Cree la cuenta única del Administrador para gestionar el sistema (US-01.2).'}
            {mode === 'login' && 'Autenticación requerida para acceder y modificar las reglas de UFW y listas de IPs.'}
            {mode === 'forgot' && 'Ingrese su correo para recibir un token temporal persistido con Redis EXPIRE (US-01.3).'}
            {mode === 'reset' && 'Ingrese su nueva credencial respaldada por token volátil en Redis.'}
          </p>

          {/* Epica & Issue Badge Indicator */}
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full font-semibold">
              Issue #5: Autenticación Admin
            </span>
            <span className="px-2 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 text-slate-400 rounded-full">
              Backend A / Frontend A
            </span>
          </div>
        </div>

        {/* Global Notifications (Error or Success) */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              id="auth-error-banner"
              className="mb-5 p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-start gap-2.5"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">Error de autenticación:</span>
                <span className="text-rose-200">{errorMessage}</span>
              </div>
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              id="auth-success-banner"
              className="mb-5 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">Operación exitosa:</span>
                <span className="text-emerald-200">{successMessage}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* =================================================================== */}
        {/* VIEW 1: CREAR CUENTA ÚNICA (US-01.2) */}
        {/* =================================================================== */}
        {mode === 'setup' && (
          <form onSubmit={handleSetupSubmit} className="space-y-4" id="form-admin-setup">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs font-mono mb-2">
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>US-01.2: Set de Credenciales Iniciales</span>
              </div>
              <span>No existe ningún administrador registrado previamente. Cree la cuenta única principal para continuar.</span>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                Nombre de Usuario Único
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  id="setup-username-input"
                  required
                  placeholder="ej. admin"
                  value={setupUsername}
                  onChange={(e) => setSetupUsername(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                Correo Electrónico de Seguridad (Para Recuperación)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  id="setup-email-input"
                  required
                  placeholder="admin@bannedbyabrejeet.io"
                  value={setupEmail}
                  onChange={(e) => setSetupEmail(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                Contraseña Maestra
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="setup-password-input"
                  required
                  placeholder="••••••••••••"
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-10 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="setup-confirm-password-input"
                  required
                  placeholder="••••••••••••"
                  value={setupConfirmPassword}
                  onChange={(e) => setSetupConfirmPassword(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              id="btn-submit-create-admin"
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg text-xs font-mono transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)] mt-2 cursor-pointer"
            >
              <span>Crear Cuenta Única de Administrador</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* =================================================================== */}
        {/* VIEW 2: LOGIN ESTÁNDAR (FRONT-01 / US-01) */}
        {/* =================================================================== */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4" id="form-admin-login">
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                Usuario o Correo Electrónico
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  id="login-username-input"
                  required
                  placeholder="admin"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono text-slate-300">
                  Contraseña
                </label>
                <button
                  type="button"
                  id="btn-forgot-password-link"
                  onClick={() => {
                    setMode('forgot');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 hover:underline"
                >
                  ¿Olvidé mi contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password-input"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-10 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="btn-submit-login"
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg text-xs font-mono transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)] mt-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Iniciar Sesión en Dashboard</span>
            </button>
          </form>
        )}

        {/* =================================================================== */}
        {/* VIEW 3: SOLICITAR RECUPERACIÓN (US-01.3 & US-10) */}
        {/* =================================================================== */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-4" id="form-forgot-password">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-300 text-xs font-mono mb-2">
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>US-01.3 &amp; US-10: Token Temporal Volátil</span>
              </div>
              <span>Se enviará un correo con un enlace temporal respaldado con el comando <code className="text-amber-300 font-bold">EXPIRE</code> en Redis (TTL 15 min).</span>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                Correo Electrónico Registrado
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  id="forgot-email-input"
                  required
                  placeholder="admin@bannedbyabrejeet.io"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-purple-400 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              id="btn-submit-forgot"
              className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg text-xs font-mono transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.25)] cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>Enviar Enlace de Recuperación (US-01.3)</span>
            </button>

            <div className="flex items-center justify-between pt-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
                className="text-slate-400 hover:text-white flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a Iniciar Sesión</span>
              </button>

              {emails.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowInboxModal(true)}
                  className="text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span>Ver Buzón ({emails.length})</span>
                </button>
              )}
            </div>
          </form>
        )}

        {/* =================================================================== */}
        {/* VIEW 4: CONFIRMAR NUEVA CONTRASEÑA CON TOKEN (US-01.3 & US-10) */}
        {/* =================================================================== */}
        {mode === 'reset' && (
          <form onSubmit={handleResetSubmit} className="space-y-4" id="form-reset-password">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Estado del Token en Redis (US-10):</span>
                </span>
                <span className={`font-mono font-bold px-1.5 py-0.2 rounded text-[10px] ${
                  tokenTtlSeconds > 0 ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {tokenTtlSeconds > 0 ? `TTL: ${tokenTtlSeconds}s` : 'CADUCADO (0s)'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Key Redis: <code className="text-amber-300 font-mono">auth:reset_token:{activeResetToken.substring(0, 16)}...</code>
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                Token Temporal de Recuperación
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  id="reset-token-input"
                  required
                  placeholder="rst_..."
                  value={activeResetToken}
                  onChange={(e) => setActiveResetToken(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                Nueva Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  id="reset-new-password-input"
                  required
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <CheckCircle2 className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  id="reset-confirm-password-input"
                  required
                  placeholder="••••••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              id="btn-submit-reset-password"
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-xs font-mono transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)] cursor-pointer"
            >
              <span>Confirmar y Actualizar Contraseña</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-between pt-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-slate-400 hover:text-white flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Cancelar</span>
              </button>

              <button
                type="button"
                onClick={handleSimulateTtlExpire}
                className="text-rose-400 hover:text-rose-300 underline text-[11px]"
                title="Prueba de Criterio US-10: Hace que el token expire a 0s de inmediato"
              >
                Simular Expiración TTL (0s)
              </button>
            </div>
          </form>
        )}

        {/* Redis Execution Trace Panel */}
        <div className="mt-6 pt-4 border-t border-white/5 font-mono text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <Terminal className="w-3 h-3 text-emerald-400" />
            <span>Última Operación Redis en Backend A:</span>
          </div>
          <div className="bg-black p-2 rounded border border-white/5 text-emerald-400/90 break-all">
            {activeRedisCommand}
          </div>
        </div>

      </div>

      {/* =================================================================== */}
      {/* EVALUATION & TESTING FAST-CONTROLS BAR */}
      {/* =================================================================== */}
      <div className="w-full max-w-md mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/10 font-mono text-xs text-slate-300">
        <div className="flex items-center justify-between mb-2.5 text-slate-400 text-[11px]">
          <span className="font-bold flex items-center gap-1 text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Accesos Rápidos de Evaluación (Issue #5):
          </span>
          <span className="text-[10px] text-emerald-400 font-semibold">Criterios US-01 / US-01.2 / US-01.3 / US-10</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Button 1: Test valid credentials */}
          <button
            onClick={handleFillValidCreds}
            id="btn-test-valid-creds"
            className="p-2 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-left transition-colors"
          >
            <div className="font-bold text-[11px]">Credenciales Válidas</div>
            <div className="text-[10px] text-slate-400">admin / admin123</div>
          </button>

          {/* Button 2: Test invalid credentials (US-01 rejection) */}
          <button
            onClick={handleFillInvalidCreds}
            id="btn-test-invalid-creds"
            className="p-2 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-left transition-colors"
          >
            <div className="font-bold text-[11px]">Credenciales Inválidas</div>
            <div className="text-[10px] text-slate-400">Verifica rechazo</div>
          </button>

          {/* Button 3: Test Initial Setup screen (US-01.2) */}
          <button
            onClick={handleTestUnconfigured}
            id="btn-test-unconfigured-setup"
            className="p-2 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-left transition-colors"
          >
            <div className="font-bold text-[11px]">Probar Cuenta Única</div>
            <div className="text-[10px] text-slate-400">US-01.2 (Sin admin)</div>
          </button>

          {/* Button 4: Open Transactional Email Inbox (US-01.3) */}
          <button
            onClick={() => setShowInboxModal(true)}
            id="btn-test-open-inbox"
            className="p-2 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-left transition-colors"
          >
            <div className="font-bold text-[11px] flex items-center justify-between">
              <span>Buzón de Correos</span>
              {emails.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              )}
            </div>
            <div className="text-[10px] text-slate-400">Tokens temporales ({emails.length})</div>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TRANSACTIONAL EMAIL INBOX MODAL (US-01.3 SIMULATOR) */}
      {/* =================================================================== */}
      <AnimatePresence>
        {showInboxModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#0e0e0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden font-mono text-xs"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-white text-sm">Buzón Transaccional (SMTP Simulado)</span>
                </div>
                <button
                  onClick={() => setShowInboxModal(false)}
                  className="text-slate-400 hover:text-white px-2 py-1 rounded"
                >
                  ✕
                </button>
              </div>

              {/* Email List */}
              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                {emails.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <span>No hay correos en la bandeja de entrada.</span>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Haga clic en "¿Olvidé mi contraseña?" y solicite un enlace de recuperación.
                    </p>
                  </div>
                ) : (
                  emails.map((mail) => (
                    <div
                      key={mail.id}
                      className="p-4 rounded-xl bg-black border border-purple-500/30 space-y-3"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="text-purple-300 font-bold">{mail.subject}</span>
                        <span>{new Date(mail.sentAt).toLocaleTimeString()}</span>
                      </div>

                      <div className="text-[11px] text-slate-300 space-y-1">
                        <div>De: <span className="text-emerald-400">{mail.from}</span></div>
                        <div>Para: <span className="text-slate-200">{mail.to}</span></div>
                      </div>

                      <div className="p-2.5 rounded bg-white/[0.02] border border-white/5 text-[11px] text-slate-300 whitespace-pre-wrap">
                        {mail.content}
                      </div>

                      {/* Token details and Quick Action */}
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-amber-300 font-bold text-[11px]">Token Temporal en Redis:</span>
                          <span className="text-amber-400 text-[10px] font-bold">
                            EXPIRE 900s
                          </span>
                        </div>
                        <div className="text-[11px] text-amber-200 bg-black/60 p-1.5 rounded break-all border border-amber-500/30">
                          {mail.token}
                        </div>

                        <button
                          onClick={() => {
                            setActiveResetToken(mail.token);
                            setMode('reset');
                            setShowInboxModal(false);
                            setErrorMessage(null);
                          }}
                          className="w-full mt-2 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Abrir Enlace de Recuperación (US-01.3)</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 border-t border-white/5 bg-black flex items-center justify-between text-[11px] text-slate-400">
                <span>Persistencia: <code className="text-amber-400">auth:reset_token:&lt;TOKEN&gt;</code></span>
                <button
                  onClick={() => setShowInboxModal(false)}
                  className="px-3 py-1 bg-white/10 text-white rounded hover:bg-white/20"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
