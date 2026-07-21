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

// OpenAI/Gemini keys moved server-side (proxy /api/*) — they are no longer
// part of the client bundle, so only the public Supabase vars are validated here.
const missingEnvVars = [
  ['VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL],
  ['VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY],
].filter(([, value]) => !value);

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

if (missingEnvVars.length > 0) {
  renderBootError(
    `As variaveis abaixo nao foram encontradas no ambiente do deploy:\n\n${missingEnvVars
      .map(([name]) => `- ${name}`)
      .join('\n')}\n\nCadastre essas variaveis no servidor proprio ou no arquivo backend/.env.local e reinicie a aplicacao.`,
  );
} else {
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
}
