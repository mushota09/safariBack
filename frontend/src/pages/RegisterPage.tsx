import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, ShieldCheck, Calendar, Phone, CheckCircle2, ChevronLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { SafariLogo } from '../components/SafariLogo';
import googleLogo from '../assets/logo_google.png';
import { authService, RegisterData } from '../services/authService';

export default function RegisterPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showGoogleExtra, setShowGoogleExtra] = useState(false);
    const navigate = useNavigate();

    // Form state
    const [formData, setFormData] = useState<RegisterData>({
        email: '',
        nom_complet: '',
        numero_telephone: '',
        password: '',
        date_naissance: '',
        document_identite: '',
        nationalite: '',
        sexe: undefined,
        langue_preferee: 'fr',
    });
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleInputChange = (field: keyof RegisterData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Validate passwords match
        if (formData.password !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas');
            setLoading(false);
            return;
        }

        try {
            const user = await authService.register(formData);
            // After registration, login automatically
            await authService.login({
                username: formData.email,
                password: formData.password,
            });
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Échec de l\'inscription');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleClick = async () => {
        setLoading(true);
        setError(null);

        try {
            const authUrl = await authService.getGoogleAuthUrl();
            window.location.href = authUrl;
        } catch (err: any) {
            setError(err.message || 'Échec de la connexion Google');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-[#010312] overflow-hidden">
            {/* Left Column: Image/Banner */}
            <div className="md:w-1/2 bg-primary relative hidden md:flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1519451241324-20b4ea2c4220?q=80&w=1470&auto=format&fit=crop"
                        alt="Voyage"
                        className="w-full h-full object-cover opacity-20 mix-blend-luminosity scale-110"
                        referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-transparent"></div>
                </div>
                <div className="absolute top-12 left-12">
                   <SafariLogo className="h-28" />
                </div>
                <div className="relative z-10 p-20 space-y-8">
                    <h2 className="archivo-black text-6xl text-white uppercase tracking-tighter leading-none">
                        Voguez vers<br />de nouveaux<br /><span className="text-accent">horizons.</span>
                    </h2>
                    <p className="text-white/40 text-lg max-w-md font-medium leading-relaxed italic">
                        Créez votre compte en quelques secondes et accédez à l'ensemble des traversées du lac Tanganyika.
                    </p>
                    <div className="flex gap-12 pt-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                                <ShieldCheck className="w-6 h-6 text-accent" />
                            </div>
                            <div>
                                <div className="text-white archivo-black text-lg font-black uppercase">Sécurisé</div>
                                <div className="text-white/20 text-[9px] uppercase font-black tracking-widest leading-none">Protection de vos données</div>
                            </div>
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
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="main-form"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-12"
                        >
                            <div className="space-y-4">
                                <h1 className="archivo-black text-4xl text-white uppercase tracking-tighter">Créer un compte</h1>
                                <p className="text-white/30 font-bold italic">Commencez votre voyage avec nous dès aujourd'hui.</p>
                            </div>

                            <form className="space-y-6" onSubmit={handleRegister}>
                                {error && (
                                    <div className="bg-red-500/10 border-2 border-red-500/20 rounded-2xl p-4 text-red-400 text-sm font-bold">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Nom Complet</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Ex: Jean Mukendi"
                                            value={formData.nom_complet}
                                            onChange={(e) => handleInputChange('nom_complet', e.target.value)}
                                            className="w-full pl-12 pr-4 py-5 bg-white/5 border-2 border-white/10 rounded-3xl outline-none focus:border-accent text-white transition-all font-bold placeholder:text-white/10"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Numéro de pièce d'identité</label>
                                    <div className="relative group">
                                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Ex: 000000000"
                                            value={formData.document_identite}
                                            onChange={(e) => handleInputChange('document_identite', e.target.value)}
                                            className="w-full pl-12 pr-4 py-5 bg-white/5 border-2 border-white/10 rounded-3xl outline-none focus:border-accent text-white transition-all font-bold placeholder:text-white/10"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Date de Naissance</label>
                                        <div className="relative group">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                                            <input
                                                type="date"
                                                value={formData.date_naissance}
                                                onChange={(e) => handleInputChange('date_naissance', e.target.value)}
                                                className="w-full pl-12 pr-4 py-5 bg-white/5 border-2 border-white/10 rounded-3xl outline-none focus:border-accent text-white transition-all font-bold [color-scheme:dark]"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Téléphone</label>
                                        <div className="relative group">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                                            <input
                                                type="tel"
                                                placeholder="+243 ..."
                                                value={formData.numero_telephone}
                                                onChange={(e) => handleInputChange('numero_telephone', e.target.value)}
                                                className="w-full pl-12 pr-4 py-5 bg-white/5 border-2 border-white/10 rounded-3xl outline-none focus:border-accent text-white transition-all font-bold placeholder:text-white/10"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Nationalité</label>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="Ex: Congolaise"
                                                value={formData.nationalite}
                                                onChange={(e) => handleInputChange('nationalite', e.target.value)}
                                                className="w-full pl-12 pr-4 py-5 bg-white/5 border-2 border-white/10 rounded-3xl outline-none focus:border-accent text-white transition-all font-bold placeholder:text-white/10"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Sexe</label>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                                            <select
                                                value={formData.sexe || ''}
                                                onChange={(e) => handleInputChange('sexe', e.target.value as 'masculin' | 'feminin')}
                                                className="w-full pl-12 pr-4 py-5 bg-white/5 border-2 border-white/10 rounded-3xl outline-none focus:border-accent text-white transition-all font-bold [color-scheme:dark]"
                                            >
                                                <option value="">Sélectionner</option>
                                                <option value="masculin">Masculin</option>
                                                <option value="feminin">Féminin</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Email</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                                        <input
                                            type="email"
                                            placeholder="nom@exemple.com"
                                            value={formData.email}
                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                            className="w-full pl-12 pr-4 py-5 bg-white/5 border-2 border-white/10 rounded-3xl outline-none focus:border-accent text-white transition-all font-bold placeholder:text-white/10"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Mot de passe</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="6+ caractères"
                                                value={formData.password}
                                                onChange={(e) => handleInputChange('password', e.target.value)}
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
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Confirmer</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Confirmer"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full pl-12 pr-4 py-5 bg-white/5 border-2 border-white/10 rounded-3xl outline-none focus:border-accent text-white transition-all font-bold placeholder:text-white/10"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 px-1 pt-2">
                                    <input type="checkbox" id="terms" className="mt-1" required />
                                    <label htmlFor="terms" className="text-[10px] text-white/40 font-medium leading-relaxed italic">
                                        J'accepte les <button type="button" className="text-accent underline">Conditions Générales</button> et la <button type="button" className="text-accent underline">Politique de Confidentialité</button>.
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-accent text-primary py-5 rounded-3xl font-black text-lg shadow-xl shadow-accent/10 hover:bg-white transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {loading ? 'Création...' : 'Créer mon compte'}
                                    {!loading && <ArrowRight className="w-5 h-5" />}
                                </button>
                            </form>

                            <div className="relative py-4">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                                <div className="relative flex justify-center text-[10px] uppercase font-black text-white/20 tracking-widest"><span className="bg-[#010312] px-4">Ou s'inscrire avec</span></div>
                            </div>

                            <button
                                onClick={handleGoogleClick}
                                type="button"
                                disabled={loading}
                                className="w-full bg-white/5 border-2 border-white/10 text-white py-5 rounded-3xl font-bold flex items-center justify-center gap-4 hover:border-white/20 transition-all shadow-sm disabled:opacity-50"
                            >
                                <img src={googleLogo} alt="Google" className="w-5 h-5 object-contain" />
                                Continuer avec Google
                            </button>
                        </motion.div>
                    </AnimatePresence>

                    <p className="text-center text-sm font-bold text-white/30">
                        Déjà inscrit ? <Link to="/login" className="text-accent hover:underline">Se connecter</Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
