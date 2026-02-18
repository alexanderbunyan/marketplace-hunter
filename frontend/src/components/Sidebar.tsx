import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Job } from "@/api"
import { Play, Clock, CheckCircle, AlertCircle, Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface SidebarProps {
    jobs: Job[];
    currentScanId: string | null;
    onSelectJob: (scanId: string) => void;
    onNewScan: () => void;
    onDeleteJob: (scanId: string) => void;
    currentView: 'dashboard' | 'schedules';
    onNavigate: (view: 'dashboard' | 'schedules') => void;
    currentParams?: {
        query: string;
        location: string;
        intent?: string;
        radius?: number;
        minListings?: number;
    }
}

export function Sidebar({ jobs, currentScanId, onSelectJob, onNewScan, onDeleteJob, currentParams, currentView, onNavigate }: SidebarProps) {
    return (
        <div className="w-80 border-r bg-white flex flex-col h-screen fixed left-0 top-0 z-50 shadow-sm">
            <div className="p-6 border-b bg-slate-50">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <span className="bg-blue-600 text-white p-1 rounded">MH</span>
                    Command Center
                </h1>
            </div>

            <div className="p-4 space-y-2 border-b">
                <Button
                    variant={currentView === 'dashboard' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => onNavigate('dashboard')}
                >
                    <Play className="w-4 h-4 mr-2" /> One-Off Mission
                </Button>
                <Button
                    variant={currentView === 'schedules' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => onNavigate('schedules')}
                >
                    <Clock className="w-4 h-4 mr-2" /> Scheduled Missions
                </Button>
            </div>

            <div className="p-4 space-y-4">
                {currentView === 'dashboard' && (
                    <Button onClick={onNewScan} className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                        <Play className="w-4 h-4 mr-2" /> New Live Mission
                    </Button>
                )}

                {currentParams && currentView === 'dashboard' && (
                    <div className="bg-slate-50 p-3 rounded-lg border text-sm space-y-1">
                        <div className="font-semibold text-slate-700 border-b pb-1 mb-1">Active Parameters</div>
                        <div className="grid grid-cols-3 gap-1">
                            <span className="text-slate-500">Query:</span>
                            <span className="col-span-2 font-medium truncate" title={currentParams.query}>{currentParams.query}</span>

                            <span className="text-slate-500">Loc:</span>
                            <span className="col-span-2 font-medium truncate">{currentParams.location}</span>

                            {currentParams.radius && (
                                <>
                                    <span className="text-slate-500">Radius:</span>
                                    <span className="col-span-2 font-medium truncate">{currentParams.radius}km</span>
                                </>
                            )}

                            {currentParams.minListings && (
                                <>
                                    <span className="text-slate-500">Vol:</span>
                                    <span className="col-span-2 font-medium truncate">{currentParams.minListings} listings</span>
                                </>
                            )}

                            {currentParams.intent && (
                                <>
                                    <span className="text-slate-500">Intent:</span>
                                    <span className="col-span-2 font-medium truncate" title={currentParams.intent}>{currentParams.intent}</span>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="px-4 py-2 bg-slate-50 font-semibold text-xs text-slate-500 uppercase tracking-wider border-b border-t">
                    Mission History
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {jobs.map((job) => (
                            <div
                                key={job.scan_id}
                                className={`group relative w-full text-left p-3 rounded-lg text-sm transition-all border ${currentScanId === job.scan_id
                                    ? "bg-blue-50 border-blue-200 shadow-sm"
                                    : "hover:bg-slate-50 border-transparent hover:border-slate-200"
                                    }`}
                            >
                                <div
                                    className="cursor-pointer"
                                    onClick={() => onSelectJob(job.scan_id)}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`font-medium truncate max-w-[140px] ${currentScanId === job.scan_id ? "text-blue-900" : "text-slate-700"}`} title={job.query || job.scan_id}>
                                            {job.query ? job.query : `${job.scan_id.slice(0, 8)}...`}
                                        </span>
                                        {job.status === 'complete' ? (
                                            <CheckCircle className="w-3 h-3 text-green-500" />
                                        ) : (
                                            <AlertCircle className="w-3 h-3 text-amber-500" />
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDistanceToNow(new Date(job.start_time), { addSuffix: true })}
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Are you sure you want to delete this mission?')) {
                                            onDeleteJob(job.scan_id);
                                        }
                                    }}
                                    className="absolute right-2 top-8 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 rounded text-slate-400 hover:text-red-600 transition-all"
                                    title="Delete Mission"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {jobs.length === 0 && (
                            <div className="p-4 text-center text-slate-400 text-sm italic">
                                No history found.
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    )
}
