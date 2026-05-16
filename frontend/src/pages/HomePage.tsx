import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, Calendar, Users, Ship, ArrowRight, Star, TrendingUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn, formatCurrency } from '../lib/utils';
import { Voyage, Port } from '../types';

export default function HomePage() {
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [loading, setLoading] = useState(true);
  const [nearestPort, setNearestPort] = useState<Port | null>(null);
  const navigate = useNavigate();

  // Filters
  const [searchDepart, setSearchDepart] = useState('');
  const [searchArrivee, setSearchArrivee] = useState('');
  const [searchDate, setSearchDate] = useState('');

  useEffect(() => {
    // Fetch ports
    fetch('/api/ports')
      .then(res => res.json())
      .then(data => {
        setPorts(data);
        // Default depart to nearest port if we can find it
        if (data.length > 0) setSearchDepart(data[0].name);
      });

    // Geolocation for nearest port
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        // In a real app we'd fetch /api/geographie/ports/nearest
        // Here we just mock it with UVIRA for the demo if user is "near" it
        setNearestPort({ id: 'uvira', name: 'Uvira', ville: 'Uvira', lat: -3.3768, lng: 29.1417 });
      });
    }
  }, []);

  // Progressive search: fetch voyages whenever filters change
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchDepart) params.append('depart', searchDepart);
    if (searchArrivee) params.append('arrivee', searchArrivee);
    if (searchDate) params.append('date', searchDate);

    fetch(`/api/voyages?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setVoyages(data);
        setLoading(false);
      });
  }, [searchDepart, searchArrivee, searchDate]);

  return (
    <div className="pt-24 pb-20">
      {/* Hero Section */}
      <section className="px-6 mb-12">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="archivo-black text-5xl md:text-7xl text-white tracking-tighter uppercase"
          >
            Programme des bateaux
          </motion.h1>
          {nearestPort && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-accent font-medium flex items-center justify-center gap-2 tracking-wide"
            >
              <MapPin className="w-4 h-4" />
              Port le plus proche : <span className="text-white">Uvira</span> <span className="text-white/40 text-xs">(25.5 km)</span>
            </motion.p>
          )}
        </div>
      </section>

      {/* Search Bar */}
      <section className="px-6 mb-16 sticky top-20 z-40">
        <div className="max-w-4xl mx-auto bg-white/5 p-1 rounded-2xl backdrop-blur-xl border border-white/10 flex flex-col md:flex-row shadow-2xl">
          <div className="flex-1 px-6 py-4 border-r border-white/10 hover:bg-white/5 transition-colors">
            <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1">Départ</label>
            <select 
              value={searchDepart}
              onChange={(e) => setSearchDepart(e.target.value)}
              className="bg-transparent text-white font-bold w-full focus:outline-none appearance-none cursor-pointer"
            >
              <option value="" className="text-primary">Choisir un port</option>
              {ports.map(p => (
                <option key={p.id} value={p.name} className="text-primary">{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 px-6 py-4 border-r border-white/10 hover:bg-white/5 transition-colors">
            <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1">Arrivée</label>
            <select 
              value={searchArrivee}
              onChange={(e) => setSearchArrivee(e.target.value)}
              className="bg-transparent text-white font-bold w-full focus:outline-none appearance-none cursor-pointer"
            >
              <option value="" className="text-primary">Choisir un port</option>
              {ports.map(p => (
                <option key={p.id} value={p.name} className="text-primary">{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 px-6 py-4 hover:bg-white/5 transition-colors">
            <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1">Date de départ</label>
            <input 
              type="date" 
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="bg-transparent text-white font-bold w-full focus:outline-none [color-scheme:dark] cursor-pointer"
            />
          </div>

          <div className="pr-4 pl-2 self-center py-2">
            <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
              <Search className="text-primary w-5 h-5" strokeWidth={3} />
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="px-6 max-w-7xl mx-auto">
        {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1,2,3].map(i => (
                    <div key={i} className="bg-white/5 rounded-3xl h-96 animate-pulse border border-white/10" />
                ))}
            </div>
        ) : (
            <>
                {voyages.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/20">
                        <Ship className="w-16 h-16 text-white/10 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white/40">Aucun voyage trouvé</h3>
                        <p className="text-white/30">Essayez d'autres critères ou dates.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {voyages.map((voyage, idx) => (
                            <motion.div
                                key={voyage.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                onClick={() => navigate(`/voyage/${voyage.id}`)}
                                className="group bg-white/5 rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-white/10 flex flex-col cursor-pointer hover:border-white/20 hover:bg-white/[0.07]"
                            >
                                <div className="relative h-48 overflow-hidden">
                                    <img 
                                        src={voyage.photo} 
                                        alt={voyage.bateau}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60"
                                        referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-primary to-transparent opacity-60"></div>
                                    <div className="absolute top-4 right-4">
                                        <span className={cn(
                                            "px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter shadow-lg",
                                            voyage.statut === 'programme' ? "bg-accent text-primary" : 
                                            voyage.statut === 'complet' ? "bg-red-500 text-white" : "bg-green-500 text-white"
                                        )}>
                                            {voyage.statut}
                                        </span>
                                    </div>
                                    <div className="absolute bottom-4 left-4">
                                        <h3 className="archivo-black text-white text-xl uppercase leading-none mb-1">{voyage.bateau}</h3>
                                        <p className="text-xs text-white/70 flex items-center gap-1">
                                            <Ship className="w-3 h-3" /> {voyage.depart} → {voyage.arrivee}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-5 flex-grow flex flex-col gap-4">
                                    <div className="flex gap-2">
                                        <div className="bg-primary border border-white/10 rounded-xl p-3 flex-1 text-center">
                                            <div className="text-[10px] uppercase text-white/40 mb-1">Départ</div>
                                            <div className="text-sm font-black text-white">{format(new Date(voyage.date), 'dd MMM', { locale: fr }).toUpperCase()}</div>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex-1 text-center">
                                            <div className="text-[10px] uppercase text-white/40 mb-1">Heure</div>
                                            <div className="text-sm font-black text-white">{format(new Date(voyage.date), 'HH:mm')}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-white/40">
                                            <span>Places Vendues</span>
                                            <span>Places Totales</span>
                                        </div>
                                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(voyage.places_vendues / voyage.places_totales) * 100}%` }}
                                                className="h-full bg-accent"
                                            />
                                        </div>
                                        <div className="flex justify-between font-mono text-sm text-white/70">
                                            <span>{voyage.places_vendues}</span>
                                            <span>{voyage.places_totales}</span>
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-2 flex items-center justify-between border-t border-white/10">
                                        <div className="leading-none">
                                            <div className="text-2xl font-black text-accent">
                                                {formatCurrency(voyage.prix_base)}
                                                <span className="text-[10px] text-white/50 ml-1 font-sans">USD</span>
                                            </div>
                                            <div className="text-[10px] text-white/30 line-through font-sans">$60 USD</div>
                                        </div>
                                        <button 
                                            onClick={() => navigate(`/voyage/${voyage.id}`)}
                                            className="bg-white text-primary px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-accent transition-colors shadow-lg"
                                        >
                                            Détails
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </>
        )}
      </section>
    </div>
  );
}
