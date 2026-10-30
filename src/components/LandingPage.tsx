import React from 'react';
import { Hero } from './landing/Hero';
import { ThreatMonitor } from './landing/ThreatMonitor';
import { FeatureGrid } from './landing/FeatureGrid';
import { Creators } from './landing/Creators';

interface LandingPageProps {
  onNavigateToDashboard: () => void;
  onNavigateToSwagger: () => void;
  onNavigateToArchitecture: () => void;
  onOpenAttackModal: () => void;
  isAuthenticated?: boolean;
}

/** Página de inicio: hero, monitor SOC, capacidades y autores. */
export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateToDashboard,
  isAuthenticated = false
}) => {
  const scrollToFeatures = () => {
    const el = document.getElementById('features-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen bg-[#050505] overflow-hidden text-slate-200 pb-20">
      <div className="absolute inset-0 bg-grid-cyber pointer-events-none opacity-40" />
      <div className="absolute -top-12 -right-12 w-96 h-96 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-80 h-80 bg-cyan-500/10 blur-[90px] rounded-full pointer-events-none" />

      <section className="relative pt-10 pb-16 md:pt-16 md:pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <Hero
          isAuthenticated={isAuthenticated}
          onNavigateToDashboard={onNavigateToDashboard}
          onScrollToFeatures={scrollToFeatures}
        />
        <ThreatMonitor />
      </section>

      <FeatureGrid />
      <Creators isAuthenticated={isAuthenticated} onNavigateToDashboard={onNavigateToDashboard} />
    </div>
  );
};
