import { useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';

const stories = [
  {
    id: 1,
    title: 'O que é IA?',
    image: '/stories/stories 1.png',
    text: 'Inteligência Artificial é a capacidade de sistemas aprenderem padrões, organizarem informacões e ajudarem você a executar e automatizar tarefas com mais velocidade e consistência no dia a dia.',
  },
  {
    id: 2,
    title: 'Como usar na DDM',
    image: '/stories/stories 2.png',
    text: 'No DDM Lab, a IA pode apoiar criacão de prompts, revisão de textos, organizacão de dados, resumos executivos e ganho de produtividade com mais clareza e segurança.',
  },
  {
    id: 3,
    title: 'Especialidades das IAs',
    image: '/stories/stories 3.png',
    text: 'As tecnologias atuais se dividem em duas frentes principais: texto e imagem. O ChatGPT e o Claude são especialistas em escrita e análise de dados, enquanto o Midjourney transforma conceitos em visuais. Cada ferramenta deve ser escolhida conforme o seu objetivo.',
  },
  {
    id: 4,
    title: 'Como estruturar um bom Prompt',
    image: '/stories/stories 4.png',
    text: 'A precisão da resposta e proporcional a clareza da instrução. Para resultados de alta performance, utilize a tríade: Contexto, Tarefa e Formato. Quanto mais específico for o comando, mais refinada sera a entrega.',
  },
  {
    id: 5,
    title: 'Importância da revisão humana',
    image: '/stories/stories 5.png',
    text: 'A Inteligência Artificial atua como um copiloto, nao como um substituto. Modelos generativos podem apresentar alucinacoes ou imprecisoes tecnicas. A validacao final de dados, fatos e do tom de voz e responsabilidade obrigatória do colaborador, garantindo o padrão de excelência da DDM.',
  },
  {
    id: 6,
    title: 'Mãos à Obra',
    image: '/stories/stories 6.png',
    text: 'O aprendizado teórico é o alicerce, mas a maestria vem com a prática. O DDM Lab está pronto para potencializar sua rotina. Explore a Central de IAs, utilize nossos modelos validados e comece a transformar seus fluxos de trabalho hoje mesmo. Vamos elevar o padrão da DDM juntos?',
  },
];

export const LearningStories = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [seenStories, setSeenStories] = useState<number[]>([]);

  const openStory = (index: number) => {
    setCurrentIndex(index);
    setSeenStories((prev) => (prev.includes(stories[index].id) ? prev : [...prev, stories[index].id]));
    setIsOpen(true);
  };

  const nextStory = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    setIsOpen(false);
  };

  const prevStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  return (
    <>
      <section className="rounded-[2rem] border border-border bg-surface-hover/40 p-6 backdrop-blur-sm md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-text-secondary">Aprenda com o Acordito</p>
            <h3 className="text-lg font-semibold text-foreground">Evolua seu uso de IA</h3>
          </div>
        </div>

        <div className="flex gap-6 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {stories.map((story, index) => (
            <button
              key={story.id}
              type="button"
              onClick={() => openStory(index)}
              className="group flex w-[88px] shrink-0 flex-col items-center gap-3 text-center"
            >
              <div
                className={`rounded-full p-[3px] transition-transform duration-300 group-hover:scale-110 ${
                  seenStories.includes(story.id)
                    ? 'bg-border'
                    : 'bg-gradient-to-tr from-orange-600 to-yellow-400'
                }`}
              >
                <div className="rounded-full bg-background p-[3px]">
                  <img
                    src={story.image}
                    alt={story.title}
                    className="h-16 w-16 rounded-full object-cover grayscale-[30%] transition-all duration-300 group-hover:grayscale-0"
                  />
                </div>
              </div>
              <span className="line-clamp-2 min-h-[32px] max-w-[88px] text-[11px] font-medium leading-tight text-text-secondary transition-colors group-hover:text-foreground">
                {story.title}
              </span>
            </button>
          ))}
        </div>
      </section>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute right-5 top-5 rounded-full border border-white/10 bg-white/5 p-2 text-white transition-colors hover:bg-white/10"
            aria-label="Fechar stories"
          >
            <X size={20} />
          </button>

          <div className="relative w-full max-w-[400px] overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 shadow-2xl">
            <div className="absolute left-4 right-4 top-4 z-20 flex gap-1">
              {stories.map((story, index) => (
                <div
                  key={story.id}
                  className={`h-1 flex-1 rounded-full ${index <= currentIndex ? 'bg-orange-500' : 'bg-zinc-700'}`}
                />
              ))}
            </div>

            <div className="relative aspect-[9/16]">
              <img
                src={stories[currentIndex].image}
                alt={stories[currentIndex].title}
                className="absolute inset-0 h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/10" />

              <div className="absolute bottom-0 left-0 right-0 space-y-3 p-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">
                  <Sparkles size={12} />
                  Acordito Ensina
                </div>
                <h4 className="text-2xl font-black text-white">{stories[currentIndex].title}</h4>
                <p className="text-sm leading-relaxed text-zinc-200">{stories[currentIndex].text}</p>
              </div>

              <button
                type="button"
                onClick={prevStory}
                className="absolute left-3 top-1/2 rounded-full bg-black/35 p-2 text-white/70 transition-colors hover:text-white"
                aria-label="Story anterior"
              >
                <ChevronLeft size={26} />
              </button>

              <button
                type="button"
                onClick={nextStory}
                className="absolute right-3 top-1/2 rounded-full bg-black/35 p-2 text-white/70 transition-colors hover:text-white"
                aria-label="Proximo story"
              >
                <ChevronRight size={26} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
