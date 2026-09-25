import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FileArchive, Loader2, Upload, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Field } from '../solutions/Field';
import { uploadSkill, CATEGORY_OPTIONS, type Skill } from '../../lib/skillsData';

interface Props {
  onClose: () => void;
  onSaved: (skill: Skill) => void;
}

export const UploadSkillModal = ({ onClose, onSaved }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0].value);
  const [tagsText, setTagsText] = useState('');
  const [compatibility, setCompatibility] = useState('Claude');
  const [version, setVersion] = useState('1.0.0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilePick = (picked: File | null) => {
    if (!picked) return;
    if (!picked.name.toLowerCase().endsWith('.zip')) {
      setError('Envie um arquivo .zip.');
      return;
    }
    setError('');
    setFile(picked);
    if (!name.trim()) setName(picked.name.replace(/\.zip$/i, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Selecione o arquivo .zip da skill.');
      return;
    }
    if (!name.trim() || !description.trim()) {
      setError('Nome e descrição são obrigatórios.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const tags = tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const skill = await uploadSkill({
        file,
        name: name.trim(),
        description: description.trim(),
        category,
        tags,
        compatibility: compatibility.trim() || 'Claude',
        version: version.trim() || '1.0.0',
      });
      onSaved(skill);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a skill.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <motion.form
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-surface p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Enviar skill</h3>
          <button type="button" onClick={onClose} className="text-text-secondary hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <label
            className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface-hover/40 p-6 text-center transition-colors hover:border-primary/40"
            onClick={() => fileInputRef.current?.click()}
          >
            {file ? (
              <>
                <FileArchive size={22} className="text-primary" />
                <span className="text-sm font-medium text-foreground">{file.name}</span>
                <span className="text-xs text-text-secondary">{(file.size / 1024 / 1024).toFixed(2)} MB — clique para trocar</span>
              </>
            ) : (
              <>
                <Upload size={22} className="text-text-secondary" />
                <span className="text-sm font-medium text-foreground">Clique para escolher o .zip</span>
                <span className="text-xs text-text-secondary">Pasta da skill compactada em .zip</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              className="hidden"
              onChange={(e) => handleFilePick(e.target.files?.[0] ?? null)}
            />
          </label>

          <Field label="Nome *">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              placeholder="Ex.: Meeting Summarizer"
            />
          </Field>

          <Field label="Descrição *">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              placeholder="O que essa skill faz, em 1-2 frases"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Versão">
              <input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                placeholder="1.0.0"
              />
            </Field>
          </div>

          <Field label="Tags (separadas por vírgula)">
            <input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              placeholder="reuniao, resumo, produtividade"
            />
          </Field>

          <p className="text-xs text-text-secondary">
            A skill entra como <strong className="text-foreground">privada</strong> — só você vê. Depois, na tela de
            detalhes, você pode enviar para revisão e um admin decide se ela é publicada para todo mundo.
          </p>

          {error && <p className="text-xs font-medium text-red-400">{error}</p>}

          <Button type="submit" disabled={saving} className="w-full justify-center">
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            Enviar skill
          </Button>
        </div>
      </motion.form>
    </motion.div>
  );
};
