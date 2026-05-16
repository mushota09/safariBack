import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Ship, Calendar, User, LayoutDashboard, LogIn, Menu, X, Anchor } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Pages (to be created)
import HomePage from './pages/HomePage';
import VoyageDetailPage from './pages/VoyageDetailPage';
import ReservationPage from './pages/ReservationPage';
import LoginPage from './pages/LoginPage';
import MyReservationsPage from './pages/MyReservationsPage';
import ReservationDetailsPage from './pages/ReservationDetailsPage';
import CancelReservationPage from './pages/CancelReservationPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfilePage from './pages/ProfilePage';
import BackofficeLoginPage from './pages/BackofficeLoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminVoyages from './pages/admin/Voyages';
import AdminReservations from './pages/admin/Reservations';
import AdminBateauEditor from './pages/admin/BateauEditor';
import AdminPaiements from './pages/admin/Paiements';
import AdminAgents from './pages/admin/Agents';
import AdminGeographie from './pages/admin/Geographie';
import AgentLayout from './pages/agent/AgentLayout';
import AgentScanner from './pages/agent/Scanner';

import { SafariLogo } from './components/SafariLogo';

function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const hideOnPaths = ['/login', '/register', '/forgot-password', '/backoffice', '/admin', '/agent'];
  if (hideOnPaths.some(path => location.pathname.startsWith(path))) return null;

  const navLinks = [
    { name: 'Programme', path: '/', icon: Calendar },
    { name: 'Mes Réservations', path: '/my-reservations', icon: LayoutDashboard },
    { name: 'Profil', path: '/profile', icon: User },
  ];

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4 flex items-center justify-between",
        isScrolled ? "bg-primary shadow-lg py-3" : "bg-transparent py-5"
      )}
    >
      <Link to="/" className="flex items-center gap-2 group">
        <SafariLogo className="h-20" />
      </Link>

      <nav className="hidden md:flex items-center gap-8">
        {navLinks.map((link) => (
          <Link 
            key={link.path}
            to={link.path}
            className={cn(
              "text-sm font-medium transition-colors hover:text-accent flex items-center gap-2",
              location.pathname === link.path ? "text-accent" : "text-white/80"
            )}
          >
            <link.icon className="w-4 h-4" />
            {link.name}
          </Link>
        ))}
        <Link 
          to="/login"
          className="bg-accent text-primary px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-white transition-colors"
        >
          <LogIn className="w-4 h-4" />
          Connexion
        </Link>
      </nav>

      <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
        {isMenuOpen ? <X /> : <Menu />}
      </button>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 bg-primary border-t border-white/10 p-6 flex flex-col gap-4 md:hidden shadow-2xl"
          >
            {navLinks.map((link) => (
              <Link 
                key={link.path}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className="text-white flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg"
              >
                <link.icon className="w-5 h-5 text-accent" />
                {link.name}
              </Link>
            ))}
            <Link 
              to="/login"
              onClick={() => setIsMenuOpen(false)}
              className="bg-accent text-primary p-4 rounded-xl font-bold text-center mt-4"
            >
              Connexion
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function Footer() {
  const location = useLocation();
  const hideOnPaths = ['/login', '/register', '/forgot-password', '/backoffice', '/admin', '/agent'];
  if (hideOnPaths.some(path => location.pathname.startsWith(path))) return null;

  return (
    <footer className="bg-primary text-white/30 py-16 px-6 border-t border-white/10 uppercase text-[10px] tracking-[0.2em]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="space-y-6">
          <Link to="/" className="flex items-center gap-2 group">
            <SafariLogo className="h-16" />
          </Link>
          <p className="text-sm leading-relaxed normal-case text-white/50">
            Votre plateforme de réservation de billets de bateau en RDC. Voyagez sereinement sur le lac Tanganyika.
          </p>
        </div>
        <div>
          <h4 className="text-white font-bold mb-6 italic normal-case text-sm">Navigation</h4>
          <ul className="space-y-4 text-sm normal-case">
            <li><Link to="/" className="hover:text-accent transition-colors">Programme</Link></li>
            <li><Link to="/my-reservations" className="hover:text-accent transition-colors">Mes Réservations</Link></li>
            <li><Link to="/profile" className="hover:text-accent transition-colors">Profil</Link></li>
            <li><Link to="/login" className="hover:text-accent transition-colors">Se Connecter</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-6 italic normal-case text-sm">Support</h4>
          <ul className="space-y-4 text-sm normal-case">
            <li><a href="#" className="hover:text-accent transition-colors">Aide & FAQ</a></li>
            <li><a href="#" className="hover:text-accent transition-colors">Conditions Générales</a></li>
            <li><a href="#" className="hover:text-accent transition-colors">Politique d'Annulation</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-6 italic normal-case text-sm">Contact</h4>
          <p className="text-sm normal-case">Email: contact@safari-fast.cd</p>
          <p className="text-sm normal-case">Tél: +243 999 000 000</p>
          <p className="text-accent mt-4 font-bold tracking-widest">FR / EN / SW</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto border-t border-white/5 mt-16 pt-8 flex justify-between items-center">
        <span>&copy; {new Date().getFullYear()} Safari Fast RDC</span>
        <div className="flex gap-6">
            <a href="#" className="hover:text-white">Confidentialité</a>
            <a href="#" className="hover:text-white">Cookies</a>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/voyage/:id" element={<VoyageDetailPage />} />
            <Route path="/reservation/:voyageId" element={<ReservationPage />} />
            <Route path="/reservation-details/:id" element={<ReservationDetailsPage />} />
            <Route path="/cancel-reservation/:id" element={<CancelReservationPage />} />
            <Route path="/my-reservations" element={<MyReservationsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            
            {/* Backoffice & Agent Routes */}
            <Route path="/backoffice" element={<BackofficeLoginPage />} />
            <Route 
              path="/admin/*" 
              element={
                <AdminLayout>
                  <Routes>
                    <Route path="/" element={<AdminDashboard />} />
                    <Route path="/voyages" element={<AdminVoyages />} />
                    <Route path="/reservations" element={<AdminReservations />} />
                    <Route path="/bateaux" element={<AdminBateauEditor />} />
                    <Route path="/paiements" element={<AdminPaiements />} />
                    <Route path="/agents" element={<AdminAgents />} />
                    <Route path="/geo" element={<AdminGeographie />} />
                    {/* Additional admin routes would go here */}
                  </Routes>
                </AdminLayout>
              } 
            />
            <Route 
              path="/agent/*" 
              element={
                <AgentLayout>
                  <Routes>
                    <Route path="/scan" element={<AgentScanner />} />
                    {/* Additional agent routes would go here */}
                  </Routes>
                </AgentLayout>
              } 
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
