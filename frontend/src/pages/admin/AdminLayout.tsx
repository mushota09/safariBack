import React, { ReactNode } from 'react';
import { motion } from 'motion/react';
import { 
    LayoutDashboard, 
    Ship, 
    Calendar, 
    Users, 
    CreditCard, 
    MapPin, 
    Settings, 
    LogOut,
    Bell,
    User,
    Menu,
    X,
    ChevronDown,
    Search,
    Ticket,
    Activity
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { SafariLogo } from '../../components/SafariLogo';

interface AdminLayoutProps {
    children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = React.useState(true);

    const navItems = [
        { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
        { name: 'Voyages', path: '/admin/voyages', icon: Calendar },
        { name: 'Réservations', path: '/admin/reservations', icon: Ticket },
        { name: 'Bateaux', path: '/admin/bateaux', icon: Ship },
        { name: 'Paiements', path: '/admin/paiements', icon: CreditCard },
        { name: 'Agents', path: '/admin/agents', icon: Users },
        { name: 'Géographie', path: '/admin/geo', icon: MapPin },
        { name: 'Journal', path: '/admin/audit', icon: Activity },
    ];

    const currentPath = location.pathname;

    return (
        <div className="min-h-screen bg-[#010312] text-white flex overflow-hidden">
            {/* Sidebar */}
            <aside 
                className={cn(
                    "fixed inset-y-0 left-0 z-50 bg-[#0A0C1A] border-r border-white/5 transition-all duration-500",
                    sidebarOpen ? "w-72" : "w-20 -translate-x-full lg:translate-x-0"
                )}
            >
                <div className="flex flex-col h-full">
                    <div className="h-24 flex items-center px-6 border-b border-white/5">
                        <Link to="/" className="flex items-center gap-3">
                            <SafariLogo className="h-8" />
                            {sidebarOpen && (
                                <div className="space-y-0">
                                    <span className="archivo-black text-xs uppercase tracking-widest text-accent leading-none">Admin</span>
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest leading-none">Backoffice</p>
                                </div>
                            )}
                        </Link>
                    </div>

                    <nav className="flex-grow py-8 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                        {navItems.map((item) => {
                            const isActive = currentPath === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={cn(
                                        "flex items-center gap-4 px-4 py-4 rounded-2xl transition-all group",
                                        isActive 
                                            ? "bg-accent text-primary shadow-lg shadow-accent/10" 
                                            : "text-white/40 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "group-hover:text-accent transition-colors")} />
                                    {sidebarOpen && <span className="text-sm font-black uppercase tracking-widest leading-none pt-1">{item.name}</span>}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t border-white/5">
                        <button 
                            onClick={() => navigate('/login')}
                            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-red-500/60 hover:text-red-500 hover:bg-red-500/5 transition-all group"
                        >
                            <LogOut className="w-5 h-5" />
                            {sidebarOpen && <span className="text-sm font-black uppercase tracking-widest leading-none pt-1">Déconnexion</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className={cn(
                "flex-grow transition-all duration-500 flex flex-col",
                sidebarOpen ? "lg:ml-72" : "lg:ml-20"
            )}>
                {/* Header */}
                <header className="h-24 bg-[#0A0C1A]/50 backdrop-blur-xl border-b border-white/5 px-8 flex items-center justify-between sticky top-0 z-40">
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center hover:border-accent/20 hover:bg-accent/5 transition-all"
                        >
                            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                        
                        <div className="hidden md:flex items-center bg-white/3 py-3 px-5 rounded-2xl border border-white/5 group focus-within:border-accent/20 transition-all">
                            <Search className="w-4 h-4 text-white/20 group-focus-within:text-accent transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Rechercher une réservation, un voyage..."
                                className="bg-transparent border-none outline-none text-xs font-bold text-white ml-3 w-64 placeholder:text-white/10"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <button className="relative w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all">
                            <Bell className="w-5 h-5 text-white/40" />
                            <span className="absolute top-3 right-3 w-2 h-2 bg-accent rounded-full border-2 border-[#0A0C1A]" />
                        </button>

                        <div className="flex items-center gap-4 pl-6 border-l border-white/5">
                            <div className="text-right hidden sm:block">
                                <p className="text-[10px] font-black text-white uppercase tracking-widest">Admin Safari</p>
                                <p className="text-[9px] font-black text-accent uppercase tracking-widest opacity-60">Super Utilisateur</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-accent p-0.5">
                                <div className="w-full h-full rounded-[14px] bg-primary flex items-center justify-center">
                                    <User className="w-5 h-5 text-accent" />
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
