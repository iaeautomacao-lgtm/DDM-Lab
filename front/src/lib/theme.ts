export type Theme = 'dark' | 'light';

export const getTheme = (): Theme =>
  (localStorage.getItem('ddm_theme') as Theme) ?? 'dark';

export const setTheme = (t: Theme) => {
  localStorage.setItem('ddm_theme', t);
  const root = document.documentElement;
  root.classList.toggle('dark', t === 'dark');
  root.classList.toggle('light', t === 'light');
};

/** Call once before React mounts to avoid flash of wrong theme. */
export const initTheme = () => setTheme(getTheme());
