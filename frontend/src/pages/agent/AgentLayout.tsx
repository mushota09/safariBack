import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    QrCode, 
    Ship, 
    User, 
    LogOut,
    Menu,
    X,
    ChevronLeft,
    Wifi,
    WifiOff
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { SafariLogo } from '../../components/SafariLogo';

interface AgentLayoutProps {
    children: ReactNode;
}

export default function AgentLayout({ children }: AgentLayoutProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [isOnline, setIsOnline] = React.useState(true);

    const navItems = [
        { name: 'Scanner', path: '/agent/scan', icon: QrCode },
        { name: 'Mes Scans', path: '/agent/scans', icon: Ship },
        { name: 'Profil', path: '/agent/profile', icon: User },
    ];

    const currentPath = location.pathname;

    return (
        <div className="min-h-screen bg-[#010312] text-white flex flex-col">
            {/* Header */}
            <header className="h-20 bg-[#0A0C1A] border-b border-white/5 px-6 flex items-center justify-between sticky top-0 z-[60]">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center p-2"
                    >
                        {isMenuOpen ? <X className="w-5 h-5 text-accent" /> : <Menu className="w-5 h-5 text-white/40" />}
                    </button>
                    <Link to="/agent" className="flex items-center gap-3">
                        <SafariLogo className="h-8" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-accent italic">Agent</span>
                    </Link>
                </div>

                <div className="flex items-center gap-4">
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                        isOnline ? "text-green-500 border-green-500/20 bg-green-500/10" : "text-red-500 border-red-500/20 bg-red-500/10"
                    )}>
                        {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        {isOnline ? 'En Ligne' : 'Hors Ligne'}
                    </div>
                </div>
            </header>

            {/* Menu Mobile Fullscreen */}
            <AnimatePresence>
                {isMenuOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMenuOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[50]"
                        />
                        <motion.div 
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-20 bottom-0 left-0 w-80 bg-[#0A0C1A] border-r border-white/5 z-[55] flex flex-col p-8"
                        >
                            <nav className="flex-grow space-y-4">
                                {navItems.map((item) => {
                                    const isActive = currentPath === item.path;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => setIsMenuOpen(false)}
                                            className={cn(
                                                "flex items-center gap-6 p-6 rounded-3xl transition-all",
                                                isActive ? "bg-accent text-primary" : "text-white/40 hover:bg-white/5"
                                            )}
                                        >
                                            <item.icon className="w-6 h-6" />
                                            <span className="archivo-black text-sm uppercase italic tracking-widest">{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </nav>

                            <button 
                                onClick={() => navigate('/login')}
                                className="flex items-center gap-6 p-6 rounded-3xl text-red-500/60 hover:bg-red-500/10"
                            >
                                <LogOut className="w-6 h-6" />
                                <span className="archivo-black text-sm uppercase italic tracking-widest">Quitter</span>
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-grow flex flex-col container mx-auto max-w-lg px-6 py-10 pb-32">
                {children}
            </main>

            {/* Bottom Nav Mobile */}
            <nav className="fixed bottom-0 inset-x-0 h-20 bg-[#0A0C1A]/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-6 z-40">
                {navItems.map((item) => {
                    const isActive = currentPath === item.path;
                    return (
                        <Link 
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex flex-col items-center gap-1 transition-all",
                                isActive ? "text-accent scale-110" : "text-white/20"
                            )}
                        >
                            <item.icon className={cn("w-6 h-6", isActive ? "stroke-[3px]" : "stroke-2")} />
                            <span className="text-[9px] font-black uppercase tracking-widest">{item.name}</span>
                        </Link>
                    )
                })}
            </nav>
        </div>
    );
}
