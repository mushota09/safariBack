import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, Calendar, Clock, Ticket, ChevronRight, Inbox, Filter, Ship } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { reservationService, SavedReservation } from '../services/reservationService';

type Tab = 'future' | 'past' | 'cancelled';

export default function MyReservationsPage() {
    const [activeTab, setActiveTab] = useState<Tab>('future');
    const [reservations, setReservations] = useState<SavedReservation[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        setReservations(reservationService.getReservations());
    }, []);

    const filtered = reservations.filter(r => {
        if (activeTab === 'cancelled') return r.status === 'ANNULÉ';
        if (activeTab === 'future') return r.status !== 'ANNULÉ'; // Simplification for demo
        return false;
    });

    return (
        <div className="pt-32 pb-32 px-6">
            <div className="max-w-5xl mx-auto space-y-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="space-y-2">
                        <h1 className="archivo-black text-4xl text-white uppercase tracking-tighter">Mes Réservations</h1>
                        <p className="text-white/30 font-bold">Gérez vos billets et vos prochains voyages.</p>
                    </div>
                    
                    <div className="flex bg-white/5 p-1.5 rounded-3xl border border-white/10 shadow-sm backdrop-blur-xl items-center">
                        <button 
                            onClick={() => setActiveTab('future')}
                            className={cn(
                                "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                                activeTab === 'future' ? "bg-accent text-primary shadow-lg shadow-accent/20" : "text-white/30 hover:text-white"
                            )}
                        >
                            À venir
                        </button>
                        <button 
                            onClick={() => setActiveTab('past')}
                            className={cn(
                                "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                                activeTab === 'past' ? "bg-accent text-primary shadow-lg shadow-accent/20" : "text-white/30 hover:text-white"
                            )}
                        >
                            Passées
                        </button>
                        <button 
                            onClick={() => setActiveTab('cancelled')}
                            className={cn(
                                "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                                activeTab === 'cancelled' ? "bg-accent text-primary shadow-lg shadow-accent/20" : "text-white/30 hover:text-white"
                            )}
                        >
                            Annulées
                        </button>
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="text-center py-32 bg-white/5 rounded-[40px] border-2 border-dashed border-white/5">
                        <Inbox className="w-16 h-16 text-white/5 mx-auto mb-6" />
                        <h3 className="archivo-black text-xl text-white/20 uppercase">Aucune réservation</h3>
                        <p className="text-white/10 font-bold">Vos réservations {activeTab === 'future' ? 'futures' : activeTab === 'past' ? 'passées' : 'annulées'} s'afficheront ici.</p>
                        <button 
                            onClick={() => navigate('/')}
                            className="mt-8 bg-accent text-primary px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-white transition-all text-[10px]"
                        >
                            Réserver un voyage
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {filtered.map(res => (
                            <motion.div 
                                key={res.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={() => navigate(`/reservation-details/${res.id}`)}
                                className="group bg-[#0B0D17] rounded-[48px] p-8 md:p-12 border border-white/5 shadow-2xl transition-all duration-500 flex flex-col md:flex-row md:items-center justify-between gap-12 backdrop-blur-3xl relative overflow-hidden cursor-pointer hover:border-white/10 hover:bg-[#0E111F]"
                            >
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
                                
                                <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 relative z-10">
                                    {/* Left: Brand & Ref */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3 text-white/40 font-black text-[10px] uppercase tracking-widest">
                                            <div className="p-2 bg-accent/10 rounded-lg">
                                                <Ticket className="w-3 h-3 text-accent" />
                                            </div>
                                            Réf: {res.id}
                                        </div>
                                        <div className="space-y-3">
                                            <h3 className="archivo-black text-3xl md:text-4xl text-white uppercase leading-none tracking-tighter">{res.vessel}</h3>
                                            <div className={cn(
                                                "inline-flex px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg italic",
                                                res.status === 'PAYÉ' ? "bg-green-500/20 text-green-500 shadow-green-500/10" : "bg-accent text-primary shadow-accent/20"
                                            )}>
                                                {res.status === 'PAYÉ' ? 'Confirmé' : res.status}
                                            </div>
                                            <div className="inline-flex px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest italic text-white/40">
                                                {res.type === 'vehicule' ? `${res.vehicles?.length || 0} Véhicule(s)` : 'Passagers'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Middle: Route */}
                                    <div className="flex flex-col justify-center">
                                        <div className="relative pl-8 h-full flex flex-col justify-between py-2 min-h-[80px]">
                                            <div className="absolute left-1 top-2 bottom-2 w-px bg-white/10" />
                                            
                                            <div className="relative">
                                                <div className="absolute -left-[30px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-accent ring-4 ring-accent/10" />
                                                <span className="archivo-black text-lg text-white uppercase tracking-tight">Kalemie</span>
                                            </div>
                                            
                                            <div className="relative">
                                                <div className="absolute -left-[30px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white/20" />
                                                <span className="archivo-black text-lg text-white/20 uppercase tracking-tight">Uvira</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right-Middle: Timing */}
                                    <div className="flex flex-col justify-center gap-6">
                                        <div className="flex items-center gap-4 text-white p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                            <div className="w-10 h-10 rounded-xl bg-accent text-primary flex items-center justify-center shadow-lg shadow-accent/10">
                                                <Calendar className="w-5 h-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-white/30 truncate">{res.date}</span>
                                                <span className="font-bold text-xs text-white/60 tracking-tight flex items-center gap-2">
                                                    <Clock className="w-3 h-3" /> 08:00 AM
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Far Right: Price & Details */}
                                <div className="relative z-10 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-white/10 pt-8 md:pt-0 md:pl-16 gap-8 md:min-w-[240px]">
                                    <div className="md:text-right space-y-1">
                                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest block italic">Total</span>
                                        <span className="archivo-black text-4xl md:text-5xl text-accent italic tracking-tighter">{formatCurrency(res.totalAmount)}</span>
                                    </div>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/reservation-details/${res.id}`);
                                        }}
                                        className="px-8 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 text-white hover:bg-white hover:text-primary hover:border-white transition-all group/btn shadow-xl backdrop-blur-xl"
                                    >
                                        <span className="archivo-black text-[10px] uppercase tracking-widest italic">Détails</span>
                                        <ChevronRight className="w-5 h-5 transition-transform group-hover/btn:translate-x-1" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
