import { Search, Sun, Moon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../lib/ThemeContext';
import { cn } from '../../lib/utils';

const routeTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Visao geral da plataforma' },
  '/generator': { title: 'Criar Pedido', subtitle: 'Monte seu prompt ideal' },
  '/library': { title: 'Modelos Prontos', subtitle: 'Templates por setor' },
  '/settings': { title: 'Configuracoes', subtitle: 'Uso responsavel e preferencias' },
  '/admin': { title: 'Administracao', subtitle: 'Painel de controle' },
  '/ddmcreator': { title: 'DDM Creator', subtitle: 'Criacao de imagens com IA' },
  '/history': { title: 'Historico', subtitle: 'Seus pedidos anteriores' },
  '/favorites': { title: 'Favoritos', subtitle: 'Templates salvos' },
};

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const page = routeTitles[location.pathname] ?? { title: 'DDM Lab', subtitle: '' };
  const [search, setSearch] = useState('');
  const { theme, toggle } = useTheme();

  const handleSearch = () => {
    const query = search.trim();
    navigate(query ? `/library?q=${encodeURIComponent(query)}` : '/library');
  };

  const isLight = theme === 'light';

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-6 border-b border-border bg-background/90 px-6 backdrop-blur-md">
      <div className="hidden min-w-0 flex-1 md:block">
        <h1 className={cn('truncate text-base font-bold leading-tight', isLight ? 'text-[#111111]' : 'text-white')}>
          {page.title}
        </h1>
        {page.subtitle && <p className="text-[11px] text-text-secondary">{page.subtitle}</p>}
      </div>

      <div className="w-full max-w-xl">
        <div className="group relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary transition-colors group-focus-within:text-primary"
            size={15}
          />
          <input
            type="text"
            placeholder="Buscar templates, prompts ou comandos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className={cn(
              'w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-28 text-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50',
              isLight ? 'placeholder:text-black/35' : 'placeholder:text-text-secondary/60'
            )}
          />
          <button
            type="button"
            onClick={handleSearch}
            className="absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center rounded-md bg-primary px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-primary/90"
          >
            Buscar
          </button>
        </div>
      </div>

      {/* Botão de alternância de tema */}
      <motion.button
        type="button"
        onClick={toggle}
        aria-label={isLight ? 'Alternar para tema escuro' : 'Alternar para tema claro'}
        title={isLight ? 'Tema escuro' : 'Tema claro'}
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border transition-colors',
          isLight
            ? 'bg-surface text-[#555555] hover:bg-surface-hover hover:text-[#111111]'
            : 'bg-surface text-text-secondary hover:bg-surface-hover hover:text-white'
        )}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isLight ? (
            <motion.span
              key="moon"
              initial={{ opacity: 0, rotate: -30 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 30 }}
              transition={{ duration: 0.18 }}
              className="flex items-center justify-center"
            >
              <Moon size={15} />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ opacity: 0, rotate: 30 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: -30 }}
              transition={{ duration: 0.18 }}
              className="flex items-center justify-center"
            >
              <Sun size={15} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </header>
  );
};
