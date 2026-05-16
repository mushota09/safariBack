import React, { useState } from 'react';
import AdminDataTable from '../../components/AdminDataTable';
import AdminVoyagesCalendar from './VoyagesCalendar';
import { cn } from '../../lib/utils';
import { Plus, List, Calendar as CalendarIcon, X, MapPin, Ship, Clock, Check, Edit2, Save, Upload, FileText, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const initialVoyages = [
    { id: 'V092', route: 'Kalemie - Uvira', boat: 'M/V SAFARI', date: '2024-05-15', time: '08:30', status: 'Confirmé', occupancy: 85 },
    { id: 'V093', route: 'Uvira - Bukavu', boat: 'M/V SAFARI', date: '2024-05-16', time: '10:00', status: 'Programmé', occupancy: 42 },
    { id: 'V094', route: 'Bukavu - Goma', boat: 'M/V SAFARI II', date: '2024-05-17', time: '07:15', status: 'En Retard', occupancy: 60 },
    { id: 'V095', route: 'Kalemie - Moba', boat: 'M/V SAFARI', date: '2024-05-18', time: '06:00', status: 'Complet', occupancy: 100 },
    { id: 'V096', route: 'Moba - Kalemie', boat: 'M/V SAFARI', date: '2024-05-19', time: '09:45', status: 'Annulé', occupancy: 0 },
];

export default function AdminVoyages() {
    const [selectedVoyage, setSelectedVoyage] = useState<any>(null);
    const [view, setView] = useState<'list' | 'calendar' | 'detail'>('list');
    const [voyages, setVoyages] = useState(initialVoyages);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newVoyage, setNewVoyage] = useState({
        route: '',
        boat: 'M/V SAFARI',
        date: '',
        time: '',
        status: 'Programmé'
    });

    const [editingVoyage, setEditingVoyage] = useState<any>(null);
    const [selectedBoatHistory, setSelectedBoatHistory] = useState<string | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

    const handleAddVoyage = () => {
        const id = `V${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        setVoyages([{ ...newVoyage, id, occupancy: 0 }, ...voyages]);
        setIsModalOpen(false);
        setNewVoyage({ route: '', boat: 'M/V SAFARI', date: '', time: '', status: 'Programmé' });
    };

    const handleUpdateVoyage = () => {
        setVoyages(voyages.map(v => v.id === editingVoyage.id ? editingVoyage : v));
        setEditingVoyage(null);
    };

    const handleSelectVoyage = (voyage: any) => {
        setSelectedVoyage(voyage);
        setView('detail');
    };

    const columns = [
        { 
            key: 'boat', 
            label: 'Bateau',
            render: (val: string, row: any) => (
                <button 
                    onClick={(e) => { e.stopPropagation(); handleSelectVoyage(row); }}
                    className="flex items-center gap-3 text-white hover:text-accent transition-colors group"
                >
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-accent/20 group-hover:text-accent transition-all">
                        <Ship className="w-4 h-4" />
                    </div>
                    <span className="archivo-black text-[10px] uppercase italic tracking-widest">{val}</span>
                </button>
            )
        },
        { 
            key: 'route', 
            label: 'Itinéraire',
            render: (val: string) => (
                <span className="text-[11px] font-black text-white/40 uppercase tracking-widest">{val}</span>
            )
        },
        { 
            key: 'date', 
            label: 'Date',
            render: (val: string) => (
                <span className="text-[11px] font-bold text-white/60 tabular-nums">{val}</span>
            )
        },
        { 
            key: 'time', 
            label: 'Heure',
            render: (val: string) => (
                <div className="flex items-center gap-2 text-accent">
                    <Clock className="w-3 h-3 opacity-40" />
                    <span className="text-[11px] font-black italic">{val || '--:--'}</span>
                </div>
            )
        },
        { 
            key: 'points',
            label: 'Sécurité',
            render: () => (
                <div className="flex gap-1">
                    {[1,2,3].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-green-500/40" title="Contrôle OK" />
                    ))}
                    <div className="w-1.5 h-1.5 rounded-full bg-white/10" title="En attente" />
                </div>
            )
        },
        { 
            key: 'occupancy', 
            label: 'Occupation',
            render: (val: number) => (
                <div className="flex items-center gap-4">
                    <div className="flex-grow w-24 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div 
                            className={cn(
                                "h-full transition-all duration-1000",
                                val > 90 ? "bg-red-500" : val > 50 ? "bg-accent" : "bg-green-500"
                            )}
                            style={{ width: `${val}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-black text-white/40">{val}%</span>
                </div>
            )
        },
        { 
            key: 'status', 
            label: 'Statut',
            render: (val: string) => (
                <div className={cn(
                    "inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                    val === 'Confirmé' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                    val === 'En Retard' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                    val === 'Annulé' ? "bg-white/5 text-white/20 border-white/5" :
                    val === 'Complet' ? "bg-white/10 text-white/60 border-white/10" :
                    "bg-accent/10 text-accent border-accent/20"
                )}>
                    {val}
                </div>
            )
        },
        {
            key: 'actions',
            label: 'Action',
            render: (_: any, row: any) => (
                <button 
                    onClick={() => setEditingVoyage({...row})}
                    className="flex items-center gap-2 text-white/20 hover:text-white transition-colors"
                >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest italic">Modifier</span>
                </button>
            )
        }
    ];

    return (
        <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div>
                    <h1 className="archivo-black text-4xl text-white uppercase italic tracking-tighter leading-none mb-4">Programme des Voyages</h1>
                    <p className="text-white/30 text-xs font-black uppercase tracking-widest italic border-l-2 border-accent pl-4">Planification et gestion des bateaux</p>
                </div>

                <div className="flex items-center bg-white/5 p-1 rounded-2xl border border-white/5 self-start md:self-auto">
                    <button 
                        onClick={() => setView('list')}
                        className={cn(
                            "flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            view === 'list' ? "bg-accent text-primary" : "text-white/40 hover:text-white"
                        )}
                    >
                        <List className="w-4 h-4" /> Liste
                    </button>
                    <button 
                        onClick={() => setView('calendar')}
                        className={cn(
                            "flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            view === 'calendar' ? "bg-accent text-primary" : "text-white/40 hover:text-white"
                        )}
                    >
                        <CalendarIcon className="w-4 h-4" /> Calendrier
                    </button>
                </div>
            </div>

            {view === 'list' ? (
                <AdminDataTable 
                    title="Liste des Traversées"
                    subtitle="Gestion temps réel des départs et arrivées"
                    columns={columns}
                    data={voyages}
                    onRowClick={handleSelectVoyage}
                    actions={
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="h-12 px-8 rounded-2xl bg-accent text-primary archivo-black text-[10px] uppercase tracking-widest italic hover:bg-white transition-all flex items-center gap-3"
                        >
                            <Plus className="w-4 h-4" /> Nouveau Voyage
                        </button>
                    }
                />
            ) : view === 'calendar' ? (
                <AdminVoyagesCalendar />
            ) : (
                <div className="space-y-12">
                    {/* Header with Back Button */}
                    <div className="flex items-center justify-between">
                        <button 
                            onClick={() => setView('list')}
                            className="group flex items-center gap-4 text-white/40 hover:text-white transition-all"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-accent group-hover:text-primary transition-all">
                                <ChevronRight className="w-5 h-5 rotate-180" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest italic">Retour à la liste</span>
                        </button>
                        <div className="flex gap-4">
                            <button className="h-12 px-6 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all">
                                Imprimer Manifeste
                            </button>
                            <button 
                                onClick={() => setEditingVoyage(selectedVoyage)}
                                className="h-12 px-6 rounded-2xl bg-accent text-primary archivo-black text-[10px] uppercase tracking-widest italic hover:bg-white transition-all flex items-center gap-3"
                            >
                                <Edit2 className="w-4 h-4" /> Modifier Voyage
                            </button>
                        </div>
                    </div>

                    {/* Main Content Detail */}
                    <div className="grid grid-cols-3 gap-12">
                        {/* Left Column: Voyage Info */}
                        <div className="col-span-2 space-y-12">
                            <div className="bg-[#0A0C1A] border border-white/5 rounded-[48px] p-12 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[120px] -translate-y-1/2 translate-x-1/2" />
                                
                                <div className="relative z-10 space-y-12">
                                    <div className="flex items-center gap-8">
                                        <div className="w-24 h-24 rounded-3xl bg-accent flex items-center justify-center text-primary shadow-2xl shadow-accent/20">
                                            <Ship className="w-12 h-12" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-4 mb-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-accent italic">{selectedVoyage.id}</span>
                                                <div className="w-1 h-1 rounded-full bg-white/20" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">{selectedVoyage.boat}</span>
                                            </div>
                                            <h2 className="archivo-black text-5xl text-white uppercase italic tracking-tighter leading-none">{selectedVoyage.route}</h2>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-4 gap-8">
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest italic">Départ</p>
                                            <div className="flex items-center gap-3 text-white">
                                                <CalendarIcon className="w-4 h-4 text-accent" />
                                                <span className="text-sm font-bold">{selectedVoyage.date}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest italic">Heure</p>
                                            <div className="flex items-center gap-3 text-white">
                                                <Clock className="w-4 h-4 text-accent" />
                                                <span className="text-sm font-bold">{selectedVoyage.time}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest italic">Passagers</p>
                                            <div className="flex items-center gap-3 text-white">
                                                <Plus className="w-4 h-4 text-accent rotate-45" />
                                                <span className="text-sm font-bold">142 / 200</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest italic">Recettes Est.</p>
                                            <div className="flex items-center gap-3 text-white font-mono font-bold">
                                                $4,250
                                            </div>
                                        </div>
                                    </div>

                                    {/* Security Points */}
                                    <div className="pt-12 border-t border-white/5">
                                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest italic mb-6">Checklist Sécurité & Conformité</h4>
                                        <div className="grid grid-cols-3 gap-6">
                                            {[
                                                { label: "Vérification Moteurs", status: "OK" },
                                                { label: "Gilets de Sauvetage", status: "OK" },
                                                { label: "Manifeste Embarquement", status: "EN ATTENTE" },
                                            ].map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-4 bg-white/2 p-4 rounded-2xl border border-white/5">
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-lg flex items-center justify-center",
                                                        item.status === 'OK' ? "bg-green-500/10 text-green-500" : "bg-accent/10 text-accent"
                                                    )}>
                                                        {item.status === 'OK' ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-white/80 uppercase tracking-widest leading-none mb-1">{item.label}</p>
                                                        <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">{item.status}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Boat History Section */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="archivo-black text-2xl text-white uppercase italic tracking-tighter">Historique des Traversées ({selectedVoyage.boat})</h3>
                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Voir tout l'historique</span>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {voyages
                                        .filter(v => v.boat === selectedVoyage.boat && v.id !== selectedVoyage.id)
                                        .slice(0, 3)
                                        .map((v, i) => (
                                            <div key={i} className="bg-white/2 border border-white/5 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/5 transition-all">
                                                <div className="flex items-center gap-8">
                                                    <div className="text-center">
                                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest italic mb-1">Date</p>
                                                        <p className="text-xs font-bold text-white tabular-nums">{v.date}</p>
                                                    </div>
                                                    <div className="w-px h-8 bg-white/5" />
                                                    <div>
                                                        <p className="text-[9px] font-black text-accent uppercase tracking-widest italic mb-1">Itinéraire</p>
                                                        <p className="text-xs font-black text-white/80 uppercase tracking-widest">{v.route}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest italic mb-1">Occupation</p>
                                                        <p className="text-xs font-bold text-white">{v.occupancy}%</p>
                                                    </div>
                                                    <button className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 group-hover:text-accent transition-colors">
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Files & Actions */}
                        <div className="space-y-12">
                            {/* Upload Section */}
                            <div className="bg-[#0A0C1A] border border-white/5 rounded-[40px] p-8 space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center text-accent">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    <h3 className="archivo-black text-lg text-white uppercase italic tracking-tighter">Documents</h3>
                                </div>

                                <div className="relative group">
                                    <input 
                                        type="file" 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) setUploadedFiles([...uploadedFiles, file]);
                                        }}
                                    />
                                    <div className="w-full h-32 bg-white/3 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-2 group-hover:bg-white/5 group-hover:border-accent transition-all">
                                        <Plus className="w-6 h-6 text-white/20 group-hover:text-accent transition-colors" />
                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest text-center px-8 leading-relaxed">Cliquez ou glissez pour ajouter des documents de bord</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {uploadedFiles.length > 0 ? uploadedFiles.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-white/2 border border-white/5 rounded-2xl group">
                                            <div className="flex items-center gap-3">
                                                <FileText className="w-4 h-4 text-accent" />
                                                <div>
                                                    <p className="text-[10px] font-black text-white/80 uppercase tracking-widest truncate max-w-[120px]">{file.name}</p>
                                                    <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">{(file.size / 1024).toFixed(1)} KB</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/10 hover:bg-red-500/10 hover:text-red-500 transition-all"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )) : (
                                        <div className="text-center py-4">
                                            <p className="text-[9px] font-black text-white/10 uppercase tracking-widest italic italic">Aucun document chargé</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Weather/Admin Quick Info */}
                            <div className="bg-gradient-to-br from-accent/20 to-transparent border border-accent/10 rounded-[40px] p-8 space-y-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-accent uppercase tracking-widest italic">Renseignements Météo</span>
                                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">Vent</span>
                                        <span className="text-xs font-bold text-white">12 km/h</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">Vagues</span>
                                        <span className="text-xs font-bold text-white">0.5m - Calme</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* New Voyage Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-[#010312]/90 backdrop-blur-xl"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-xl bg-[#0A0C1A] border border-white/5 rounded-[48px] overflow-hidden shadow-2xl"
                        >
                            <div className="p-12 space-y-12">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center text-accent">
                                            <CalendarIcon className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h2 className="archivo-black text-3xl text-white uppercase italic tracking-tighter leading-none mb-2">Programmer Voyage</h2>
                                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest italic tracking-tighter">Planification tactique des opérations</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setIsModalOpen(false)}
                                        className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20 hover:text-white transition-all outline-none"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Itinéraire</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-accent" />
                                                <input 
                                                    type="text"
                                                    placeholder="Ex: Kalemie - Bukavu"
                                                    value={newVoyage.route}
                                                    onChange={e => setNewVoyage({...newVoyage, route: e.target.value})}
                                                    className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl pl-12 pr-6 text-sm font-bold text-white focus:border-accent/40 outline-none transition-all uppercase"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Bateau</label>
                                                <div className="relative font-bold text-sm">
                                                    <Ship className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                                    <select 
                                                        value={newVoyage.boat}
                                                        onChange={e => setNewVoyage({...newVoyage, boat: e.target.value})}
                                                        className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl pl-12 pr-6 text-white focus:border-accent/40 outline-none transition-all appearance-none"
                                                    >
                                                        <option value="M/V SAFARI">M/V SAFARI</option>
                                                        <option value="M/V SAFARI II">M/V SAFARI II</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Date du Départ</label>
                                                <div className="relative">
                                                    <CalendarIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                                    <input 
                                                        type="date"
                                                        value={newVoyage.date}
                                                        onChange={e => setNewVoyage({...newVoyage, date: e.target.value})}
                                                        className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl pl-12 pr-6 text-sm font-bold text-white focus:border-accent/40 outline-none transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Heure du Départ</label>
                                                <div className="relative">
                                                    <Clock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                                    <input 
                                                        type="time"
                                                        value={newVoyage.time}
                                                        onChange={e => setNewVoyage({...newVoyage, time: e.target.value})}
                                                        className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl pl-12 pr-6 text-sm font-bold text-white focus:border-accent/40 outline-none transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Documents (Manifeste, etc.)</label>
                                            <div className="relative group">
                                                <input 
                                                    type="file"
                                                    onChange={(e) => {
                                                        const files = Array.from(e.target.files || []);
                                                        setUploadedFiles(prev => [...prev, ...files]);
                                                    }}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <div className="w-full h-24 bg-white/3 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 group-hover:bg-white/5 group-hover:border-accent/40 transition-all">
                                                    <Upload className="w-5 h-5 text-white/20 group-hover:text-accent transition-colors" />
                                                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Glisser ou cliquer pour uploader</p>
                                                </div>
                                            </div>
                                            {uploadedFiles.length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-2">
                                                    {uploadedFiles.map((f, i) => (
                                                        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/5 rounded-xl text-[9px] font-bold text-white/60 uppercase tracking-widest">
                                                            <FileText className="w-3 h-3 text-accent" />
                                                            {f.name.slice(0, 10)}...
                                                            <button onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-red-500">
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-8">
                                    <button 
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 h-18 rounded-[28px] border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/5 transition-all outline-none"
                                    >
                                        Annuler
                                    </button>
                                    <button 
                                        onClick={handleAddVoyage}
                                        disabled={!newVoyage.route || !newVoyage.date}
                                        className={cn(
                                            "flex-1 h-18 rounded-[28px] bg-accent text-primary archivo-black text-xs uppercase tracking-widest italic hover:bg-white transition-all shadow-xl shadow-accent/5 flex items-center justify-center gap-3 outline-none",
                                            (!newVoyage.route || !newVoyage.date) && "opacity-20 cursor-not-allowed grayscale"
                                        )}
                                    >
                                        <Check className="w-5 h-5" /> Confirmer le Voyage
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Edit Voyage Modal */}
            <AnimatePresence>
                {editingVoyage && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setEditingVoyage(null)}
                            className="absolute inset-0 bg-[#010312]/90 backdrop-blur-xl"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-xl bg-[#0A0C1A] border border-white/5 rounded-[48px] overflow-hidden shadow-2xl"
                        >
                            <div className="p-12 space-y-12">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-accent">
                                            <Edit2 className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h2 className="archivo-black text-3xl text-white uppercase italic tracking-tighter leading-none mb-2">Modifier Voyage</h2>
                                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest italic tracking-tighter">Référence: {editingVoyage.id}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setEditingVoyage(null)}
                                        className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20 hover:text-white transition-all outline-none"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Itinéraire</label>
                                            <input 
                                                type="text"
                                                value={editingVoyage.route}
                                                onChange={e => setEditingVoyage({...editingVoyage, route: e.target.value})}
                                                className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none transition-all uppercase"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Bateau</label>
                                                <select 
                                                    value={editingVoyage.boat}
                                                    onChange={e => setEditingVoyage({...editingVoyage, boat: e.target.value})}
                                                    className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none transition-all appearance-none"
                                                >
                                                    <option value="M/V SAFARI">M/V SAFARI</option>
                                                    <option value="M/V SAFARI II">M/V SAFARI II</option>
                                                </select>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Date</label>
                                                <input 
                                                    type="date"
                                                    value={editingVoyage.date}
                                                    onChange={e => setEditingVoyage({...editingVoyage, date: e.target.value})}
                                                    className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Heure</label>
                                                <input 
                                                    type="time"
                                                    value={editingVoyage.time}
                                                    onChange={e => setEditingVoyage({...editingVoyage, time: e.target.value})}
                                                    className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Statut</label>
                                                <select 
                                                    value={editingVoyage.status}
                                                    onChange={e => setEditingVoyage({...editingVoyage, status: e.target.value})}
                                                    className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none transition-all appearance-none"
                                                >
                                                    <option value="Programmé">Programmé</option>
                                                    <option value="Confirmé">Confirmé</option>
                                                    <option value="En Retard">En Retard</option>
                                                    <option value="Annulé">Annulé</option>
                                                    <option value="Complet">Complet</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Documents (Manifeste, etc.)</label>
                                            <div className="relative group">
                                                <input 
                                                    type="file"
                                                    onChange={(e) => {
                                                        const files = Array.from(e.target.files || []);
                                                        setUploadedFiles(prev => [...prev, ...files]);
                                                    }}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <div className="w-full h-24 bg-white/3 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 group-hover:bg-white/5 group-hover:border-accent/40 transition-all">
                                                    <Upload className="w-5 h-5 text-white/20 group-hover:text-accent transition-colors" />
                                                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Glisser ou cliquer pour uploader</p>
                                                </div>
                                            </div>
                                            {uploadedFiles.length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-2">
                                                    {uploadedFiles.map((f, i) => (
                                                        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/5 rounded-xl text-[9px] font-bold text-white/60 uppercase tracking-widest">
                                                            <FileText className="w-3 h-3 text-accent" />
                                                            {f.name.slice(0, 10)}...
                                                            <button onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-red-500">
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-8">
                                    <button 
                                        onClick={() => setEditingVoyage(null)}
                                        className="flex-1 h-18 rounded-[28px] border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/5 transition-all outline-none"
                                    >
                                        Annuler
                                    </button>
                                    <button 
                                        onClick={handleUpdateVoyage}
                                        className="flex-1 h-18 rounded-[28px] bg-accent text-primary archivo-black text-xs uppercase tracking-widest italic hover:bg-white transition-all shadow-xl shadow-accent/5 flex items-center justify-center gap-3 outline-none"
                                    >
                                        <Save className="w-5 h-5 ml-1" /> Sauvegarder
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Boat History Modal */}
            <AnimatePresence>
                {selectedBoatHistory && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedBoatHistory(null)}
                            className="absolute inset-0 bg-[#010312]/95 backdrop-blur-2xl"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-3xl bg-[#0A0C1A] border border-white/5 rounded-[48px] overflow-hidden shadow-2xl"
                        >
                            <div className="p-12 space-y-12">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 rounded-3xl bg-accent text-primary flex items-center justify-center">
                                            <Ship className="w-10 h-10" />
                                        </div>
                                        <div>
                                            <h2 className="archivo-black text-4xl text-white uppercase italic tracking-tighter leading-none mb-2">{selectedBoatHistory}</h2>
                                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest italic tracking-tighter">Historique opérationnel & statistiques</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedBoatHistory(null)}
                                        className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20 hover:text-white transition-all outline-none"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                                    {voyages
                                        .filter(v => v.boat === selectedBoatHistory)
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .map((voyage, idx) => (
                                            <div 
                                                key={voyage.id}
                                                className="group relative bg-white/2 border border-white/5 rounded-3xl p-6 hover:bg-white/5 transition-all flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-8">
                                                    <div className="text-center min-w-[80px]">
                                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1 italic">Date</p>
                                                        <p className="text-sm font-black text-white tabular-nums">{voyage.date}</p>
                                                    </div>
                                                    <div className="w-px h-10 bg-white/5" />
                                                    <div>
                                                        <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-1 italic">Itinéraire</p>
                                                        <p className="text-xs font-black text-white/80 uppercase tracking-widest">{voyage.route}</p>
                                                    </div>
                                                    <div className="w-px h-10 bg-white/5" />
                                                    <div>
                                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1 italic">Heure</p>
                                                        <p className="text-xs font-black text-white/60">{voyage.time}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1 italic">Status</p>
                                                        <span className={cn(
                                                            "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
                                                            voyage.status === 'Confirmé' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-accent/10 text-accent border-accent/20"
                                                        )}>
                                                            {voyage.status}
                                                        </span>
                                                    </div>
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/10 group-hover:text-accent transition-colors">
                                                        <ChevronRight className="w-5 h-5" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>

                                <div className="pt-8 border-t border-white/5">
                                    <button 
                                        onClick={() => setSelectedBoatHistory(null)}
                                        className="w-full h-20 rounded-[32px] bg-white text-primary archivo-black text-xs uppercase tracking-widest italic hover:bg-accent transition-all shadow-xl flex items-center justify-center gap-4"
                                    >
                                        Fermer l'historique
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
