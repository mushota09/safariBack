import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Phone, Calendar, ShieldCheck, Camera, LogOut, ChevronRight, Edit2, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function ProfilePage() {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);

    // Mock user data
    const [userData, setUserData] = useState({
        name: "Jean Mukendi",
        email: "jean.mukendi@example.com",
        phone: "+243 812 345 678",
        joinedDate: "Mars 2024",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=1470&auto=format&fit=crop"
    });

    const handleLogout = () => {
        navigate('/login');
    };

    const handlePhotoUpdate = () => {
        setIsUpdatingPhoto(true);
        // Simulate photo upload
        setTimeout(() => {
            setIsUpdatingPhoto(false);
            // Just for demo, keeping same photo or could rotate
        }, 1500);
    };

    return (
        <div className="min-h-screen pt-32 pb-20 px-6">
            <div className="max-w-4xl mx-auto space-y-12">
                {/* Header Profile Section */}
                <section className="flex flex-col md:flex-row items-center gap-12 p-12 rounded-[56px] bg-white/5 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -mr-32 -mt-32 transition-colors group-hover:bg-accent/10" />
                    
                    <div className="relative group/avatar">
                        <div className="w-40 h-40 rounded-[48px] overflow-hidden border-2 border-accent/20 p-2 bg-black/50">
                            <img 
                                src={userData.avatar} 
                                alt={userData.name} 
                                className={cn("w-full h-full object-cover rounded-[40px] transition-opacity", isUpdatingPhoto && "opacity-50")}
                                referrerPolicy="no-referrer"
                            />
                            {isUpdatingPhoto && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={handlePhotoUpdate}
                            className="absolute bottom-2 right-2 w-12 h-12 rounded-2xl bg-accent text-primary flex items-center justify-center border-4 border-[#010312] hover:scale-110 transition-all shadow-xl"
                        >
                            <Camera className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-grow space-y-4 text-center md:text-left">
                        <div className="space-y-1">
                            <h1 className="archivo-black text-4xl text-white uppercase italic tracking-tighter leading-none">
                                {userData.name}
                            </h1>
                            <p className="text-white/30 text-xs font-black uppercase tracking-widest tracking-[0.2em] italic">
                                Membre depuis {userData.joinedDate}
                            </p>
                        </div>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                            <div className="px-4 py-2 bg-white/5 rounded-full border border-white/5 flex items-center gap-3">
                                <ShieldCheck className="w-4 h-4 text-accent" />
                                <span className="text-[10px] font-black uppercase text-accent tracking-widest">Compte Vérifié</span>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => setIsEditing(!isEditing)}
                        className="p-4 rounded-2xl bg-white/5 border border-white/5 text-white/40 hover:text-accent hover:border-accent/20 transition-all"
                    >
                        <Edit2 className="w-5 h-5" />
                    </button>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Information Personnelle */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <h3 className="archivo-black text-xs text-white/30 uppercase tracking-[0.3em] italic ml-4">Informations</h3>
                        <div className="bg-white/5 border border-white/5 rounded-[40px] p-8 space-y-8">
                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                                    <Mail className="w-5 h-5 text-accent" />
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">Email</div>
                                    <div className="text-white font-bold">{userData.email}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                                    <Phone className="w-5 h-5 text-accent" />
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">Téléphone</div>
                                    <div className="text-white font-bold">{userData.phone}</div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Paramètres & Actions */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-6"
                    >
                        <h3 className="archivo-black text-xs text-white/30 uppercase tracking-[0.3em] italic ml-4">Paramètres</h3>
                        <div className="bg-white/5 border border-white/5 rounded-[40px] p-2 overflow-hidden">
                            <button 
                                onClick={() => setShowPasswordModal(true)}
                                className="w-full p-6 flex items-center justify-between hover:bg-white/5 rounded-[32px] transition-all group"
                            >
                                <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                                        <ShieldAlert className="w-5 h-5 text-white/40 group-hover:text-accent transition-colors" />
                                    </div>
                                    <span className="text-white/60 font-bold uppercase tracking-widest text-[10px] group-hover:text-white transition-colors">Modifier le mot de passe</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-accent transition-colors" />
                            </button>

                            <button 
                                onClick={handleLogout}
                                className="w-full p-6 flex items-center justify-between hover:bg-red-500/10 rounded-[32px] transition-all group mt-2"
                            >
                                <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 rounded-2xl bg-red-500/5 flex items-center justify-center">
                                        <LogOut className="w-5 h-5 text-red-500" />
                                    </div>
                                    <span className="text-red-500/60 font-bold uppercase tracking-widest text-[10px]">Déconnexion</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-red-500/10 group-hover:text-red-500 transition-colors" />
                            </button>
                        </div>

                        <div className="bg-accent/5 border border-accent/10 rounded-[40px] p-8 mt-6">
                            <h4 className="text-accent text-[10px] font-black uppercase tracking-widest mb-2">Besoin d'aide ?</h4>
                            <p className="text-accent/40 text-[11px] leading-relaxed italic border-l border-accent/20 pl-4">
                                Notre support est disponible 24/7 pour vous accompagner dans vos réservations ou la gestion de votre compte.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-24">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowPasswordModal(false)}
                        className="absolute inset-0 bg-[#010312]/90 backdrop-blur-3xl"
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="relative w-full max-w-lg bg-white/5 border border-white/10 rounded-[48px] p-12 space-y-10"
                    >
                        <div className="space-y-4">
                            <h2 className="archivo-black text-3xl text-white uppercase italic tracking-tighter">Sécurité</h2>
                            <p className="text-white/30 font-bold italic text-sm">Mettez à jour votre mot de passe pour rester protégé.</p>
                        </div>

                        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); setShowPasswordModal(false); }}>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Ancien Mot de Passe</label>
                                <input 
                                    type="password" 
                                    className="w-full px-6 py-5 bg-white/5 border-2 border-white/10 rounded-3xl outline-none focus:border-accent text-white font-bold transition-all"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Nouveau Mot de Passe</label>
                                <input 
                                    type="password" 
                                    className="w-full px-6 py-5 bg-white/5 border-2 border-white/10 rounded-3xl outline-none focus:border-accent text-white font-bold transition-all"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Confirmer le nouveau</label>
                                <input 
                                    type="password" 
                                    className="w-full px-6 py-5 bg-white/5 border-2 border-white/10 rounded-3xl outline-none focus:border-accent text-white font-bold transition-all"
                                    required
                                />
                            </div>

                            <button className="w-full bg-accent text-primary py-5 rounded-3xl font-black uppercase tracking-widest text-sm hover:bg-white transition-all shadow-xl shadow-accent/5">
                                Confirmer la modification
                            </button>
                        </form>

                        <button 
                            onClick={() => setShowPasswordModal(false)}
                            className="w-full py-4 text-white/20 font-black uppercase tracking-widest text-[10px] hover:text-white transition-colors"
                        >
                            Annuler
                        </button>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
