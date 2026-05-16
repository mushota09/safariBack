import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    User, 
    Lock, 
    ArrowRight, 
    Ship, 
    Users, 
    ChevronLeft,
    ShieldCheck,
    Mail,
    Building
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SafariLogo } from '../components/SafariLogo';
import { cn } from '../lib/utils';

export default function BackofficeLoginPage() {
    const [loginType, setLoginType] = useState<'agent' | 'company' | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            if (loginType === 'agent') {
                navigate('/agent/scan'); // In a real app, this would be based on role
            } else {
                navigate('/admin');
            }
            setLoading(false);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-[#010312] flex flex-col items-center justify-center p-6 bg-grid-white/[0.02] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-accent/10 via-transparent to-primary/20 pointer-events-none" />
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md space-y-12 relative z-10"
            >
                <div className="text-center space-y-6">
                    <div className="flex justify-center">
                        <SafariLogo className="h-20" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="archivo-black text-4xl text-white uppercase italic tracking-tighter italic">Espace Pro</h1>
                        <p className="text-white/30 text-xs font-black uppercase tracking-widest italic">Gestion & Embarquement Safari</p>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {!loginType ? (
                        <motion.div 
                            key="selection"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="grid grid-cols-1 gap-6"
                        >
                            <button 
                                onClick={() => setLoginType('company')}
                                className="group relative p-10 bg-white/5 border-2 border-white/5 rounded-[40px] hover:border-accent/40 hover:bg-accent/5 transition-all text-left"
                            >
                                <div className="flex flex-col gap-6">
                                    <div className="w-16 h-16 rounded-[24px] bg-accent/20 border border-accent/20 flex items-center justify-center group-hover:bg-accent group-hover:text-primary transition-all duration-500">
                                        <Building className="w-8 h-8 text-accent group-hover:text-primary" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="archivo-black text-2xl text-white uppercase italic tracking-tighter">Administration</h3>
                                        <p className="text-xs font-bold text-white/30 italic">Gestion complète, voyages et finances.</p>
                                    </div>
                                </div>
                                <ArrowRight className="absolute bottom-10 right-10 w-6 h-6 text-white/10 group-hover:text-accent group-hover:translate-x-2 transition-all" />
                            </button>

                            <button 
                                onClick={() => setLoginType('agent')}
                                className="group relative p-10 bg-white/5 border-2 border-white/5 rounded-[40px] hover:border-accent/40 hover:bg-accent/5 transition-all text-left"
                            >
                                <div className="flex flex-col gap-6">
                                    <div className="w-16 h-16 rounded-[24px] bg-accent/20 border border-accent/20 flex items-center justify-center group-hover:bg-accent group-hover:text-primary transition-all duration-500">
                                        <Users className="w-8 h-8 text-accent group-hover:text-primary" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="archivo-black text-2xl text-white uppercase italic tracking-tighter">Agent Embarquement</h3>
                                        <p className="text-xs font-bold text-white/30 italic">Scan QR codes et contrôle passagers.</p>
                                    </div>
                                </div>
                                <ArrowRight className="absolute bottom-10 right-10 w-6 h-6 text-white/10 group-hover:text-accent group-hover:translate-x-2 transition-all" />
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="login-form"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-white/5 border border-white/5 rounded-[48px] p-10 space-y-10"
                        >
                            <button 
                                onClick={() => setLoginType(null)}
                                className="flex items-center gap-2 text-[10px] font-black uppercase text-white/30 hover:text-white transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" /> Retour
                            </button>

                            <div className="space-y-2">
                                <h3 className="archivo-black text-2xl text-accent uppercase italic tracking-tighter">
                                    {loginType === 'agent' ? 'Connexion Agent' : 'Admin Safari'}
                                </h3>
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest italic">Veuillez vous identifier</p>
                            </div>

                            <form className="space-y-6" onSubmit={handleLogin}>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1">Identifiant ou Email</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/10 group-focus-within:text-accent transition-colors" />
                                        <input 
                                            type="text" 
                                            placeholder="Ex: agent_092"
                                            className="w-full pl-16 pr-6 py-5 bg-white/5 border-2 border-white/10 rounded-[24px] outline-none focus:border-accent text-white font-bold transition-all placeholder:text-white/5"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1">Mot de passe</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/10 group-focus-within:text-accent transition-colors" />
                                        <input 
                                            type="password" 
                                            placeholder="••••••••"
                                            className="w-full pl-16 pr-6 py-5 bg-white/5 border-2 border-white/10 rounded-[24px] outline-none focus:border-accent text-white font-bold transition-all placeholder:text-white/5"
                                            required
                                        />
                                    </div>
                                </div>

                                <button 
                                    disabled={loading}
                                    className="w-full bg-accent text-primary py-5 rounded-[24px] archivo-black text-base uppercase tracking-widest italic hover:bg-white transition-all shadow-xl shadow-accent/5 disabled:opacity-50"
                                >
                                    {loading ? 'Connexion...' : 'S\'identifier'}
                                </button>
                            </form>

                            <div className="flex items-center justify-center gap-3 py-4 border-t border-white/5">
                                <ShieldCheck className="w-4 h-4 text-accent/40" />
                                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Serveur Sécurisé TLS/SSL</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <p className="text-center text-[10px] text-white/10 uppercase tracking-widest font-black italic">
                    Propulsé par <span className="text-white/20">InterLake Systems</span>
                </p>
            </motion.div>
        </div>
    );
}
