
import React from 'react';
import { Article } from '../types';

interface NewsCarouselProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
}

const NewsCarousel: React.FC<NewsCarouselProps> = ({ articles, onSelectArticle }) => {
  return (
    <div className="relative">
      <h1 className="text-4xl font-extrabold text-center mb-2 text-green-300 glow-green">Top 10 Stories by Bias Severity</h1>
      <p className="text-center text-lg text-green-500 mb-8 max-w-3xl mx-auto glow-cyan">These stories are programmatically selected and ranked. Click "Decode Story" to engage our AI agent for a counter-perspective analysis.</p>
      <div className="flex overflow-x-auto space-x-6 p-4 -mx-4 no-scrollbar" style={{ scrollSnapType: 'x mandatory' }}>
        {articles.map((article, index) => (
          <div
            key={article.id}
            className="flex-shrink-0 w-80 md:w-96 hologram-card rounded-xl overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-green-500/20 glitch"
            style={{ scrollSnapAlign: 'center' }}
          >
            <div className="relative">
              <img src={article.imageUrl} alt={article.title} className="w-full h-48 object-cover border-b border-green-500/30" />
              <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg glow-green">
                BIAS SEVERITY: {article.biasSeverity.toFixed(2)}
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/80 to-transparent"></div>
            </div>
            <div className="p-6 flex flex-col justify-between h-[calc(100%-12rem)] circuit-bg">
              <div>
                <p className="text-sm text-green-400 font-semibold glow-green">{article.source}</p>
                <h3 className="text-lg font-bold mt-1 text-green-300 h-20 overflow-hidden glow-cyan">{article.title}</h3>
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
    </div>
  );
};

export default NewsCarousel;
