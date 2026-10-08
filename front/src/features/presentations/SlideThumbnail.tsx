import type { PresentationTheme, Slide } from '../../lib/presentationsData';
import type { BrandOverrides } from '../../lib/slideThemes';
import { SlideRenderer } from './SlideRenderer';

// SlideRenderer usa clamp(...vw...) pro tamanho de fonte — isso e relativo ao
// VIEWPORT, nao ao container. Encolher o container sozinho nao encolhe o
// texto proporcionalmente. Por isso renderiza em tamanho fixo (largura
// "nativa") e aplica scale() por cima — scale() encolhe tudo de verdade,
// depois do layout, texto incluso.
const NATIVE_WIDTH = 480;

interface Props {
  slide: Slide;
  theme: PresentationTheme;
  brand?: BrandOverrides;
  width: number;
}

export const SlideThumbnail = ({ slide, theme, brand, width }: Props) => {
  const scale = width / NATIVE_WIDTH;
  const height = width * (9 / 16);

  return (
    <div className="overflow-hidden rounded-md" style={{ width, height }}>
      <div style={{ width: NATIVE_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <SlideRenderer slide={slide} theme={theme} index={0} total={1} brand={brand} />
      </div>
    </div>
  );
};
