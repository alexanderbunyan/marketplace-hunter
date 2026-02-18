import { useRef } from 'react';
import { DealCard } from './DealCard';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Deal } from "@/api";

interface DealCarouselProps {
    deals: Deal[];
    basePath?: string;
    title?: string;
}

export function DealCarousel({ deals, basePath, title }: DealCarouselProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 400; // Approx card width + gap
            const currentScroll = scrollContainerRef.current.scrollLeft;
            const targetScroll = direction === 'left'
                ? currentScroll - scrollAmount
                : currentScroll + scrollAmount;

            scrollContainerRef.current.scrollTo({
                left: targetScroll,
                behavior: 'smooth'
            });
        }
    };

    if (!deals || deals.length === 0) return null;

    return (
        <div className="space-y-4 w-full">

            <div className="flex items-center justify-between px-1">
                {title ? (
                    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                ) : (
                    <div /> /* Spacer if no title */
                )}

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => scroll('left')}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => scroll('right')}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div
                ref={scrollContainerRef}
                className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory scrollbar-hide -mx-4 px-4"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {deals.map((deal, i) => (
                    <div key={deal.id || i} className="flex-none w-[350px] snap-center h-auto flex">
                        <DealCard deal={deal} basePath={basePath} />
                    </div>
                ))}
            </div>
        </div>
    );
}
