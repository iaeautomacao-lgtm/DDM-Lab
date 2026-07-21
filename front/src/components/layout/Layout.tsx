import { Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { RHBalloon } from '../RHBalloon';
import { SugestaoBox } from '../SugestaoBox';
import { AnnouncementModal } from '../AnnouncementModal';
import { Menu } from 'lucide-react'; // Removemos o ícone de 'X' que estava sobrando

export const Layout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const hideFloatingAssistant = location.pathname === '/generator' || location.pathname === '/ddmcreator';
  const hideFooter = location.pathname === '/generator' || location.pathname === '/ddmcreator';

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(circle at 20% 20%, rgba(255,106,0,0.08), transparent 500px), radial-gradient(circle at 80% 70%, rgba(255,106,0,0.04), transparent 600px)',
        }}
      />

      {/* 1. SIDEBAR DESKTOP */}
      <div className="hidden md:block relative z-10">
        <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      </div>

      {/* 2. MENU MOBILE OVERLAY */}
      {isMobileOpen && (
        // Adicionamos 'justify-end' aqui para o menu colar no lado direito da tela
        <div className="md:hidden fixed inset-0 z-50 flex justify-end">
          {/* Fundo escuro */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Gaveta do Menu */}
          <div className="relative w-64 bg-background h-full shadow-2xl flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {/* O onToggle agora diz para a própria setinha '<' da Sidebar fechar o menu mobile */}
              <Sidebar isCollapsed={false} onToggle={() => setIsMobileOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* 3. ÁREA CENTRAL */}
      <div className="relative z-10 flex-1 flex flex-col w-full min-w-0 transition-all duration-300">

        {/* Header Mobile */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background">
          <img src="/logo-ddm.webp" alt="DDM Lab" className="h-7 object-contain" />
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-lg bg-surface border border-border text-text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>

        <div className="hidden md:block">
          <Navbar />
        </div>

        <main className={`flex min-h-0 flex-1 p-4 md:p-8 ${hideFooter ? 'overflow-hidden' : 'overflow-x-hidden'}`}>
          <Outlet />
        </main>

        {!hideFooter && (
          <footer className="py-6 border-t border-border bg-background/50 text-center shrink-0">
            <p className="text-xs text-text-secondary font-medium uppercase tracking-widest">
              Desenvolvido por <span className="text-white">Grupo DDM</span>
            </p>
          </footer>
        )}
      </div>

      {!hideFloatingAssistant && <RHBalloon />}
      <SugestaoBox />
      <AnnouncementModal />
    </div>
  );
};
