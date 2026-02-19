import { useState } from 'react'; // React Query handles api calls
import { useScanStatus, useStartScan, useDeleteJob, useJobs, useScanLog } from './hooks/useScan';
import { MissionControl } from './components/MissionControl';
import { DealCard } from './components/DealCard';
import { Carousel } from './components/Carousel';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { ScrollArea } from './components/ui/scroll-area';
import { Separator } from './components/ui/separator';
import { Loader2, Search, Trash2, History, CalendarClock, Zap, Clock, Play } from 'lucide-react';
import { SchedulesView } from './views/Schedules';

function App() {
    // State
    const [view, setView] = useState<'dashboard' | 'schedules'>('dashboard');
    const [scanId, setScanId] = useState<string | null>(null);
    const [query, setQuery] = useState("Office Chair");
    const [location, setLocation] = useState("Sydney");
    const [radius, setRadius] = useState(10);
    const [minListings, setMinListings] = useState(20);
    const [userIntent, setUserIntent] = useState("");

    // Queries
    const { data: scanData } = useScanStatus(scanId);
    const { data: jobsData } = useJobs();
    // Sort jobs by start_time descending
    const sortedJobs = jobsData?.jobs.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()) || [];

    const startScanMutation = useStartScan();
    const deleteJobMutation = useDeleteJob();

    const handleStartScan = () => {
        startScanMutation.mutate(
            { query, location, radius, minListings, userIntent },
            {
                onSuccess: (data) => {
                    setScanId(data.scan_id);
                    setView('dashboard'); // Switch to dashboard on scan start
                }
            }
        );
    };

    const loadJob = (id: string) => {
        setScanId(id);
        setView('dashboard');
    };

    const activeScan = scanData;
    const results = activeScan?.results || [];
    const inventory = activeScan?.inventory || [];

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 border-r bg-muted/10 flex flex-col">
                <div className="p-6 border-b">
                    <h1 className="font-bold text-xl tracking-tight flex items-center gap-2">
                        <Search className="h-5 w-5 text-primary" />
                        Market<span className="text-primary">Hunter</span>
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">v2.0 Command Center</p>
                </div>

                <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                    {/* Navigation */}
                    <div className="space-y-2 mb-6">
                        <Button
                            variant={view === 'dashboard' ? 'secondary' : 'ghost'}
                            className="w-full justify-start"
                            onClick={() => setView('dashboard')}
                        >
                            <Search className="mr-2 h-4 w-4" />
                            Live Scraper
                        </Button>
                        <Button
                            variant={view === 'schedules' ? 'secondary' : 'ghost'}
                            className="w-full justify-start"
                            onClick={() => setView('schedules')}
                        >
                            <CalendarClock className="mr-2 h-4 w-4" />
                            Schedules & Alerts
                        </Button>
                    </div>

                    <Separator className="mb-4" />

                    {/* New Scan Form */}
                    {view === 'dashboard' && (
                        <Card>
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-sm font-bold">New Mission</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Query</label>
                                    <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. Herman Miller" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Location</label>
                                    <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Sydney" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium">Radius (km)</label>
                                        <Input type="number" value={radius} onChange={e => setRadius(Number(e.target.value))} placeholder="10" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium">Min Listings</label>
                                        <Input type="number" value={minListings} onChange={e => setMinListings(Number(e.target.value))} placeholder="20" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Hunter's Intent (Optional)</label>
                                    <Input value={userIntent} onChange={e => setUserIntent(e.target.value)} placeholder="e.g. Find undervalued items for resale" />
                                </div>
                                <Button
                                    className="w-full"
                                    onClick={handleStartScan}
                                    disabled={startScanMutation.isPending}
                                >
                                    {startScanMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Launch Scan
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {view === 'dashboard' && <Separator className="my-4" />}

                    {/* History */}
                    <div>
                        <h3 className="text-xs font-bold uppercase text-muted-foreground mb-3 px-1 flex items-center">
                            <History className="h-3 w-3 mr-1" /> History
                        </h3>
                        <div className="space-y-1">
                            {sortedJobs.map(job => (
                                <div
                                    key={job.scan_id}
                                    className={`group flex items-center justify-between p-2 rounded-md text-sm cursor-pointer transition-colors ${scanId === job.scan_id && view === 'dashboard' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}
                                    onClick={() => loadJob(job.scan_id)}
                                >
                                    <div className="truncate flex-1">
                                        <div className="flex items-center gap-2">
                                            {job.source === 'scheduled' ? (
                                                <Clock className="h-3 w-3 text-purple-400" />
                                            ) : job.source === 'manual_scheduled' ? (
                                                <Play className="h-3 w-3 text-blue-400" />
                                            ) : (
                                                <Zap className="h-3 w-3 text-emerald-400" />
                                            )}
                                            <p className="truncate font-medium">{job.query || "Unknown Scan"}</p>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground pl-5 break-words">
                                            {new Date(job.start_time).toLocaleString(undefined, {
                                                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteJobMutation.mutate(job.scan_id);
                                            if (scanId === job.scan_id) setScanId(null);
                                        }}
                                    >
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">

                {view === 'schedules' ? (
                    <ScrollArea className="flex-1">
                        <SchedulesView onJobStarted={loadJob} />
                    </ScrollArea>
                ) : (
                    <>
                        {/* Mission Control HUD - Fixed at Top */}
                        <div className="p-6 border-b bg-muted/5 z-10 shrink-0">
                            <MissionControl
                                status={activeScan?.status || 'complete'}
                                stage={activeScan?.stage || 'initializing'}
                                stats={activeScan?.stats || { total_duration_seconds: 0, total_cost_usd: 0, total_tokens: { input: 0, output: 0 } }}
                            />
                        </div>

                        {/* Scrollable Content */}
                        <ScrollArea className="flex-1">
                            <div className="p-6 space-y-8 pb-20 max-w-[1600px] mx-auto">

                                {/* Live Terminal Logs - Moved to bottom fixed section */}

                                {/* Top Picks Carousel */}

                                {/* 1. Scraping Phase: Loading State (Hide raw listings as per user request) */}
                                {scanId && !inventory.length && (!results.length || activeScan?.stage === 'scraped') && activeScan?.stage !== 'complete' && (
                                    <div className="flex flex-col items-center justify-center h-[20vh] text-muted-foreground animate-pulse">
                                        <Search className="h-12 w-12 mb-4 opacity-50" />
                                        <h3 className="text-lg font-medium">Scouring the Market...</h3>
                                        <p className="text-sm">Gathering intelligence from the shadows.</p>
                                    </div>
                                )}

                                {/* 2. Analysis Phase: Market Inventory (Horizontal Carousel) */}
                                {inventory.length > 0 && (
                                    <Carousel
                                        title={
                                            <div className="flex items-center gap-4">
                                                <h2 className="text-xl font-bold flex items-center gap-2 text-muted-foreground">
                                                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                                                    Market Analysis ({inventory.length})
                                                </h2>
                                                <Separator className="flex-1" />
                                            </div>
                                        }
                                    >
                                        {inventory.map(deal => (
                                            <DealCard key={deal.id} deal={deal} basePath={(activeScan?.stats as any)?.output_dir} />
                                        ))}
                                    </Carousel>
                                )}

                                {/* 3. Ranking/Deep Dive Phase: Verified Top Picks (Below Inventory) */}
                                {results && results.length > 0 && activeScan?.stage !== 'scraped' && (
                                    <div className="mt-8">
                                        <Carousel
                                            title={
                                                <div className="flex items-center gap-4">
                                                    <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
                                                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                        Verified Top Picks ({results.length})
                                                    </h2>
                                                    <Separator className="flex-1 bg-emerald-900/30" />
                                                </div>
                                            }
                                        >
                                            {results.map(deal => (
                                                <DealCard key={deal.id} deal={deal} basePath={(activeScan?.stats as any)?.output_dir} />
                                            ))}
                                        </Carousel>
                                    </div>
                                )}

                                {!scanId && !results.length && !inventory.length && (
                                    <div className="flex flex-col items-center justify-center h-[40vh] text-muted-foreground">
                                        <Search className="h-16 w-16 mb-4 opacity-20" />
                                        <h3 className="text-lg font-medium">Ready to Hunt</h3>
                                        <p>Select a mission from the sidebar or launch a new scan.</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        {/* Fixed Terminal Footer */}
                        {scanId && (
                            <div className="h-64 border-t bg-black shrink-0 flex flex-col transition-all duration-300">
                                <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center shrink-0">
                                    <h3 className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                        SYSTEM_LOGS
                                    </h3>
                                    <span className="text-[10px] text-slate-500">LIVE FEED</span>
                                </div>
                                <div className="flex-1 overflow-hidden relative">
                                    <LogViewer scanId={scanId} />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

function LogViewer({ scanId }: { scanId: string }) {
    const { data: logData } = useScanLog(scanId);
    // Backend returns { log: string }
    // We split by newline to get lines
    const lines = logData?.log ? logData.log.split('\n').filter((l: string) => l.trim().length > 0) : [];

    return (
        <div className="h-full overflow-y-auto p-4 font-mono text-xs text-slate-300 space-y-1">
            {lines.length > 0 ? lines.map((line: string, i: number) => (
                <div key={i} className="flex gap-2">
                    <span className="text-slate-500 shrink-0">[{new Date().toLocaleTimeString()}]</span>
                    <span className="text-slate-300 break-all">
                        {line}
                    </span>
                </div>
            )) : <span className="text-slate-600 animate-pulse">Waiting for uplink...</span>}
        </div>
    );
}

export default App
