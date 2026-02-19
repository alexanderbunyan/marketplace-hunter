import { useEffect, useState } from 'react';
import { getSchedules, saveSchedule, getSettings, saveSettings, Schedule, Settings } from '../api';
import { ScheduleCard } from '../components/ScheduleCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, Save, Loader2, Mail } from 'lucide-react';

export function SchedulesView({ onJobStarted }: { onJobStarted?: (id: string) => void }) {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [settings, setSettingsObj] = useState<Settings>({
        smtp_server: '', smtp_port: 587, smtp_user: '', smtp_password: '', default_email: ''
    });

    const [newSchedule, setNewSchedule] = useState<Partial<Schedule>>({
        query: '', location: 'Sydney', radius: 10, min_listings: 10, user_intent: '',
        frequency: 'daily', time: '09:00', email_to: '', active: true
    });

    // Load Data
    const refresh = async () => {
        setLoading(true);
        try {
            const s = await getSchedules();
            setSchedules(s.schedules);
            const set = await getSettings();
            setSettingsObj(set);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    const handleCreate = async () => {
        if (!newSchedule.query) return;
        try {
            await saveSchedule(newSchedule as Schedule);
            setNewSchedule({ ...newSchedule, query: '', user_intent: '' }); // Reset fields
            refresh();
        } catch (e) {
            console.error(e);
        }
    };

    const handleSaveSettings = async () => {
        try {
            await saveSettings(settings);
            alert('Settings Saved!');
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="p-6 max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Mission Schedules</h2>
                    <p className="text-muted-foreground">Automated scanning and email alerts.</p>
                </div>
            </div>

            <Tabs defaultValue="schedules" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="schedules">Active Schedules</TabsTrigger>
                    <TabsTrigger value="settings">SMTP Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="schedules" className="space-y-6">
                    {/* Create New */}
                    <Card className="border-emerald-500/20 bg-emerald-500/5">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Plus className="h-5 w-5 text-emerald-500" />
                                Create New Schedule
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label>Search Query</Label>
                                    <Input value={newSchedule.query} onChange={e => setNewSchedule({ ...newSchedule, query: e.target.value })} placeholder="e.g. Herman Miller" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Location</Label>
                                    <Input value={newSchedule.location} onChange={e => setNewSchedule({ ...newSchedule, location: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Radius (km)</Label>
                                    <Input type="number" value={newSchedule.radius} onChange={e => setNewSchedule({ ...newSchedule, radius: Number(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Min Listings</Label>
                                    <Input type="number" value={newSchedule.min_listings} onChange={e => setNewSchedule({ ...newSchedule, min_listings: Number(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Frequency</Label>
                                    {/* Using native select for reliability */}
                                    <select
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={newSchedule.frequency}
                                        onChange={(e) => setNewSchedule({ ...newSchedule, frequency: e.target.value })}
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Time (24h)</Label>
                                    <Input type="time" value={newSchedule.time} onChange={e => setNewSchedule({ ...newSchedule, time: e.target.value })} />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Email Alert To</Label>
                                    <Input value={newSchedule.email_to} onChange={e => setNewSchedule({ ...newSchedule, email_to: e.target.value })} placeholder="me@example.com" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Hunter's Intent (Optional)</Label>
                                <Input value={newSchedule.user_intent} onChange={e => setNewSchedule({ ...newSchedule, user_intent: e.target.value })} placeholder="e.g. Only authentic items, ignore replicas." />
                            </div>
                            <Button onClick={handleCreate} disabled={!newSchedule.query}>Create Schedule</Button>
                        </CardContent>
                    </Card>

                    {/* List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {loading ? <Loader2 className="animate-spin" /> : schedules.map(s => (
                            <ScheduleCard key={s.id} schedule={s} onRefresh={refresh} onRun={onJobStarted} />
                        ))}
                        {!loading && schedules.length === 0 && (
                            <div className="col-span-full text-center text-muted-foreground py-10">
                                No active schedules. Create one above!
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="settings">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="h-5 w-5" />
                                Email Configuration
                            </CardTitle>
                            <CardDescription>
                                Configure SMTP settings for sending alerts.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 max-w-lg">
                            <div className="space-y-2">
                                <Label>SMTP Server</Label>
                                <Input value={settings.smtp_server} onChange={e => setSettingsObj({ ...settings, smtp_server: e.target.value })} placeholder="smtp.gmail.com" />
                            </div>
                            <div className="space-y-2">
                                <Label>SMTP Port</Label>
                                <Input type="number" value={settings.smtp_port} onChange={e => setSettingsObj({ ...settings, smtp_port: Number(e.target.value) })} placeholder="587" />
                            </div>
                            <div className="space-y-2">
                                <Label>SMTP User</Label>
                                <Input value={settings.smtp_user} onChange={e => setSettingsObj({ ...settings, smtp_user: e.target.value })} placeholder="user@gmail.com" />
                            </div>
                            <div className="space-y-2">
                                <Label>SMTP Password</Label>
                                <Input type="password" value={settings.smtp_password} onChange={e => setSettingsObj({ ...settings, smtp_password: e.target.value })} placeholder="App Password" />
                            </div>
                            <div className="space-y-2">
                                <Label>Default Recipient</Label>
                                <Input value={settings.default_email} onChange={e => setSettingsObj({ ...settings, default_email: e.target.value })} placeholder="alert@example.com" />
                            </div>
                            <Button onClick={handleSaveSettings}>
                                <Save className="h-4 w-4 mr-2" />
                                Save Configuration
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
