import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
    XCircle, ArrowLeft, ShieldAlert, CheckCircle2, 
    User, Users, Ship, AlertCircle, ChevronRight
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { reservationService, SavedReservation } from '../services/reservationService';

export default function CancelReservationPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [reservation, setReservation] = useState<SavedReservation | null>(null);
    const [selectedPassengers, setSelectedPassengers] = useState<string[]>([]);
    const [step, setStep] = useState<'selection' | 'reason' | 'confirmation' | 'success'>('selection');
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (id) {
            const res = reservationService.getReservationById(id);
            if (res) {
                setReservation(res);
                // By default, select all passengers
                setSelectedPassengers(res.passengers.map(p => p.email || p.name));
            }
        }
    }, [id]);

    if (!reservation) return null;

    const isFullCancellation = selectedPassengers.length === reservation.passengers.length;

    const handleTogglePassenger = (id: string) => {
        setSelectedPassengers(prev => 
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleConfirmCancellation = () => {
        if (id) {
            // For now, we cancel the entire reservation in the service
            reservationService.cancelReservation(id);
            setStep('success');
        }
    };

    const reasons = [
        "Changement de programme",
        "Problème de santé",
        "Conditions météorologiques",
        "Erreur lors de la réservation",
        "Autre"
    ];

    return (
        <div className="pt-32 pb-32 px-6 bg-[#08090F] min-h-screen text-white font-sans">
            <div className="max-w-3xl mx-auto space-y-12">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => navigate(-1)}
                        className="p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all flex items-center gap-3 text-xs font-black uppercase tracking-widest text-white/60"
                    >
                        <ArrowLeft className="w-4 h-4" /> Retour
                    </button>
                    <div className="text-right">
                        <span className="text-[10px] font-black text-accent uppercase tracking-[0.3em] block mb-1 italic">RÉFÉRENCE</span>
                        <span className="archivo-black text-xl text-white italic tracking-tighter">{reservation.id}</span>
                    </div>
                </div>

                {step !== 'success' && (
                    <div className="space-y-8">
                        {/* Stepper */}
                        <div className="flex items-center gap-4">
                            {[
                                { id: 'selection', label: 'Sélection' },
                                { id: 'reason', label: 'Motif' },
                                { id: 'confirmation', label: 'Validation' }
                            ].map((s, idx) => (
                                <React.Fragment key={s.id}>
                                    <div className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-full border transition-all",
                                        step === s.id 
                                            ? "bg-accent border-accent text-primary" 
                                            : "bg-white/5 border-white/10 text-white/40"
                                    )}>
                                        <span className="archivo-black text-[10px]">{idx + 1}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">{s.label}</span>
                                    </div>
                                    {idx < 2 && <div className="h-px w-8 bg-white/10" />}
                                </React.Fragment>
                            ))}
                        </div>

                        {step === 'selection' && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-8"
                            >
                                <div className="space-y-4">
                                    <h1 className="archivo-black text-4xl text-white uppercase italic tracking-tighter leading-none">
                                        Qui souhaite annuler ?
                                    </h1>
                                    <p className="text-white/40 text-sm leading-relaxed max-w-xl">
                                        Sélectionnez les passagers pour lesquels vous souhaitez annuler le voyage. 
                                        {reservation.forWhom === 'moi' ? " Ce ticket est personnel." : 
                                         reservation.forWhom === 'moi_autres' ? " Vous pouvez annuler pour vous ou vos accompagnants." :
                                         " Vous annulez une réservation faite pour des tiers."}
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    {reservation.passengers.map((p, idx) => {
                                        const pId = p.email || p.name;
                                        const isSelected = selectedPassengers.includes(pId);
                                        const isMe = idx === 0 && (reservation.forWhom === 'moi' || reservation.forWhom === 'moi_autres');

                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleTogglePassenger(pId)}
                                                className={cn(
                                                    "w-full flex items-center justify-between p-8 rounded-[40px] border transition-all group",
                                                    isSelected 
                                                        ? "bg-red-500/10 border-red-500/30 ring-1 ring-red-500/20" 
                                                        : "bg-white/5 border-white/5 hover:bg-white/[0.07]"
                                                )}
                                            >
                                                <div className="flex items-center gap-6 text-left">
                                                    <div className={cn(
                                                        "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
                                                        isSelected ? "bg-red-500/20 text-red-500" : "bg-white/5 text-white/20"
                                                    )}>
                                                        {isMe ? <User className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="archivo-black text-xl text-white uppercase tracking-tighter leading-none italic">
                                                                {p.name}
                                                            </span>
                                                            {isMe && (
                                                                <span className="px-2 py-0.5 rounded-lg bg-accent text-primary text-[8px] font-black uppercase tracking-widest italic">MOI</span>
                                                            )}
                                                        </div>
                                                        <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em] mt-2 italic">
                                                            {isSelected ? "Sélectionné pour annulation" : "Maintenir le ticket"}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={cn(
                                                    "w-8 h-8 rounded-xl border flex items-center justify-center transition-all",
                                                    isSelected 
                                                        ? "bg-red-500 border-red-500 text-white" 
                                                        : "border-white/10 bg-white/5 group-hover:border-white/20"
                                                )}>
                                                    {isSelected && <XCircle className="w-5 h-5" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <button 
                                    disabled={selectedPassengers.length === 0}
                                    onClick={() => setStep('reason')}
                                    className="w-full bg-white text-primary py-8 rounded-[32px] archivo-black text-xl shadow-2xl hover:bg-white/90 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest italic disabled:opacity-20 disabled:pointer-events-none flex items-center justify-center gap-4"
                                >
                                    Continuer vers le motif <ChevronRight className="w-6 h-6" />
                                </button>
                            </motion.div>
                        )}

                        {step === 'reason' && (
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-8"
                            >
                                <div className="space-y-4">
                                    <h1 className="archivo-black text-4xl text-white uppercase italic tracking-tighter leading-none">
                                        Pourquoi annulez-vous ?
                                    </h1>
                                    <p className="text-white/40 text-sm leading-relaxed">
                                        Ces informations nous aident à améliorer nos services et à traiter votre remboursement plus rapidement.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {reasons.map((r) => (
                                        <button
                                            key={r}
                                            onClick={() => setReason(r)}
                                            className={cn(
                                                "w-full p-6 p-8 rounded-[32px] border text-left transition-all flex items-center justify-between group",
                                                reason === r 
                                                    ? "bg-accent/10 border-accent/40 ring-1 ring-accent/20" 
                                                    : "bg-white/5 border-white/5 hover:bg-white/[0.07]"
                                            )}
                                        >
                                            <span className={cn(
                                                "archivo-black text-lg uppercase tracking-tight italic",
                                                reason === r ? "text-accent" : "text-white/60"
                                            )}>{r}</span>
                                            <div className={cn(
                                                "w-6 h-6 rounded-full border flex items-center justify-center transition-all",
                                                reason === r ? "bg-accent border-accent text-primary" : "border-white/10"
                                            )}>
                                                {reason === r && <CheckCircle2 className="w-4 h-4" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setStep('selection')}
                                        className="flex-1 bg-white/5 border border-white/10 text-white py-8 rounded-[32px] archivo-black text-xl hover:bg-white/10 transition-all uppercase tracking-widest italic"
                                    >
                                        Précédent
                                    </button>
                                    <button 
                                        disabled={!reason}
                                        onClick={() => setStep('confirmation')}
                                        className="flex-1 bg-white text-primary py-8 rounded-[32px] archivo-black text-xl hover:bg-white/90 transition-all uppercase tracking-widest italic disabled:opacity-20"
                                    >
                                        Valider
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'confirmation' && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-12"
                            >
                                <div className="p-12 rounded-[56px] bg-red-500/5 border border-red-500/20 space-y-12 text-center relative overflow-hidden">
                                    <div className="absolute top-0 inset-x-0 h-1 bg-red-500/20" />
                                    
                                    <div className="w-24 h-24 rounded-[32px] bg-red-500/20 border border-red-500/20 flex items-center justify-center mx-auto mb-8">
                                        <ShieldAlert className="w-12 h-12 text-red-500" />
                                    </div>

                                    <div className="space-y-6">
                                        <h1 className="archivo-black text-4xl text-white uppercase italic tracking-tighter leading-none">
                                            Confirmation d'annulation
                                        </h1>
                                        <div className="max-w-md mx-auto space-y-4">
                                            <p className="text-white/60 text-sm leading-relaxed italic">
                                                Vous êtes sur le point d'annuler {isFullCancellation ? "l'intégralité de " : ""}la réservation pour :
                                            </p>
                                            <div className="flex flex-wrap justify-center gap-2">
                                                {reservation.passengers.filter(p => selectedPassengers.includes(p.email || p.name)).map((p, i) => (
                                                    <span key={i} className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase text-accent border border-accent/20">
                                                        {p.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-8 text-left">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <h2 className="archivo-black text-xl text-white uppercase italic tracking-tighter">
                                                Politique d'annulation
                                            </h2>
                                            <div className="w-fit px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest text-white/40">
                                                Frais selon le délai
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {[
                                                { label: "Plus de 7 jours avant le départ", value: "Aucun frais", color: "text-[#00FF85]", border: "border-[#00FF85]/20", bg: "bg-[#00FF85]/5" },
                                                { label: "Entre 3 et 7 jours avant", value: "25 % de frais", color: "text-[#FFD600]", border: "border-[#FFD600]/20", bg: "bg-[#FFD600]/5" },
                                                { label: "Entre 1 et 3 jours avant", value: "50 % de frais", color: "text-[#FF8A00]", border: "border-[#FF8A00]/20", bg: "bg-[#FF8A00]/5" },
                                                { label: "Moins de 24 h avant le départ", value: "80 % de frais", color: "text-[#FF4B4B]", border: "border-[#FF4B4B]/20", bg: "bg-[#FF4B4B]/5" },
                                                { label: "Après le départ", value: "Non remboursable", color: "text-red-900", border: "border-red-900/20", bg: "bg-red-950/5" },
                                            ].map((item, idx) => (
                                                <div key={idx} className={cn("flex items-center justify-between p-6 rounded-[24px] border transition-all", item.border, item.bg)}>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/80 italic">{item.label}</span>
                                                    <span className={cn("archivo-black text-sm uppercase italic tracking-wider", item.color)}>{item.value}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="p-6 rounded-[24px] bg-white/5 border border-white/5">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-white/20 leading-relaxed italic">
                                                Note : Remboursement à 80% si annulation 24h avant le départ. Les frais de service et taxes portuaires sont non-remboursables après confirmation du billet.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <button 
                                            onClick={handleConfirmCancellation}
                                            className="w-full bg-red-500 text-white py-8 rounded-[32px] archivo-black text-xl shadow-2xl shadow-red-500/20 hover:bg-red-600 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest italic"
                                        >
                                            Confirmer l'annulation
                                        </button>
                                        <button 
                                            onClick={() => setStep('reason')}
                                            className="w-full py-4 text-white/40 text-xs font-black uppercase tracking-[0.3em] hover:text-white transition-colors italic"
                                        >
                                            Annuler et revenir en arrière
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                )}

                {step === 'success' && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center space-y-12 py-12"
                    >
                        <div className="w-32 h-32 rounded-[48px] bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-8 relative">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', damping: 10, stiffness: 100, delay: 0.2 }}
                            >
                                <XCircle className="w-16 h-16 text-red-500" />
                            </motion.div>
                            <div className="absolute inset-0 rounded-[48px] bg-red-500/20 animate-ping opacity-20" />
                        </div>

                        <div className="space-y-6">
                            <h1 className="archivo-black text-5xl text-white uppercase italic tracking-tighter leading-none">
                                Annulation Terminée
                            </h1>
                            <p className="text-white/40 text-base leading-relaxed max-w-lg mx-auto italic">
                                Votre demande a été traitée avec succès. Un e-mail de confirmation détaillant le remboursement a été envoyé à l'adresse associée à votre compte.
                            </p>
                        </div>

                        <div className="max-w-md mx-auto p-10 rounded-[48px] bg-white/5 border border-white/5 space-y-8">
                            <div className="flex items-center justify-between text-left">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block italic">Remboursement</span>
                                    <span className="archivo-black text-3xl text-accent italic tracking-tighter leading-none">
                                        {formatCurrency(reservation.totalAmount * 0.8)}
                                    </span>
                                </div>
                                <div className="text-right space-y-1">
                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block italic">Délai</span>
                                    <span className="text-sm font-bold text-white italic">3-5 jours ouvrés</span>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => navigate('/my-reservations')}
                                className="w-full bg-white text-primary py-6 rounded-3xl archivo-black text-sm uppercase tracking-widest italic hover:bg-accent transition-all shadow-xl"
                            >
                                Mes réservations
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
