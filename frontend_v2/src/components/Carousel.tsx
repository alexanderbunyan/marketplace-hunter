import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "./ui/button"
import { cn } from "../lib/utils"

interface CarouselProps {
    children: React.ReactNode
    title?: React.ReactNode
    className?: string
}

export function Carousel({ children, title, className }: CarouselProps) {
    const scrollRef = React.useRef<HTMLDivElement>(null)

    const scroll = (direction: "left" | "right") => {
        if (scrollRef.current) {
            const scrollAmount = 600 // Scroll by 2 cards width approx
            const newScrollLeft =
                direction === "left"
                    ? scrollRef.current.scrollLeft - scrollAmount
                    : scrollRef.current.scrollLeft + scrollAmount

            scrollRef.current.scrollTo({
                left: newScrollLeft,
                behavior: "smooth",
            })
        }
    }

    return (
        <div className={cn("space-y-4 group", className)}>
            <div className="flex items-center justify-between">
                {title && <div className="flex-1">{title}</div>}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="outline" size="icon" onClick={() => scroll("left")} className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm border-slate-700 hover:bg-slate-800">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => scroll("right")} className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm border-slate-700 hover:bg-slate-800">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex overflow-x-auto gap-4 snap-x snap-mandatory scrollbar-none px-1 pb-4"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Hide scrollbar
            >
                {React.Children.map(children, (child) => (
                    <div className="min-w-[300px] w-[300px] snap-center shrink-0">
                        {child}
                    </div>
                ))}
            </div>
        </div>
    )
}
