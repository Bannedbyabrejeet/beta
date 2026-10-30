import React from 'react';
import { LandingPage } from './LandingPage';
import { Dashboard } from './Dashboard';
import { AuthPortal } from './AuthPortal';
import { SwaggerDocs } from './SwaggerDocs';
import { ArchitectureHub } from './ArchitectureHub';
import { RedisInspector } from './RedisInspector';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminUser, Tab } from '../types';

interface AppRoutesProps {
  currentTab: Tab;
  setCurrentTab: (tab: Tab) => void;
  adminUser: AdminUser;
  onOpenAttackModal: () => void;
}

/** Router principal: decide qué vista se muestra según la pestaña activa. */
export const AppRoutes: React.FC<AppRoutesProps> = ({
  currentTab,
  setCurrentTab,
  adminUser,
  onOpenAttackModal
}) => {
  const goToProtected = (tab: Tab) => {
    setCurrentTab(adminUser.isAuthenticated ? tab : 'auth');
  };

  return (
    <main className="flex-1">
      {currentTab === 'landing' && (
        <LandingPage
          isAuthenticated={adminUser.isAuthenticated}
          onNavigateToDashboard={() => goToProtected('dashboard')}
          onNavigateToSwagger={() => goToProtected('swagger')}
          onNavigateToArchitecture={() => goToProtected('architecture')}
          onOpenAttackModal={() => {
            if (adminUser.isAuthenticated) {
              onOpenAttackModal();
            } else {
              setCurrentTab('auth');
            }
          }}
        />
      )}

      {/* Dashboard Route: Protected by Admin Session (FRONT-01 / US-01) */}
      {currentTab === 'dashboard' && (
        <ProtectedRoute
          isAuthenticated={adminUser.isAuthenticated}
          message="Acceso Restringido: Inicie sesión como Administrador para ver las métricas y reglas del Firewall"
          onSuccess={() => setCurrentTab('dashboard')}
          onCancel={() => setCurrentTab('landing')}
        >
          <Dashboard
            onOpenAttackModal={() => onOpenAttackModal()}
            onNavigateToSwagger={() => setCurrentTab('swagger')}
            onNavigateToArchitecture={() => setCurrentTab('architecture')}
            onNavigateToRedis={() => setCurrentTab('redis')}
          />
        </ProtectedRoute>
      )}

      {/* Dedicated Auth Portal View - Only accessible when NOT authenticated */}
      {currentTab === 'auth' && !adminUser.isAuthenticated && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <AuthPortal
            onSuccessLogin={() => setCurrentTab('dashboard')}
            onCancel={() => setCurrentTab('landing')}
          />
        </div>
      )}

      {/* Swagger / OpenAPI Docs Route: Protected */}
      {currentTab === 'swagger' && (
        <ProtectedRoute
          isAuthenticated={adminUser.isAuthenticated}
          message="Acceso Restringido: Inicie sesión como Administrador para consultar y probar la API OpenAPI"
          onSuccess={() => setCurrentTab('swagger')}
          onCancel={() => setCurrentTab('landing')}
        >
          <SwaggerDocs />
        </ProtectedRoute>
      )}

      {/* Architecture Hub Route: Protected */}
      {currentTab === 'architecture' && (
        <ProtectedRoute
          isAuthenticated={adminUser.isAuthenticated}
          message="Acceso Restringido: Inicie sesión como Administrador para ver el blueprint Docker y arquitectura"
          onSuccess={() => setCurrentTab('architecture')}
          onCancel={() => setCurrentTab('landing')}
        >
          <ArchitectureHub />
        </ProtectedRoute>
      )}

      {/* Redis Streams & KV Route: Protected */}
      {currentTab === 'redis' && (
        <ProtectedRoute
          isAuthenticated={adminUser.isAuthenticated}
          message="Acceso Restringido: Inicie sesión como Administrador para inspeccionar Redis Streams &amp; KV"
          onSuccess={() => setCurrentTab('redis')}
          onCancel={() => setCurrentTab('landing')}
        >
          <RedisInspector />
        </ProtectedRoute>
      )}

    </main>
  );
};
