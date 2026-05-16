import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ArrowLeft, MapPin, Calendar, Clock, Star, Users, Ship, 
  Wifi, Coffee, ShoppingBag, Wind, Bed, Check, ChevronRight,
  TrendingUp, PlaneTakeoff, Navigation2, Info, Timer, IdCard, Briefcase,
  Smartphone, Car, Shirt
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn, formatCurrency } from '../lib/utils';
import { Voyage } from '../types';

export default function VoyageDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [voyage, setVoyage] = useState<Voyage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/voyages/${id}`)
      .then(res => res.json())
      .then(data => {
        setVoyage(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="pt-32 text-centerarchivo-black text-2xl">Chargement...</div>;
  if (!voyage) return <div className="pt-32 text-center">Déjà parti !</div>;

  const amenities = [
    { icon: Wind, label: 'Climatisation', active: true },
    { icon: Wifi, label: 'Wi-Fi Satellite', active: true },
    { icon: Coffee, label: 'Restaurant', active: true },
    { icon: ShoppingBag, label: 'Boutique', active: true },
    { icon: Bed, label: 'Chambres luxe', active: true },
  ];

  return (
    <div className="pt-20 pb-32">
      <div className="max-w-7xl mx-auto px-6 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/50 font-bold hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Retour au programme
        </button>
      </div>

      {/* Main Content & Sticky Box */}
      <section className="px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left Column: Gallery + Details */}
            <div className="lg:col-span-8 space-y-16">
              {/* Gallery */}
              <div className="flex flex-col gap-4">
                <div className="h-[500px] rounded-[40px] overflow-hidden shadow-2xl relative">
                  <img 
                    src={voyage.photo} 
                    alt={voyage.bateau} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent p-12 flex flex-col justify-end">
                      <div className="flex items-center gap-3 mb-4">
                          <span className="bg-accent text-primary px-4 py-1.5 rounded-full text-[10px] uppercase font-black tracking-widest">Premium Class</span>
                          <div className="flex text-accent">
                              {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-3 h-3 fill-current" />)}
                          </div>
                      </div>
                      <h1 className="archivo-black text-4xl md:text-6xl text-white uppercase tracking-tighter leading-none">
                          {voyage.bateau}
                      </h1>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 h-40">
                  <div className="rounded-3xl overflow-hidden shadow-lg border-2 border-white">
                    <img src="https://images.unsplash.com/photo-1548574505-5e239809ee19?q=80&w=2070&auto=format&fit=crop" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="rounded-3xl overflow-hidden shadow-lg border-2 border-white">
                    <img src="https://images.unsplash.com/photo-1562280963-8a5475740a10?q=80&w=2070&auto=format&fit=crop" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="rounded-3xl overflow-hidden shadow-lg border-2 border-white relative group cursor-pointer">
                    <img src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=2074&auto=format&fit=crop" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-white font-black text-xl">+12 Photos</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Availability Section */}
              <div className="space-y-8 pt-8">
                  <div className="flex items-center justify-between">
                      <h2 className="archivo-black text-2xl text-white uppercase tracking-tighter">Disponibilité en direct</h2>
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-green-500">en direct</span>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Passengers Card */}
                      <div className="p-8 pb-6 rounded-[32px] border border-green-500/30 bg-green-500/5 backdrop-blur-xl space-y-8">
                          <div className="flex items-center gap-4">
                              <div className="w-16 h-16 rounded-2xl bg-[#010312] border border-white/5 flex items-center justify-center text-white/40">
                                  <Users className="w-8 h-8" />
                              </div>
                              <div>
                                  <h3 className="archivo-black text-xl text-white uppercase leading-none mb-1">Passagers</h3>
                                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                      {voyage.places_vendues} réservés sur {voyage.places_totales}
                                  </p>
                              </div>
                          </div>
                          
                          <div className="space-y-4">
                              <div className="h-3 w-full bg-[#010312] rounded-full overflow-hidden border border-white/5">
                                  <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${(voyage.places_vendues / voyage.places_totales) * 100}%` }}
                                      className="h-full bg-green-500/20"
                                  />
                              </div>
                              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                  <span className="text-green-500">{voyage.places_totales - voyage.places_vendues} place(s) restante(s)</span>
                                  <span className="text-white/20">{Math.round((voyage.places_vendues / voyage.places_totales) * 100)}% occupé</span>
                              </div>
                          </div>
                      </div>

                      {/* Vehicles Card */}
                      <div className="p-8 pb-6 rounded-[32px] border border-blue-500/30 bg-blue-500/5 backdrop-blur-xl space-y-8">
                          <div className="flex items-center gap-4">
                              <div className="w-16 h-16 rounded-2xl bg-[#010312] border border-white/5 flex items-center justify-center text-white/40">
                                  <Car className="w-8 h-8" />
                              </div>
                              <div>
                                  <h3 className="archivo-black text-xl text-white uppercase leading-none mb-1">Véhicules</h3>
                                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                      0 réservés sur 15
                                  </p>
                              </div>
                          </div>
                          
                          <div className="space-y-4">
                              <div className="h-3 w-full bg-[#010312] rounded-full overflow-hidden border border-white/5">
                                  <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `0%` }}
                                      className="h-full bg-blue-500/20"
                                  />
                              </div>
                              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                  <span className="text-blue-500">15 place(s) véhicule(s)</span>
                                  <span className="text-white/20">0% occupé</span>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Amenities */}
              <div className="space-y-8">
                  <h2 className="archivo-black text-2xl text-white uppercase">Équipements à bord</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {amenities.map(amenity => (
                          <div key={amenity.label} className="p-6 rounded-[32px] bg-white/5 border border-white/10 flex flex-col items-center gap-3 text-center group hover:border-accent hover:bg-accent/5 transition-all">
                              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-primary group-hover:scale-110 transition-all">
                                  <amenity.icon className="w-6 h-6" />
                              </div>
                              <span className="text-sm font-bold text-white/70">{amenity.label}</span>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Itinerary */}
              <div className="space-y-8">
                  <h2 className="archivo-black text-2xl text-white uppercase">Itinéraire & Horaires</h2>
                  <div className="bg-white/5 rounded-[40px] p-10 border border-white/10 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[100px]" />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
                          <div className="space-y-4">
                              <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase font-black tracking-widest">
                                  <MapPin className="w-4 h-4" /> Port de Départ
                              </div>
                              <div>
                                  <div className="archivo-black text-3xl text-white uppercase">{voyage.depart}</div>
                                  <div className="text-lg font-bold text-white/50">{format(new Date(voyage.date), 'HH:mm')}</div>
                              </div>
                          </div>

                          <div className="flex flex-col items-center justify-center gap-4">
                              <div className="w-full flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full border-2 border-accent bg-primary shrink-0" />
                                  <div className="h-[2px] flex-grow border-t-2 border-dashed border-white/10" />
                                  <Navigation2 className="w-5 h-5 text-accent rotate-90 shrink-0" />
                                  <div className="h-[2px] flex-grow border-t-2 border-dashed border-white/10" />
                                  <div className="w-3 h-3 rounded-full bg-accent shrink-0" />
                              </div>
                              <div className="bg-white/5 px-4 py-2 rounded-full flex items-center gap-2 border border-white/10">
                                  <Clock className="w-4 h-4 text-accent" />
                                  <span className="text-xs font-black text-white/70">8h 30min ESTIMÉS</span>
                              </div>
                          </div>

                          <div className="space-y-4 md:text-right">
                              <div className="flex items-center md:justify-end gap-2 text-white/40 text-[10px] uppercase font-black tracking-widest">
                                  Destination <MapPin className="w-4 h-4" />
                              </div>
                              <div>
                                  <div className="archivo-black text-3xl text-white uppercase">{voyage.arrivee}</div>
                                  <div className="text-lg font-bold text-white/50">~ 18:30</div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Additional Info */}
              <div className="space-y-8">
                  <h2 className="archivo-black text-2xl text-white uppercase">Infos Supplémentaires</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-8 rounded-[32px] bg-white/5 border border-white/10 text-white space-y-4 shadow-xl">
                          <h4 className="font-black italic flex items-center gap-2">
                              <Ship className="text-accent" /> Capitaine & Équipage
                          </h4>
                          <p className="text-sm text-white/50 leading-relaxed">
                              Le capitaine <span className="text-white font-bold">Jean-Claude Mwamba</span> et son équipage de 12 personnes vous accueillent à bord. 
                          </p>
                          <div className="pt-4 flex gap-4">
                              <div className="flex flex-col">
                                  <span className="text-[10px] uppercase tracking-widest text-white/20">Équipage</span>
                                  <span className="font-bold">12 Pers.</span>
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-[10px] uppercase tracking-widest text-white/20">Expérience</span>
                                  <span className="font-bold">+15 Ans</span>
                              </div>
                          </div>
                      </div>
                      <div className="p-8 rounded-[32px] bg-white/5 border border-white/10 space-y-4">
                          <h4 className="font-black italic text-white flex items-center gap-2">
                              <Info className="text-accent" /> Remarques
                          </h4>
                          <ul className="space-y-2 text-sm text-white/40">
                              <li>• Présentation au port 2h avant le départ.</li>
                              <li>• Documents d'identité obligatoires.</li>
                              <li>• 2 bagages de 30kg inclus par passager.</li>
                          </ul>
                      </div>
                  </div>
              </div>

              {/* Cancellation Policy Section */}
              <div className="space-y-8">
                  <div className="flex items-center justify-between">
                      <h2 className="archivo-black text-2xl text-white uppercase">Politique d’annulation</h2>
                      <span className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-[10px] uppercase font-black tracking-widest text-white/40">
                          Frais selon le délai
                      </span>
                  </div>
                  
                  <div className="space-y-3">
                      {[
                          { label: 'Plus de 7 jours avant le départ', value: 'Aucun frais', color: 'border-green-500/30 bg-green-500/5 text-green-400' },
                          { label: 'Entre 3 et 7 jours avant', value: '25 % de frais', color: 'border-yellow-500/30 bg-yellow-500/5 text-yellow-400' },
                          { label: 'Entre 1 et 3 jours avant', value: '50 % de frais', color: 'border-orange-500/30 bg-orange-500/5 text-orange-400' },
                          { label: 'Moins de 24 h avant', value: '80 % de frais', color: 'border-red-500/30 bg-red-500/5 text-red-500' },
                          { label: 'Après le départ', value: 'Non remboursable', color: 'border-red-900/30 bg-red-950/20 text-red-800' },
                      ].map((policy) => (
                          <div 
                              key={policy.label} 
                              className={cn(
                                  "flex items-center justify-between p-6 rounded-2xl border backdrop-blur-sm transition-all hover:scale-[1.01]",
                                  policy.color
                              )}
                          >
                              <span className="font-bold text-xs md:text-sm uppercase tracking-wider">{policy.label}</span>
                              <span className="archivo-black text-xs md:text-sm uppercase text-right">{policy.value}</span>
                          </div>
                      ))}
                  </div>
                  
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                      <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                          Note : Remboursement à 80% si annulation 24h avant le départ. Les frais de service et taxes portuaires sont non-remboursables après confirmation du billet.
                      </p>
                  </div>
              </div>

              {/* Travel Tips Section */}
              <div className="space-y-8">
                  <h2 className="archivo-black text-2xl text-white uppercase">Conseils pour votre voyage</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                          { 
                              icon: Timer, 
                              title: 'Arrivez en avance', 
                              desc: 'Présentez-vous au quai au plus tard 45 min avant le départ pour l’embarquement.' 
                          },
                          { 
                              icon: IdCard, 
                              title: 'Pièce d’identité', 
                              desc: 'Une pièce d’identité officielle est exigée pour chaque passager à l’embarquement.' 
                          },
                          { 
                              icon: Briefcase, 
                              title: 'Bagages', 
                              desc: '1 bagage cabine + 1 bagage soute inclus. Bagages volumineux à signaler à la compagnie.' 
                          },
                          { 
                              icon: Smartphone, 
                              title: 'Billet électronique', 
                              desc: 'Votre billet et QR code sont envoyés par email immédiatement après la réservation.' 
                          },
                          { 
                              icon: Car, 
                              title: 'Véhicules', 
                              desc: 'Présentez-vous 60 min avant le départ et munissez-vous de la carte grise.' 
                          },
                          { 
                              icon: Shirt, 
                              title: 'Prévoir une veste', 
                              desc: 'Les conditions en mer peuvent être plus fraîches qu’à quai, même en été.' 
                          },
                      ].map((tip, idx) => (
                          <div key={idx} className="flex items-start gap-5 p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-accent/30 transition-all group">
                              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                                  <tip.icon className="w-6 h-6" />
                              </div>
                              <div className="space-y-1">
                                  <h4 className="font-black text-white uppercase text-xs tracking-tight">{tip.title}</h4>
                                  <p className="text-[11px] text-white/40 leading-relaxed font-bold">
                                      {tip.desc}
                                  </p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
            </div>

            {/* Right Column: Sticky Order Box */}
            <div className="lg:col-span-4 h-full">
              <div className="bg-white/5 rounded-[40px] p-8 shadow-2xl border border-white/10 backdrop-blur-xl sticky top-28 space-y-8">
                <div className="space-y-2">
                    <span className="text-white/40 text-xs font-bold uppercase tracking-widest block">Prix par passager</span>
                    <div className="flex items-end justify-between">
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl archivo-black text-accent">{formatCurrency(voyage.prix_base)}</span>
                            <span className="text-white/40 font-medium text-sm">USD</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="p-5 rounded-3xl bg-primary/50 border border-white/5 space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="w-5 h-5 text-accent" />
                                <span className="font-bold text-sm text-white">Disponibilité</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-bold text-white/40">
                                <span>Places Vendues</span>
                                <span>{voyage.places_vendues} / {voyage.places_totales}</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(voyage.places_vendues/voyage.places_totales)*100}%` }}
                                    className="h-full bg-accent"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <ul className="space-y-4">
                    {[
                      'Billet électronique (QR)', 
                      'Embarquement prioritaire', 
                      'Annulation gratuite (24h)'
                    ].map(item => (
                        <li key={item} className="flex items-center gap-4 text-xs font-bold text-slate-300 tracking-tight">
                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                            {item}
                        </li>
                    ))}
                </ul>

                <button 
                  onClick={() => navigate(`/reservation/${voyage.id}`)}
                  className="w-full bg-[#010312] border border-white/5 text-white py-6 rounded-[32px] font-black text-xs md:text-sm tracking-[0.1em] shadow-2xl hover:bg-white hover:text-black transition-all flex items-center justify-center gap-3 group uppercase"
                >
                  Réserver Maintenant
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-2 transition-transform text-white group-hover:text-black" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-lg border-t border-slate-200 z-50">
        <button 
            onClick={() => navigate(`/reservation/${voyage.id}`)}
            className="w-full bg-primary text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3"
        >
            RESERVER {formatCurrency(voyage.prix_base)}
            <ChevronRight />
        </button>
      </div>
    </div>
  );
}
