import React from "react";
import { Article } from "../types";
import ThreeDPhotoCarousel, { CarouselItem } from "./ui/ThreeDPhotoCarousel";
import { BgAnimateButton } from "./ui/BgAnimateButton";

interface ThreeDNewsCarouselProps {
    articles: Article[];
    onSelectArticle: (article: Article) => void;
}

const ThreeDNewsCarousel: React.FC<ThreeDNewsCarouselProps> = ({
    articles,
    onSelectArticle,
}) => {
    // Transform articles to carousel items with custom content
    const carouselItems: CarouselItem[] = articles.map((article) => ({
        id: article.id,
        imageUrl: article.imageUrl,
        title: article.title,
        content: (
            <div className="relative w-full h-full group cursor-pointer rounded-xl overflow-hidden border-2 border-green-500/0 group-hover:border-green-500/50 transition-all duration-300">
                {/* Article Image */}
                <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    draggable={false}
                />

                {/* Bias Severity Badge */}
                <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg glow-green z-10">
                    BIAS: {article.biasSeverity.toFixed(2)}
                </div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-80"></div>

                {/* Article Details */}
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <p className="text-sm text-green-400 font-semibold mb-2 glow-green uppercase tracking-wide">
                        {article.source}
                    </p>
                    <h3 className="text-xl font-bold text-green-300 mb-12 line-clamp-3 glow-cyan">
                        {article.title}
                    </h3>
                </div>

                {/* Decode Button */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20">
                    <BgAnimateButton
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelectArticle(article);
                        }}
                        gradient="forest"
                        animation="pulse"
                        rounded="full"
                        shadow="deep"
                        className="hover:scale-105 transition-transform"
                    >
                        Decode Story →
                    </BgAnimateButton>
                </div>
            </div>
        ),
    }));

    const handleItemClick = (item: CarouselItem) => {
        const article = articles.find((a) => a.id === item.id);
        if (article) {
            onSelectArticle(article);
        }
    };

    return (
        <ThreeDPhotoCarousel
            items={carouselItems}
            onItemClick={handleItemClick}
            autoRotate={false}
        />
    );
};

export default ThreeDNewsCarousel;
