import type { PresentationTheme, Slide } from '../../lib/presentationsData';
import { resolveThemeColors, type BrandOverrides } from '../../lib/slideThemes';

interface Props {
  slide: Slide;
  theme: PresentationTheme;
  index: number;
  total: number;
  brand?: BrandOverrides;
  logoDataUrl?: string | null;
}

// Renderiza o slide com cores fixas do tema (nao os tokens claro/escuro do
// app) — precisa parecer exatamente com o que vira no .pptx exportado.
export const SlideRenderer = ({ slide, theme, index, total, brand, logoDataUrl }: Props) => {
  const c = resolveThemeColors(theme, brand);
  const isCover = slide.type === 'capa';

  return (
    <div
      className="relative flex aspect-video w-full flex-col overflow-hidden rounded-2xl border"
      style={{ background: c.background, borderColor: c.border, color: c.foreground }}
    >
      {isCover && <div className="absolute inset-y-0 left-0 w-2" style={{ background: c.accent }} />}
      {slide.type === 'fechamento' && <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: c.accent }} />}
      {logoDataUrl && (
        <img
          src={logoDataUrl}
          alt=""
          className={`absolute right-[4%] h-[9%] max-w-[16%] object-contain ${isCover ? 'top-[5%]' : 'bottom-[5%]'}`}
        />
      )}

      <div className="flex flex-1 flex-col p-[5%]">
        {slide.type === 'capa' && (
          <div className="flex flex-1 flex-col justify-end pb-[6%] pl-[3%]">
            <h2 className="text-[clamp(1.1rem,3.2vw,2.6rem)] font-bold leading-tight">{slide.title}</h2>
            {slide.subtitle && (
              <p className="mt-3 text-[clamp(0.7rem,1.3vw,1.15rem)]" style={{ color: c.muted }}>
                {slide.subtitle}
              </p>
            )}
          </div>
        )}

        {slide.type === 'fechamento' && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <h2 className="text-[clamp(1rem,2.6vw,2.1rem)] font-bold">{slide.title || 'Obrigado'}</h2>
            {slide.bullets && slide.bullets.length > 0 && (
              <ul className="mt-4 space-y-1.5 text-[clamp(0.6rem,1.1vw,1rem)]" style={{ color: c.muted }}>
                {slide.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {slide.type === 'citacao' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-[8%] text-center">
            <p className="text-[clamp(0.85rem,2vw,1.6rem)] italic leading-snug">“{slide.quote}”</p>
            {slide.quoteAuthor && (
              <p className="text-[clamp(0.55rem,1vw,0.95rem)] font-semibold" style={{ color: c.accent }}>
                — {slide.quoteAuthor}
              </p>
            )}
          </div>
        )}

        {(slide.type === 'topicos' || slide.type === 'duas_colunas') && (
          <>
            <h3 className="text-[clamp(0.8rem,2vw,1.6rem)] font-bold">{slide.title}</h3>
            <div className="mb-[3%] mt-1.5 h-[3px] w-[10%] min-w-6" style={{ background: c.accent }} />

            {slide.type === 'topicos' && (
              <ul className="flex-1 space-y-2 text-[clamp(0.6rem,1.2vw,1.05rem)]">
                {(slide.bullets || []).map((b, i) => (
                  <li key={i} className="flex gap-2">
                    <span style={{ color: c.accent }}>•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}

            {slide.type === 'duas_colunas' && (
              <div className="grid flex-1 grid-cols-2 gap-[3%]">
                {[slide.columnLeft, slide.columnRight].map((col, ci) => (
                  <div
                    key={ci}
                    className="flex flex-col gap-2 rounded-xl border p-[4%]"
                    style={{ background: c.cardBackground, borderColor: c.border }}
                  >
                    {col?.heading && (
                      <p className="text-[clamp(0.6rem,1.1vw,1rem)] font-semibold" style={{ color: c.accent }}>
                        {col.heading}
                      </p>
                    )}
                    <ul className="space-y-1.5 text-[clamp(0.55rem,1vw,0.9rem)]">
                      {(col?.bullets || []).map((b, i) => (
                        <li key={i} className="flex gap-1.5">
                          <span style={{ color: c.accent }}>•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="absolute bottom-[3%] right-[4%] text-[clamp(0.5rem,0.8vw,0.75rem)]" style={{ color: c.muted }}>
        {isCover ? 'Grupo DDM' : `Grupo DDM · ${index + 1}/${total}`}
      </div>
    </div>
  );
};
