import { Card, CardContent } from "@/components/ui/card";
import { Timer, Coins, MessageSquare } from "lucide-react";

interface StatsTickerProps {
    duration: number;
    cost: number;
    tokens: number;
}

export function StatsTicker({ duration, cost, tokens }: StatsTickerProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
                <CardContent className="flex items-center p-4 space-x-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full flex-shrink-0">
                        <Timer className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-muted-foreground truncate">Duration</p>
                        <h3 className="text-2xl font-bold tabular-nums">{duration.toFixed(1)}s</h3>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="flex items-center p-4 space-x-4">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full flex-shrink-0">
                        <Coins className="w-5 h-5 text-green-600 dark:text-green-300" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-muted-foreground truncate">Total Cost</p>
                        <h3 className="text-2xl font-bold text-green-600 tabular-nums truncate" title={`$${cost.toFixed(6)}`}>${cost.toFixed(4)}</h3>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="flex items-center p-4 space-x-4">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full flex-shrink-0">
                        <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-muted-foreground truncate">Tokens Used</p>
                        <h3 className="text-2xl font-bold tabular-nums">{tokens.toLocaleString()}</h3>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
