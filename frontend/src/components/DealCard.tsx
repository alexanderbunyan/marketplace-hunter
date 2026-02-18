import { useState } from "react";
import { Card, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, MapPin, CheckCircle, X, Search, AlertTriangle } from "lucide-react";
import type { Deal } from "@/api";

interface DealCardProps {
    deal: Deal;
    basePath?: string;
}

// Robust Helper to convert file paths to static URLs
const getImageUrl = (deal: Deal, basePath?: string) => {
    // 1. If absolute URL, use it
    if (deal.image_url && deal.image_url.startsWith('http')) return deal.image_url;

    // 2. If we have a local screenshot file
    if (deal.screenshot && basePath) {
        // Extract just the folder name from the basePath (e.g. "screenshots_Mini_PC_...")
        // This handles both Windows (\\) and Unix (/) separators
        const folderName = basePath.split(/[/\\]/).pop();

        if (folderName) {
            return `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/data/${folderName}/${deal.screenshot}`;
        }
    }

    return null;
}

export function DealCard({ deal, basePath }: DealCardProps) {
    const [showModal, setShowModal] = useState(false);

    const imageUrl = getImageUrl(deal, basePath);
    const isSteal = deal.ai_analysis?.is_steal;

    // Safety check for verification object
    const score = deal.verification?.score || 0;

    // Determine card border color based on status
    let borderColor = "border-slate-200";
    if (isSteal) borderColor = "border-emerald-500 border-2";
    else if (score >= 7) borderColor = "border-blue-300";

    return (
        <>
            <Card className={`overflow-hidden hover:shadow-lg transition-all bg-white group h-full flex flex-col rounded-xl w-full ${borderColor}`}>
                {/* Compact Image Header */}
                <div className="h-40 w-full bg-slate-100 relative overflow-hidden group">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={deal.title}
                            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50 text-xs">
                            <Search className="w-6 h-6 mb-1 opacity-20" />
                            <span>No Image</span>
                        </div>
                    )}

                    {/* Floating Price Tag */}
                    <div className="absolute bottom-0 left-0 bg-slate-900/90 text-white px-3 py-1 text-sm font-bold rounded-tr-lg backdrop-blur-sm">
                        {deal.price}
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-2 right-2 flex gap-1">
                        {deal.verification?.verified ? (
                            <Badge className="bg-emerald-500 hover:bg-emerald-600 shadow-sm border-0 text-[10px] h-5 px-1.5">
                                VERIFIED
                            </Badge>
                        ) : isSteal ? (
                            <Badge className="bg-blue-500 hover:bg-blue-600 shadow-sm border-0 text-[10px] h-5 px-1.5">
                                POTENTIAL
                            </Badge>
                        ) : null}
                    </div>
                </div>

                {/* Dense Content Body */}
                <div className="p-3 flex flex-col flex-1 gap-2">
                    {/* Title & Location */}
                    <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-tight line-clamp-2 h-10" title={deal.title}>
                            {deal.title}
                        </h4>
                        <div className="flex items-center text-[10px] text-slate-500 mt-1">
                            <MapPin className="w-3 h-3 mr-1" />
                            <span className="truncate">{deal.location || "Unknown Location"}</span>
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                        <div className="bg-slate-50 p-1.5 rounded border text-[10px]">
                            <span className="text-slate-400 block uppercase tracking-wider text-[9px]">Est. New</span>
                            <span className="font-semibold text-slate-700">{deal.ai_analysis?.resale_price_estimate || "N/A"}</span>
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded border text-[10px]">
                            <span className="text-slate-400 block uppercase tracking-wider text-[9px]">Score</span>
                            <div className="flex items-center gap-1">
                                <span className={`font-bold ${score >= 7 ? "text-green-600" : "text-amber-600"}`}>
                                    {score}/10
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* AI Verdict (Condensed) */}
                    {(deal.ai_analysis?.reason || deal.reason) && (
                        <div className="mt-auto pt-2 border-t border-slate-100">
                            <p className="text-[10px] text-slate-600 line-clamp-2 leading-relaxed">
                                <span className="font-bold text-slate-700">AI:</span> {deal.ai_analysis?.reason || deal.reason}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <CardFooter className="p-2 bg-slate-50 border-t flex gap-2">
                    <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs" onClick={() => setShowModal(true)}>
                        Details
                    </Button>
                    <Button size="sm" className="flex-1 h-7 text-xs bg-slate-900 hover:bg-slate-800" asChild>
                        <a href={deal.url} target="_blank" rel="noopener noreferrer">
                            Listing <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                    </Button>
                </CardFooter>
            </Card>

            {/* Detailed Modal (Unchanged or slightly clean up) */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-4 border-b flex justify-between items-start bg-slate-50 sticky top-0">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 pr-4">{deal.title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200">
                                        {deal.price}
                                    </Badge>
                                    <span className="text-xs text-slate-500 flex items-center">
                                        <MapPin className="w-3 h-3 mr-1" /> {deal.location}
                                    </span>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} className="rounded-full hover:bg-slate-200 -mt-1 -mr-1">
                                <X className="w-5 h-5 text-slate-500" />
                            </Button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            {/* Image in Modal */}
                            {imageUrl && (
                                <div className="rounded-lg overflow-hidden border bg-slate-100">
                                    <img src={imageUrl} alt="Full view" className="w-full object-contain max-h-[300px]" />
                                </div>
                            )}

                            {/* Description */}
                            <div>
                                <h4 className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-2">Listing Description</h4>
                                <div className="bg-slate-50 p-4 rounded-lg border text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                    {deal.description || "No description available."}
                                </div>
                            </div>

                            {/* AI Detailed Analysis */}
                            {deal.ai_analysis && (
                                <div>
                                    <h4 className="font-bold text-sm uppercase tracking-wider text-blue-500 mb-2 flex items-center">
                                        <CheckCircle className="w-4 h-4 mr-1" /> AI Assessment
                                    </h4>
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
                                        <div className="flex gap-4 border-b border-blue-100 pb-3">
                                            <div>
                                                <span className="text-xs text-blue-400 uppercase font-bold">Resale Est.</span>
                                                <p className="font-mono font-bold text-blue-900">{deal.ai_analysis.resale_price_estimate}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs text-blue-400 uppercase font-bold">Steal?</span>
                                                <p className={`font-bold ${deal.ai_analysis.is_steal ? "text-emerald-600" : "text-slate-600"}`}>
                                                    {deal.ai_analysis.is_steal ? "YES" : "NO"}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-slate-800 text-sm">{deal.ai_analysis.reason}</p>
                                    </div>
                                </div>
                            )}

                            {/* Deep Dive Verification logic presentation could go here if available */}
                            {deal.verification && (
                                <div>
                                    <h4 className="font-bold text-sm uppercase tracking-wider text-purple-500 mb-2 flex items-center">
                                        <AlertTriangle className="w-4 h-4 mr-1" /> Auditor Notes
                                    </h4>
                                    <div className={`p-4 rounded-lg border text-sm ${deal.verification.verified ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
                                        <p className="font-bold mb-1">{deal.verification.verified ? "VERIFIED DEAL" : "REJECTED"}</p>
                                        <p>{deal.verification.notes}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t bg-slate-50 flex justify-end gap-2 sticky bottom-0">
                            <Button variant="outline" onClick={() => setShowModal(false)}>Close</Button>
                            <Button className="bg-blue-600 hover:bg-blue-700" asChild>
                                <a href={deal.url} target="_blank" rel="noopener noreferrer">
                                    Open on Facebook <ExternalLink className="w-4 h-4 ml-2" />
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
