
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Article } from "../types";

interface NewsCarouselProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
}

const CARD_WIDTH = 384; // tailwind w-96
const CARD_GAP = 24; // gap-6 => 1.5rem => 24px

const NewsCarousel: React.FC<NewsCarouselProps> = ({
  articles,
  onSelectArticle,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 8);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 8);
  }, []);

  const handleManualScroll = useCallback(
    (direction: "left" | "right") => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const delta = direction === "left" ? -1 : 1;
      const distance = delta * (CARD_WIDTH + CARD_GAP);
      container.scrollBy({ left: distance, behavior: "smooth" });
    },
    [],
  );

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    updateScrollState();
    container.addEventListener("scroll", updateScrollState);

    const handleResize = () => updateScrollState();
    window.addEventListener("resize", handleResize);

    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", handleResize);
    };
  }, [updateScrollState, articles.length]);

  useEffect(() => {
    updateScrollState();
  }, [articles, updateScrollState]);

  return (
    <div className="relative">
      <h1 className="text-4xl font-extrabold text-center mb-2 text-green-300 glow-green">
        Top 10 Stories by Bias Severity
      </h1>
      <p className="text-center text-lg text-green-500 mb-8 max-w-3xl mx-auto glow-cyan">
        These stories are programmatically selected and ranked. Click "Decode
        Story" to engage our AI agent for a counter-perspective analysis.
      </p>
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto space-x-6 p-4 -mx-4 no-scrollbar scroll-smooth"
          style={{ scrollSnapType: "x mandatory" }}
          aria-live="polite"
        >
          {articles.map((article) => (
            <div
              key={article.id}
              className="flex-shrink-0 w-80 md:w-96 hologram-card rounded-xl overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-green-500/20 glitch"
              style={{ scrollSnapAlign: "center" }}
            >
              <div className="relative">
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  className="w-full h-48 object-cover border-b border-green-500/30"
                  loading="lazy"
                />
                <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg glow-green">
                  BIAS SEVERITY: {article.biasSeverity.toFixed(2)}
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/80 to-transparent"></div>
              </div>
              <div className="p-6 flex flex-col justify-between h-[calc(100%-12rem)] circuit-bg">
                <div>
                  <p className="text-sm text-green-400 font-semibold glow-green">
                    {article.source}
                  </p>
                  <h3 className="text-lg font-bold mt-1 text-green-300 h-20 overflow-hidden glow-cyan">
                    {article.title}
                  </h3>
                </div>
                <button
                  onClick={() => onSelectArticle(article)}
                  className="mt-4 w-full bg-green-600 hover:bg-green-500 text-black font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 glow-green"
                >
                  Decode Story
                </button>
              </div>
            </div>
          ))}
        </div>

        {articles.length > 3 ? (
          <>
            <button
              type="button"
              onClick={() => handleManualScroll("left")}
              className={`hidden md:flex absolute top-1/2 -translate-y-1/2 -left-4 z-10 items-center justify-center w-12 h-12 rounded-full bg-black/60 border border-green-500/40 text-green-200 hover:bg-green-500/20 transition ${
                canScrollLeft ? "" : "opacity-30 pointer-events-none"
              }`}
              aria-label="Scroll previous stories"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => handleManualScroll("right")}
              className={`hidden md:flex absolute top-1/2 -translate-y-1/2 -right-4 z-10 items-center justify-center w-12 h-12 rounded-full bg-black/60 border border-green-500/40 text-green-200 hover:bg-green-500/20 transition ${
                canScrollRight ? "" : "opacity-30 pointer-events-none"
              }`}
              aria-label="Scroll next stories"
            >
              →
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default NewsCarousel;
