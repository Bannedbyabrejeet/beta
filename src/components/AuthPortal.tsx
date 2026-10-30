import React from 'react';
import { Terminal } from 'lucide-react';
import { AuthMode } from './auth/types';
import { useAuthFlow } from '../hooks/useAuthFlow';
import { AuthHeader } from './auth/AuthHeader';
import { SetupForm } from './auth/SetupForm';
import { LoginForm } from './auth/LoginForm';
import { ForgotForm } from './auth/ForgotForm';
import { ResetForm } from './auth/ResetForm';
import { QuickAccessBar } from './auth/QuickAccessBar';
import { InboxModal } from './auth/InboxModal';

interface AuthPortalProps {
  onSuccessLogin: () => void;
  onCancel?: () => void;
  initialMode?: AuthMode;
}

/**
 * Portal de autenticación: login, alta de administrador, recuperación y reset.
 * La lógica vive en `useAuthFlow` y cada bloque visual en `components/auth/`.
 */
export const AuthPortal: React.FC<AuthPortalProps> = ({
  onSuccessLogin,
  onCancel,
  initialMode
}) => {
  const bindings = useAuthFlow(onSuccessLogin, initialMode);
  const { activeRedisCommand } = bindings;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md bg-[#0c0c0c] border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 relative backdrop-blur-xl">
        <AuthHeader bindings={bindings} onCancel={onCancel} />

        {bindings.mode === 'setup' && <SetupForm bindings={bindings} />}
        {bindings.mode === 'login' && <LoginForm bindings={bindings} />}
        {bindings.mode === 'forgot' && <ForgotForm bindings={bindings} />}
        {bindings.mode === 'reset' && <ResetForm bindings={bindings} />}

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

      <QuickAccessBar bindings={bindings} />

      <InboxModal bindings={bindings} />
    </div>
  );
};
