import React, { useState, useEffect, useRef } from "react";
import { motion, useAnimation, PanInfo } from "framer-motion";
import { LightBoard } from "./LightBoard";
export interface CarouselItem {
    id: string | number;
    imageUrl: string;
    title: string;
    content?: React.ReactNode;
}

interface ThreeDPhotoCarouselProps {
    items: CarouselItem[];
    onItemClick?: (item: CarouselItem) => void;
    autoRotate?: boolean;
    rotationSpeed?: number;
}

const ThreeDPhotoCarousel: React.FC<ThreeDPhotoCarouselProps> = ({
    items,
    onItemClick,
    autoRotate = false,
    rotationSpeed = 3000,
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [rotation, setRotation] = useState(0);
    const carouselRef = useRef<HTMLDivElement>(null);

    const itemCount = items.length;
    const theta = 360 / itemCount;
    const radius = Math.round((450 / 2) / Math.tan(Math.PI / itemCount));

    useEffect(() => {
        if (!autoRotate || isDragging) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % itemCount);
        }, rotationSpeed);

        return () => clearInterval(interval);
    }, [autoRotate, isDragging, itemCount, rotationSpeed]);

    useEffect(() => {
        setRotation(-currentIndex * theta);
    }, [currentIndex, theta]);

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + itemCount) % itemCount);
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % itemCount);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setStartX(e.clientX);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const diff = e.clientX - startX;
        const sensitivity = 0.5;
        const indexChange = Math.round(-diff * sensitivity / 50);

        if (Math.abs(indexChange) > 0) {
            setCurrentIndex((prev) => {
                const newIndex = (prev + indexChange + itemCount) % itemCount;
                return newIndex;
            });
            setStartX(e.clientX);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        setStartX(e.touches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const diff = e.touches[0].clientX - startX;
        const sensitivity = 0.5;
        const indexChange = Math.round(-diff * sensitivity / 50);

        if (Math.abs(indexChange) > 0) {
            setCurrentIndex((prev) => {
                const newIndex = (prev + indexChange + itemCount) % itemCount;
                return newIndex;
            });
            setStartX(e.touches[0].clientX);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    return (
        <div className="relative w-full max-w-5xl mx-auto">
            <div className="w-full max-w-4xl mx-auto mb-12 relative z-10">
                <LightBoard
                    text="Woke AI vs. MAGA"
                    gap={1}
                    lightSize={6}
                    rows={7}
                    updateInterval={50}
                    colors={{
                        background: "rgba(0, 20, 0, 0.3)",
                        textDim: "rgba(0, 100, 0, 0.5)",
                        textBright: "rgba(0, 255, 0, 0.9)",
                        drawLine: "rgba(0, 150, 0, 0.7)"
                    }}
                />
            </div>
            <div className="relative h-[500px] flex items-center justify-center">
                {/* Carousel Container */}
                <div
                    ref={carouselRef}
                    className="relative w-full h-full perspective-container"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{ cursor: isDragging ? "grabbing" : "grab" }}
                >
                    <div
                        className="carousel-3d"
                        style={{
                            transform: `translateZ(-${radius}px) rotateY(${rotation}deg)`,
                            transition: isDragging ? "none" : "transform 0.5s ease-out",
                        }}
                    >
                        {items.map((item, index) => {
                            const angle = theta * index;
                            const isCurrent = index === currentIndex;

                            return (
                                <div
                                    key={item.id}
                                    className={`carousel-item ${isCurrent ? "active" : ""}`}
                                    style={{
                                        transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                                    }}
                                    onClick={() => isCurrent && onItemClick?.(item)}
                                >
                                    <div
                                        className={`w-full h-full hologram-card rounded-xl overflow-hidden transition-all duration-300 ${isCurrent
                                            ? "scale-100 opacity-100 shadow-2xl shadow-green-500/40"
                                            : "scale-90 opacity-60"
                                            }`}
                                    >
                                        {item.content || (
                                            <img
                                                src={item.imageUrl}
                                                alt={item.title}
                                                className="w-full h-full object-cover"
                                                draggable={false}
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Navigation Buttons */}
                <button
                    onClick={handlePrevious}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/60 border border-green-500/40 text-green-200 hover:bg-green-500/20 transition flex items-center justify-center text-2xl"
                    aria-label="Previous story"
                >
                    ←
                </button>
                <button
                    onClick={handleNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/60 border border-green-500/40 text-green-200 hover:bg-green-500/20 transition flex items-center justify-center text-2xl"
                    aria-label="Next story"
                >
                    →
                </button>
            </div>

            {/* Indicators */}
            <div className="flex justify-center gap-2 mt-8">
                {items.map((item, index) => (
                    <button
                        key={item.id}
                        onClick={() => setCurrentIndex(index)}
                        className={`w-3 h-3 rounded-full transition-all ${index === currentIndex
                            ? "bg-green-400 w-8 glow-green"
                            : "bg-green-700/50 hover:bg-green-600"
                            }`}
                        aria-label={`Go to story ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default ThreeDPhotoCarousel;
