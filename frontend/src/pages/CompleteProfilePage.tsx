import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, ArrowRight, ShieldCheck, Calendar, Phone, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SafariLogo } from '../components/SafariLogo';
import { authService } from '../services/authService';

export default function CompleteProfilePage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tokensReady, setTokensReady] = useState(false);
    const [tokenError, setTokenError] = useState(false);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Form state
    const [dateNaissance, setDateNaissance] = useState('');
    const [numeroTelephone, setNumeroTelephone] = useState('');
    const [documentIdentite, setDocumentIdentite] = useState('');
    const [nationalite, setNationalite] = useState('');
    const [sexe, setSexe] = useState<'masculin' | 'feminin' | ''>('');

    useEffect(() => {
        // Get tokens from URL - try multiple methods
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');

        // Also try to get from window.location (fallback)
        const urlParams = new URLSearchParams(window.location.search);
        const accessTokenFromWindow = urlParams.get('access_token');
        const refreshTokenFromWindow = urlParams.get('refresh_token');

        console.log('🔍 CompleteProfilePage - Checking tokens from URL');
        console.log('Method 1 (useSearchParams):');
        console.log('  Access Token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'NOT FOUND');
        console.log('  Refresh Token:', refreshToken ? `${refreshToken.substring(0, 20)}...` : 'NOT FOUND');
        console.log('Method 2 (window.location):');
        console.log('  Access Token:', accessTokenFromWindow ? `${accessTokenFromWindow.substring(0, 20)}...` : 'NOT FOUND');
        console.log('  Refresh Token:', refreshTokenFromWindow ? `${refreshTokenFromWindow.substring(0, 20)}...` : 'NOT FOUND');
        console.log('Full URL:', window.location.href);

        // Use whichever method found the tokens
        const finalAccessToken = accessToken || accessTokenFromWindow;
        const finalRefreshToken = refreshToken || refreshTokenFromWindow;

        if (finalAccessToken && finalRefreshToken) {
            // Store tokens
            localStorage.setItem('access_token', finalAccessToken);
            localStorage.setItem('refresh_token', finalRefreshToken);
            console.log('✅ Tokens stored in localStorage');

            // Verify storage
            const storedAccess = localStorage.getItem('access_token');
            const storedRefresh = localStorage.getItem('refresh_token');
            console.log('Verification - Access Token stored:', storedAccess ? 'YES' : 'NO');
            console.log('Verification - Refresh Token stored:', storedRefresh ? 'YES' : 'NO');

            setTokensReady(true);
        } else {
            console.error('❌ No tokens found in URL');
            console.error('This means the backend did not redirect with tokens.');
            console.error('Please check:');
            console.error('1. Backend is running on http://localhost:8000');
            console.error('2. Google OAuth callback is working');
            console.error('3. Backend logs for any errors');

            setTokenError(true);

            // Don't redirect immediately, give user time to see the error
            setTimeout(() => {
                navigate('/login');
            }, 5000);
        }
    }, [searchParams, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('access_token');

            console.log('🚀 Submitting complete profile form');
            console.log('Access Token from localStorage:', token ? `${token.substring(0, 20)}...` : 'NOT FOUND');

            if (!token) {
                console.error('❌ No access token found in localStorage');
                throw new Error('No access token found. Please try logging in again.');
            }

            const payload = {
                numero_telephone: numeroTelephone,
                date_naissance: dateNaissance,
                document_identite: documentIdentite || undefined,
                nationalite: nationalite || undefined,
                sexe: sexe || undefined,
            };

            console.log('📤 Sending payload:', payload);

            // Complete profile with all fields
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${API_URL}/auth/complete-profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            console.log('📥 Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Error response:', errorData);
                throw new Error(errorData.detail || 'Failed to complete profile');
            }

            const userData = await response.json();
            console.log('✅ Profile completed successfully:', userData);

            // Profile completed successfully, redirect to home
            navigate('/');
        } catch (err: any) {
            console.error('❌ Error in handleSubmit:', err);
            setError(err.message || 'Échec de la complétion du profil');
        } finally {
            setLoading(false);
        }
    };

    // Show error state if tokens not found
    if (tokenError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#010312] p-8">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full text-center space-y-6 bg-red-500/10 border-2 border-red-500/20 rounded-3xl p-8"
                >
                    <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/30 flex items-center justify-center mx-auto">
                        <span className="text-4xl">⚠️</span>
                    </div>
                    <div className="space-y-3">
                        <h2 className="archivo-black text-2xl text-white uppercase tracking-tighter">
                            Erreur d'authentification
                        </h2>
                        <p className="text-red-400 text-sm font-bold">
                            Les tokens d'authentification n'ont pas été trouvés dans l'URL.
                        </p>
                        <p className="text-white/40 text-xs">
                            Cela peut arriver si:
                        </p>
                        <ul className="text-white/30 text-xs text-left space-y-1 pl-6">
                            <li>• Le backend n'est pas démarré</li>
                            <li>• La redirection Google a échoué</li>
                            <li>• L'URL a été modifiée manuellement</li>
                        </ul>
                        <p className="text-white/40 text-xs italic pt-4">
                            Redirection vers la page de connexion dans 5 secondes...
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full bg-accent text-primary py-4 rounded-3xl font-black text-sm hover:bg-white transition-all"
                    >
                        Retour à la connexion
                    </button>
                </motion.div>
            </div>
        );
    }

    // Show loading state while tokens are being processed
    if (!tokensReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#010312]">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-6"
                >
                    <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <div className="space-y-2">
                        <h2 className="archivo-black text-2xl text-white uppercase tracking-tighter">
                            Préparation...
                        </h2>
                        <p className="text-white/40 text-sm">
                            Chargement de votre profil
                        </p>
                    </div>
                </motion.div>
            </div>
        );
    }

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
                        Presque<br />terminé !<br /><span className="text-accent">Une dernière étape.</span>
                    </h2>
                    <p className="text-white/40 text-lg max-w-md font-medium leading-relaxed italic">
                        Complétez votre profil pour finaliser votre inscription et commencer à réserver vos traversées.
                    </p>
                    <div className="flex gap-12 pt-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-accent" />
                            </div>
                            <div>
                                <div className="text-white archivo-black text-lg font-black uppercase">Vérifié</div>
                                <div className="text-white/20 text-[9px] uppercase font-black tracking-widest leading-none">Compte Google connecté</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Form */}
            <div className="flex-grow flex flex-col items-center justify-center p-8 pt-32 md:pt-8 bg-white/5 backdrop-blur-xl border-l border-white/5 relative">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md space-y-12"
                >
                    <div className="text-center space-y-6">
                        <div className="w-20 h-20 rounded-[32px] bg-accent/20 border border-accent/20 flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-10 h-10 text-accent" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="archivo-black text-3xl text-white uppercase tracking-tighter">Presque fini !</h2>
                            <p className="text-white/30 font-bold italic">Compte Google vérifié. Complétez vos informations.</p>
                        </div>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-500/10 border-2 border-red-500/20 rounded-2xl p-4 text-red-400 text-sm font-bold">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Date de Naissance *</label>
                            <div className="relative group">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                                <input
                                    type="date"
                                    value={dateNaissance}
                                    onChange={(e) => setDateNaissance(e.target.value)}
                                    className="w-full pl-12 pr-4 py-5 bg-white/5 border-2 border-white/10 rounded-3xl outline-none focus:border-accent text-white transition-all font-bold [color-scheme:dark]"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Numéro de Téléphone *</label>
                            <div className="relative group">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                                <input
                                    type="tel"
                                    placeholder="+243 ..."
                                    value={numeroTelephone}
                                    onChange={(e) => setNumeroTelephone(e.target.value)}
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
                                    value={documentIdentite}
                                    onChange={(e) => setDocumentIdentite(e.target.value)}
                                    className="w-full pl-12 pr-4 py-5 bg-white/5 border-2 border-white/10 rounded-3xl outline-none focus:border-accent text-white transition-all font-bold placeholder:text-white/10"
                                />
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
                                        value={nationalite}
                                        onChange={(e) => setNationalite(e.target.value)}
                                        className="w-full pl-12 pr-4 py-5 bg-white/5 border-2 border-white/10 rounded-3xl outline-none focus:border-accent text-white transition-all font-bold placeholder:text-white/10"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Sexe</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent transition-colors" />
                                    <select
                                        value={sexe}
                                        onChange={(e) => setSexe(e.target.value as 'masculin' | 'feminin')}
                                        className="w-full pl-12 pr-4 py-5 bg-white/5 border-2 border-white/10 rounded-3xl outline-none focus:border-accent text-white transition-all font-bold [color-scheme:dark]"
                                    >
                                        <option value="">Sélectionner</option>
                                        <option value="masculin">Masculin</option>
                                        <option value="feminin">Féminin</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-accent text-primary py-5 rounded-3xl font-black text-lg shadow-xl shadow-accent/10 hover:bg-white transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading ? 'Finalisation...' : 'Finaliser l\'inscription'}
                            {!loading && <ArrowRight className="w-5 h-5" />}
                        </button>
                    </form>

                    <p className="text-center text-xs text-white/30 italic">
                        * Champs obligatoires
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
