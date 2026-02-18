import { ScrollArea } from "@/components/ui/scroll-area"
import { useEffect, useRef } from "react"

interface LogStreamProps {
    logs: string;
}

export function LogStream({ logs }: LogStreamProps) {
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [logs])

    return (
        <div className="rounded-md border bg-slate-950 p-4 font-mono text-xs text-green-400 h-[300px] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <span className="font-bold">SYSTEM LOG - PROCESS STREAM</span>
                <span className="animate-pulse">● LIVE</span>
            </div>
            <ScrollArea className="flex-1">
                <div className="whitespace-pre-wrap">
                    {logs || "Waiting for signal..."}
                </div>
                <div ref={bottomRef} />
            </ScrollArea>
        </div>
    )
}
