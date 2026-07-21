import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  Library,
  Briefcase,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
  User,
  Users,
  ImagePlus,
  Rss,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Logo } from '../ui/Logo';
import { useAuth } from '../../lib/AuthContext';

const navItems: Array<{ icon: React.ElementType; label: string; path: string; adminOnly?: boolean }> = [
  { icon: LayoutDashboard, label: 'Inicio', path: '/' },
  { icon: Sparkles, label: 'Criar Pedido', path: '/generator' },
  { icon: Briefcase, label: 'Cases IA', path: '/cases' },
  { icon: Library, label: 'Modelos Prontos', path: '/library' },
  { icon: Zap, label: 'IAs', path: '/ias' },
  { icon: ImagePlus, label: 'DDM Creator', path: '/ddmcreator' },
  { icon: User, label: 'Meu Perfil', path: '/profile' },
  { icon: Settings, label: 'Uso Responsavel', path: '/settings' },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ isCollapsed, onToggle }: SidebarProps) => {
  const { logout, profile, isAdmin, isRH } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        'sticky top-0 flex h-screen flex-col border-r border-border bg-background transition-all duration-300',
        isCollapsed ? 'w-[72px]' : 'w-56'
      )}
    >
      <div
        className={cn(
          'flex h-16 items-center border-b border-border px-4',
          isCollapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {!isCollapsed && <Logo />}
        <button
          onClick={onToggle}
          className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface hover:text-foreground"
          title={isCollapsed ? 'Expandir' : 'Recolher'}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {!isCollapsed && (
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
            Menu Principal
          </p>
        )}

        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300',
                isActive
                  ? 'bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(255,81,0,0.08)]'
                  : 'text-text-secondary hover:bg-surface hover:text-foreground',
                isCollapsed && 'justify-center px-0'
              )
            }
            title={isCollapsed ? item.label : undefined}
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'absolute left-0 top-1/2 h-0 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300',
                    isActive ? 'h-7 opacity-100' : 'h-0 opacity-0 group-hover:h-5 group-hover:opacity-70',
                  )}
                />
                <item.icon
                  size={18}
                  className={cn(
                    'shrink-0 transition-all duration-300 group-hover:translate-x-1',
                    isActive ? 'text-primary' : 'text-text-secondary group-hover:text-foreground'
                  )}
                />
                {!isCollapsed && (
                  <span className="truncate transition-transform duration-300 group-hover:translate-x-1">
                    {item.label}
                  </span>
                )}

                {isCollapsed && (
                  <div className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {item.label}
                  </div>
                )}
              </>
            )}
          </NavLink>
          ))}

        {isAdmin && (
          <>
            {!isCollapsed && (
              <p className="mb-2 mt-4 px-3 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                Administracao
              </p>
            )}
            {isCollapsed && <div className="my-2 border-t border-border" />}
            <AdminNavItem
              isCollapsed={isCollapsed}
              icon={ShieldCheck}
              label="Painel Admin"
              path="/admin"
            />
          </>
        )}

        {(isRH || isAdmin) && (
          <>
            {!isCollapsed && (
              <p className="mb-2 mt-4 px-3 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                RH
              </p>
            )}
            {isCollapsed && <div className="my-2 border-t border-border" />}
            <AdminNavItem
              isCollapsed={isCollapsed}
              icon={Users}
              label="Painel RH"
              path="/rh"
            />
          </>
        )}
      </nav>

      <div className="space-y-1 border-t border-border p-3">
        {!isCollapsed && profile && (
          <div className="mb-2 flex items-center gap-3 rounded-lg bg-surface px-3 py-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-hover text-text-secondary">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar do usuario" className="h-full w-full object-cover" />
              ) : (
                <User size={18} />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">{profile.preferredName || profile.displayName || 'Colaborador'}</p>
              <p className="truncate text-[11px] text-text-secondary">{profile.department || 'Geral'}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-red-400/10 hover:text-red-400',
            isCollapsed && 'justify-center px-0'
          )}
          title={isCollapsed ? 'Sair' : undefined}
        >
          <LogOut size={18} className="shrink-0" />
          {!isCollapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
};

interface AdminNavItemProps {
  isCollapsed: boolean;
  icon: typeof ShieldCheck;
  label: string;
  path: string;
}

const AdminNavItem = ({ isCollapsed, icon: Icon, label, path }: AdminNavItemProps) => (
  <NavLink
    to={path}
    className={({ isActive }) =>
      cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300',
        isActive
          ? 'bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(255,81,0,0.08)]'
          : 'text-text-secondary hover:bg-surface hover:text-foreground',
        isCollapsed && 'justify-center px-0'
      )
    }
    title={isCollapsed ? label : undefined}
  >
    {({ isActive }) => (
      <>
        <span
          className={cn(
            'absolute left-0 top-1/2 h-0 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300',
            isActive ? 'h-7 opacity-100' : 'h-0 opacity-0 group-hover:h-5 group-hover:opacity-70',
          )}
        />
        <Icon
          size={18}
          className={cn(
            'shrink-0 transition-all duration-300 group-hover:translate-x-1',
            isActive ? 'text-primary' : 'text-text-secondary group-hover:text-foreground'
          )}
        />
        {!isCollapsed && <span className="transition-transform duration-300 group-hover:translate-x-1">{label}</span>}
        {isCollapsed && (
          <div className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            {label}
          </div>
        )}
      </>
    )}
  </NavLink>
);
