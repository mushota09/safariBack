import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
    QrCode, 
    CheckCircle2, 
    XCircle, 
    AlertCircle, 
    User, 
    Ship, 
    Calendar,
    Users,
    ChevronRight,
    Search,
    RefreshCw,
    Camera
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface Passenger {
    id: string;
    name: string;
    type: string;
    cabin?: string;
    status: 'en_attente' | 'embarqué';
}

interface ScanResult {
    id: string;
    type: 'global' | 'individual';
    primaryPassenger: string;
    totalPassengers: number;
    passengers: Passenger[];
    voyage: string;
    vessel: string;
    vehicle?: string;
}

export default function AgentScanner() {
    const [scanning, setScanning] = useState(true);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [selectedPassengers, setSelectedPassengers] = useState<string[]>([]);
    const [history, setHistory] = useState<any[]>([]);

    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        if (scanning) {
            scannerRef.current = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                /* verbose= */ false
            );
            scannerRef.current.render(onScanSuccess, onScanFailure);
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
            }
        };
    }, [scanning]);

    function onScanSuccess(decodedText: string) {
        // Stop scanning and process
        setScanning(false);
        setProcessing(true);
        
        // Simulate API verification
        setTimeout(() => {
            // Mock result based on data
            const mockResult: ScanResult = {
                id: decodedText,
                type: decodedText.includes('GLB') ? 'global' : 'individual',
                primaryPassenger: "Jean Mukendi",
                totalPassengers: decodedText.includes('GLB') ? 4 : 1,
                voyage: "Bukavu - Kalemie",
                vessel: "M/V SAFARI",
                vehicle: decodedText.includes('VEH') ? "TOYOTA HILUX (ABC-123)" : undefined,
                passengers: decodedText.includes('GLB') ? [
                    { id: '1', name: "Jean Mukendi", type: "Adulte", cabin: "CAB-102", status: 'en_attente' },
                    { id: '2', name: "Marie Mukendi", type: "Adulte", cabin: "CAB-102", status: 'en_attente' },
                    { id: '3', name: "Éric Mukendi", type: "Enfant", cabin: "CAB-102", status: 'en_attente' },
                    { id: '4', name: "Sarah Mukendi", type: "Enfant", cabin: "CAB-102", status: 'en_attente' },
                ] : [
                    { id: '1', name: "Jean Mukendi", type: "Adulte", cabin: "CAB-102", status: 'en_attente' }
                ]
            };
            
            setResult(mockResult);
            // Default select all
            setSelectedPassengers(mockResult.passengers.map(p => p.id));
            setProcessing(false);
        }, 1500);
    }

    function onScanFailure(error: any) {
        // Quietly fail while scanning
    }

    const handleConfirmBoarding = () => {
        if (!result) return;
        setProcessing(true);
        
        // Simulate boarding action
        setTimeout(() => {
            const newHistoryItem = {
                id: result.id,
                passengers: selectedPassengers.length,
                time: new Date().toLocaleTimeString(),
                status: 'Success'
            };
            setHistory([newHistoryItem, ...history]);
            setProcessing(false);
            setResult(null);
            setScanning(true);
        }, 1000);
    };

    const togglePassenger = (id: string) => {
        setSelectedPassengers(prev => 
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        if (result) setSelectedPassengers(result.passengers.map(p => p.id));
    };

    return (
        <div className="space-y-10">
            <div className="text-center space-y-3">
                <h1 className="archivo-black text-3xl text-white uppercase italic tracking-tighter leading-none">Embarquement</h1>
                <p className="text-white/30 text-[10px] font-black uppercase tracking-widest italic">Scannez le ticket ou le QR code global</p>
            </div>

            <div className="relative">
                <AnimatePresence mode="wait">
                    {scanning ? (
                        <motion.div 
                            key="scanner"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="space-y-8"
                        >
                            <div className="aspect-square w-full bg-[#0A0C1A] rounded-[48px] border-2 border-white/5 overflow-hidden relative shadow-2xl">
                                <div id="reader" className="w-full h-full scale-[1.5]" />
                                <div className="absolute inset-0 border-[40px] border-[#0A0C1A]/60 pointer-events-none" />
                                <div className="absolute inset-x-12 top-1/2 h-0.5 bg-accent/40 shadow-[0_0_20px_#DEB507] animate-scan" />
                                
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-64 h-64 border-2 border-dashed border-accent/20 rounded-3xl" />
                                </div>
                            </div>

                            <div className="flex justify-center gap-4">
                                <button className="px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-3">
                                    <RefreshCw className="w-4 h-4" /> Changement Caméra
                                </button>
                                <button className="px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-3">
                                    <Search className="w-4 h-4" /> Saisie Manuelle
                                </button>
                            </div>
                        </motion.div>
                    ) : (processing && !result) ? (
                        <motion.div 
                            key="loading"
                            className="aspect-square w-full bg-white/5 rounded-[48px] flex flex-col items-center justify-center space-y-6"
                        >
                            <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                            <p className="archivo-black text-xs text-white uppercase tracking-widest animate-pulse">Vérification...</p>
                        </motion.div>
                    ) : result ? (
                        <motion.div 
                            key="result"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-8"
                        >
                            {/* Ticket Info Card */}
                            <div className="bg-white/5 border border-white/5 rounded-[48px] p-10 space-y-10 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -mr-16 -mt-16" />
                                
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="w-16 h-16 rounded-2xl bg-accent/20 border border-accent/20 flex items-center justify-center">
                                        <CheckCircle2 className="w-8 h-8 text-accent" />
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-black text-white/20 uppercase tracking-widest leading-none mb-1">Ticket ID</div>
                                        <div className="archivo-black text-xl text-white uppercase tracking-tighter italic">{result.id.substring(0, 12)}...</div>
                                    </div>
                                </div>

                                <div className="space-y-6 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <Ship className="w-5 h-5 text-accent" />
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest leading-none">Voyage & Bateau</p>
                                            <p className="text-sm font-bold text-white uppercase italic">{result.voyage} — {result.vessel}</p>
                                        </div>
                                    </div>
                                    {result.vehicle && (
                                        <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <Ship className="w-5 h-5 text-accent" />
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest leading-none">Véhicule Inclus</p>
                                                <p className="text-sm font-bold text-accent uppercase italic">{result.vehicle}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6 relative z-10">
                                    <div className="flex items-center justify-between">
                                        <h3 className="archivo-black text-base text-white uppercase tracking-tighter italic">Passagers</h3>
                                        <button 
                                            onClick={selectAll}
                                            className="text-[9px] font-black text-accent uppercase tracking-widest hover:underline"
                                        >
                                            Tout Sélectionner
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {result.passengers.map((passenger) => (
                                            <button 
                                                key={passenger.id}
                                                onClick={() => togglePassenger(passenger.id)}
                                                className={cn(
                                                    "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
                                                    selectedPassengers.includes(passenger.id) 
                                                        ? "bg-accent/10 border-accent/40 text-white" 
                                                        : "bg-white/5 border-white/5 text-white/30"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                                        selectedPassengers.includes(passenger.id) ? "bg-accent text-primary" : "bg-white/5"
                                                    )}>
                                                        <User className="w-4 h-4" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[11px] font-black uppercase tracking-widest">{passenger.name}</p>
                                                        <p className="text-[9px] font-bold opacity-60 italic">{passenger.type} • {passenger.cabin}</p>
                                                    </div>
                                                </div>
                                                <div className={cn(
                                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                                    selectedPassengers.includes(passenger.id) ? "border-accent bg-accent" : "border-white/10"
                                                )}>
                                                    {selectedPassengers.includes(passenger.id) && <CheckCircle2 className="w-3 h-3 text-primary" />}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-white/5 flex gap-4">
                                    <button 
                                        onClick={() => { setResult(null); setScanning(true); }}
                                        className="flex-1 py-5 rounded-3xl bg-white/5 border border-white/5 text-white/40 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                                    >
                                        Annuler
                                    </button>
                                    <button 
                                        onClick={handleConfirmBoarding}
                                        disabled={processing || selectedPassengers.length === 0}
                                        className="flex-[2] py-5 rounded-3xl bg-accent text-primary text-xs font-black uppercase tracking-widest hover:bg-white transition-all shadow-xl shadow-accent/10 disabled:opacity-50"
                                    >
                                        {processing ? 'Chargement...' : `Embarquer (${selectedPassengers.length})`}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            {/* Recent Scans */}
            <div className="space-y-6">
                <h3 className="archivo-black text-xs text-white/20 uppercase tracking-[0.3em] italic ml-4">Scans Récents</h3>
                <div className="bg-white/5 rounded-[40px] p-2 space-y-2">
                    {history.length > 0 ? history.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-6 bg-white/2 rounded-3xl border border-white/5 group">
                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-white uppercase tracking-widest">{item.id.substring(0, 8)}...</p>
                                    <p className="text-[9px] font-bold text-white/30 italic">{item.passengers} Passager(s) • {item.time}</p>
                                </div>
                            </div>
                            <button className="p-3 rounded-xl bg-white/5 text-white/20 opacity-0 group-hover:opacity-100 transition-all">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )) : (
                        <div className="p-12 text-center space-y-4">
                            <div className="w-16 h-16 rounded-3xl bg-white/2 border border-white/5 flex items-center justify-center mx-auto text-white/5">
                                <Calendar className="w-8 h-8" />
                            </div>
                            <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.2em]">Aucun scan aujourd'hui</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Styles for scanner */}
            <style dangerouslySetInnerHTML={{ __html: `
                #reader__scan_region {
                    background: transparent !important;
                }
                #reader__dashboard {
                    display: none !important;
                }
                video {
                    object-fit: cover !important;
                    border-radius: 48px !important;
                }
                @keyframes scan {
                    0%, 100% { transform: translateY(-120px) scaleX(0.8); opacity: 0; }
                    50% { transform: translateY(120px) scaleX(1); opacity: 1; }
                }
                .animate-scan {
                    animation: scan 3s ease-in-out infinite;
                }
            `}} />
        </div>
    );
}
