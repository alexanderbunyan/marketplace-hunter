import { useState } from "react";
import { ExternalLink, MapPin, Search, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Card, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"; // Need to make Dialog component next
import type { Deal } from "@/api";

interface DealCardProps {
    deal: Deal;
    basePath?: string;
}

// Helper to construct image URL
const getImageUrl = (deal: Deal, basePath?: string) => {
    if (deal.image_url && deal.image_url.startsWith('http')) return deal.image_url;
    if (deal.screenshot && basePath) {
        const folderName = basePath.split(/[/\\]/).pop();
        if (folderName) {
            return `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/data/${folderName}/${deal.screenshot}`;
        }
    }
    return null;
}

export function DealCard({ deal, basePath }: DealCardProps) {
    const [showModal, setShowModal] = useState(false);
    const [imgError, setImgError] = useState(false);

    const imageUrl = getImageUrl(deal, basePath);
    const isSteal = deal.ai_analysis?.is_steal;
    const isVerified = deal.verification?.verified;
    const score = deal.verification?.score || deal.deal_rating || 0;

    // Border Logic
    let borderColor = "border-border";
    if (isVerified) borderColor = "border-emerald-500 border-2";
    else if (isSteal) borderColor = "border-blue-500 border-2";
    else if (score >= 8) borderColor = "border-blue-300";

    return (
        <>
            <Card
                className={`overflow-hidden transition-all hover:shadow-lg group flex flex-col h-full bg-card ${borderColor}`}
            >
                {/* Image Section - Fixed Height */}
                <div className="relative h-48 w-full bg-muted overflow-hidden">
                    {imageUrl && !imgError ? (
                        <img
                            src={imageUrl}
                            alt={deal.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <Search className="h-8 w-8 opacity-20 mb-2" />
                            <span className="text-xs">No Preview</span>
                        </div>
                    )}

                    {/* Overlays */}
                    <div className="absolute top-2 right-2 flex gap-1">
                        {isVerified && <Badge className="bg-emerald-600">VERIFIED</Badge>}
                        {isSteal && !isVerified && <Badge className="bg-blue-600">POTENTIAL</Badge>}
                    </div>

                    <div className="absolute bottom-0 left-0 bg-background/90 px-3 py-1 rounded-tr-lg backdrop-blur-sm border-t border-r border-border">
                        <span className="font-bold font-mono">{deal.price}</span>
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-4 flex-1 flex flex-col gap-3">
                    {/* Header */}
                    <div>
                        <h3 className="font-semibold text-sm leading-tight line-clamp-2 h-10" title={deal.title}>
                            {deal.title}
                        </h3>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span className="truncate">{deal.location || "Unknown"}</span>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-auto">
                        <div className="bg-muted/50 p-2 rounded border text-xs">
                            <span className="text-muted-foreground uppercase text-[10px] font-bold block">Est. New</span>
                            <span className="font-mono font-medium">
                                {deal.ai_analysis?.resale_price_estimate || (deal.estimated_new_price ? `$${deal.estimated_new_price}` : "N/A")}
                            </span>
                        </div>
                        <div className="bg-muted/50 p-2 rounded border text-xs">
                            <span className="text-muted-foreground uppercase text-[10px] font-bold block">Score</span>
                            <div className="flex items-center gap-1">
                                <span className={`font-bold ${score >= 7 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                                    {score}/10
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* AI Insight Snippet */}
                    {(deal.ai_analysis?.reason || deal.flipper_comment) && (
                        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded italic line-clamp-4 border border-transparent hover:border-border transition-colors">
                            "{deal.ai_analysis?.reason || deal.flipper_comment}"
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <CardFooter className="p-2 border-t bg-muted/20 flex gap-2">
                    <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs" onClick={() => setShowModal(true)}>
                        Details
                    </Button>
                    <Button size="sm" className="flex-1 h-8 text-xs" asChild>
                        <a href={deal.url} target="_blank" rel="noopener noreferrer">
                            Listing <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                    </Button>
                </CardFooter>
            </Card>

            {/* Modal - Basic Implementation for now */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-background border rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 border-b flex justify-between items-center bg-muted/20">
                            <h2 className="font-bold text-lg truncate pr-4">{deal.title}</h2>
                            <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}>✕</Button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            {imageUrl && (
                                <img src={imageUrl} className="w-full rounded-lg border bg-muted" alt="Full view" />
                            )}

                            <div className="space-y-2">
                                <h3 className="font-bold text-sm uppercase text-muted-foreground">Description</h3>
                                <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-md border">
                                    {deal.description || "No description."}
                                </p>
                            </div>

                            {(deal.ai_analysis || deal.flipper_comment) && (
                                <div className="space-y-2">
                                    <h3 className="font-bold text-sm uppercase text-emerald-600 dark:text-emerald-400 flex items-center">
                                        <CheckCircle className="h-4 w-4 mr-2" /> AI Analysis
                                    </h3>
                                    <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-lg border border-emerald-100 dark:border-emerald-900 text-sm">
                                        <p>{deal.ai_analysis?.reason || deal.flipper_comment}</p>
                                    </div>
                                </div>
                            )}

                            {deal.verification && (
                                <div className="space-y-2">
                                    <h3 className="font-bold text-sm uppercase text-purple-600 dark:text-purple-400 flex items-center">
                                        <AlertTriangle className="h-4 w-4 mr-2" /> Auditor Notes
                                    </h3>
                                    <div className={`p-4 rounded-lg border text-sm ${deal.verification.verified ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20" : "bg-red-50 border-red-200 dark:bg-red-900/20"}`}>
                                        <p className="font-bold">{deal.verification.verified ? "VERIFIED VALID" : "REJECTED"}</p>
                                        <p>{deal.verification.notes}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t bg-muted/20 flex justify-end">
                            <Button onClick={() => setShowModal(false)} variant="outline" className="mr-2">Close</Button>
                            <Button asChild>
                                <a href={deal.url} target="_blank" rel="noopener noreferrer">Open Link</a>
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
