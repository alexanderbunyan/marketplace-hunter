import { useState, useEffect } from 'react'
import { startScan, getScanStatus, getJobs, getScanLog, deleteJob } from './api'
import type { ScanResult, Deal, Job } from './api'
import { StatsTicker } from './components/StatsTicker'
import { DealCarousel } from './components/DealCarousel'
import { LogStream } from './components/LogStream'
import { Sidebar } from './components/Sidebar'
import { Badge } from './components/ui/badge'
import { Loader2, AlertCircle } from 'lucide-react'
import { Schedules } from './views/Schedules'

function App() {
  const [view, setView] = useState<'dashboard' | 'schedules'>('dashboard')
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('erskineville')
  const [radius, setRadius] = useState(10)
  const [minListings, setMinListings] = useState(30)
  const [userIntent, setUserIntent] = useState('')
  const [scanId, setScanId] = useState<string | null>(null)
  const [status, setStatus] = useState<ScanResult['status']>('running')
  const [stage, setStage] = useState<ScanResult['stage']>('initializing')
  const [scanData, setScanData] = useState<ScanResult['stats'] | null>(null)
  const [results, setResults] = useState<Deal[] | null>(null)
  const [inventory, setInventory] = useState<Deal[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [logContent, setLogContent] = useState("")
  const [elapsed, setElapsed] = useState(0)

  // Initial Load
  useEffect(() => {
    fetchJobs()
  }, [])

  // Timer
  useEffect(() => {
    let interval: any;
    if (status === 'running' && scanData?.start_time) {
      const startTime = new Date(scanData.start_time).getTime();
      interval = setInterval(() => {
        setElapsed((Date.now() - startTime) / 1000);
      }, 100);
    } else if (scanData?.total_duration_seconds) {
      setElapsed(scanData.total_duration_seconds);
    }
    return () => clearInterval(interval);
  }, [status, scanData?.start_time, scanData?.total_duration_seconds]);

  // Poll for status & logs
  useEffect(() => {
    if (!scanId || status === 'complete' || status === 'failed') return
    const interval = setInterval(async () => {
      try {
        const res = await getScanStatus(scanId)
        setStatus(res.status)
        setStage(res.stage)
        if (res.stats) setScanData(res.stats)
        setResults(res.results) // Fixed: Always update results to clear stale data
        if (res.inventory) setInventory(res.inventory)
        const logRes = await getScanLog(scanId)
        if (logRes.log) setLogContent(logRes.log)
        if (res.status === 'complete' || res.status === 'failed') {
          setLoading(false)
          fetchJobs()
          clearInterval(interval)
        }
      } catch (err) {
        console.error("Polling error", err)
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [scanId, status])

  const fetchJobs = async () => {
    try {
      const res = await getJobs()
      setJobs(res.jobs)
    } catch (e) {
      console.error("Failed to fetch jobs", e)
    }
  }

  const handleNewScan = () => {
    setScanId(null)
    setScanData(null)
    setResults(null)
    setInventory(null)
    setLogContent("")
    setStatus('running')
    setStage('initializing')
    setLoading(false)
    setView('dashboard')
  }

  const handleDeleteJob = async (id: string) => {
    try {
      await deleteJob(id);
      if (scanId === id) handleNewScan();
      await fetchJobs();
    } catch (e) {
      console.error("Failed to delete job", e);
    }
  }

  const handleStartScan = async () => {
    setLoading(true)
    setScanId(null)
    setScanData(null)
    setResults(null)
    setInventory(null)
    setLogContent("Initializing mission...")
    setStatus('running')
    setStage('initializing')
    try {
      const response = await startScan(query, location, radius, minListings, userIntent)
      if (response.scan_id) {
        setScanId(response.scan_id)
        setTimeout(fetchJobs, 1000)
      } else {
        console.error("No scan ID returned")
        setLoading(false)
      }
    } catch (error) {
      console.error("Scan failed to start", error)
      setLoading(false)
      setStatus('failed')
    }
  }

  const handleSelectJob = async (id: string) => {
    setScanId(id)
    setView('dashboard')
    setLoading(true)
    setLogContent("Loading historical mission data...")
    try {
      const res = await getScanStatus(id)
      setStatus(res.status)
      setStage(res.stage)
      if (res.stats) setScanData(res.stats)
      if (res.results) setResults(res.results)
      if (res.inventory) setInventory(res.inventory)
      const logRes = await getScanLog(id)
      setLogContent(logRes.log)
      setLoading(false)
    } catch (e) {
      console.error("Failed to select job", e)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 overflow-hidden">
      <Sidebar
        jobs={jobs}
        currentScanId={scanId}
        currentView={view}
        onNavigate={setView}
        onSelectJob={handleSelectJob}
        onNewScan={handleNewScan}
        onDeleteJob={handleDeleteJob}
        currentParams={scanId ? {
          query: (scanData as any)?.query || query,
          location: (scanData as any)?.location || location,
          intent: (scanData as any)?.user_intent || userIntent,
          radius: (scanData as any)?.radius || radius,
          minListings: (scanData as any)?.min_listings || minListings
        } : undefined}
      />

      <div className="flex-1 ml-80 h-screen overflow-y-auto bg-slate-50 relative">
        {view === 'schedules' ? (
          <Schedules />
        ) : (
          <div className="p-8 max-w-7xl mx-auto w-full space-y-6 flex flex-col min-h-screen">
            {/* Header */}
            {scanId && scanData && (
              <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex-none">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    Mission Control
                    {loading && (
                      <Badge variant="secondary" className="animate-pulse capitalize font-normal text-sm">
                        {stage === 'initializing' ? 'Initializing...' :
                          stage === 'scraped' ? 'Scraping Listings...' :
                            stage === 'analyzed' ? 'Analyzing Images...' :
                              stage === 'ranked' ? 'Ranking Deals...' : 'Finalizing...'}
                      </Badge>
                    )}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                    <p>ID: <span className="font-mono text-xs">{scanId.slice(0, 8)}</span></p>
                    <span className="text-slate-300">|</span>
                    <p>{status === 'complete' ? 'Mission Complete' : 'Mission Active'}</p>
                  </div>
                </div>
                <StatsTicker
                  duration={elapsed}
                  cost={scanData.total_cost_usd || 0}
                  tokens={(scanData.total_tokens?.input || 0) + (scanData.total_tokens?.output || 0)}
                />
              </div>
            )}

            {/* New Mission Form */}
            {!scanId && (
              <div className="max-w-xl mx-auto mt-20">
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center space-y-6">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Initiate New Scan</h2>
                  <p className="text-slate-500">Configure parameters to hunt for deals.</p>

                  <div className="space-y-4 text-left">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-widest">Search Query</label>
                      <input
                        className="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="e.g. Herman Miller Aeron"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-widest">Location</label>
                        <input
                          className="w-full mt-1 p-3 border rounded-lg"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-widest">Radius (km)</label>
                        <input
                          type="number"
                          className="w-full mt-1 p-3 border rounded-lg"
                          value={radius}
                          onChange={(e) => setRadius(Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-widest">Min Listings</label>
                        <input
                          type="number"
                          className="w-full mt-1 p-3 border rounded-lg"
                          value={minListings}
                          onChange={(e) => setMinListings(Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-widest">User Intent (Optional)</label>
                      <input
                        className="w-full mt-1 p-3 border rounded-lg"
                        placeholder="e.g. Resell for profit, Personal use"
                        value={userIntent}
                        onChange={(e) => setUserIntent(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={handleStartScan}
                      disabled={!query || loading}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : 'Start Mission'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Results Area */}
            {scanId && (
              <div className="space-y-8 pb-20">
                {results && results.length > 0 && (
                  <section>
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      Top Findings (AI Verified)
                    </h3>
                    {/* Pass basePath derived from scanData */}
                    <DealCarousel
                      deals={results}
                      basePath={(scanData as any)?.output_dir}
                    />
                  </section>
                )}
                {inventory && inventory.length > 0 && (
                  <section>
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 text-slate-500">
                      <span className="w-2 h-2 bg-slate-300 rounded-full"></span>
                      Market Inventory ({inventory.length})
                    </h3>
                    <DealCarousel
                      deals={inventory}
                      basePath={(scanData as any)?.output_dir}
                    />
                  </section>
                )}
                <section className="border-t pt-8">
                  <LogStream logs={logContent} />
                </section>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
export default App
