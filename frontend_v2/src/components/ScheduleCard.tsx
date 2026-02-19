import { Schedule, deleteSchedule } from '../api';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Play, Trash2, Clock, MapPin, Mail } from 'lucide-react';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface ScheduleCardProps {
    schedule: Schedule;
    onRefresh: () => void;
    onRun?: (scanId: string) => void;
}

import { useRunSchedule } from '../hooks/useScan';

export function ScheduleCard({ schedule, onRefresh, onRun }: ScheduleCardProps) {
    const runScheduleMutation = useRunSchedule();
    const loading = runScheduleMutation.isPending;

    const handleRun = async () => {
        if (!schedule.id) return;
        try {
            const res = await runScheduleMutation.mutateAsync(schedule.id);
            if (res.scan_id && onRun) {
                onRun(res.scan_id);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async () => {
        if (!schedule.id) return;
        if (!confirm('Are you sure you want to delete this schedule?')) return;
        try {
            await deleteSchedule(schedule.id);
            onRefresh();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <Card>
            <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        {schedule.query}
                        <Badge variant={schedule.active ? "default" : "secondary"} className="text-[10px] h-5">
                            {schedule.frequency}
                        </Badge>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {schedule.location} ({schedule.radius}km)
                    </p>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-2">
                <div className="text-xs text-muted-foreground grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Last Run: {schedule.last_run ? new Date(schedule.last_run).toLocaleDateString() : 'Never'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate" title={schedule.email_to}>{schedule.email_to || 'Default Email'}</span>
                    </div>
                </div>
                {schedule.user_intent && (
                    <div className="text-xs bg-muted p-2 rounded border">
                        <span className="font-semibold">Intent:</span> {schedule.user_intent}
                    </div>
                )}
            </CardContent>
            <CardFooter className="p-4 pt-0 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleRun} disabled={loading}>
                    {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                    Run Now
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3 w-3" />
                </Button>
            </CardFooter>
        </Card>
    );
}
