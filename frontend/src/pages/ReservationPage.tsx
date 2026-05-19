import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Users, Car, Ship, ChevronRight, ChevronLeft, Check, 
    Trash2, Plus, User as UserIcon, CreditCard, Smartphone,
    Bed, Info, ShieldCheck, Timer, Camera
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { reservationService, type ReservationMode } from '../services/reservationService';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../services/api';

type ReservationType = 'passager' | 'vehicule';
type ForWhom = 'moi' | 'moi_autres' | 'autres' | 'personne';

/** Map UI -> reservation_mode backend */
function toReservationMode(type: ReservationType, forWhom: ForWhom): ReservationMode {
    if (type === 'vehicule') return 'vehicule';
    if (forWhom === 'moi') return 'moi_meme';
    if (forWhom === 'moi_autres') return 'moi_et_autres';
    return 'les_autres';
}

export default function ReservationPage() {
    const { voyageId } = useParams();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [reservationType, setReservationType] = useState<ReservationType>('passager');
    const [forWhom, setForWhom] = useState<ForWhom>('moi');
    
    // Vehicle States
    const [vehicles, setVehicles] = useState<{
        plate: string;
        model: string;
        type: string;
        color: string;
        platePhoto: string | null;
        vehiclePhoto: string | null;
    }[]>([{ plate: '', model: '', type: '', color: '', platePhoto: null, vehiclePhoto: null }]);
    const [recipient, setRecipient] = useState({
        name: '',
        phone: '',
        photo: null as string | null
    });
    const [verificationStatus] = useState<'attente' | 'verifie'>('attente');

    const [passengersCount, setPassengersCount] = useState(1);
    const [passengers, setPassengers] = useState<{
        name: string;
        email: string;
        phone: string;
        documentId: string;
        nationality: string;
        gender: string;
        birthDate: string;
        roomPref: 'tous' | 'chambre' | 'chambre_mixte';
        selectedRoom: string | null;
        selectedBed: string | null;
    }[]>([{ 
        name: 'Mushota Kabemba', 
        email: 'mushota09@gmail.com', 
        phone: '+243 000 000 000', 
        documentId: '',
        nationality: '',
        gender: '',
        birthDate: '',
        roomPref: 'tous',
        selectedRoom: null,
        selectedBed: null
    }]);
    const [wantsRoom, setWantsRoom] = useState<boolean | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [selectedBed, setSelectedBed] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'carte' | 'mobile'>('mobile');
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes

    const [isProcessing, setIsProcessing] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const { isAuthenticated, user } = useAuth();

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Préremplir le passager principal depuis l'utilisateur connecté
    useEffect(() => {
        if (user && (forWhom === 'moi' || forWhom === 'moi_autres')) {
            setPassengers(prev => {
                if (!prev.length) return prev;
                const next = [...prev];
                next[0] = {
                    ...next[0],
                    name: user.nom_complet || user.email,
                    email: user.email,
                    phone: user.numero_telephone || next[0].phone,
                };
                return next;
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, forWhom]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const nextStep = () => {
        // Validation for Step 3 - Vehicle
        if (step === 3 && reservationType === 'vehicule') {
            const hasEmptyVehicle = vehicles.some(v => !v.plate || !v.model || !v.type || !v.color || !v.platePhoto || !v.vehiclePhoto);
            if (hasEmptyVehicle) {
                alert('Veuillez remplir tous les détails incluant les deux photos (plaque et ensemble) pour chaque véhicule.');
                return;
            }
            
            if (forWhom === 'personne' && (!recipient.name || !recipient.phone || !recipient.photo)) {
                alert('Veuillez remplir les champs obligatoires du réceptionnaire.');
                return;
            }
        }

        setStep(step + 1);
    };
    const prevStep = () => setStep(step - 1);

    const roomsData = [
        { id: 'M01', type: 'suite', price: 100, lits: 3, floor: 'Étage 2', features: ['Fenêtre', 'Salle de bain'], status: 'disponible' },
        { id: 'M02', type: 'double', price: 45, lits: 2, floor: 'Étage 2', features: ['Fenêtre', 'Salle de bain'], status: 'disponible' },
        { id: 'M03', type: 'double', price: 45, lits: 2, floor: 'Étage 2', features: ['Fenêtre', 'Salle de bain'], status: 'disponible' },
        { id: 'M04', type: 'double', price: 45, lits: 2, floor: 'Étage 2', features: ['Fenêtre', 'Salle de bain'], status: 'disponible' },
    ];

    const bedsData: Record<string, { id: string; type: string; size: string; price: number }[]> = {
        'M01': [
            { id: 'M01-L1', type: 'Suite King', size: '200x200', price: 10 },
            { id: 'M01-L2', type: 'Simple', size: '90x200', price: 7 },
            { id: 'M01-L3', type: 'Simple', size: '90x200', price: 7 },
        ],
        'M02': [
            { id: 'M02-L1', type: 'Double', size: '160x200', price: 7 },
            { id: 'M02-L2', type: 'Simple', size: '90x200', price: 7 },
        ],
        'M03': [
            { id: 'M03-L1', type: 'Double', size: '160x200', price: 7 },
            { id: 'M03-L2', type: 'Simple', size: '90x200', price: 7 },
        ],
        'M04': [
            { id: 'M04-L1', type: 'Double', size: '160x200', price: 7 },
            { id: 'M04-L2', type: 'Simple', size: '90x200', price: 7 },
        ],
    };

    return (
        <div className="pt-24 pb-32 px-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16">
                    <div className="space-y-4">
                        <h1 className="archivo-black text-4xl md:text-6xl text-white uppercase leading-none tracking-tighter">
                            Réservez votre place
                        </h1>
                        <p className="text-white/30 font-black tracking-[0.3em] text-xs uppercase italic">
                            Voyage V092 • Kalemie vers Uvira
                        </p>
                    </div>
                </div>

                <div className="relative mb-24 max-w-3xl mx-auto">
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-white/5 -translate-y-1/2" />
                    <div className="flex items-center justify-between relative z-10">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex flex-col items-center gap-4">
                                <motion.div 
                                    initial={false}
                                    animate={{
                                        scale: step === i ? 1.2 : 1,
                                        backgroundColor: step >= i ? '#DEB507' : 'rgba(255,255,255,0.05)',
                                    }}
                                    className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                                        step >= i ? "border-accent shadow-[0_0_30px_rgba(222,181,7,0.3)]" : "border-white/5"
                                    )}
                                >
                                    {step > i ? (
                                        <Check className="w-6 h-6 text-primary stroke-[3px]" />
                                    ) : (
                                        <span className={cn("archivo-black text-sm", step >= i ? "text-primary" : "text-white/20")}>0{i}</span>
                                    )}
                                </motion.div>
                                <span className={cn(
                                    "text-[9px] font-black uppercase tracking-[0.2em] transition-colors duration-500",
                                    step >= i ? "text-accent italic" : "text-white/10"
                                )}>
                                    {i === 1 && 'Type'}
                                    {i === 2 && (reservationType === 'passager' ? 'Passagers' : 'Accompagnement')}
                                    {i === 3 && (reservationType === 'passager' ? 'Chambre' : 'Détails')}
                                    {i === 4 && 'Paiement'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div 
                                key="step1"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-12"
                            >
                                <div className="space-y-2">
                                    <h2 className="archivo-black text-3xl md:text-4xl text-white uppercase tracking-tighter">1. Type de réservation</h2>
                                    <p className="text-white/20 text-xs font-bold uppercase tracking-widest italic">Choisissez votre mode de transport pour ce voyage</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {[
                                        { id: 'passager', icon: Users, title: 'Passagers', desc: 'Réservez des lits ou places pour passagers.' },
                                        { id: 'vehicule', icon: Car, title: 'Véhicule', desc: 'Espace garage pour voitures, motos ou camions.' }
                                    ].map(type => (
                                        <button 
                                            key={type.id}
                                            onClick={() => {
                                                setReservationType(type.id as typeof reservationType);
                                                if (type.id === 'passager' && forWhom === 'moi') {
                                                    setPassengersCount(1);
                                                }
                                            }}
                                            className={cn(
                                                "p-6 rounded-3xl text-left border transition-all duration-500 group relative overflow-hidden",
                                                reservationType === type.id 
                                                    ? "bg-[#151825] border-accent/40 shadow-[0_0_30px_rgba(222,181,7,0.06)] scale-[1.01]" 
                                                    : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center mb-5 transition-all duration-500",
                                                reservationType === type.id ? "bg-accent text-primary shadow-lg shadow-accent/20" : "bg-white/5 text-accent group-hover:scale-110"
                                            )}>
                                                <type.icon className="w-5 h-5" />
                                            </div>
                                            <h3 className={cn(
                                                "archivo-black text-lg uppercase mb-2 tracking-tight transition-colors duration-500",
                                                reservationType === type.id ? "text-accent" : "text-white"
                                            )}>
                                                {type.title}
                                            </h3>
                                            <p className={cn(
                                                "text-[11px] font-medium leading-relaxed transition-colors duration-500", 
                                                reservationType === type.id ? "text-white/70" : "text-white/30"
                                            )}>
                                                {type.desc}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div 
                                key="step2"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-16"
                            >
                                <div className="space-y-8">
                                    <div className="space-y-2 text-center md:text-left">
                                        <h2 className="archivo-black text-3xl md:text-4xl text-white uppercase tracking-tighter">
                                            {reservationType === 'vehicule' ? '2. Avec qui le véhicule voyage ?' : '2. Pour qui réservez-vous ?'}
                                        </h2>
                                        <p className="text-white/20 text-xs font-bold uppercase tracking-widest italic">
                                            {reservationType === 'vehicule' 
                                                ? 'Indiquez si vous accompagnez le véhicule ou s\'il est expédié seul' 
                                                : 'Définissez les bénéficiaires de cette réservation'}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {reservationType === 'passager' ? (
                                            (['moi', 'moi_autres', 'autres'] as const).map(option => (
                                                <button 
                                                    key={option}
                                                    onClick={() => {
                                                        setForWhom(option);
                                                        if (option === 'moi') {
                                                            setPassengersCount(1);
                                                            setPassengers([{ name: 'Mushota Kabemba', email: 'mushota09@gmail.com', phone: '+243 000 000 000', roomPref: 'tous', selectedRoom: null, selectedBed: null }]);
                                                        } else if (option === 'moi_autres') {
                                                            setPassengersCount(2);
                                                            setPassengers([
                                                                { name: 'Mushota Kabemba', email: 'mushota09@gmail.com', phone: '+243 000 000 000', documentId: '', nationality: '', gender: '', birthDate: '', roomPref: 'tous', selectedRoom: null, selectedBed: null },
                                                                { name: '', email: '', phone: '', documentId: '', nationality: '', gender: '', birthDate: '', roomPref: 'tous', selectedRoom: null, selectedBed: null }
                                                            ]);
                                                        } else {
                                                            setPassengersCount(1);
                                                            setPassengers([{ name: '', email: '', phone: '', roomPref: 'tous', selectedRoom: null, selectedBed: null }]);
                                                        }
                                                    }}
                                                    className={cn(
                                                        "p-8 rounded-[32px] border-2 transition-all font-black text-[10px] uppercase tracking-[0.2em] italic text-center",
                                                        forWhom === option 
                                                            ? "border-accent bg-accent text-primary shadow-lg" 
                                                            : "border-white/5 bg-white/5 text-white/30 hover:bg-white/10 hover:border-white/10"
                                                    )}
                                                >
                                                    {option === 'moi' ? 'Pour moi-même' : option === 'moi_autres' ? 'Moi et d\'autres' : 'Pour d\'autres'}
                                                </button>
                                            ))
                                        ) : (
                                            <>
                                                <button 
                                                    onClick={() => {
                                                        setForWhom('moi');
                                                        setPassengersCount(1);
                                                        setPassengers([{ name: 'Mushota Kabemba', email: 'mushota09@gmail.com', phone: '+243 000 000 000', roomPref: 'tous', selectedRoom: null, selectedBed: null }]);
                                                    }}
                                                    className={cn(
                                                        "p-8 rounded-[32px] border-2 transition-all font-black text-[10px] uppercase tracking-[0.2em] italic text-center",
                                                        forWhom === 'moi' ? "border-accent bg-accent text-primary" : "border-white/5 bg-white/5 text-white/30"
                                                    )}
                                                >
                                                    Moi-même (Passagers)
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setForWhom('personne');
                                                        setPassengersCount(0);
                                                        setPassengers([]);
                                                    }}
                                                    className={cn(
                                                        "p-8 rounded-[32px] border-2 transition-all font-black text-[10px] uppercase tracking-[0.2em] italic text-center",
                                                        forWhom === 'personne' ? "border-accent bg-accent text-primary" : "border-white/5 bg-white/5 text-white/30"
                                                    )}
                                                >
                                                    Personne (Transport seul)
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {(reservationType === 'passager' || (reservationType === 'vehicule' && forWhom === 'moi')) && (
                                    <div className="space-y-12">
                                        {(forWhom !== 'moi') && (
                                            <div className="p-10 rounded-[48px] bg-[#151825] border border-accent/20 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
                                                <div className="space-y-2 relative z-10">
                                                    <h3 className="archivo-black text-2xl text-white uppercase tracking-tight">Nombre de passagers</h3>
                                                    <p className="text-[10px] text-white/30 font-black uppercase tracking-widest italic">Total de personnes voyageant avec le véhicule</p>
                                                </div>
                                                <div className="flex items-center gap-8 relative z-10 bg-white/5 p-4 rounded-[32px] border border-white/5">
                                                    <button 
                                                        disabled={passengersCount <= (forWhom === 'moi_autres' ? 2 : 1)}
                                                        onClick={() => {
                                                            setPassengersCount(p => p - 1);
                                                            setPassengers(prev => prev.slice(0, -1));
                                                        }}
                                                        className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 disabled:opacity-30 hover:bg-red-500/10 hover:text-red-500 transition-all"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                    <span className="archivo-black text-5xl text-accent w-12 text-center italic">{passengersCount}</span>
                                                    <button 
                                                        onClick={() => {
                                                            setPassengersCount(p => p + 1);
                                                            setPassengers(prev => [...prev, { name: '', email: '', phone: '', documentId: '', nationality: '', gender: '', birthDate: '', roomPref: 'tous', selectedRoom: null, selectedBed: null }]);
                                                        }}
                                                        className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center text-primary transition-all shadow-xl"
                                                    >
                                                        <Plus className="w-6 h-6 stroke-[3px]" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-10">
                                            <div className="flex items-center gap-4">
                                                <div className="h-px bg-white/10 flex-grow" />
                                                <h3 className="archivo-black text-sm text-white/20 uppercase tracking-[0.4em] italic px-4">Manifeste Passagers</h3>
                                                <div className="h-px bg-white/10 flex-grow" />
                                            </div>
                                            <div className="grid grid-cols-1 gap-8">
                                                {passengers.map((passenger, index) => {
                                                    const isPrincipal = index === 0 && (forWhom === 'moi' || forWhom === 'moi_autres');
                                                    return (
                                                        <motion.div 
                                                            key={index} 
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            className="p-10 md:p-12 rounded-[56px] bg-white/5 border border-white/5 space-y-10 shadow-sm relative overflow-hidden group"
                                                        >
                                                            <div className="flex items-center gap-6">
                                                                <div className="w-16 h-16 rounded-3xl bg-accent text-primary flex items-center justify-center archivo-black text-2xl italic">
                                                                    0{index + 1}
                                                                </div>
                                                                <h4 className="archivo-black text-2xl text-white uppercase tracking-tight">
                                                                    {isPrincipal ? 'Vous (Principal)' : `Passager 0${index + 1}`}
                                                                </h4>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] italic">Nom complet *</label>
                                                                    <input 
                                                                        type="text" 
                                                                        value={passenger.name} 
                                                                        readOnly={isPrincipal}
                                                                        onChange={(e) => {
                                                                            if (isPrincipal) return;
                                                                            const newP = [...passengers];
                                                                            newP[index].name = e.target.value;
                                                                            setPassengers(newP);
                                                                        }} 
                                                                        placeholder="Nom complet" 
                                                                        className={cn(
                                                                            "w-full p-5 bg-white/5 rounded-2xl border border-white/5 focus:border-accent outline-none text-white transition-all uppercase",
                                                                            isPrincipal && "opacity-50 cursor-not-allowed"
                                                                        )} 
                                                                    />
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] italic">Email</label>
                                                                    <input 
                                                                        type="email" 
                                                                        value={passenger.email} 
                                                                        readOnly={isPrincipal}
                                                                        onChange={(e) => {
                                                                            if (isPrincipal) return;
                                                                            const newP = [...passengers];
                                                                            newP[index].email = e.target.value;
                                                                            setPassengers(newP);
                                                                        }} 
                                                                        placeholder="Email" 
                                                                        className={cn(
                                                                            "w-full p-5 bg-white/5 rounded-2xl border border-white/5 focus:border-accent outline-none text-white transition-all",
                                                                            isPrincipal && "opacity-50 cursor-not-allowed"
                                                                        )} 
                                                                    />
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] italic">Téléphone</label>
                                                                    <input 
                                                                        type="tel" 
                                                                        value={passenger.phone} 
                                                                        readOnly={isPrincipal}
                                                                        onChange={(e) => {
                                                                            if (isPrincipal) return;
                                                                            const newP = [...passengers];
                                                                            newP[index].phone = e.target.value;
                                                                            setPassengers(newP);
                                                                        }} 
                                                                        placeholder="Téléphone" 
                                                                        className={cn(
                                                                            "w-full p-5 bg-white/5 rounded-2xl border border-white/5 focus:border-accent outline-none text-white transition-all",
                                                                            isPrincipal && "opacity-50 cursor-not-allowed"
                                                                        )} 
                                                                    />
                                                                </div>
                                                            {!isPrincipal && (
                                                                <>
                                                                    <div className="space-y-3">
                                                                        <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] italic">Numéro de pièce d'identite *</label>
                                                                        <input type="text" value={passenger.documentId} onChange={(e) => { const newP = [...passengers]; newP[index].documentId = e.target.value; setPassengers(newP); }} placeholder="Numéro" className="w-full p-5 bg-white/5 rounded-2xl border border-white/5 focus:border-accent outline-none text-white transition-all" />
                                                                    </div>
                                                                    <div className="space-y-3">
                                                                        <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] italic">Nationalité *</label>
                                                                        <input type="text" value={passenger.nationality} onChange={(e) => { const newP = [...passengers]; newP[index].nationality = e.target.value; setPassengers(newP); }} placeholder="Nationalité" className="w-full p-5 bg-white/5 rounded-2xl border border-white/5 focus:border-accent outline-none text-white transition-all" />
                                                                    </div>
                                                                    <div className="space-y-3">
                                                                        <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] italic">Sexe *</label>
                                                                        <select value={passenger.gender} onChange={(e) => { const newP = [...passengers]; newP[index].gender = e.target.value; setPassengers(newP); }} className="w-full p-5 bg-white/5 rounded-2xl border border-white/5 focus:border-accent outline-none text-white transition-all uppercase">
                                                                            <option value="">Sélectionner</option>
                                                                            <option value="masculin">Masculin</option>
                                                                            <option value="feminin">Féminin</option>
                                                                        </select>
                                                                    </div>
                                                                    <div className="space-y-3">
                                                                        <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] italic">Date de naissance *</label>
                                                                        <input type="date" value={passenger.birthDate} onChange={(e) => { const newP = [...passengers]; newP[index].birthDate = e.target.value; setPassengers(newP); }} className="w-full p-5 bg-white/5 rounded-2xl border border-white/5 focus:border-accent outline-none text-white transition-all" />
                                                                    </div>
                                                                </>
                                                            )}
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div 
                                key="step3"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-16"
                            >
                                <div className="space-y-12">
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                        <div className="space-y-2">
                                            <h2 className="archivo-black text-3xl md:text-4xl text-white uppercase tracking-tighter">
                                                {reservationType === 'vehicule' ? '3. Détails du véhicule' : '3. Souhaitez-vous une chambre ?'}
                                            </h2>
                                            <p className="text-white/20 text-xs font-bold uppercase tracking-widest italic">
                                                {reservationType === 'vehicule' ? 'Fournissez les documents visuels pour l\'embarquement' : 'Sélectionnez votre confort pour la traversée'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {reservationType === 'vehicule' ? (
                                        <div className="space-y-24">
                                            <div className="space-y-12">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="archivo-black text-2xl text-white uppercase italic">Vos Véhicules</h3>
                                                    <button 
                                                        onClick={() => setVehicles([...vehicles, { plate: '', model: '', color: '' }])}
                                                        className="flex items-center gap-2 px-6 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest hover:bg-accent/20 transition-all"
                                                    >
                                                        <Plus className="w-4 h-4" /> Ajouter un véhicule
                                                    </button>
                                                </div>

                                                <div className="space-y-8">
                                                    {vehicles.map((vehicle, idx) => (
                                                        <motion.div 
                                                            key={idx}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            className="p-8 rounded-[40px] bg-[#151825] border border-accent/20 space-y-10 relative overflow-hidden shadow-xl"
                                                        >
                                                            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[100px] -mr-32 -mt-32" />
                                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 border-b border-white/5 pb-6">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-10 h-10 rounded-xl bg-accent text-primary flex items-center justify-center archivo-black italic text-lg">
                                                                        {idx + 1}
                                                                    </div>
                                                                    <div className="space-y-0.5">
                                                                        <h3 className="archivo-black text-lg text-white uppercase italic">Véhicule 0{idx + 1}</h3>
                                                                        <p className="text-[8px] text-white/30 font-black uppercase tracking-widest italic">Détails et photos requis</p>
                                                                    </div>
                                                                </div>
                                                                {vehicles.length > 1 && (
                                                                    <button 
                                                                        onClick={() => setVehicles(vehicles.filter((_, i) => i !== idx))}
                                                                        className="p-2 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                                                                {/* Vehicle Photos */}
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-4">
                                                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] italic block">Plaque d'immatr. *</label>
                                                                        <div 
                                                                            onClick={() => document.getElementById(`platePhoto-${idx}`)?.click()}
                                                                            className={cn(
                                                                                "aspect-video rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden relative",
                                                                                vehicle.platePhoto ? "border-accent" : "border-white/10 hover:border-accent/40"
                                                                            )}
                                                                        >
                                                                            <input id={`platePhoto-${idx}`} type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                                                const file = e.target.files?.[0];
                                                                                if (file) {
                                                                                    const newV = [...vehicles];
                                                                                    newV[idx].platePhoto = URL.createObjectURL(file);
                                                                                    setVehicles(newV);
                                                                                }
                                                                            }} />
                                                                            {vehicle.platePhoto ? <img src={vehicle.platePhoto} className="absolute inset-0 w-full h-full object-cover" alt="Plate" /> : <Camera className="w-6 h-6 text-white/10" />}
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-4">
                                                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] italic block">Vue d'ensemble *</label>
                                                                        <div 
                                                                            onClick={() => document.getElementById(`vehiclePhoto-${idx}`)?.click()}
                                                                            className={cn(
                                                                                "aspect-video rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden relative",
                                                                                vehicle.vehiclePhoto ? "border-accent" : "border-white/10 hover:border-accent/40"
                                                                            )}
                                                                        >
                                                                            <input id={`vehiclePhoto-${idx}`} type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                                                const file = e.target.files?.[0];
                                                                                if (file) {
                                                                                    const newV = [...vehicles];
                                                                                    newV[idx].vehiclePhoto = URL.createObjectURL(file);
                                                                                    setVehicles(newV);
                                                                                }
                                                                            }} />
                                                                            {vehicle.vehiclePhoto ? <img src={vehicle.vehiclePhoto} className="absolute inset-0 w-full h-full object-cover" alt="Vehicle" /> : <Car className="w-6 h-6 text-white/10" />}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Vehicle Text Info */}
                                                                <div className="space-y-6">
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div className="space-y-2">
                                                                            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] italic">Type Véhicule *</label>
                                                                            <select 
                                                                                value={vehicle.type}
                                                                                onChange={(e) => {
                                                                                    const newV = [...vehicles];
                                                                                    newV[idx].type = e.target.value;
                                                                                    setVehicles(newV);
                                                                                }}
                                                                                className="w-full p-4 bg-black/40 rounded-xl border border-white/5 focus:border-accent outline-none font-black text-white uppercase italic transition-all [color-scheme:dark]"
                                                                            >
                                                                                <option value="">Sélectionner</option>
                                                                                <option value="voiture">Voiture</option>
                                                                                <option value="moto">Moto</option>
                                                                                <option value="camion">Camion</option>
                                                                            </select>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] italic">Numéro de Plaque *</label>
                                                                            <input 
                                                                                type="text" 
                                                                                value={vehicle.plate}
                                                                                onChange={(e) => {
                                                                                    const newV = [...vehicles];
                                                                                    newV[idx].plate = e.target.value.toUpperCase();
                                                                                    setVehicles(newV);
                                                                                }}
                                                                                placeholder="1234AB05"
                                                                                className="w-full p-4 bg-black/40 rounded-xl border border-white/5 focus:border-accent outline-none font-black text-white uppercase italic transition-all"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div className="space-y-2">
                                                                            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] italic">Marque / Modèle *</label>
                                                                            <input 
                                                                                type="text" 
                                                                                value={vehicle.model}
                                                                                onChange={(e) => {
                                                                                    const newV = [...vehicles];
                                                                                    newV[idx].model = e.target.value;
                                                                                    setVehicles(newV);
                                                                                }}
                                                                                placeholder="Toyota Hilux"
                                                                                className="w-full p-4 bg-black/40 rounded-xl border border-white/5 focus:border-accent outline-none font-black text-white uppercase italic transition-all"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] italic">Couleur *</label>
                                                                            <input 
                                                                                type="text" 
                                                                                value={vehicle.color}
                                                                                onChange={(e) => {
                                                                                    const newV = [...vehicles];
                                                                                    newV[idx].color = e.target.value;
                                                                                    setVehicles(newV);
                                                                                }}
                                                                                placeholder="Blanc"
                                                                                className="w-full p-4 bg-black/40 rounded-xl border border-white/5 focus:border-accent outline-none font-black text-white uppercase italic transition-all"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </div>

                                            {forWhom === 'personne' && (
                                                <div className="space-y-12 pt-24 border-t border-white/5">
                                                    <div className="space-y-2 text-center md:text-left">
                                                        <h2 className="archivo-black text-3xl text-white uppercase tracking-tighter italic">Réceptionnaire</h2>
                                                        <p className="text-white/20 text-xs font-bold uppercase tracking-widest italic">Personne habilitée à récupérer le véhicule</p>
                                                    </div>
                                                    <div className="p-8 rounded-[40px] bg-white/5 border border-white/5 space-y-10">
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                                            <div className="space-y-4 text-center">
                                                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] italic block">Photo d'identité *</label>
                                                                    <div 
                                                                        onClick={() => document.getElementById('recipPhotoInput')?.click()}
                                                                        className={cn(
                                                                            "w-32 h-32 mx-auto rounded-3xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden relative",
                                                                            recipient.photo ? "border-accent" : "border-white/10 hover:border-accent/40"
                                                                        )}
                                                                    >
                                                                        <input id="recipPhotoInput" type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) setRecipient({...recipient, photo: URL.createObjectURL(file)});
                                                                        }} />
                                                                        {recipient.photo ? <img src={recipient.photo} className="absolute inset-0 w-full h-full object-cover" alt="Recipient" /> : <UserIcon className="w-8 h-8 text-white/10" />}
                                                                    </div>
                                                                </div>
                                                            <div className="md:col-span-2 space-y-6">
                                                                <div className="space-y-2">
                                                                    <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] italic">Nom complet *</label>
                                                                    <input type="text" value={recipient.name} onChange={(e) => setRecipient({...recipient, name: e.target.value})} placeholder="Nom du réceptionnaire" className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-accent font-black uppercase transition-all" />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] italic">Téléphone *</label>
                                                                    <input type="tel" value={recipient.phone} onChange={(e) => setRecipient({...recipient, phone: e.target.value})} placeholder="+243 XXX XXX XXX" className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-accent font-black transition-all" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {forWhom === 'moi' && (
                                                <div className="space-y-12 pt-16 border-t border-white/5">
                                                    <div className="space-y-2 text-center md:text-left">
                                                        <h2 className="archivo-black text-3xl text-white uppercase tracking-tighter italic">Souhaitez-vous une chambre ?</h2>
                                                    </div>
                                                    
                                                    <div className="space-y-20">
                                                        {passengers.map((p, i) => (
                                                            <div key={i} className="space-y-10">
                                                                <div className="p-8 rounded-[32px] bg-white/5 border border-white/10 flex flex-col md:flex-row items-center gap-8">
                                                                    <div className="flex items-center gap-4 md:w-1/3">
                                                                        <div className="w-12 h-12 rounded-xl bg-accent text-primary flex items-center justify-center text-xl archivo-black italic">{i+1}</div>
                                                                        <h4 className="archivo-black text-lg text-white uppercase italic">{p.name || `Passager ${i+1}`}</h4>
                                                                    </div>
                                                                    <div className="flex gap-3 w-full md:w-2/3">
                                                                        {[
                                                                            { value: 'chambre_mixte', label: 'Oui, une chambre mixte' }, 
                                                                            { value: 'chambre', label: 'Oui, une chambre' },
                                                                            { value: 'tous', label: 'Place standard' }
                                                                        ].map(o => (
                                                                            <button 
                                                                                key={o.value} 
                                                                                onClick={() => {
                                                                                    const newP = [...passengers];
                                                                                    newP[i].roomPref = o.value as any;
                                                                                    if (o.value === 'tous') {
                                                                                        newP[i].selectedRoom = null;
                                                                                        newP[i].selectedBed = null;
                                                                                    } else if (o.value === 'chambre') {
                                                                                        newP[i].selectedBed = null;
                                                                                    }
                                                                                    setPassengers(newP);
                                                                                }} 
                                                                                className={cn(
                                                                                    "flex-1 p-5 rounded-2xl border-2 font-black text-[9px] uppercase tracking-[0.2em] italic transition-all", 
                                                                                    p.roomPref === o.value ? "border-accent bg-accent text-primary" : "border-white/5 bg-white/5 text-white/20"
                                                                                )}
                                                                            >
                                                                                {o.label}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {p.roomPref === 'chambre_mixte' && (
                                                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12 pl-4 md:pl-12 border-l-2 border-accent/20">
                                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                            {roomsData.map(room => (
                                                                                <button 
                                                                                    key={room.id}
                                                                                    onClick={() => {
                                                                                        const newP = [...passengers];
                                                                                        newP[i].selectedRoom = room.id;
                                                                                        newP[i].selectedBed = null;
                                                                                        setPassengers(newP);
                                                                                    }}
                                                                                    className={cn(
                                                                                        "p-6 rounded-3xl text-center border-2 transition-all",
                                                                                        p.selectedRoom === room.id ? "bg-accent/10 border-accent" : "bg-white/5 border-white/5"
                                                                                    )}
                                                                                >
                                                                                    <span className={cn("archivo-black text-2xl italic block", p.selectedRoom === room.id ? "text-accent" : "text-white/20")}>{room.id}</span>
                                                                                    <span className="text-[10px] text-accent font-black">+{room.price}€</span>
                                                                                </button>
                                                                            ))}
                                                                        </div>

                                                                        {p.selectedRoom && (
                                                                            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                                                {bedsData[p.selectedRoom]?.map(bed => (
                                                                                    <button 
                                                                                        key={bed.id}
                                                                                        onClick={() => {
                                                                                            const newP = [...passengers];
                                                                                            newP[i].selectedBed = bed.id;
                                                                                            setPassengers(newP);
                                                                                        }}
                                                                                        className={cn(
                                                                                            "p-6 rounded-3xl text-center border-2 transition-all",
                                                                                            p.selectedBed === bed.id ? "bg-[#151825] border-accent" : "bg-white/5 border-white/5"
                                                                                        )}
                                                                                    >
                                                                                        <span className={cn("archivo-black text-xl italic block", p.selectedBed === bed.id ? "text-accent" : "text-white/20")}>{bed.id}</span>
                                                                                        <span className="text-[10px] text-accent/80 font-black">+{bed.price}€</span>
                                                                                    </button>
                                                                                ))}
                                                                            </motion.div>
                                                                        )}
                                                                    </motion.div>
                                                                )}
                                                                {p.roomPref === 'chambre' && (
                                                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12 pl-4 md:pl-12 border-l-2 border-accent/20">
                                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                            {roomsData.map(room => (
                                                                                <button 
                                                                                    key={room.id}
                                                                                    onClick={() => {
                                                                                        const newP = [...passengers];
                                                                                        newP[i].selectedRoom = room.id;
                                                                                        newP[i].selectedBed = null;
                                                                                        setPassengers(newP);
                                                                                    }}
                                                                                    className={cn(
                                                                                        "p-6 rounded-3xl text-center border-2 transition-all",
                                                                                        p.selectedRoom === room.id ? "bg-accent/10 border-accent" : "bg-white/5 border-white/5"
                                                                                    )}
                                                                                >
                                                                                    <span className={cn("archivo-black text-2xl italic block", p.selectedRoom === room.id ? "text-accent" : "text-white/20")}>{room.id}</span>
                                                                                    <span className="text-[10px] text-accent font-black">+{room.price}€</span>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-16">
                                            <div className="space-y-20">
                                                {passengers.map((passenger, pIndex) => (
                                                    <div key={pIndex} className="space-y-12">
                                                        <div className="flex items-center gap-8 p-8 rounded-[40px] bg-white/5 border border-white/10 w-fit">
                                                            <div className="w-16 h-16 rounded-3xl bg-accent text-primary flex items-center justify-center text-2xl archivo-black italic">0{pIndex + 1}</div>
                                                            <div>
                                                                <h3 className="archivo-black text-xl text-white uppercase italic">{passenger.name || `Passager 0${pIndex + 1}`}</h3>
                                                                <p className="text-[10px] text-white/30 font-black uppercase tracking-widest italic">Choix de l'hébergement</p>
                                                            </div>
                                                        </div>

                                                        <div className="p-10 rounded-[48px] bg-[#151825] border border-accent/20 space-y-10 relative overflow-hidden shadow-2xl">
                                                            <div className="flex flex-col sm:flex-row gap-6 relative z-10">
                                                                {[
                                                                    { value: 'chambre_mixte', label: 'Oui, une chambre mixte' },
                                                                    { value: 'chambre', label: 'Oui, une chambre' },
                                                                    { value: 'tous', label: 'Place standard' }
                                                                ].map((opt) => (
                                                                    <button
                                                                        key={opt.label}
                                                                        onClick={() => {
                                                                            const newP = [...passengers];
                                                                            newP[pIndex].roomPref = opt.value as any;
                                                                            if (opt.value === 'tous') {
                                                                                newP[pIndex].selectedRoom = null;
                                                                                newP[pIndex].selectedBed = null;
                                                                            } else if (opt.value === 'chambre') {
                                                                                newP[pIndex].selectedBed = null;
                                                                            }
                                                                            setPassengers(newP);
                                                                        }}
                                                                        className={cn(
                                                                            "flex-1 py-8 rounded-[32px] border-2 font-black text-[10px] uppercase tracking-[0.25em] italic transition-all",
                                                                            passenger.roomPref === opt.value ? "border-accent bg-accent text-primary scale-[1.02]" : "border-white/5 bg-white/5 text-white/20"
                                                                        )}
                                                                    >
                                                                        {opt.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <AnimatePresence>
                                                            {passenger.roomPref === 'chambre_mixte' && (
                                                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-12 pl-6 md:pl-12 border-l-2 border-accent/20">
                                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                                        {roomsData.map(room => (
                                                                            <button 
                                                                                key={room.id} 
                                                                                onClick={() => {
                                                                                    const newP = [...passengers];
                                                                                    newP[pIndex].selectedRoom = room.id;
                                                                                    newP[pIndex].selectedBed = null;
                                                                                    setPassengers(newP);
                                                                                }} 
                                                                                className={cn(
                                                                                    "p-8 rounded-[40px] text-left border transition-all duration-500", 
                                                                                    passenger.selectedRoom === room.id ? "bg-[#151825] border-accent" : "bg-white/5 border-white/5"
                                                                                )}
                                                                            >
                                                                                <h4 className={cn("archivo-black text-3xl italic", passenger.selectedRoom === room.id ? "text-accent" : "text-white/40")}>{room.id}</h4>
                                                                                <div className="pt-6 flex justify-between items-end italic">
                                                                                    <div className="text-xl archivo-black text-accent italic">+{room.price}€</div>
                                                                                </div>
                                                                            </button>
                                                                        ))}
                                                                    </div>

                                                                    {passenger.selectedRoom && (
                                                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-3 gap-8 pt-12 border-t border-white/5">
                                                                            {bedsData[passenger.selectedRoom]?.map(bed => (
                                                                                <button 
                                                                                    key={bed.id} 
                                                                                    onClick={() => {
                                                                                        const newP = [...passengers];
                                                                                        newP[pIndex].selectedBed = bed.id;
                                                                                        setPassengers(newP);
                                                                                    }} 
                                                                                    className={cn(
                                                                                        "p-8 rounded-[40px] text-left border transition-all duration-500", 
                                                                                        passenger.selectedBed === bed.id ? "bg-[#151825] border-accent" : "bg-white/5 border-white/5"
                                                                                    )}
                                                                                >
                                                                                    <div className={cn("archivo-black text-2xl italic text-center", passenger.selectedBed === bed.id ? "text-accent" : "text-white/40")}>{bed.id}</div>
                                                                                    <div className="pt-6 text-center">
                                                                                        <div className="text-xl archivo-black text-accent italic">+{bed.price}€</div>
                                                                                    </div>
                                                                                </button>
                                                                            ))}
                                                                        </motion.div>
                                                                    )}
                                                                </motion.div>
                                                            )}
                                                            {passenger.roomPref === 'chambre' && (
                                                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-12 pl-6 md:pl-12 border-l-2 border-accent/20">
                                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                                        {roomsData.map(room => (
                                                                            <button 
                                                                                key={room.id} 
                                                                                onClick={() => {
                                                                                    const newP = [...passengers];
                                                                                    newP[pIndex].selectedRoom = room.id;
                                                                                    newP[pIndex].selectedBed = null;
                                                                                    setPassengers(newP);
                                                                                }} 
                                                                                className={cn(
                                                                                    "p-8 rounded-[40px] text-left border transition-all duration-500", 
                                                                                    passenger.selectedRoom === room.id ? "bg-[#151825] border-accent" : "bg-white/5 border-white/5"
                                                                                )}
                                                                            >
                                                                                <h4 className={cn("archivo-black text-3xl italic", passenger.selectedRoom === room.id ? "text-accent" : "text-white/40")}>{room.id}</h4>
                                                                                <div className="pt-6 flex justify-between items-end italic">
                                                                                    <div className="text-xl archivo-black text-accent italic">+{room.price}€</div>
                                                                                </div>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div 
                                key="step4"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-12"
                            >
                                <div className="space-y-12">
                                    <div className="space-y-8">
                                        <h2 className="archivo-black text-2xl text-white uppercase italic">4. Mode de Paiement</h2>
                                        <div className="space-y-4">
                                            {['mobile', 'carte'].map(m => (
                                                <button key={m} onClick={() => setPaymentMethod(m as any)} className={cn("w-full p-8 rounded-[32px] border transition-all flex items-center justify-between", paymentMethod === m ? "border-accent bg-accent/10" : "border-white/10 bg-white/5")}>
                                                    <div className="flex items-center gap-6">
                                                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", paymentMethod === m ? "bg-accent text-primary" : "bg-white/10 text-accent")}>
                                                            {m === 'mobile' ? <Smartphone /> : <CreditCard />}
                                                        </div>
                                                        <h4 className="font-black text-lg uppercase text-white">{m === 'mobile' ? 'Mobile Money' : 'Carte Bancaire'}</h4>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-[#0F111A] rounded-[48px] p-8 border border-white/5 shadow-2xl relative overflow-hidden h-fit group w-full max-w-sm mx-auto md:ml-auto md:mr-0">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[100px] -mr-32 -mt-32 transition-colors group-hover:bg-accent/10" />
                                    
                                    <div className="relative z-10 space-y-8">
                                        <div className="space-y-4">
                                            <h3 className="archivo-black text-2xl text-white uppercase tracking-tighter italic leading-none">Récapitulatif</h3>
                                            <div className="w-full h-px bg-white/5" />
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/40">
                                                <span>Passagers ({passengersCount}x)</span>
                                                <span className="text-white font-mono">{formatCurrency(passengersCount * 45)}</span>
                                            </div>
                                            
                                            {reservationType === 'vehicule' && vehicles.length > 0 && (
                                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/40">
                                                    <span>Véhicules ({vehicles.length}x)</span>
                                                    <span className="text-white font-mono">{formatCurrency(vehicles.length * 150)}</span>
                                                </div>
                                            )}

                                            {passengers.some(p => p.selectedRoom) && (
                                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/40 border-t border-white/5 pt-3">
                                                    <span>Cabines</span>
                                                    <span className="text-white font-mono">
                                                        {formatCurrency(passengers.reduce((s, p) => s + (p.selectedRoom ? (roomsData.find(r => r.id === p.selectedRoom)?.price || 0) + (bedsData[p.selectedRoom!]?.find(b => b.id === p.selectedBed)?.price || 0) : 0), 0))}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="w-full h-px bg-white/10" />

                                        <div className="flex justify-between items-end gap-6">
                                            <div className="flex flex-col">
                                                <span className="archivo-black text-white uppercase text-xl tracking-tighter italic leading-tight">Total</span>
                                            </div>
                                            <div className="text-4xl md:text-5xl archivo-black text-accent italic tracking-tighter leading-none">
                                                {formatCurrency((passengersCount * 45) + (reservationType === 'vehicule' ? vehicles.length * 150 : 0) + passengers.reduce((s, p) => s + (p.selectedRoom ? (roomsData.find(r => r.id === p.selectedRoom)?.price || 0) + (bedsData[p.selectedRoom!]?.find(b => b.id === p.selectedBed)?.price || 0) : 0), 0))}
                                            </div>
                                        </div>

                                        {submitError && (
                                            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-[11px] font-bold uppercase tracking-widest">
                                                {submitError}
                                            </div>
                                        )}
                                        <button 
                                            disabled={isProcessing}
                                            className={cn(
                                                "w-full py-6 rounded-[24px] archivo-black text-lg transition-all uppercase tracking-widest italic flex items-center justify-center gap-4 relative overflow-hidden",
                                                isProcessing 
                                                    ? "bg-white/10 text-white/20 cursor-wait" 
                                                    : "bg-accent text-primary hover:bg-white hover:scale-[1.02] shadow-[0_15px_40px_rgba(222,181,7,0.15)] active:scale-[0.98]"
                                            )}
                                            onClick={async () => {
                                                setSubmitError(null);

                                                if (!isAuthenticated) {
                                                    navigate('/login');
                                                    return;
                                                }

                                                const voyageIdNum = Number(voyageId);
                                                if (!voyageIdNum || isNaN(voyageIdNum)) {
                                                    setSubmitError("Voyage invalide.");
                                                    return;
                                                }

                                                setIsProcessing(true);
                                                try {
                                                    const mode = toReservationMode(reservationType, forWhom);

                                                    if (reservationType === 'passager') {
                                                        const passagersPayload = passengers
                                                            .filter(p => p.name?.trim())
                                                            .map(p => ({
                                                                nom_complet: p.name,
                                                                email: p.email || undefined,
                                                                telephone: p.phone || undefined,
                                                                // Conversion id ui -> id backend si on a un id numérique
                                                                chambre_id: undefined as number | undefined,
                                                                lit_id: undefined as number | undefined,
                                                            }));

                                                        const created = await reservationService.createMultiple({
                                                            voyage_id: voyageIdNum,
                                                            type_reservation: 'passager',
                                                            reservation_mode: mode,
                                                            passagers: passagersPayload,
                                                        });
                                                        navigate(`/reservation-details/${created.id}`);
                                                    } else {
                                                        // Réservation véhicule
                                                        const vehiculesPayload = vehicles
                                                            .filter(v => v.plate?.trim())
                                                            .map(v => ({
                                                                type_vehicule: (v.type || 'voiture') as any,
                                                                immatriculation: v.plate,
                                                                modele: v.model || undefined,
                                                                couleur: v.color || undefined,
                                                                proprietaire_nom: forWhom === 'personne' ? recipient.name : (user?.nom_complet || undefined),
                                                                proprietaire_telephone: forWhom === 'personne' ? recipient.phone : (user?.numero_telephone || undefined),
                                                            }));

                                                        const passagersPayload = forWhom === 'moi'
                                                            ? passengers
                                                                .filter(p => p.name?.trim())
                                                                .map(p => ({
                                                                    nom_complet: p.name,
                                                                    email: p.email || undefined,
                                                                    telephone: p.phone || undefined,
                                                                }))
                                                            : undefined;

                                                        const created = await reservationService.createMultiple({
                                                            voyage_id: voyageIdNum,
                                                            type_reservation: 'vehicule',
                                                            reservation_mode: 'vehicule',
                                                            vehicules: vehiculesPayload,
                                                            passagers: passagersPayload,
                                                            vehicule_inclus: true,
                                                        });
                                                        navigate(`/reservation-details/${created.id}`);
                                                    }
                                                } catch (err: any) {
                                                    const msg = err instanceof ApiError
                                                        ? (typeof err.detail === 'string' ? err.detail : err.detail?.detail || err.message)
                                                        : (err?.message || 'Erreur lors de la réservation');
                                                    setSubmitError(msg);
                                                } finally {
                                                    setIsProcessing(false);
                                                }
                                            }}
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <div className="w-6 h-6 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                                                    <span className="animate-pulse">Patientez</span>
                                                </>
                                            ) : (
                                                'Confirmer'
                                            )}
                                        </button>

                                        <div className="flex items-center justify-center gap-3 text-[9px] font-black text-white/10 uppercase tracking-widest">
                                            <ShieldCheck className="w-4 h-4 opacity-50" />
                                            Sécurisé
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="mt-12 flex items-center justify-between pt-8 border-t border-white/5">
                    <button disabled={step === 1} onClick={prevStep} className="flex items-center gap-3 px-8 py-5 rounded-2xl text-white/40 font-black uppercase tracking-[0.2em] text-[10px] italic disabled:opacity-0 transition-all hover:text-white">
                        <ChevronLeft className="w-5 h-5" /> Retour
                    </button>
                    {step < 4 ? (
                        <button onClick={nextStep} className="bg-white text-primary px-12 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] italic flex items-center gap-3 hover:bg-accent transition-all">
                            Suivant <ChevronRight className="w-5 h-5" />
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
