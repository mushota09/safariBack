import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
    QrCode as QrCodeIcon, Download, Calendar, MapPin, Ship, Ticket,
    ArrowLeft, Printer, ShieldCheck, ChevronRight,
    CreditCard, Globe, Info, ExternalLink, Share2, XCircle,
    FileText, Image as ImageIcon, Car, User
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { reservationService, SavedReservation } from '../services/reservationService';

// Helper component for a premium QR code block
const QRCodeBlock = ({ size = "md", value = "RES-XYZ" }: { size?: "sm" | "md" | "lg", value?: string }) => {
    const sizeClasses = {
        sm: "w-24 h-24 p-2",
        md: "w-40 h-40 p-4",
        lg: "w-56 h-56 p-6"
    };

    return (
        <div className={cn(
            "bg-white rounded-3xl flex items-center justify-center relative overflow-hidden group",
            sizeClasses[size]
        )}>
            {/* Scanned status indicator dots */}
            <div className="absolute top-2 right-2 flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-accent/30" />
            </div>
            
            <div className="w-full h-full border-2 border-primary/5 rounded-2xl flex items-center justify-center p-2 relative">
                <QrCodeIcon className="w-full h-full text-primary opacity-90 group-hover:scale-95 transition-transform duration-500" strokeWidth={1.5} />
            </div>
        </div>
    );
};

export default function ReservationDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [savedRes, setSavedRes] = useState<SavedReservation | null>(null);

    const [isNotFound, setIsNotFound] = useState(false);

    useEffect(() => {
        if (id) {
            const res = reservationService.getReservationById(id);
            if (res) {
                setSavedRes(res);
                setIsNotFound(false);
            } else {
                // Give it a tiny bit of time in case storage is async (it's not but for UI feel)
                const timer = setTimeout(() => {
                    const resRetry = reservationService.getReservationById(id);
                    if (resRetry) {
                        setSavedRes(resRetry);
                    } else {
                        setIsNotFound(true);
                    }
                }, 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [id]);

    if (isNotFound) {
        return (
            <div className="pt-40 text-center space-y-8">
                <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                    <XCircle className="w-10 h-10 text-red-500" />
                </div>
                <div className="space-y-4">
                    <h1 className="archivo-black text-3xl text-white uppercase italic tracking-tighter">Billet introuvable</h1>
                    <p className="text-white/40 max-w-sm mx-auto">Nous n'avons pas pu trouver de réservation avec la référence <span className="text-white font-bold">{id}</span>.</p>
                </div>
                <button 
                    onClick={() => navigate('/')}
                    className="bg-accent text-primary px-10 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-white transition-all text-sm italic"
                >
                    Retour à l'accueil
                </button>
            </div>
        );
    }

    if (!savedRes && id) {
        return (
            <div className="pt-40 text-center space-y-8">
                <div className="w-20 h-20 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="archivo-black text-2xl text-white uppercase italic tracking-tighter">Récupération de votre billet...</p>
            </div>
        );
    }

    // Mock data for fallback or combined data
    const mockReservation = {
        id: id || 'RES-8E3B33384F83',
        date: savedRes?.date || '12 mai 2026 à 14:55',
        type: savedRes?.type || 'passager',
        travelClass: savedRes?.type === 'mixte' ? 'MIXTÉ (VIP + VÉHICULE)' : (savedRes?.type === 'vehicule' ? 'TRANSPORT VÉHICULE' : 'PREMIUM LUXE'),
        passengerCount: savedRes?.passengers.length || 0,
        totalAmount: savedRes?.totalAmount || 245.00,
        status: savedRes?.status || 'PAYÉ',
        vessel: savedRes?.vessel || 'BATEAU AGERA',
        vehicles: savedRes?.vehicles || [],
        recipient: savedRes?.recipient || null,
        forWhom: savedRes?.forWhom || 'moi',
        passengers: savedRes?.passengers.map((p, idx) => ({
            id: idx + 1,
            name: p.name || `Voyageur 0${idx + 1}`,
            email: p.email || '—',
            phone: p.phone || '—',
            isPrincipal: idx === 0 && (savedRes?.forWhom === 'moi' || savedRes?.forWhom === 'moi_autres'),
            room: p.selectedRoom ? `#${p.selectedRoom}` : '—',
            bed: p.selectedBed ? `#${p.selectedBed.split('-').pop()}` : '—',
            ticketId: `T${idx + 1}-${savedRes?.id ? savedRes.id.split('-').pop() : 'XYZ'}`
        })) || []
    };

    const reservation = mockReservation;

    return (
        <div className="pt-32 pb-32 px-6 bg-[#08090F] min-h-screen text-white font-sans selection:bg-accent/30">
            <div className="max-w-7xl mx-auto space-y-16">
                
                {/* Top Sticky Navigation & Actions */}
                <div className="sticky top-20 md:top-24 z-50 -mx-6 px-6 py-4 bg-[#08090F]/80 backdrop-blur-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <button 
                        onClick={() => navigate('/my-reservations')}
                        className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 hover:border-accent/20 transition-all group shadow-xl shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                    </button>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar pb-2 md:pb-0">
                        <button className="flex-grow md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white/5 rounded-2xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all whitespace-nowrap">
                            <Download className="w-4 h-4 text-accent" /> PDF
                        </button>
                        <button className="flex-grow md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white/5 rounded-2xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all whitespace-nowrap">
                            <Printer className="w-4 h-4 text-accent" /> Imprimer
                        </button>
                        <button className="flex-grow md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white/5 rounded-2xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all whitespace-nowrap">
                            <Share2 className="w-4 h-4 text-accent" /> Partager
                        </button>

                        {/* Generate ticket button: always for vehicle type, or for other types if for oneself or self and others */}
                        {(reservation.type === 'vehicule' || reservation.forWhom === 'moi' || reservation.forWhom === 'moi_autres') && (
                            <button className="flex-grow md:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-[#0A4206] rounded-2xl border border-[#0A4206]/20 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white hover:text-primary transition-all shadow-lg shadow-[#0A4206]/20 whitespace-nowrap">
                                <Ticket className="w-4 h-4" /> 
                                {reservation.forWhom === 'moi_autres' ? 'Générer le ticket global' : 'Générer le ticket'}
                            </button>
                        )}

                        <button 
                            onClick={() => navigate(`/cancel-reservation/${id}`)}
                            className="flex-grow md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-red-500/10 rounded-2xl border border-red-500/10 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/20 transition-all whitespace-nowrap"
                        >
                            <XCircle className="w-4 h-4" /> Annuler la réservation
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    
                    {/* Left Column: Ticket & Info */}
                    <div className="lg:col-span-8 space-y-12">
                        
                        {/* THE "NICKEL" STYLE TICKET CARD */}
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative aspect-[1.586/1] md:aspect-auto md:min-h-[400px] w-full rounded-[48px] bg-white/5 p-8 md:p-14 border border-white/5 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden group"
                        >
                            {/* Decorative background effects */}
                            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[150px] -mr-80 -mt-80 pointer-events-none group-hover:bg-accent/10 transition-colors duration-1000" />
                            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[120px] -ml-60 -mb-60 pointer-events-none" />
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 mix-blend-overlay pointer-events-none" />
                            
                            {/* Card Content Top Layer */}
                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-[#DEB507] p-[1px] shadow-2xl">
                                                <div className="w-full h-full rounded-[15px] bg-[#10121A] flex items-center justify-center">
                                                    <Ship className="w-6 h-6 text-accent" />
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="archivo-black text-xl text-white uppercase tracking-tighter leading-none italic">Safari Trans</h3>
                                                <p className="text-accent text-[9px] font-black uppercase tracking-[0.4em] mt-1 italic">Royal Fleet</p>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] italic">Code réservation</span>
                                            <h2 className="archivo-black text-3xl md:text-5xl text-white uppercase tracking-tighter italic drop-shadow-2xl">
                                                {reservation.id}
                                            </h2>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col items-end gap-6 text-right">

                                        <div className="hidden md:block relative">
                                            {/* Corner accents for QR area */}
                                            <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-accent/20 rounded-tl-xl" />
                                            <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-accent/20 rounded-br-xl" />
                                            <QRCodeBlock size="md" value={reservation.id} />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto pt-16 flex flex-wrap md:flex-nowrap justify-between items-end gap-8">
                                    <div className="space-y-6 flex-grow">
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] block">Date du voyage</span>
                                                <p className="font-bold text-white tracking-tight uppercase text-sm italic">15 Mai 2026 • 08:00</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] block">Navire</span>
                                                <p className="font-bold text-white tracking-tight uppercase text-sm italic">{reservation.vessel}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] block">Type</span>
                                                <p className="font-bold text-white tracking-tight uppercase text-sm italic">{reservation.type === 'vehicule' ? 'VÉHICULE SEUL' : (reservation.type === 'mixte' ? 'MIXTÉ : PERS. + VÉH.' : 'PASSAGERS SEULS')}</p>
                                            </div>
                                            <div className="space-y-1 col-span-2 lg:col-span-1">
                                                <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] block">{reservation.type === 'vehicule' ? 'Véhicules' : 'Passagers'}</span>
                                                <p className="font-bold text-white tracking-tight uppercase text-sm italic">
                                                    {reservation.type === 'vehicule' 
                                                        ? `${reservation.vehicles.length} VÉHICULE(S)`
                                                        : `${reservation.passengerCount < 10 ? `0${reservation.passengerCount}` : reservation.passengerCount} PERS. ENREGISTRÉS`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <div className={cn(
                                            "px-10 py-5 rounded-full archivo-black text-xs uppercase tracking-[0.3em] italic shadow-2xl transition-all",
                                            reservation.status === 'PAYÉ' 
                                                ? "bg-[#0A4206] text-white shadow-[#0A4206]/20" 
                                                : "bg-accent text-primary shadow-accent/20"
                                        )}>
                                            {reservation.status}
                                        </div>
                                    </div>
                                </div>
                            </div>


                        </motion.div>

                        {/* Combined Voyage & Billing Card */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="rounded-[48px] bg-white/5 border border-white/5 overflow-hidden"
                        >
                            <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/5">
                                {/* Voyage Details */}
                                <div className="p-10 flex-1 space-y-10 group hover:bg-white/[0.02] transition-all">
                                    <div className="flex items-center justify-between">
                                        <h2 className="archivo-black text-xs text-white uppercase tracking-[0.4em] italic flex items-center gap-3">
                                            <Ship className="w-4 h-4 text-accent" /> Voyage Details
                                        </h2>
                                        <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                            <Info className="w-3 h-3 text-white/20 group-hover:text-accent transition-colors" />
                                        </div>
                                    </div>
                                    
                                    <div className="relative pl-10 space-y-10">
                                        {/* Connection Line */}
                                        <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-accent via-accent/30 to-white/5" />
                                        
                                        <div className="relative">
                                            <div className="absolute -left-[45px] top-1.5 w-5 h-5 rounded-full bg-accent shadow-[0_0_20px_rgba(255,215,0,0.4)] flex items-center justify-center">
                                                <div className="w-2 h-2 rounded-full bg-primary" />
                                            </div>
                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-1 italic">Départ Terminal</span>
                                            <span className="archivo-black text-2xl text-white uppercase leading-none">Kalemie</span>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Calendar className="w-3 h-3 text-accent" />
                                                <p className="text-white/40 text-[10px] font-black uppercase tracking-wider">15 Mai 2026 • 08:00 AM</p>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <div className="absolute -left-[45px] top-1.5 w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                                                <div className="w-2 h-2 rounded-full bg-white/20" />
                                            </div>
                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-1 italic">Destinatio Arrivée</span>
                                            <span className="archivo-black text-2xl text-white uppercase leading-none">Uvira</span>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Globe className="w-3 h-3 text-white/20" />
                                                <p className="text-white/20 text-[10px] font-bold uppercase tracking-wider">Durée estimée: 10h 30m</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Billing details */}
                                <div className="p-10 flex-1 flex flex-col justify-between hover:bg-white/[0.02] transition-all">
                                    <h2 className="archivo-black text-xs text-white uppercase tracking-[0.4em] italic flex items-center gap-3">
                                        <CreditCard className="w-4 h-4 text-accent" /> Facturation
                                    </h2>
                                    
                                    <div className="space-y-5 py-6">
                                        {[
                                            { label: 'Date Émission', value: reservation.date },
                                            { label: 'Mode de paiement', value: 'Virement Mobile (M-Pesa)' },
                                            { label: 'Référence Transaction', value: 'TX-99827-BC' },
                                        ].map((item, id) => (
                                            <div key={id} className="flex justify-between items-center group/item">
                                                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest group-hover/item:text-white/50 transition-colors italic">{item.label}</span>
                                                <span className="text-white font-bold text-xs tracking-tight italic">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="pt-6 border-t border-white/5 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-black text-accent uppercase tracking-[0.4em] italic">Montant net</span>
                                            <span className="text-white/40 font-bold text-base leading-none tracking-tighter italic">$220.00</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-[9px] font-black text-accent uppercase tracking-[0.5em] italic">Total final</span>
                                            <span className="archivo-black text-4xl text-white italic tracking-tighter leading-none">
                                                {formatCurrency(reservation.totalAmount)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Vehicle Details Section */}
                        {reservation.type === 'vehicule' && reservation.vehicles.length > 0 && (
                            <div className="space-y-10">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h2 className="archivo-black text-2xl md:text-3xl text-white uppercase tracking-tight">Véhicules enregistrés</h2>
                                        <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em] italic">Manifeste Garage Safari Trans v2.1</p>
                                    </div>
                                    <span className="px-6 py-2 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-accent hover:border-accent/40 transition-colors cursor-default">
                                        {reservation.vehicles.length} Véhicules
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-8">
                                    {reservation.vehicles.map((vehicle, index) => (
                                        <motion.div 
                                            key={index}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="p-10 rounded-[48px] bg-white/5 border border-white/5 space-y-8 relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[100px] -mr-32 -mt-32" />
                                            <div className="flex items-center gap-4 relative z-10">
                                                <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                                                    <Car className="w-6 h-6" />
                                                </div>
                                                <div className="space-y-1">
                                                    <h3 className="archivo-black text-xl text-white uppercase italic">Véhicule 0{index + 1}</h3>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                                                <div className="p-6 rounded-3xl bg-black/40 border border-white/5 space-y-4">
                                                    <div className="space-y-1">
                                                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block italic">Immatriculation</span>
                                                        <p className="archivo-black text-2xl text-accent italic uppercase">{vehicle.plate}</p>
                                                    </div>
                                                    {vehicle.platePhoto && (
                                                        <div className="aspect-video rounded-xl overflow-hidden border border-white/10">
                                                            <img src={vehicle.platePhoto} className="w-full h-full object-cover" alt="Plate" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-6 rounded-3xl bg-black/40 border border-white/5 space-y-4">
                                                    <div className="space-y-1">
                                                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block italic">Marque / Modèle</span>
                                                        <p className="archivo-black text-2xl text-white italic uppercase">{vehicle.model}</p>
                                                    </div>
                                                    {vehicle.vehiclePhoto && (
                                                        <div className="aspect-video rounded-xl overflow-hidden border border-white/10">
                                                            <img src={vehicle.vehiclePhoto} className="w-full h-full object-cover" alt="Vehicle" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-6 rounded-3xl bg-black/40 border border-white/5 flex flex-col justify-center">
                                                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block italic">Couleur</span>
                                                    <p className="archivo-black text-2xl text-white italic uppercase">{vehicle.color}</p>
                                                </div>
                                            </div>

                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recipient Details Section */}
                        {reservation.type === 'vehicule' && reservation.recipient && (
                            <div className="space-y-10">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h2 className="archivo-black text-2xl md:text-3xl text-white uppercase tracking-tight">Réceptionnaire</h2>
                                        <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em] italic">Personne habilitée à la réception du véhicule</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                                        <User className="w-6 h-6" />
                                    </div>
                                </div>

                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-10 rounded-[48px] bg-white/5 border border-white/5 relative overflow-hidden group"
                                >
                                    <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
                                        {/* Recipient Photo */}
                                        <div className="w-32 h-32 rounded-[28px] bg-gradient-to-br from-accent to-[#DEB507] p-[1px] shadow-2xl">
                                            <div className="w-full h-full rounded-[27px] bg-[#10121A] flex items-center justify-center overflow-hidden">
                                                {reservation.recipient.photo ? (
                                                    <img src={reservation.recipient.photo} className="w-full h-full object-cover" alt="Recipient" />
                                                ) : (
                                                    <User className="w-10 h-10 text-accent" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 flex-grow">
                                            <div className="space-y-2">
                                                <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] block">Nom complet</span>
                                                <h4 className="text-2xl font-bold text-white tracking-tighter italic leading-none">{reservation.recipient.name}</h4>
                                            </div>
                                            <div className="space-y-2">
                                                <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] block">Téléphone</span>
                                                <p className="text-xl font-black text-accent italic">{reservation.recipient.phone}</p>
                                            </div>
                                        </div>

                                        {/* Recipient QR Code */}
                                        <div className="flex flex-col items-center md:items-end justify-center">
                                            <div className="space-y-3">
                                                <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] md:text-right italic">Pick-up code</p>
                                                <QRCodeBlock size="sm" value={`PICKUP-${reservation.id}`} />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}

                        {/* Passenger List with Individual QR Codes */}
                        {(reservation.type !== 'vehicule' || reservation.forWhom === 'moi') && reservation.passengers.length > 0 && (
                            <div className="space-y-10">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h2 className="archivo-black text-2xl md:text-3xl text-white uppercase tracking-tight">Passagers enregistrés</h2>
                                        <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em] italic">Manifeste Passager Alpha v2.1</p>
                                    </div>
                                    <span className="px-6 py-2 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-accent hover:border-accent/40 transition-colors cursor-default">
                                        {reservation.passengerCount} Voyageurs
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-12">
                                    {reservation.passengers.map((passenger, index) => (
                                        <motion.div 
                                            key={passenger.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: index * 0.15 }}
                                            className="group relative"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-[48px] border border-white/5 group-hover:border-white/10 transition-all opacity-0 group-hover:opacity-100 -m-0.5 pointer-events-none" />
                                            
                                            <div className="p-8 md:p-12 rounded-[48px] bg-white/[0.03] border border-white/5 flex flex-col gap-10 relative overflow-hidden backdrop-blur-md">
                                                {/* Main Content Area */}
                                                <div className="flex flex-col md:flex-row items-center gap-12">
                                                    {/* Pass Number/Status */}
                                                    <div className="flex flex-col items-center gap-4">
                                                        <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-accent to-[#DEB507] p-[1px]">
                                                            <div className="w-full h-full rounded-[27px] bg-[#10121A] flex items-center justify-center">
                                                                <span className="archivo-black text-3xl text-accent italic">0{passenger.id}</span>
                                                            </div>
                                                        </div>
                                                        {passenger.isPrincipal ? (
                                                            <div className="px-5 py-1.5 rounded-full bg-accent text-primary text-[8px] font-black uppercase tracking-[0.2em] shadow-xl shadow-accent/10 whitespace-nowrap">
                                                                Principal
                                                            </div>
                                                        ) : (
                                                            <div className="px-5 py-1.5 rounded-full bg-white/10 text-white/40 text-[8px] font-black uppercase tracking-[0.2em] whitespace-nowrap">
                                                                Passager
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Passenger Details Bento */}
                                                    <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 w-full">
                                                        <div className="space-y-3">
                                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] block">Nom complet</span>
                                                            <h4 className="text-2xl font-bold text-white tracking-tighter italic leading-none">{passenger.name}</h4>
                                                            <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-widest group-hover:text-accent transition-colors">
                                                                <Globe className="w-3 h-3" /> {passenger.phone}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="space-y-4">
                                                            <div className="space-y-1">
                                                                <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] block">Coordonnées</span>
                                                                <p className="text-xs font-bold text-white/80">{passenger.email}</p>
                                                            </div>
                                                            <div className="flex gap-4">
                                                                <div className="space-y-1 bg-white/5 p-3 rounded-2xl border border-white/5 flex-grow">
                                                                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block">Chambre</span>
                                                                    <p className="archivo-black text-lg text-accent italic leading-none">{passenger.room}</p>
                                                                </div>
                                                                <div className="space-y-1 bg-white/5 p-3 rounded-2xl border border-white/5 flex-grow">
                                                                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block">Lit n°</span>
                                                                    <p className="archivo-black text-lg text-accent italic leading-none">{passenger.bed}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* INDIVIDUAL QR CODE FOR EACH PASSENGER */}
                                                        <div className="flex flex-col items-center lg:items-end justify-center">
                                                            <div className="space-y-3">
                                                                <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] lg:text-right italic">E-Ticket Individual</p>
                                                                <QRCodeBlock size="sm" value={passenger.ticketId} />
                                                                <p className="text-[10px] archivo-black text-white/40 uppercase tracking-tighter italic lg:text-right">{passenger.ticketId}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Individual Passenger Actions */}
                                                <div className="flex flex-wrap items-center gap-2 pt-8 border-t border-white/5">
                                                    <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all">
                                                        <Download className="w-3.5 h-3.5 text-accent" /> PDF
                                                    </button>
                                                    <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all">
                                                        <Printer className="w-3.5 h-3.5 text-accent" /> Imprimer
                                                    </button>
                                                    <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all">
                                                        <Share2 className="w-3.5 h-3.5 text-accent" /> Partager
                                                    </button>
                                                    <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0A4206]/40 border border-[#0A4206]/20 text-white text-[9px] font-black uppercase tracking-widest hover:bg-[#0A4206] transition-all">
                                                        <Ticket className="w-3.5 h-3.5 text-white" /> Générer le ticket
                                                    </button>
                                                </div>

                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}                    </div>

                    {/* Right Column: Actions & Help */}
                    <div className="lg:col-span-4 space-y-8">
                        <div className="lg:sticky lg:top-32 space-y-8">
                            

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
