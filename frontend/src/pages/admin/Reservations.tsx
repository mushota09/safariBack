import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { User, Ship, Calendar, CreditCard, ChevronRight, X, Phone, Mail, MapPin, Hash, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Assuming data structure based on the request requirements
const mockReservations = [
    { id: 'RES-X29A', boat: 'M/V SAFARI', voyage: 'V092', customer: 'Mani Koulibaly', amount: '$245', date: '12/05/2024', status: 'Payé', type: 'Mixte', phone: '+243 812 345 678', email: 'mani@example.com' },
    { id: 'RES-B91K', boat: 'M/V SAFARI', voyage: 'V092', customer: 'Alice Mweze', amount: '$120', date: '12/05/2024', status: 'En Attente', type: 'Passager', phone: '+243 998 765 432', email: 'alice@example.com' },
    { id: 'RES-J82L', boat: 'M/V SAFARI II', voyage: 'V093', customer: 'Jean Mukendi', amount: '$450', date: '13/05/2024', status: 'Annulé', type: 'Véhicule', phone: '+243 854 321 098', email: 'jean@example.com' },
    { id: 'RES-K93M', boat: 'M/V SAFARI', voyage: 'V092', customer: 'Marie Kabange', amount: '$85', date: '14/05/2024', status: 'Payé', type: 'Passager', phone: '+243 811 223 344', email: 'marie@example.com' },
    { id: 'RES-H74N', boat: 'M/V SAFARI II', voyage: 'V094', customer: 'John Doe', amount: '$310', date: '15/05/2024', status: 'Payé', type: 'Mixte', phone: '+243 900 111 222', email: 'john@example.com' },
];

export default function AdminReservations() {
    const [reservations, setReservations] = useState(mockReservations);
    const [selectedReservation, setSelectedReservation] = useState<any>(null);
    const [filterBoat, setFilterBoat] = useState('Tous');
    const [filterVoyage, setFilterVoyage] = useState('Tous');

    const filteredReservations = reservations.filter(res => 
        (filterBoat === 'Tous' || res.boat === filterBoat) &&
        (filterVoyage === 'Tous' || res.voyage === filterVoyage)
    );

    // Grouping logic
    const groupedData = filteredReservations.reduce((acc, res) => {
        if (!acc[res.boat]) acc[res.boat] = {};
        if (!acc[res.boat][res.voyage]) acc[res.boat][res.voyage] = [];
        acc[res.boat][res.voyage].push(res);
        return acc;
    }, {} as Record<string, Record<string, typeof mockReservations>>);

    const boats = ['Tous', ...Array.from(new Set(reservations.map(r => r.boat)))];
    const voyages = ['Tous', ...Array.from(new Set(reservations.filter(r => filterBoat === 'Tous' || r.boat === filterBoat).map(r => r.voyage)))];

    const handleCancelReservation = (id: string) => {
        if (confirm('Souhaitez-vous annuler cette réservation ?')) {
            setReservations(reservations.map(res => 
                res.id === id ? { ...res, status: 'Annulé' } : res
            ));
            if (selectedReservation?.id === id) {
                setSelectedReservation({ ...selectedReservation, status: 'Annulé' });
            }
        }
    };

    return (
        <div className="space-y-12">
            <div>
                <h1 className="archivo-black text-4xl text-white uppercase italic tracking-tighter leading-none mb-4">Commandes & Réservations</h1>
                <div className="flex items-center gap-6">
                    <p className="text-white/30 text-xs font-black uppercase tracking-widest italic border-l-2 border-accent pl-4">Organisées par Bateau et Traversée</p>
                    <div className="flex gap-4">
                        <select value={filterBoat} onChange={(e) => { setFilterBoat(e.target.value); setFilterVoyage('Tous'); }} className="bg-[#0A0C1A] text-white text-xs font-black p-3 rounded-lg border border-white/5 outline-none uppercase italic tracking-widest">
                            {boats.map(boat => <option key={boat} value={boat}>{boat}</option>)}
                        </select>
                        <select value={filterVoyage} onChange={(e) => setFilterVoyage(e.target.value)} className="bg-[#0A0C1A] text-white text-xs font-black p-3 rounded-lg border border-white/5 outline-none uppercase italic tracking-widest">
                            {voyages.map(voyage => <option key={voyage} value={voyage}>{voyage}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {Object.entries(groupedData).map(([boat, voyages]) => (
                    <div key={boat} className="bg-[#0A0C1A] border border-white/5 rounded-[32px] p-8">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                                <Ship className="w-6 h-6" />
                            </div>
                            <h2 className="archivo-black text-2xl text-white uppercase italic tracking-tighter">{boat}</h2>
                        </div>
                        
                        <div className="space-y-6">
                            {Object.entries(voyages).map(([voyageId, resList]) => (
                                <div key={voyageId} className="bg-white/2 rounded-2xl border border-white/5 p-6 hover:bg-white/5 transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-black text-white italic tracking-widest uppercase">Traversée: {voyageId}</h3>
                                        <span className="text-[10px] font-bold text-accent italic">{resList.length} réservations</span>
                                    </div>
                                    <div className="space-y-2">
                                        {resList.map(res => (
                                            <button 
                                                key={res.id}
                                                onClick={() => setSelectedReservation(res)}
                                                className="w-full flex items-center justify-between p-4 bg-[#0A0C1A] rounded-xl border border-white/5 hover:border-accent/40 transition-all group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[10px] font-black text-accent tracking-widest">{res.id}</span>
                                                    <span className="text-xs font-bold text-white">{res.customer}</span>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <span className="text-xs font-bold text-white/60">{res.date}</span>
                                                    <span className={cn(
                                                        "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
                                                        res.status === 'Payé' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-accent/10 text-accent border-accent/20"
                                                    )}>{res.status}</span>
                                                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-accent" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Details Modal */}
            <AnimatePresence>
                {selectedReservation && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedReservation(null)}
                            className="absolute inset-0 bg-[#010312]/90 backdrop-blur-xl"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-2xl bg-[#0A0C1A] border border-white/5 rounded-[48px] overflow-hidden shadow-2xl"
                        >
                            <div className="p-12 space-y-12">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center text-accent">
                                            <CreditCard className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h2 className="archivo-black text-3xl text-white uppercase italic tracking-tighter leading-none mb-2">Détails Réservation</h2>
                                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest italic tracking-tighter">Référence: {selectedReservation.id}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedReservation(null)}
                                        className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20 hover:text-white transition-all outline-none"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                {/* ... [existing modal details content] ... */}
                                <div className="flex gap-4 pt-8">
                                    {selectedReservation.status !== 'Annulé' && (
                                        <button 
                                            onClick={() => handleCancelReservation(selectedReservation.id)}
                                            className="flex-1 h-18 rounded-[28px] bg-red-500/10 border border-red-500/20 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500 hover:text-primary transition-all font-black uppercase tracking-widest"
                                        >
                                            Annuler Réservation
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => setSelectedReservation(null)}
                                        className="flex-1 h-18 rounded-[28px] bg-accent text-primary archivo-black text-xs uppercase tracking-widest italic hover:bg-white transition-all shadow-xl shadow-accent/5 flex items-center justify-center gap-3 outline-none"
                                    >
                                        Fermer les Détails
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

