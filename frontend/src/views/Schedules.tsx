import { useState, useEffect } from "react";
import { getSchedules, saveSchedule, deleteSchedule, runSchedule } from "../api";
import type { Schedule } from "../api";
import { ScheduleCard } from "@/components/ScheduleCard";
import { SettingsForm } from "@/components/SettingsForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Calendar } from "lucide-react";

export function Schedules() {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    // New Schedule Form State
    const [newSchedule, setNewSchedule] = useState<Schedule>({
        query: "",
        location: "erskineville",
        radius: 10,
        min_listings: 10,
        user_intent: "",
        frequency: "daily",
        email_to: "",
        active: true
    });

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        try {
            const data = await getSchedules();
            setSchedules(data.schedules);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        await saveSchedule(newSchedule);
        setIsOpen(false);
        setNewSchedule({ ...newSchedule, query: "" }); // Reset partially
        load();
    };

    const handleDelete = async (id: string) => {
        if (confirm("Delete this schedule?")) {
            await deleteSchedule(id);
            load();
        }
    };

    const handleRun = async (id: string) => {
        await runSchedule(id);
        alert("Scan triggered in background!");
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
            <div className="p-6 border-b bg-white shadow-sm flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Mission Control</h1>
                    <p className="text-slate-500 text-sm">Automated surveillance and reporting.</p>
                </div>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-4 h-4 mr-2" /> Schedule Mission
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>New Scheduled Mission</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Query</Label>
                                <Input
                                    value={newSchedule.query}
                                    onChange={(e) => setNewSchedule({ ...newSchedule, query: e.target.value })}
                                    placeholder="e.g. Herman Miller Aeron"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Location</Label>
                                    <Input
                                        value={newSchedule.location}
                                        onChange={(e) => setNewSchedule({ ...newSchedule, location: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Radius (km)</Label>
                                    <Input
                                        type="number"
                                        value={newSchedule.radius}
                                        onChange={(e) => setNewSchedule({ ...newSchedule, radius: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Frequency</Label>
                                    <Select
                                        value={newSchedule.frequency}
                                        onValueChange={(v: any) => setNewSchedule({ ...newSchedule, frequency: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="daily">Daily</SelectItem>
                                            <SelectItem value="weekly">Weekly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Min Listings</Label>
                                    <Input
                                        type="number"
                                        value={newSchedule.min_listings}
                                        onChange={(e) => setNewSchedule({ ...newSchedule, min_listings: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Email Alert To (Optional)</Label>
                                <Input
                                    value={newSchedule.email_to}
                                    onChange={(e) => setNewSchedule({ ...newSchedule, email_to: e.target.value })}
                                    placeholder="Defaults to global settings if empty"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>User Intent</Label>
                                <Input
                                    value={newSchedule.user_intent}
                                    onChange={(e) => setNewSchedule({ ...newSchedule, user_intent: e.target.value })}
                                    placeholder="e.g. Reselling for profit"
                                />
                            </div>
                            <Button className="w-full mt-4" onClick={handleCreate} disabled={!newSchedule.query}>
                                Create Schedule
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-8">
                {/* Active Schedules */}
                <section>
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" /> Active Schedules
                    </h2>

                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-300" /></div>
                    ) : schedules.length === 0 ? (
                        <div className="bg-white p-8 rounded-lg border border-dashed text-center text-slate-500">
                            No active schedules. Create one to get started.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {schedules.map(s => (
                                <ScheduleCard
                                    key={s.id}
                                    schedule={s}
                                    onDelete={handleDelete}
                                    onRun={handleRun}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* Settings Section */}
                <section>
                    <h2 className="text-lg font-semibold text-slate-800 mb-4">Settings</h2>
                    <div className="max-w-2xl">
                        <SettingsForm />
                    </div>
                </section>
            </div>
        </div>
    );
}
