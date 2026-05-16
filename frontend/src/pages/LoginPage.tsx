import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, Anchor, ArrowRight, ChevronLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

import { SafariLogo } from '../components/SafariLogo';
import googleLogo from '../assets/logo_google.png';

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate auth
        setTimeout(() => {
            navigate('/');
            setLoading(false);
        }, 1000);
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-[#010312] overflow-hidden">
            {/* Left Column: Image/Banner */}
            <div className="md:w-1/2 bg-primary relative hidden md:flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img 
                        src="https://images.unsplash.com/photo-1544911845-1f34a3eb46b1?q=80&w=1470&auto=format&fit=crop" 
                        alt="Voyage" 
                        className="w-full h-full object-cover opacity-20 mix-blend-luminosity scale-110"
                        referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-transparent"></div>
                </div>
                <div className="absolute top-12 left-12">
                   <SafariLogo className="h-40" />
                </div>
                <div className="relative z-10 p-20 space-y-8">
                    <h2 className="archivo-black text-6xl text-white uppercase tracking-tighter leading-none">
                        Explorez<br />le Congo<br /><span className="text-accent">autrement.</span>
                    </h2>
                    <p className="text-white/40 text-lg max-w-md font-medium leading-relaxed">
                        Rejoignez des milliers de voyageurs et réservez vos traversées en quelques secondes sur le lac Tanganyika.
                    </p>
                    <div className="flex gap-12 pt-8">
                        <div>
                            <div className="text-accent archivo-black text-3xl font-black">24/7</div>
                            <div className="text-white/20 text-[10px] uppercase font-black tracking-widest">Support Voyageurs</div>
                        </div>
                        <div>
                            <div className="text-accent archivo-black text-3xl font-black">100%</div>
                            <div className="text-white/20 text-[10px] uppercase font-black tracking-widest">Sécurisé</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Form */}
            <div className="flex-grow flex flex-col items-center justify-center p-8 pt-32 md:pt-8 bg-white/5 backdrop-blur-xl border-l border-white/5 relative">
                <button 
                    onClick={() => navigate('/')}
                    className="absolute top-12 left-12 flex items-center gap-2 text-white/30 hover:text-accent transition-all group"
                >
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:border-accent/20 group-hover:bg-accent/5">
                        <ChevronLeft className="w-5 h-5" />
                    </div>
                </button>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md space-y-12"
                >
                    <div className="space-y-4">
                        <h1 className="archivo-black text-4xl text-white uppercase tracking-tighter">Bienvenue à bord</h1>
                        <p className="text-white/30 font-bold">Connectez-vous pour gérer vos réservations.</p>
                    </div>

                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                                <input 
                                    type="email" 
                                    placeholder="nom@exemple.com"
                                    className="w-full pl-12 pr-4 py-5 bg-white/5 border-2 border-white/10 rounded-3xl outline-none focus:border-accent text-white transition-all font-bold placeholder:text-white/10"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Mot de passe</label>
                                <Link to="/forgot-password" size="sm" className="text-xs text-accent font-bold hover:underline">Oublié ?</Link>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder="••••••••"
                                    className="w-full pl-12 pr-12 py-5 bg-white/5 border-2 border-white/10 rounded-3xl outline-none focus:border-accent text-white transition-all font-bold placeholder:text-white/10"
                                    required
                                />
                                <button 
                                    type="button"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 text-white/20 flex items-center justify-center hover:text-accent"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full bg-accent text-primary py-5 rounded-3xl font-black text-lg shadow-xl shadow-accent/10 hover:bg-white transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading ? 'Connexion...' : 'Se Connecter'}
                            {!loading && <ArrowRight className="w-5 h-5" />}
                        </button>
                    </form>

                    <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                        <div className="relative flex justify-center text-[10px] uppercase font-black text-white/20 tracking-widest"><span className="bg-[#010312] px-4">Ou continuer avec</span></div>
                    </div>

                    <button className="w-full bg-white/5 border-2 border-white/10 text-white py-5 rounded-3xl font-bold flex items-center justify-center gap-4 hover:border-white/20 transition-all shadow-sm">
                        <img src={googleLogo} alt="Google" className={cn("w-5 h-5 object-contain")} />
                        Continuer avec Google
                    </button>

                    <p className="text-center text-sm font-bold text-white/30">
                        Nouveau voyageur ? <Link to="/register" className="text-accent hover:underline">Créer un compte</Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
