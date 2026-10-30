import React from 'react';
import { AuthPortal } from './AuthPortal';

interface ProtectedRouteProps {
  /** Si el admin está autenticado, se renderiza el contenido. */
  isAuthenticated: boolean;
  /** Mensaje del aviso de acceso restringido. */
  message: string;
  /** Callback cuando el login es exitoso. */
  onSuccess: () => void;
  /** Callback para volver al inicio. */
  onCancel: () => void;
  children: React.ReactNode;
}

/**
 * Envoltorio de rutas privadas: muestra el login si no hay sesión y el
 * contenido cuando el administrador está autenticado.
 *
 * Evita repetir el mismo bloque de "Acceso Restringido" en cada ruta.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  isAuthenticated,
  message,
  onSuccess,
  onCancel,
  children
}) => {
  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-4 text-center">
        <span className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full inline-flex items-center gap-2">
          <span>⚠️</span>
          <span>{message}</span>
        </span>
      </div>
      <AuthPortal onSuccessLogin={onSuccess} onCancel={onCancel} />
    </div>
  );
};
