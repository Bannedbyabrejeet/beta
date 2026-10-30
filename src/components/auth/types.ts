import type { FormEvent } from 'react';
import { AdminUser, TransactionalEmail } from '../../types';

export type AuthMode = 'setup' | 'login' | 'forgot' | 'reset';

/**
 * Estado y acciones del flujo de autenticación.
 * Se agrupan en un solo objeto para no repetir 40 props en cada formulario.
 */
export interface AuthBindings {
  adminUser: AdminUser;
  emails: TransactionalEmail[];
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;

  identifier: string;
  setIdentifier: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;

  setupUsername: string;
  setSetupUsername: (v: string) => void;
  setupEmail: string;
  setSetupEmail: (v: string) => void;
  setupPassword: string;
  setSetupPassword: (v: string) => void;
  setupConfirmPassword: string;
  setSetupConfirmPassword: (v: string) => void;

  forgotEmail: string;
  setForgotEmail: (v: string) => void;
  activeResetToken: string;
  setActiveResetToken: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmNewPassword: string;
  setConfirmNewPassword: (v: string) => void;
  tokenTtlSeconds: number;

  errorMessage: string | null;
  setErrorMessage: (v: string | null) => void;
  successMessage: string | null;
  setSuccessMessage: (v: string | null) => void;
  activeRedisCommand: string;
  setActiveRedisCommand: (v: string) => void;
  showInboxModal: boolean;
  setShowInboxModal: (v: boolean) => void;

  handleLoginSubmit: (e: FormEvent) => Promise<void>;
  handleSetupSubmit: (e: FormEvent) => Promise<void>;
  handleForgotSubmit: (e: FormEvent) => Promise<void>;
  handleResetSubmit: (e: FormEvent) => Promise<void>;
  handleFillValidCreds: () => void;
  handleFillInvalidCreds: () => void;
  handleSimulateTtlExpire: () => void;
  handleTestUnconfigured: () => void;
}
