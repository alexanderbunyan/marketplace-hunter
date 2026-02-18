import { useState, useEffect } from "react";
import { Activity, Clock, DollarSign, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ScanResult } from "@/api";

interface MissionControlProps {
    status: ScanResult['status'];
    stage: ScanResult['stage'];
    stats: ScanResult['stats'];
}

export function MissionControl({ status, stage, stats }: MissionControlProps) {
    const isRunning = status === 'running';

    const [duration, setDuration] = useState(stats?.total_duration_seconds || 0);

    useEffect(() => {
        if (!isRunning || !stats?.start_time) return;
        const interval = setInterval(() => {
            const start = new Date(stats.start_time!).getTime();
            const now = new Date().getTime();
            setDuration((now - start) / 1000);
        }, 1000);
        return () => clearInterval(interval);
    }, [isRunning, stats?.start_time]);

    const formatDuration = (seconds: number) => {
        if (!seconds) return "0s";
        if (seconds < 60) return `${seconds.toFixed(0)}s`;
        const m = Math.floor(seconds / 60);
        const s = (seconds % 60).toFixed(0);
        return `${m}m ${s}s`;
    };

    const getStageColor = () => {
        switch (stage) {
            case 'scraped': return 'text-blue-500';
            case 'analyzed': return 'text-purple-500';
            case 'ranked': return 'text-amber-500';
            case 'complete': return 'text-emerald-500';
            default: return 'text-slate-500';
        }
    };

    return (
        <Card className="bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <CardContent className="p-6 flex items-center justify-between">

                {/* Status Column */}
                <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${isRunning ? 'bg-blue-100 text-blue-600 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
                        <Activity className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight">Mission Control</h2>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium uppercase ${getStageColor()}`}>
                                {stage === 'initializing' ? 'Ready' : stage}
                            </span>
                            {isRunning && <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />}
                        </div>
                    </div>
                </div>

                {/* Metrics */}
                <div className="flex gap-8">
                    <div className="flex flex-col items-end">
                        <span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Duration
                        </span>
                        <span className="text-xl font-mono font-bold">
                            {formatDuration(duration)}
                        </span>
                    </div>

                    <div className="flex flex-col items-end">
                        <span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1">
                            <DollarSign className="h-3 w-3" /> Cost
                        </span>
                        <span className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ${(stats?.total_cost_usd || 0).toFixed(4)}
                        </span>
                    </div>

                    <div className="flex flex-col items-end">
                        <span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1">
                            <Brain className="h-3 w-3" /> Tokens
                        </span>
                        <span className="text-xl font-mono font-bold text-purple-600 dark:text-purple-400">
                            {((stats?.total_tokens?.input || 0) + (stats?.total_tokens?.output || 0)).toLocaleString()}
                        </span>
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}
