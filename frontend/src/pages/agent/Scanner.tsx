/**
 * Scanner d'embarquement (Agent).
 *
 * Comportement :
 *  - L'agent scanne un QR code via la caméra OU saisit le code à la main.
 *  - Le code est résolu via `POST /embarquement/verify`.
 *      * QR individuel (passager / véhicule) → embarquement direct au clic.
 *      * QR global → la liste complète des passagers (et véhicules) de la
 *        réservation est affichée. L'agent peut cocher 1, plusieurs ou tous
 *        les passagers, puis valider via `POST /embarquement/scan/selective`
 *        (ou `POST /embarquement/scan` si tout est coché).
 *  - Les passagers déjà embarqués apparaissent grisés et non sélectionnables.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
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
    ChevronRight,
    Search,
    RefreshCw,
    Camera,
    Loader2,
    Car,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { embarquementService, ScanResolved, BoardingResult } from '../../services/embarquementService';
import { ApiError } from '../../services/api';

interface HistoryItem {
    id: string;
    label: string;
    kind: string;
    time: string;
    count: number;
    status: 'success' | 'partial' | 'already_boarded';
}

export default function AgentScanner() {
    const [scanning, setScanning] = useState(true);
    const [manualOpen, setManualOpen] = useState(false);
    const [manualCode, setManualCode] = useState('');

    const [verifying, setVerifying] = useState(false);
    const [boarding, setBoarding] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [result, setResult] = useState<ScanResolved | null>(null);
    const [rawCode, setRawCode] = useState<string | null>(null);

    const [selectedPassagers, setSelectedPassagers] = useState<number[]>([]);
    const [selectedVehicules, setSelectedVehicules] = useState<number[]>([]);

    const [history, setHistory] = useState<HistoryItem[]>([]);

    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    // --- Scanner caméra ---

    useEffect(() => {
        if (!scanning) return;
        // (Re)initialisation
        try {
            scannerRef.current = new Html5QrcodeScanner(
                'reader',
                { fps: 10, qrbox: { width: 250, height: 250 } },
                false,
            );
            scannerRef.current.render(onScanSuccess, onScanFailure);
        } catch (e) {
            console.error('Scanner init failed', e);
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(() => {});
                scannerRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scanning]);

    function onScanSuccess(decodedText: string) {
        // Stop scanner et résoudre
        setScanning(false);
        verifyCode(decodedText);
    }
    function onScanFailure(_: any) {
        /* failures silencieux pendant la recherche */
    }

    // --- API ---

    const verifyCode = useCallback(async (code: string) => {
        setError(null);
        setVerifying(true);
        setRawCode(code);
        try {
            const data = await embarquementService.verify(code);
            setResult(data);
            // Préselection : tous les passagers/véhicules non encore embarqués
            if (data.kind === 'global') {
                setSelectedPassagers((data.passagers || []).filter(p => !p.embarque).map(p => p.id));
                setSelectedVehicules((data.vehicules || []).filter(v => !v.embarque && !v.annule).map(v => v.id));
            } else {
                setSelectedPassagers([]);
                setSelectedVehicules([]);
            }
        } catch (err: any) {
            const msg = err instanceof ApiError
                ? (typeof err.detail === 'string' ? err.detail : err.detail?.detail || err.message)
                : err?.message;
            setError(msg || 'Code invalide ou ticket introuvable.');
        } finally {
            setVerifying(false);
        }
    }, []);

    const resetScanner = () => {
        setResult(null);
        setRawCode(null);
        setError(null);
        setSelectedPassagers([]);
        setSelectedVehicules([]);
        setScanning(true);
    };

    const pushHistory = (label: string, kind: string, count: number, status: HistoryItem['status']) => {
        setHistory(prev => [{
            id: `${Date.now()}`,
            label,
            kind,
            count,
            status,
            time: new Date().toLocaleTimeString(),
        }, ...prev.slice(0, 19)]);
    };

    const handleConfirmBoarding = async () => {
        if (!result || !rawCode) return;
        setBoarding(true);
        setError(null);
        try {
            let res: BoardingResult;
            if (result.kind === 'global') {
                const allPax = result.passagers?.filter(p => !p.embarque).map(p => p.id) || [];
                const allVeh = result.vehicules?.filter(v => !v.embarque && !v.annule).map(v => v.id) || [];
                const tousCoches =
                    selectedPassagers.length === allPax.length &&
                    selectedVehicules.length === allVeh.length;

                if (tousCoches && allPax.length + allVeh.length > 0) {
                    // Tout cocher = scan global complet
                    res = await embarquementService.scan(rawCode);
                } else if (selectedPassagers.length + selectedVehicules.length > 0) {
                    res = await embarquementService.scanSelective(rawCode, selectedPassagers, selectedVehicules);
                } else {
                    setError('Veuillez cocher au moins un passager ou véhicule.');
                    setBoarding(false);
                    return;
                }
            } else {
                // QR individuel
                res = await embarquementService.scan(rawCode);
            }

            const label = result.reference_reservation || result.numero_ticket || '—';
            const count = (res.passagers_embarques?.length || 0) + ((res as any).vehicules_embarques?.length || 0)
                || (result.kind !== 'global' ? 1 : 0);
            const status: HistoryItem['status'] = res.status === 'already_boarded' ? 'already_boarded' : res.status as any;
            pushHistory(label, result.kind, count, status);

            // Petit délai pour montrer le succès
            setTimeout(() => resetScanner(), 800);
        } catch (err: any) {
            const msg = err instanceof ApiError
                ? (typeof err.detail === 'string' ? err.detail : err.detail?.detail || err.message)
                : err?.message;
            setError(msg || "Erreur lors de l'embarquement.");
        } finally {
            setBoarding(false);
        }
    };

    const togglePassager = (id: number) => {
        setSelectedPassagers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };
    const toggleVehicule = (id: number) => {
        setSelectedVehicules(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const selectAll = () => {
        if (!result) return;
        setSelectedPassagers((result.passagers || []).filter(p => !p.embarque).map(p => p.id));
        setSelectedVehicules((result.vehicules || []).filter(v => !v.embarque && !v.annule).map(v => v.id));
    };

    return (
        <div className="space-y-10">
            <div className="text-center space-y-3">
                <h1 className="archivo-black text-3xl text-white uppercase italic tracking-tighter leading-none">Embarquement</h1>
                <p className="text-white/30 text-[10px] font-black uppercase tracking-widest italic">Scannez le ticket ou le QR code global</p>
            </div>

            <div className="relative">
                <AnimatePresence mode="wait">
                    {scanning && !result && !verifying && (
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

                            {error && (
                                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-[11px] font-bold flex items-center gap-3">
                                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                                </div>
                            )}

                            <div className="flex justify-center gap-4">
                                <button onClick={() => setManualOpen(true)} className="px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-3">
                                    <Search className="w-4 h-4" /> Saisie Manuelle
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {verifying && (
                        <motion.div key="loading" className="aspect-square w-full bg-white/5 rounded-[48px] flex flex-col items-center justify-center space-y-6">
                            <Loader2 className="w-12 h-12 text-accent animate-spin" />
                            <p className="archivo-black text-xs text-white uppercase tracking-widest">Vérification…</p>
                        </motion.div>
                    )}

                    {result && !verifying && (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-8"
                        >
                            <div className="bg-white/5 border border-white/5 rounded-[48px] p-10 space-y-10 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -mr-16 -mt-16" />

                                <div className="flex items-center justify-between relative z-10">
                                    <div className="w-16 h-16 rounded-2xl bg-accent/20 border border-accent/20 flex items-center justify-center">
                                        {result.embarque ? <CheckCircle2 className="w-8 h-8 text-green-400" /> : <QrCode className="w-8 h-8 text-accent" />}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-black text-white/20 uppercase tracking-widest leading-none mb-1">{result.kind === 'global' ? 'Ticket Global' : result.kind === 'passager' ? 'Passager' : 'Véhicule'}</div>
                                        <div className="archivo-black text-xl text-white uppercase tracking-tighter italic">{result.reference_reservation || result.numero_ticket}</div>
                                    </div>
                                </div>

                                <div className="space-y-4 relative z-10">
                                    {result.voyage?.libelle && (
                                        <div className="flex items-center gap-4">
                                            <Ship className="w-5 h-5 text-accent" />
                                            <div>
                                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest leading-none">Voyage & Bateau</p>
                                                <p className="text-sm font-bold text-white uppercase italic">{result.voyage.libelle}{result.bateau?.nom ? ` — ${result.bateau.nom}` : ''}</p>
                                            </div>
                                        </div>
                                    )}
                                    {result.kind === 'passager' && (
                                        <div className="flex items-center gap-4 p-4 bg-accent/5 rounded-2xl border border-accent/20">
                                            <User className="w-5 h-5 text-accent" />
                                            <div>
                                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest leading-none">Passager</p>
                                                <p className="text-sm font-bold text-accent uppercase italic">{result.nom_complet}</p>
                                            </div>
                                        </div>
                                    )}
                                    {result.kind === 'vehicule' && (
                                        <div className="flex items-center gap-4 p-4 bg-accent/5 rounded-2xl border border-accent/20">
                                            <Car className="w-5 h-5 text-accent" />
                                            <div>
                                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest leading-none">Véhicule</p>
                                                <p className="text-sm font-bold text-accent uppercase italic">{result.immatriculation}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Liste des passagers pour QR global */}
                                {result.kind === 'global' && (
                                    <div className="space-y-6 relative z-10">
                                        <div className="flex items-center justify-between">
                                            <h3 className="archivo-black text-base text-white uppercase tracking-tighter italic">Passagers ({result.passagers?.length || 0})</h3>
                                            <button onClick={selectAll} className="text-[9px] font-black text-accent uppercase tracking-widest hover:underline">Tout cocher</button>
                                        </div>

                                        <div className="space-y-3">
                                            {(result.passagers || []).map(p => {
                                                const dejaEmbarque = p.embarque || p.statut === 'annule';
                                                const isSelected = selectedPassagers.includes(p.id);
                                                return (
                                                    <button
                                                        key={p.id}
                                                        disabled={dejaEmbarque}
                                                        onClick={() => togglePassager(p.id)}
                                                        className={cn(
                                                            "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
                                                            dejaEmbarque
                                                                ? "bg-white/2 border-white/5 text-white/20 cursor-not-allowed"
                                                                : isSelected
                                                                    ? "bg-accent/10 border-accent/40 text-white"
                                                                    : "bg-white/5 border-white/5 text-white/30",
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={cn(
                                                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                                                isSelected && !dejaEmbarque ? "bg-accent text-primary" : "bg-white/5",
                                                            )}>
                                                                <User className="w-4 h-4" />
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-[11px] font-black uppercase tracking-widest">{p.nom_complet}{p.is_principal ? ' (Principal)' : ''}</p>
                                                                <p className="text-[9px] font-bold opacity-60 italic">
                                                                    {p.email || '—'}
                                                                    {dejaEmbarque ? (p.statut === 'annule' ? ' • Annulé' : ' • Déjà embarqué') : ''}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className={cn(
                                                            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                                            dejaEmbarque
                                                                ? "border-white/10 bg-white/5"
                                                                : isSelected
                                                                    ? "border-accent bg-accent"
                                                                    : "border-white/10",
                                                        )}>
                                                            {isSelected && !dejaEmbarque && <CheckCircle2 className="w-3 h-3 text-primary" />}
                                                            {dejaEmbarque && <XCircle className="w-3 h-3 text-white/20" />}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {(result.vehicules || []).length > 0 && (
                                            <div className="space-y-3 pt-4 border-t border-white/5">
                                                <h4 className="text-[10px] font-black text-white/30 uppercase tracking-widest">Véhicules</h4>
                                                {(result.vehicules || []).map(v => {
                                                    const dejaEmb = v.embarque || v.annule;
                                                    const isSel = selectedVehicules.includes(v.id);
                                                    return (
                                                        <button
                                                            key={v.id}
                                                            disabled={dejaEmb}
                                                            onClick={() => toggleVehicule(v.id)}
                                                            className={cn(
                                                                "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
                                                                dejaEmb
                                                                    ? "bg-white/2 border-white/5 text-white/20 cursor-not-allowed"
                                                                    : isSel ? "bg-accent/10 border-accent/40 text-white" : "bg-white/5 border-white/5 text-white/30",
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isSel && !dejaEmb ? "bg-accent text-primary" : "bg-white/5")}>
                                                                    <Car className="w-4 h-4" />
                                                                </div>
                                                                <div className="text-left">
                                                                    <p className="text-[11px] font-black uppercase tracking-widest">{v.immatriculation}</p>
                                                                    <p className="text-[9px] font-bold opacity-60 italic">
                                                                        {v.marque || ''} {v.modele || ''}
                                                                        {dejaEmb ? (v.annule ? ' • Annulé' : ' • Déjà embarqué') : ''}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className={cn(
                                                                "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                                                dejaEmb ? "border-white/10 bg-white/5" : isSel ? "border-accent bg-accent" : "border-white/10",
                                                            )}>
                                                                {isSel && !dejaEmb && <CheckCircle2 className="w-3 h-3 text-primary" />}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {error && (
                                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-[11px] font-bold flex items-center gap-3">
                                        <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                                    </div>
                                )}

                                <div className="pt-6 border-t border-white/5 flex gap-4">
                                    <button onClick={resetScanner} className="flex-1 py-5 rounded-3xl bg-white/5 border border-white/5 text-white/40 text-xs font-black uppercase tracking-widest hover:bg-white/10">
                                        Annuler
                                    </button>
                                    <button
                                        onClick={handleConfirmBoarding}
                                        disabled={boarding || (result.kind === 'global' && selectedPassagers.length === 0 && selectedVehicules.length === 0) || (result.kind !== 'global' && (result.embarque || false))}
                                        className="flex-[2] py-5 rounded-3xl bg-accent text-primary text-xs font-black uppercase tracking-widest hover:bg-white transition-all shadow-xl shadow-accent/10 disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {boarding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                        {result.kind === 'global'
                                            ? `Embarquer (${selectedPassagers.length + selectedVehicules.length})`
                                            : (result.embarque ? 'Déjà embarqué' : 'Embarquer')}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Saisie manuelle */}
            <AnimatePresence>
                {manualOpen && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setManualOpen(false)} />
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="relative bg-[#0A0C1A] border border-white/5 rounded-[32px] p-8 w-full max-w-md space-y-6">
                            <h3 className="archivo-black text-xl text-white uppercase italic tracking-tighter">Saisie manuelle</h3>
                            <input
                                type="text"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                placeholder="Numéro de ticket ou QR signé"
                                className="w-full h-12 bg-white/5 border border-white/5 rounded-xl px-4 text-sm text-white outline-none focus:border-accent/40"
                                autoFocus
                            />
                            <div className="flex gap-3">
                                <button onClick={() => setManualOpen(false)} className="flex-1 h-12 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40">Annuler</button>
                                <button
                                    onClick={() => { if (manualCode.trim()) { setManualOpen(false); setScanning(false); verifyCode(manualCode.trim()); setManualCode(''); } }}
                                    className="flex-1 h-12 rounded-xl bg-accent text-primary text-[10px] font-black uppercase tracking-widest"
                                >
                                    Vérifier
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Historique */}
            <div className="space-y-6">
                <h3 className="archivo-black text-xs text-white/20 uppercase tracking-[0.3em] italic ml-4">Scans Récents</h3>
                <div className="bg-white/5 rounded-[40px] p-2 space-y-2">
                    {history.length > 0 ? history.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-6 bg-white/2 rounded-3xl border border-white/5 group">
                            <div className="flex items-center gap-6">
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center border",
                                    item.status === 'success' ? "bg-green-500/10 border-green-500/20 text-green-500" :
                                    item.status === 'partial' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                                    "bg-white/5 border-white/10 text-white/40",
                                )}>
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-white uppercase tracking-widest">{item.label}</p>
                                    <p className="text-[9px] font-bold text-white/30 italic">{item.kind} • {item.count} embarqué(s) • {item.time}</p>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/20 opacity-0 group-hover:opacity-100" />
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

            <style dangerouslySetInnerHTML={{ __html: `
                #reader__scan_region { background: transparent !important; }
                #reader__dashboard { display: none !important; }
                video { object-fit: cover !important; border-radius: 48px !important; }
                @keyframes scan {
                    0%, 100% { transform: translateY(-120px) scaleX(0.8); opacity: 0; }
                    50% { transform: translateY(120px) scaleX(1); opacity: 1; }
                }
                .animate-scan { animation: scan 3s ease-in-out infinite; }
            `}} />
        </div>
    );
}
