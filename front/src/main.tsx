import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { initTheme } from './lib/theme';

// Apply saved theme class to <html> before React mounts to prevent flash.
initTheme();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento root nao encontrado.');
}

// Nenhuma variavel de ambiente precisa existir no bundle do cliente: banco,
// segredo de JWT e chaves de IA ficam so no servidor (server/*.js). O unico
// env de cliente, VITE_API_BASE, e opcional (default: mesma origem).
const renderBootError = (message: string) => {
  createRoot(rootElement).render(
    <StrictMode>
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <div className="w-full max-w-xl rounded-3xl border border-rose-500/20 bg-zinc-950 p-8 shadow-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-rose-400">Erro de Configuracao</p>
          <h1 className="mt-3 text-2xl font-black">O app nao conseguiu iniciar</h1>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{message}</p>
        </div>
      </div>
    </StrictMode>,
  );
};

import('./App.tsx')
  .then(({ default: App }) => {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((error) => {
    console.error('Erro ao iniciar aplicacao:', error);
    renderBootError(
      error instanceof Error
        ? error.message
        : 'Nao foi possivel carregar a aplicacao. Verifique os logs do servidor.',
    );
  });
