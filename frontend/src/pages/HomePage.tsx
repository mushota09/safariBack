import React, { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Users, Ship, ArrowRight, Star, TrendingUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn, formatCurrency } from '../lib/utils';
import { voyageService, Port, Traversee, NearestPort } from '../services/voyageService';

export default function HomePage() {
  const [traversees, setTraversees] = useState<Traversee[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [loading, setLoading] = useState(true);
  const [nearestPort, setNearestPort] = useState<NearestPort | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Filters
  const [searchDepartId, setSearchDepartId] = useState<number | undefined>();
  const [searchArriveeId, setSearchArriveeId] = useState<number | undefined>();
  const [searchDate, setSearchDate] = useState('');

  // Load ports on mount
  useEffect(() => {
    const loadPorts = async () => {
      try {
        const portsData = await voyageService.getPorts();
        setPorts(portsData);

        // Set default depart to first port
        if (portsData.length > 0) {
          setSearchDepartId(portsData[0].id);
        }
      } catch (err: any) {
        console.error('Failed to load ports:', err);
        setError('Impossible de charger les ports');
      }
    };

    loadPorts();
  }, []);

  // Get nearest port using geolocation
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const nearest = await voyageService.getNearestPort(latitude, longitude);
            setNearestPort(nearest);
          } catch (err) {
            console.error('Failed to get nearest port:', err);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  }, []);

  // Search traversees whenever filters change
  useEffect(() => {
    const searchTraversees = async () => {
      setLoading(true);
      setError(null);

      try {
        const params: any = {};

        if (searchDepartId) params.port_depart = searchDepartId;
        if (searchArriveeId) params.port_arrivee = searchArriveeId;
        if (searchDate) {
          // Set date_min to start of selected day
          const dateMin = new Date(searchDate);
          dateMin.setHours(0, 0, 0, 0);
          params.date_min = dateMin.toISOString();

          // Set date_max to end of selected day
          const dateMax = new Date(searchDate);
          dateMax.setHours(23, 59, 59, 999);
          params.date_max = dateMax.toISOString();
        }

        const results = await voyageService.searchTraversees(params);
        setTraversees(results);
      } catch (err: any) {
        console.error('Failed to search traversees:', err);
        setError('Impossible de charger les traversées');
      } finally {
        setLoading(false);
      }
    };

    searchTraversees();
  }, [searchDepartId, searchArriveeId, searchDate]);

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
              Port le plus proche : <span className="text-white">{nearestPort.nom}</span>
              <span className="text-white/40 text-xs">({nearestPort.distance_km} km)</span>
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
              value={searchDepartId || ''}
              onChange={(e) => setSearchDepartId(e.target.value ? parseInt(e.target.value) : undefined)}
              className="bg-transparent text-white font-bold w-full focus:outline-none appearance-none cursor-pointer"
            >
              <option value="" className="text-primary">Choisir un port</option>
              {ports.map(p => (
                <option key={p.id} value={p.id} className="text-primary">{p.nom}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 px-6 py-4 border-r border-white/10 hover:bg-white/5 transition-colors">
            <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1">Arrivée</label>
            <select
              value={searchArriveeId || ''}
              onChange={(e) => setSearchArriveeId(e.target.value ? parseInt(e.target.value) : undefined)}
              className="bg-transparent text-white font-bold w-full focus:outline-none appearance-none cursor-pointer"
            >
              <option value="" className="text-primary">Choisir un port</option>
              {ports.map(p => (
                <option key={p.id} value={p.id} className="text-primary">{p.nom}</option>
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
        {error && (
          <div className="bg-red-500/10 border-2 border-red-500/20 rounded-2xl p-6 text-red-400 text-center mb-8">
            {error}
          </div>
        )}

        {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1,2,3].map(i => (
                    <div key={i} className="bg-white/5 rounded-3xl h-96 animate-pulse border border-white/10" />
                ))}
            </div>
        ) : (
            <>
                {traversees.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/20">
                        <Ship className="w-16 h-16 text-white/10 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white/40">Aucun voyage trouvé</h3>
                        <p className="text-white/30">Essayez d'autres critères ou dates.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {traversees.map((traversee, idx) => {
                            const placesVendues = traversee.places_vendues_passagers || 0;
                            const placesTotales = traversee.places_totales_passagers || traversee.bateau.capacite_passagers;
                            const prixAffiche = traversee.prix_promotionnel || traversee.prix_base;
                            const hasPromo = !!traversee.prix_promotionnel;

                            return (
                                <motion.div
                                    key={traversee.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.1 }}
                                    onClick={() => navigate(`/voyage/${traversee.id}`)}
                                    className="group bg-white/5 rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-white/10 flex flex-col cursor-pointer hover:border-white/20 hover:bg-white/[0.07]"
                                >
                                    <div className="relative h-48 overflow-hidden">
                                        <img
                                            src={traversee.bateau.photo_principale || 'https://images.unsplash.com/photo-1544911845-1f34a3eb46b1?q=80&w=1470&auto=format&fit=crop'}
                                            alt={traversee.bateau.nom}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60"
                                            referrerPolicy="no-referrer"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-primary to-transparent opacity-60"></div>
                                        <div className="absolute top-4 right-4">
                                            <span className={cn(
                                                "px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter shadow-lg",
                                                traversee.statut === 'programme' ? "bg-accent text-primary" :
                                                traversee.statut === 'complet' ? "bg-red-500 text-white" :
                                                traversee.statut === 'confirme' ? "bg-green-500 text-white" :
                                                "bg-yellow-500 text-primary"
                                            )}>
                                                {traversee.statut}
                                            </span>
                                        </div>
                                        <div className="absolute bottom-4 left-4">
                                            <h3 className="archivo-black text-white text-xl uppercase leading-none mb-1">{traversee.bateau.nom}</h3>
                                            <p className="text-xs text-white/70 flex items-center gap-1">
                                                <Ship className="w-3 h-3" /> {traversee.port_depart.nom} → {traversee.port_arrivee.nom}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-5 flex-grow flex flex-col gap-4">
                                        <div className="flex gap-2">
                                            <div className="bg-primary border border-white/10 rounded-xl p-3 flex-1 text-center">
                                                <div className="text-[10px] uppercase text-white/40 mb-1">Départ</div>
                                                <div className="text-sm font-black text-white">
                                                    {format(new Date(traversee.date_depart_programme), 'dd MMM', { locale: fr }).toUpperCase()}
                                                </div>
                                            </div>
                                            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex-1 text-center">
                                                <div className="text-[10px] uppercase text-white/40 mb-1">Heure</div>
                                                <div className="text-sm font-black text-white">
                                                    {format(new Date(traversee.date_depart_programme), 'HH:mm')}
                                                </div>
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
                                                    animate={{ width: `${(placesVendues / placesTotales) * 100}%` }}
                                                    className="h-full bg-accent"
                                                />
                                            </div>
                                            <div className="flex justify-between font-mono text-sm text-white/70">
                                                <span>{placesVendues}</span>
                                                <span>{placesTotales}</span>
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-2 flex items-center justify-between border-t border-white/10">
                                            <div className="leading-none">
                                                <div className="text-2xl font-black text-accent">
                                                    {formatCurrency(prixAffiche)}
                                                    <span className="text-[10px] text-white/50 ml-1 font-sans">USD</span>
                                                </div>
                                                {hasPromo && (
                                                    <div className="text-[10px] text-white/30 line-through font-sans">
                                                        ${traversee.prix_base} USD
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/voyage/${traversee.id}`);
                                                }}
                                                className="bg-white text-primary px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-accent transition-colors shadow-lg"
                                            >
                                                Détails
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </>
        )}
      </section>
    </div>
  );
}
