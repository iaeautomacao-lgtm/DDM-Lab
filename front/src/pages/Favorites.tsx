import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Copy, Search, Star, Trash2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TEMPLATES } from '../constants';
import { fetchFavoritePrompts, fetchPromptTemplates, removeFavoritePrompt } from '../lib/supabaseData';
import type { Template } from '../types';

export function Favorites() {
  const [templates, setTemplates] = useState<Template[]>(TEMPLATES);
  const [favoritePrompts, setFavoritePrompts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [dbTemplates, storedFavorites] = await Promise.all([fetchPromptTemplates(), fetchFavoritePrompts()]);
        if (dbTemplates.length > 0) {
          setTemplates(dbTemplates);
        }
        setFavoritePrompts(storedFavorites);
      } catch (err) {
        console.error('Error fetching favorites:', err);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const favoriteTemplates = useMemo(
    () =>
      templates.filter((template) => favoritePrompts.includes(template.basePrompt)).filter((template) => {
        const term = searchTerm.toLowerCase();
        return template.name.toLowerCase().includes(term) || template.basePrompt.toLowerCase().includes(term);
      }),
    [templates, favoritePrompts, searchTerm]
  );

  const handleRemove = async (basePrompt: string) => {
    try {
      await removeFavoritePrompt(basePrompt);
      setFavoritePrompts((prev) => prev.filter((item) => item !== basePrompt));
    } catch (err) {
      console.error('Error removing favorite:', err);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) return <div className="p-20 text-center text-text-secondary">Carregando favoritos...</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-20">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Meus Favoritos</h1>
          <p className="text-text-secondary">Acesse rapidamente seus prompts e modelos preferidos.</p>
        </div>
      </header>

      <div className="group relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary transition-colors group-focus-within:text-primary" size={20} />
        <input
          type="text"
          placeholder="Buscar nos favoritos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-2xl border border-border bg-surface py-4 pl-12 pr-4 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {favoriteTemplates.length > 0 ? (
          favoriteTemplates.map((item) => (
            <Card key={item.id} className="flex flex-col space-y-4 border-border/50 p-6 transition-all hover:border-primary/20">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  <span className="text-primary">{item.department}</span>
                  <span>•</span>
                  <span>{item.complexity}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(item.basePrompt, item.id)}
                    className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-hover"
                    title="Copiar prompt"
                  >
                    {copiedId === item.id ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                  <button
                    onClick={() => handleRemove(item.basePrompt)}
                    className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-500/10"
                    title="Remover"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-bold text-text-primary">{item.name}</h3>
                <p className="line-clamp-3 text-sm leading-relaxed text-text-secondary">{item.basePrompt}</p>
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto w-full justify-between p-0 font-bold text-primary hover:bg-transparent"
                  onClick={() => navigate('/generator', { state: { prompt: item.basePrompt } })}
                >
                  Usar agora
                  <ArrowRight size={16} />
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full rounded-3xl border border-dashed border-border bg-surface p-20 text-center text-text-secondary">
            <Star size={48} className="mx-auto mb-4 opacity-20" />
            <p>Nenhum favorito encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
