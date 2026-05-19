import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');

        if (accessToken && refreshToken) {
            // Store tokens
            localStorage.setItem('access_token', accessToken);
            localStorage.setItem('refresh_token', refreshToken);

            // Check for redirect URL from OAuth flow
            const redirectUrl = sessionStorage.getItem('oauth_redirect');
            if (redirectUrl) {
                sessionStorage.removeItem('oauth_redirect');
                setTimeout(() => {
                    navigate(redirectUrl);
                }, 1000);
            } else {
                // Redirect to home
                setTimeout(() => {
                    navigate('/');
                }, 1000);
            }
        } else {
            // No tokens, redirect to login
            navigate('/login');
        }
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#010312]">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6"
            >
                <Loader2 className="w-16 h-16 text-accent mx-auto animate-spin" />
                <div className="space-y-2">
                    <h2 className="archivo-black text-2xl text-white uppercase tracking-tighter">
                        Connexion en cours...
                    </h2>
                    <p className="text-white/40 text-sm">
                        Vous allez être redirigé dans un instant
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
