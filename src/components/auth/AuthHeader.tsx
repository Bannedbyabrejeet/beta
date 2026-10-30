import React from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthBindings } from './types';
import { NotificationBanner } from './NotificationBanner';

interface AuthHeaderProps {
  bindings: AuthBindings;
  onCancel?: () => void;
}

/** Encabezado de la tarjeta de autenticación (título, tabs y mensajes). */
export const AuthHeader: React.FC<AuthHeaderProps> = ({ bindings, onCancel }) => {
  const {
    mode,
    errorMessage,
    successMessage
  } = bindings;

  return (
    <>
        
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
            <NotificationBanner
              id="auth-error-banner"
              variant="error"
              title="Error de autenticación:"
              message={errorMessage}
            />
          )}

          {successMessage && (
            <NotificationBanner
              id="auth-success-banner"
              variant="success"
              title="Operación exitosa:"
              message={successMessage}
            />
          )}
        </AnimatePresence>

        {/* =================================================================== */}
        {/* VIEW 1: CREAR CUENTA ÚNICA (US-01.2) */}
        {/* =================================================================== */}
    </>
  );
};
