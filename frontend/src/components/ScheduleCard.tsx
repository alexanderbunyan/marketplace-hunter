import type { Schedule } from "../api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Trash2, Play, Circle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ScheduleCardProps {
    schedule: Schedule;
    onDelete: (id: string) => void;
    onRun: (id: string) => void;
}

export function ScheduleCard({ schedule, onDelete, onRun }: ScheduleCardProps) {
    return (
        <Card className="w-full">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-bold text-slate-800 truncate" title={schedule.query}>
                        {schedule.query}
                    </CardTitle>
                    <Badge variant={schedule.active ? "default" : "secondary"} className={schedule.active ? "bg-green-600" : ""}>
                        {schedule.frequency}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="text-sm space-y-2 pb-2">
                <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-4 h-4" />
                    <span>{schedule.location} ({schedule.radius}km)</span>
                </div>
                {schedule.user_intent && (
                    <div className="text-slate-500 italic truncate" title={schedule.user_intent}>
                        Intent: {schedule.user_intent}
                    </div>
                )}
                <div className="flex items-center gap-2 text-slate-500 text-xs mt-2">
                    <Clock className="w-3 h-3" />
                    Last run: {schedule.last_run ? formatDistanceToNow(new Date(schedule.last_run), { addSuffix: true }) : "Never"}
                </div>
                {schedule.email_to && (
                    <div className="text-xs text-slate-400">
                        Alerts to: {schedule.email_to}
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between pt-2 border-t bg-slate-50/50">
                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-red-600 h-8 px-2" onClick={() => schedule.id && onDelete(schedule.id)}>
                    <Trash2 className="w-4 h-4" />
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => schedule.id && onRun(schedule.id)}>
                        <Play className="w-3 h-3 mr-1" /> Run Now
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
