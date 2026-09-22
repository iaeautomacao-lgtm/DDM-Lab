export const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-text-secondary/70">{label}</span>
    {children}
  </label>
);
