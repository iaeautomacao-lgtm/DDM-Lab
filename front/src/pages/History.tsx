import React, { useEffect, useState } from 'react';
import {
  History as HistoryIcon,
  Search,
  Trash2,
  Copy,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { useAuth } from '../lib/AuthContext';
import { deleteUsageLogById, fetchUsageLogsByUser, UsageLogRecord } from '../lib/supabaseData';

export function History() {
  const { user } = useAuth();
  const [interactions, setInteractions] = useState<UsageLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      setInteractions([]);
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        const rows = await fetchUsageLogsByUser(user.id);
        setInteractions(rows);
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta interação?')) return;

    try {
      await deleteUsageLogById(id);
      setInteractions((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Error deleting interaction:', err);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredInteractions = interactions.filter((item) => {
    const promptText = item.prompt_text || '';
    const responseText = item.response_text || '';
    return (
      promptText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      responseText.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (loading) {
    return <div className="p-20 text-center text-text-secondary">Carregando histórico...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-20">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Histórico de Uso</h1>
          <p className="text-text-secondary">Acesse e reutilize suas interações anteriores com a IA.</p>
        </div>
      </header>

      <div className="group relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary transition-colors group-focus-within:text-primary"
          size={20}
        />
        <input
          type="text"
          placeholder="Buscar no histórico..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-2xl border border-border bg-surface py-4 pl-12 pr-4 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="space-y-6">
        {filteredInteractions.length > 0 ? (
          filteredInteractions.map((item) => {
            const createdAt = item.created_at ? new Date(item.created_at) : null;

            return (
              <Card key={item.id} className="space-y-4 border-border/50 p-6 transition-all hover:border-primary/20">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {createdAt ? `${createdAt.toLocaleDateString()} ${createdAt.toLocaleTimeString()}` : 'Sem data'}
                    </span>
                    <span>•</span>
                    <span className="text-primary">{item.ia_used || 'IA'}</span>
                    <span>•</span>
                    <span>{item.sector || 'Geral'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(item.prompt_text, `${item.id}-prompt`)}
                      className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-hover"
                      title="Copiar prompt"
                    >
                      {copiedId === `${item.id}-prompt` ? (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>

                    <button
                      onClick={() => navigate('/generator', { state: { prompt: item.prompt_text } })}
                      className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-hover"
                      title="Reutilizar prompt"
                    >
                      <ExternalLink size={16} />
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-500/10"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-text-primary">Prompt:</p>
                    <p className="rounded-xl border border-border bg-surface-hover p-3 text-sm text-text-secondary">
                      {item.prompt_text}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-bold text-text-primary">Resposta:</p>
                    <p className="rounded-xl border border-primary/10 bg-primary/5 p-3 text-sm italic text-text-secondary">
                      {item.response_text}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-surface p-20 text-center text-text-secondary">
            <HistoryIcon size={48} className="mx-auto mb-4 opacity-20" />
            <p>Nenhuma interação encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
}
