import { useState, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LogTerminalProps {
    steps: Record<string, any>;
    status: string;
}

export function LogTerminal({ steps, status }: LogTerminalProps) {
    const [isOpen, setIsOpen] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of logs?
    // Since we are just showing steps, it's not a real log stream.
    // We can simulate log stream by converting steps to a list.

    const sortedSteps = Object.entries(steps).sort((a, b) => {
        return new Date(a[1].start_time).getTime() - new Date(b[1].start_time).getTime();
    });

    return (
        <div className={cn(
            "fixed bottom-0 left-0 right-0 bg-slate-950 text-slate-100 border-t border-slate-800 transition-all duration-300 z-50 shadow-2xl",
            isOpen ? "h-64" : "h-10"
        )}>
            <div
                className="flex items-center justify-between px-4 h-10 bg-slate-900 cursor-pointer hover:bg-slate-800"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center space-x-2 text-sm font-mono">
                    <Terminal className="w-4 h-4" />
                    <span>System Logs</span>
                    <span className={cn(
                        "ml-2 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold",
                        status === 'completed' ? "bg-green-900 text-green-300" :
                            status === 'error' ? "bg-red-900 text-red-300" :
                                "bg-blue-900 text-blue-300 animate-pulse"
                    )}>
                        {status}
                    </span>
                </div>
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </div>

            {isOpen && (
                <ScrollArea className="h-[calc(100%-2.5rem)] p-4 font-mono text-xs">
                    {sortedSteps.map(([name, step], index) => (
                        <div key={name} className="mb-2">
                            <div className="flex items-center text-slate-400">
                                <span className="mr-2">[{new Date(step.start_time).toLocaleTimeString()}]</span>
                                <span className={cn(
                                    "font-bold uppercase",
                                    step.duration_seconds > 0 ? "text-green-400" : "text-yellow-400"
                                )}>
                                    {name}
                                </span>
                                {step.duration_seconds > 0 && (
                                    <span className="ml-2 text-slate-500">
                                        done in {step.duration_seconds.toFixed(2)}s
                                    </span>
                                )}
                            </div>
                            <div className="pl-20 text-slate-500">
                                Tokens: {step.tokens.input} in / {step.tokens.output} out | Cost: ${step.cost_usd.toFixed(5)}
                            </div>
                        </div>
                    ))}
                    {status === 'completed' && (
                        <div className="text-green-400 font-bold mt-4">
                            &gt; SESSION COMPLETE. RESULTS READY.
                        </div>
                    )}
                </ScrollArea>
            )}
        </div>
    );
}
