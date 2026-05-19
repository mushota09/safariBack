import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, ArrowRight, ArrowLeft, Send, ShieldCheck, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { SafariLogo } from '../components/SafariLogo';
import { authService } from '../services/authService';

type Step = 'email' | 'otp' | 'reset' | 'success';

export default function ForgotPasswordPage() {
    const [step, setStep] = useState<Step>('email');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
    const navigate = useNavigate();

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await authService.forgotPassword({ email });
            setStep('otp');
        } catch (err: any) {
            setError(err.message || 'Échec de l\'envoi du code');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const otpCode = otp.join('');

        try {
            await authService.verifyOTP({ email, otp: otpCode });
            setStep('reset');
        } catch (err: any) {
            setError(err.message || 'Code OTP invalide ou expiré');
        } finally {
            setLoading(false);
        }
    };

    const handleResetSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (newPassword !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas');
            setLoading(false);
            return;
        }

        const otpCode = otp.join('');

        try {
            await authService.resetPassword({
                email,
                otp: otpCode,
                new_password: newPassword,
            });
            setStep('success');
        } catch (err: any) {
            setError(err.message || 'Échec de la réinitialisation');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) value = value.slice(-1);
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleResendOTP = async () => {
        setLoading(true);
        setError(null);

        try {
            await authService.forgotPassword({ email });
            setOtp(['', '', '', '', '', '']);
        } catch (err: any) {
            setError(err.message || 'Échec du renvoi du code');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-[#010312] overflow-hidden">
            {/* Left Column: Image/Banner */}
            <div className="md:w-1/2 bg-primary relative hidden md:flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1517315003714-a071486bd9ea?q=80&w=1471&auto=format&fit=crop"
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
                        La sécurité<br />de votre<br /><span className="text-accent">compte.</span>
                    </h2>
                    <p className="text-white/40 text-lg max-w-md font-medium leading-relaxed italic">
                        Pas de panique. Suivez les étapes pour réinitialiser votre mot de passe et reprendre votre voyage en toute sécurité.
                    </p>
                    <div className="flex gap-12 pt-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                                <ShieldCheck className="w-6 h-6 text-accent" />
                            </div>
                            <div>
                                <div className="text-white archivo-black text-lg font-black uppercase">Vérifié</div>
                                <div className="text-white/20 text-[9px] uppercase font-black tracking-widest leading-none">Protocole de sécurité strict</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Form Rendering based on Step */}
            <div className="flex-grow flex items-center justify-center p-8 pt-32 md:pt-8 bg-white/5 backdrop-blur-xl border-l border-white/5">
                <div className="w-full max-w-md space-y-12">
                    {step !== 'success' && (
                        <button
                            onClick={() => step === 'email' ? navigate('/login') : setStep('email')}
                            className="inline-flex items-center gap-2 text-white/30 hover:text-accent transition-colors font-bold text-xs uppercase tracking-widest"
                        >
                            <ArrowLeft className="w-4 h-4" /> {step === 'email' ? 'Retour à la connexion' : 'Retour'}
                        </button>
                    )}

                    <AnimatePresence mode="wait">
                        {step === 'email' && (
                            <motion.div
                                key="email"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-10"
                            >
                                <div className="space-y-4">
                                    <h1 className="archivo-black text-4xl text-white uppercase tracking-tighter">Récupération</h1>
                                    <p className="text-white/30 font-bold italic">Entrez votre email pour recevoir votre code de vérification.</p>
                                </div>

                                <form className="space-y-6" onSubmit={handleEmailSubmit}>
                                    {error && (
                                        <div className="bg-red-500/10 border-2 border-red-500/20 rounded-2xl p-4 text-red-400 text-sm font-bold">
                                            {error}
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Email</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                                            <input
                                                type="email"
                                                placeholder="nom@exemple.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full pl-12 pr-4 py-5 bg-white/5 border-2 border-white/10 rounded-3xl outline-none focus:border-accent text-white transition-all font-bold placeholder:text-white/10"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-accent text-primary py-5 rounded-3xl font-black text-lg shadow-xl shadow-accent/10 hover:bg-white transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {loading ? 'Envoi...' : 'Envoyer le code'}
                                        {!loading && <Send className="w-5 h-5" />}
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {step === 'otp' && (
                            <motion.div
                                key="otp"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-10"
                            >
                                <div className="space-y-4">
                                    <h1 className="archivo-black text-4xl text-white uppercase tracking-tighter">Vérification</h1>
                                    <p className="text-white/30 font-bold italic">Nous vous avons envoyé un code à 6 chiffres par email.</p>
                                </div>

                                <form className="space-y-8" onSubmit={handleOtpSubmit}>
                                    {error && (
                                        <div className="bg-red-500/10 border-2 border-red-500/20 rounded-2xl p-4 text-red-400 text-sm font-bold">
                                            {error}
                                        </div>
                                    )}

                                    <div className="flex justify-between gap-2">
                                        {otp.map((digit, i) => (
                                            <input
                                                key={i}
                                                ref={el => otpRefs.current[i] = el}
                                                type="text"
                                                maxLength={1}
                                                value={digit}
                                                onChange={e => handleOtpChange(i, e.target.value)}
                                                onKeyDown={e => handleKeyDown(i, e)}
                                                className="w-full aspect-square bg-white/5 border-2 border-white/10 rounded-2xl text-center text-2xl font-black text-accent outline-none focus:border-accent transition-all"
                                            />
                                        ))}
                                    </div>

                                    <div className="space-y-4">
                                        <button
                                            type="submit"
                                            disabled={loading || otp.some(d => !d)}
                                            className="w-full bg-accent text-primary py-5 rounded-3xl font-black text-lg shadow-xl shadow-accent/10 hover:bg-white transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                        >
                                            {loading ? 'Vérification...' : 'Vérifier le code'}
                                            {!loading && <ShieldCheck className="w-5 h-5" />}
                                        </button>
                                        <div className="text-center">
                                            <button
                                                type="button"
                                                onClick={handleResendOTP}
                                                disabled={loading}
                                                className="text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-accent transition-colors italic disabled:opacity-50"
                                            >
                                                Renvoyer le code
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {step === 'reset' && (
                            <motion.div
                                key="reset"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-10"
                            >
                                <div className="space-y-4">
                                    <h1 className="archivo-black text-4xl text-white uppercase tracking-tighter">Nouveau Mot de Passe</h1>
                                    <p className="text-white/30 font-bold italic">Choisissez un mot de passe fort pour sécuriser votre compte.</p>
                                </div>

                                <form className="space-y-6" onSubmit={handleResetSubmit}>
                                    {error && (
                                        <div className="bg-red-500/10 border-2 border-red-500/20 rounded-2xl p-4 text-red-400 text-sm font-bold">
                                            {error}
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Nouveau Mot de Passe</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Minimum 6 caractères"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full pl-12 pr-12 py-5 bg-white/5 border-2 border-white/10 rounded-3xl outline-none focus:border-accent text-white transition-all font-bold placeholder:text-white/10"
                                                required
                                                minLength={6}
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

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Confirmer le mot de passe</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Répétez votre mot de passe"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full pl-12 pr-12 py-5 bg-white/5 border-2 border-white/10 rounded-3xl outline-none focus:border-accent text-white transition-all font-bold placeholder:text-white/10"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-accent text-primary py-5 rounded-3xl font-black text-lg shadow-xl shadow-accent/10 hover:bg-white transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {loading ? 'Mise à jour...' : 'Réinitialiser le mot de passe'}
                                        {!loading && <ArrowRight className="w-5 h-5" />}
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {step === 'success' && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-accent/10 border-2 border-accent/20 p-10 rounded-[40px] text-center space-y-6"
                            >
                                <div className="w-24 h-24 rounded-[32px] bg-accent text-primary flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="w-12 h-12" />
                                </div>
                                <h2 className="archivo-black text-3xl text-white uppercase tracking-tighter">Félicitations !</h2>
                                <p className="text-white/40 text-sm leading-relaxed italic">
                                    Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter à votre compte.
                                </p>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="w-full bg-accent text-primary py-5 rounded-3xl font-black text-lg uppercase tracking-widest hover:bg-white transition-all shadow-xl shadow-accent/10"
                                >
                                    Se connecter
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {step !== 'success' && (
                        <p className="text-center text-sm font-bold text-white/30">
                            Besoin d'aide ? <button type="button" className="text-accent hover:underline">Contacter le support</button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
