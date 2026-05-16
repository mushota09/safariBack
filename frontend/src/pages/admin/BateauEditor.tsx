import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Ship, 
    Layers, 
    Bed, 
    DoorOpen, 
    Plus, 
    Trash2, 
    ChevronRight, 
    ArrowLeft,
    CheckCircle2,
    Edit2,
    Save,
    Eye,
    X,
    ShieldCheck,
    ToggleLeft,
    ToggleRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import AdminDataTable from '../../components/AdminDataTable';

interface Boat {
    id: string;
    nom: string;
    immatriculation: string;
    capacite_passagers: number;
    capacite_vehicules: number;
    en_maintenance: boolean;
    status: 'Actif' | 'Maintenance';
}

interface Level {
    id: string;
    number: number;
    nom: string;
    multiplicateur_prix: number;
    description: string;
    rooms: Room[];
}

interface Room {
    id: string;
    numero_chambre: string;
    type_chambre: 'Luxe' | 'Standard' | 'Économique';
    prix_base: number;
    fenetre: boolean;
    salle_de_bain: boolean;
    beds: BedType[];
}

interface BedType {
    id: string;
    numero_lit: string;
    type_lit: 'Simple' | 'Double' | 'Superposé';
    taille: string;
    prix_supplementaire: number;
}

export default function AdminBateauEditor() {
    const [view, setView] = useState<'list' | 'detail' | 'create_boat'>('list');
    const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null);
    const [activeLevelId, setActiveLevelId] = useState<string | null>(null);
    
    // Modal States
    const [editingRoom, setEditingRoom] = useState<{ room: Room; isNew: boolean } | null>(null);
    const [editingBed, setEditingBed] = useState<{ roomId: string; bed: BedType; isNew: boolean } | null>(null);

    // Dynamic State for the Boat structure
    const [boatLevels, setBoatLevels] = useState<Level[]>([]);

    // Mock Boats
    const [boats, setBoats] = useState<Boat[]>([
        { id: '1', nom: 'M/V SAFARI', immatriculation: 'REG-1029', capacite_passagers: 350, capacite_vehicules: 40, en_maintenance: false, status: 'Actif' },
        { id: '2', nom: 'M/V SAFARI II', immatriculation: 'REG-2033', capacite_passagers: 450, capacite_vehicules: 60, en_maintenance: true, status: 'Maintenance' },
    ]);

    const [selectedBoatDetails, setSelectedBoatDetails] = useState<Boat | null>(null);

    const [editingBoat, setEditingBoat] = useState<{ boat: Boat; isNew: boolean } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // Wizard state
    const [wizardNewBoat, setWizardNewBoat] = useState<Boat | null>(null);

    const handleSelectBoat = (boat: Boat) => {
        setSelectedBoat(boat);
        // Reset or load levels for this boat. By default, start with NIVEAU 1
        const initialLevels: Level[] = [
            { 
                id: 'L1', 
                number: 1, 
                nom: 'NIVEAU 1', 
                multiplicateur_prix: 1.0,
                description: 'Niveau principal du bateau.',
                rooms: [] 
            }
        ];
        setBoatLevels(initialLevels);
        setActiveLevelId('L1');
        setView('detail');
    };

    const handleRowClick = (boat: Boat) => {
        setSelectedBoatDetails(boat);
    };

    const openAddBoat = () => {
        const newBoat: Boat = {
            id: `B${Date.now()}`,
            nom: '',
            immatriculation: '',
            capacite_passagers: 0,
            capacite_vehicules: 0,
            en_maintenance: false,
            status: 'Actif'
        };
        setWizardNewBoat(newBoat);
        setView('create_boat');
    };

    const saveBoat = (boat: Boat) => {
        let updatedBoats = [];
        if (editingBoat?.isNew) {
            updatedBoats = [...boats, boat];
            setBoats(updatedBoats);
            // After creating, redirect to manage structure
            handleSelectBoat(boat);
        } else {
            updatedBoats = boats.map(b => b.id === boat.id ? boat : b);
            setBoats(updatedBoats);
            if (selectedBoat?.id === boat.id) {
                setSelectedBoat(boat);
            }
        }
        setEditingBoat(null);
    };

    const deleteBoat = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Êtes-vous sûr de vouloir supprimer ce bateau ?')) {
            setBoats(boats.filter(b => b.id !== id));
        }
    };

    const handleSaveStructure = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            alert('Structure enregistrée avec succès !');
        }, 1000);
    };

    // --- Dynamic Logic ---

    const addNiveau = () => {
        const nextNumber = boatLevels.length + 1;
        const newLevel: Level = {
            id: `L${Date.now()}`,
            number: nextNumber,
            nom: `NIVEAU ${nextNumber}`,
            multiplicateur_prix: 1.0,
            description: 'Nouveau niveau ajouté.',
            rooms: []
        };
        setBoatLevels([...boatLevels, newLevel]);
        setActiveLevelId(newLevel.id);
    };

    const removeNiveau = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (boatLevels.length <= 1) return; // Keep at least one level
        const filtered = boatLevels.filter(l => l.id !== id);
        setBoatLevels(filtered);
        if (activeLevelId === id) {
            setActiveLevelId(filtered[0].id);
        }
    };

    const openAddChambre = () => {
        if (!activeLevelId) return;
        const level = boatLevels.find(l => l.id === activeLevelId);
        if (!level) return;

        const nextRoomNum = level.rooms.length + 1;
        const newRoom: Room = {
            id: `R${Date.now()}`,
            numero_chambre: `${level.number}0${nextRoomNum}`,
            type_chambre: 'Standard',
            prix_base: 50,
            fenetre: true,
            salle_de_bain: true,
            beds: []
        };
        setEditingRoom({ room: newRoom, isNew: true });
    };

    const openEditChambre = (room: Room) => {
        setEditingRoom({ room: { ...room }, isNew: false });
    };

    const saveRoom = (updatedRoom: Room) => {
        if (!activeLevelId) return;
        const updatedLevels = [...boatLevels];
        const levelIndex = updatedLevels.findIndex(l => l.id === activeLevelId);
        if (levelIndex === -1) return;

        if (editingRoom?.isNew) {
            updatedLevels[levelIndex].rooms.push(updatedRoom);
        } else {
            const roomIndex = updatedLevels[levelIndex].rooms.findIndex(r => r.id === updatedRoom.id);
            if (roomIndex !== -1) {
                updatedLevels[levelIndex].rooms[roomIndex] = updatedRoom;
            }
        }
        setBoatLevels(updatedLevels);
        setEditingRoom(null);
    };

    const removeChambre = (roomId: string) => {
        if (!confirm('Voulez-vous vraiment supprimer cette chambre ?')) return;
        const levelIndex = boatLevels.findIndex(l => l.id === activeLevelId);
        if (levelIndex === -1) return;

        const updatedLevels = [...boatLevels];
        updatedLevels[levelIndex].rooms = updatedLevels[levelIndex].rooms.filter(r => r.id !== roomId);
        setBoatLevels(updatedLevels);
    };

    const openAddLit = (roomId: string) => {
        const levelIndex = boatLevels.findIndex(l => l.id === activeLevelId);
        if (levelIndex === -1) return;

        const room = boatLevels[levelIndex].rooms.find(r => r.id === roomId);
        if (!room) return;

        const nextBedNum = String.fromCharCode(65 + room.beds.length); // A, B ...
        const newBed: BedType = {
            id: `B${Date.now()}`,
            numero_lit: nextBedNum,
            type_lit: 'Simple',
            taille: '90x190',
            prix_supplementaire: 0
        };
        setEditingBed({ roomId, bed: newBed, isNew: true });
    };

    const openEditLit = (roomId: string, bed: BedType) => {
        setEditingBed({ roomId, bed: { ...bed }, isNew: false });
    };

    const saveBed = (bed: BedType) => {
        if (!editingBed) return;
        const { roomId, isNew } = editingBed;
        const levelIndex = boatLevels.findIndex(l => l.id === activeLevelId);
        if (levelIndex === -1) return;

        const updatedLevels = [...boatLevels];
        const roomIndex = updatedLevels[levelIndex].rooms.findIndex(r => r.id === roomId);
        if (roomIndex === -1) return;

        const currentRoom = updatedLevels[levelIndex].rooms[roomIndex];
        if (isNew) {
            currentRoom.beds.push(bed);
        } else {
            const bedIndex = currentRoom.beds.findIndex(b => b.id === bed.id);
            if (bedIndex !== -1) {
                currentRoom.beds[bedIndex] = bed;
            }
        }

        setBoatLevels(updatedLevels);
        setEditingBed(null);
    };

    const removeLit = (roomId: string, bedId: string) => {
        if (!confirm('Voulez-vous vraiment supprimer ce lit ?')) return;
        const levelIndex = boatLevels.findIndex(l => l.id === activeLevelId);
        if (levelIndex === -1) return;

        const updatedLevels = [...boatLevels];
        const roomIndex = updatedLevels[levelIndex].rooms.findIndex(r => r.id === roomId);
        if (roomIndex === -1) return;

        updatedLevels[levelIndex].rooms[roomIndex].beds = updatedLevels[levelIndex].rooms[roomIndex].beds.filter(b => b.id !== bedId);
        setBoatLevels(updatedLevels);
    };

    const columns = [
        { key: 'nom', label: 'Nom du Bateau' },
        { key: 'immatriculation', label: 'Immatriculation' },
        { key: 'capacite_passagers', label: 'Passagers', render: (val: number) => <span className="font-mono text-white/60">{val} Pers.</span> },
        { key: 'capacite_vehicules', label: 'Véhicules', render: (val: number) => <span className="font-mono text-white/60">{val} Unit.</span> },
        { 
            key: 'status', 
            label: 'Statut',
            render: (val: string) => (
                <div className={cn(
                    "inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                    val === 'Actif' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                )}>
                    {val}
                </div>
            )
        },
        {
            key: 'actions',
            label: 'Action',
            render: (_: any, row: Boat) => (
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setEditingBoat({ boat: { ...row }, isNew: false }); }}
                            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors archivo-black text-[9px] uppercase tracking-widest"
                        >
                            <Edit2 className="w-3.5 h-3.5" /> Modifier
                        </button>
                        <button 
                            onClick={() => handleSelectBoat(row)}
                            className="flex items-center gap-2 text-accent hover:text-white transition-colors archivo-black text-[9px] uppercase tracking-widest group"
                        >
                            <Layers className="w-3.5 h-3.5" /> Structure
                        </button>
                    </div>
                    <button 
                        onClick={(e) => deleteBoat(row.id, e)}
                        className="flex items-center gap-2 text-red-500/40 hover:text-red-500 transition-colors archivo-black text-[9px] uppercase tracking-widest pl-6 border-l border-white/10"
                    >
                        <Trash2 className="w-3.5 h-3.5" /> Supprimer
                    </button>
                </div>
            )
        }
    ];

    if (view === 'list') {
        return (
            <div className="space-y-12">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="archivo-black text-4xl text-white uppercase italic tracking-tighter leading-none mb-4">Gestion des Bateaux</h1>
                        <p className="text-white/30 text-xs font-black uppercase tracking-widest italic border-l-2 border-accent pl-4">Administration de la flotte et des configurations structurelles</p>
                    </div>
                    <button 
                        onClick={openAddBoat}
                        className="h-12 px-8 rounded-2xl bg-accent text-primary archivo-black text-[10px] uppercase tracking-widest italic hover:bg-white transition-all flex items-center gap-3"
                    >
                        <Plus className="w-4 h-4" /> Ajouter un Bateau
                    </button>
                </div>

                <AdminDataTable 
                    title="Liste des Bateaux"
                    subtitle="Configuration des actifs navals"
                    columns={columns}
                    data={boats}
                    onRowClick={handleRowClick}
                />
            </div>
        );
    }

    if (view === 'create_boat' && wizardNewBoat) {
        return (
            <div className="space-y-12">
                <div className="flex items-center gap-8">
                    <button 
                        onClick={() => setView('list')}
                        className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-white/40"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="archivo-black text-3xl text-white uppercase italic tracking-tighter leading-none mb-2">Création : {wizardNewBoat.nom || 'Nouveau Bateau'}</h1>
                        <p className="text-[10px] font-black text-accent uppercase tracking-widest italic tracking-tighter">Étape 1/2 : Informations du Bateau</p>
                    </div>
                </div>

                <div className="max-w-2xl bg-[#0A0C1A] border border-white/5 rounded-[48px] p-12 mx-auto">
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Nom du Bateau</label>
                            <input 
                                type="text"
                                value={wizardNewBoat.nom}
                                onChange={(e) => setWizardNewBoat({ ...wizardNewBoat, nom: e.target.value })}
                                className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none transition-all uppercase"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Immatriculation</label>
                            <input 
                                type="text"
                                value={wizardNewBoat.immatriculation}
                                onChange={(e) => setWizardNewBoat({ ...wizardNewBoat, immatriculation: e.target.value })}
                                className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none transition-all uppercase"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Passagers</label>
                                <input 
                                    type="number"
                                    value={wizardNewBoat.capacite_passagers}
                                    onChange={(e) => setWizardNewBoat({ ...wizardNewBoat, capacite_passagers: Number(e.target.value) })}
                                    className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Véhicules</label>
                                <input 
                                    type="number"
                                    value={wizardNewBoat.capacite_vehicules}
                                    onChange={(e) => setWizardNewBoat({ ...wizardNewBoat, capacite_vehicules: Number(e.target.value) })}
                                    className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <button 
                            onClick={() => {
                                setBoats([...boats, wizardNewBoat]);
                                handleSelectBoat(wizardNewBoat);
                            }}
                            className="w-full h-16 rounded-[24px] bg-accent text-primary archivo-black text-sm uppercase tracking-widest italic hover:bg-white transition-all shadow-xl shadow-accent/5 mt-8"
                        >
                            Suivant (Structure du Bateau)
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const activeLevel = boatLevels.find(l => l.id === activeLevelId);

    return (
        <div className="space-y-12">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="flex items-center gap-8">
                    <button 
                        onClick={() => setView('list')}
                        className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-white/40"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="archivo-black text-3xl text-white uppercase italic tracking-tighter leading-none mb-2">{selectedBoat?.nom}</h1>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest italic">Immatriculation: {selectedBoat?.immatriculation}</span>
                            <div className="w-1 h-1 bg-white/10 rounded-full" />
                            <span className="text-[10px] font-black text-accent uppercase tracking-widest italic tracking-tighter">Édition des Niveaux</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button 
                        onClick={() => selectedBoat && setEditingBoat({ boat: { ...selectedBoat }, isNew: false })}
                        className="h-12 px-6 rounded-2xl bg-white/5 border border-white/5 text-[9px] font-black uppercase text-white/40 hover:text-white transition-all flex items-center gap-3"
                    >
                        <Edit2 className="w-4 h-4" /> Modifier le bateau
                    </button>
                    <button 
                        onClick={handleSaveStructure}
                        disabled={isSaving}
                        className={cn(
                            "h-12 px-8 rounded-2xl bg-accent text-primary archivo-black text-[10px] uppercase tracking-widest italic flex items-center gap-3 transition-all",
                            isSaving && "opacity-50 cursor-wait"
                        )}
                    >
                        {isSaving ? <Layers className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isSaving ? 'Enregistrement...' : 'Enregistrer la Structure'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Levels Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white/5 border border-white/5 rounded-[40px] p-8 space-y-8 sticky top-8">
                        <div className="flex items-center justify-between">
                            <h3 className="archivo-black text-xs text-white/30 uppercase tracking-[0.2em] italic leading-none">Niveaux du Bateau</h3>
                            <button 
                                onClick={addNiveau}
                                className="w-8 h-8 rounded-xl bg-accent/20 border border-accent/20 flex items-center justify-center text-accent hover:bg-accent hover:text-primary transition-all"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {boatLevels.map((level) => (
                                <button 
                                    key={level.id}
                                    onClick={() => setActiveLevelId(level.id)}
                                    className={cn(
                                        "w-full flex items-center justify-between p-6 rounded-3xl border transition-all group",
                                        activeLevelId === level.id ? "bg-accent border-accent text-primary" : "bg-white/3 border-white/5 text-white/40 hover:bg-white/5"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <Layers className="w-5 h-5 transition-transform group-hover:scale-110" />
                                        <div className="text-left">
                                            <p className="text-[11px] font-black uppercase tracking-widest leading-none mb-1">{level.nom}</p>
                                            <p className="text-[9px] font-bold opacity-60 italic">{level.rooms.length} Chambres</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Trash2 
                                            onClick={(e) => removeNiveau(level.id, e)}
                                            className={cn("w-3.5 h-3.5 opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-all", activeLevelId === level.id ? "text-primary" : "text-red-500")} 
                                        />
                                        <ChevronRight className={cn("w-4 h-4 transition-all", activeLevelId === level.id ? "text-primary" : "text-white/10 group-hover:translate-x-1")} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Editor Console */}
                <div className="lg:col-span-3">
                    <div className="bg-white/5 border border-white/5 rounded-[48px] p-10 min-h-[700px] flex flex-col gap-12 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[150px] -mr-64 -mt-64 pointer-events-none" />
                        
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                                        <Layers className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h2 className="archivo-black text-3xl text-white uppercase italic tracking-tighter leading-none mb-1">{activeLevel?.nom}</h2>
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] italic">Configuration des Chambres — Niveau {activeLevel?.number}</p>
                                    </div>
                                </div>
                                <div className="bg-white/3 p-4 rounded-2xl border border-white/5 max-w-xl">
                                    <p className="text-[11px] text-white/40 italic leading-relaxed">{activeLevel?.description}</p>
                                </div>
                            </div>

                            <button 
                                onClick={openAddChambre}
                                className="h-16 px-10 rounded-[28px] bg-accent text-primary archivo-black text-xs uppercase tracking-widest italic flex items-center gap-3 shadow-xl shadow-accent/5 hover:scale-105 transition-all active:scale-95"
                            >
                                <Plus className="w-5 h-5" /> Ajouter une Chambre
                            </button>
                        </div>

                        {/* Rooms Hierarchy Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 relative z-10">
                            {activeLevel?.rooms.map((room) => (
                                <div key={room.id} className="bg-white/2 border border-white/5 rounded-[48px] p-8 space-y-10 group hover:border-accent/40 hover:bg-white/5 transition-all duration-500">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-5">
                                            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-accent/40 group-hover:bg-accent group-hover:text-primary transition-all duration-500">
                                                <DoorOpen className="w-7 h-7" />
                                            </div>
                                            <div>
                                                <h4 className="archivo-black text-2xl text-white italic tracking-tighter">N° {room.numero_chambre}</h4>
                                                <div className="flex items-center gap-2">
                                                     <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                                     <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none">{room.type_chambre}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="archivo-black text-xl text-accent">{room.prix_base}$</p>
                                            <p className="text-[9px] font-bold text-white/20 uppercase">Base</p>
                                        </div>
                                    </div>

                                    {/* Sub-hierarchy: Beds */}
                                    <div className="space-y-5">
                                        <div className="flex justify-between items-center text-[10px] font-black text-white/20 uppercase tracking-widest border-b border-white/5 pb-3">
                                            <div className="flex items-center gap-2">
                                                <Bed className="w-3.5 h-3.5" />
                                                <span>Lits ({room.beds.length})</span>
                                            </div>
                                            <button 
                                                onClick={() => openAddLit(room.id)}
                                                className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-white/20 hover:text-accent hover:bg-white/10 transition-all font-black"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            {room.beds.map((bed) => (
                                                <div key={bed.id} className="flex items-center justify-between p-4 bg-white/3 rounded-2xl border border-white/5 group/bed hover:bg-white/5 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/30 group-hover/bed:text-accent transition-all">
                                                            <Bed className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-black text-white uppercase tracking-widest leading-none mb-1">Lit {bed.numero_lit}</p>
                                                            <p className="text-[9px] font-bold text-white/20 italic">{bed.type_lit} — {bed.taille}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <button 
                                                            onClick={() => openEditLit(room.id, bed)}
                                                            className="w-8 h-8 rounded-lg bg-white/5 text-white/20 hover:text-accent hover:bg-white/10 transition-all opacity-0 group-hover/bed:opacity-100"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button 
                                                            onClick={() => removeLit(room.id, bed.id)}
                                                            className="w-8 h-8 rounded-lg bg-red-500/5 text-red-500/20 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover/bed:opacity-100"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {room.beds.length === 0 && (
                                                <p className="text-[10px] text-white/10 italic text-center py-2">Aucun lit configuré</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Attributes */}
                                    <div className="flex flex-wrap gap-3">
                                        <div className={cn(
                                            "flex items-center gap-3 px-4 py-2 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all",
                                            room.fenetre ? "bg-green-500/5 border-green-500/10 text-green-500" : "bg-white/3 border-white/5 text-white/10"
                                        )}>
                                            <Eye className="w-3.5 h-3.5" /> Fenêtre
                                        </div>
                                        <div className={cn(
                                            "flex items-center gap-3 px-4 py-2 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all",
                                            room.salle_de_bain ? "bg-green-500/5 border-green-500/10 text-green-500" : "bg-white/3 border-white/5 text-white/10"
                                        )}>
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Salle de bain
                                        </div>
                                    </div>

                                    <div className="pt-6 flex gap-4 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                        <button 
                                            onClick={() => openEditChambre(room)}
                                            className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black uppercase text-white/40 hover:text-white hover:bg-white/10 transition-all"
                                        >
                                            Éditer Chambre
                                        </button>
                                        <button 
                                            onClick={() => removeChambre(room.id)}
                                            className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-primary transition-all"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Dynamic Room Adder Card */}
                            <button 
                                onClick={openAddChambre}
                                className="aspect-[4/5] flex flex-col items-center justify-center gap-8 rounded-[48px] border-2 border-dashed border-white/5 hover:border-accent/40 hover:bg-accent/5 transition-all group"
                            >
                                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-accent group-hover:text-primary transition-all duration-700">
                                    <Plus className="w-10 h-10" />
                                </div>
                                <div className="text-center space-y-2 px-10">
                                    <p className="text-[11px] font-black text-white/30 uppercase tracking-widest group-hover:text-white transition-colors">Ajouter une Chambre</p>
                                    <p className="text-[10px] font-bold text-white/10 italic leading-relaxed">Instanciez un nouveau compartiment sur ce niveau</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {editingRoom && (
                    <RoomModal 
                        room={editingRoom.room} 
                        isNew={editingRoom.isNew} 
                        onClose={() => setEditingRoom(null)} 
                        onSave={saveRoom} 
                    />
                )}
                {editingBed && (
                    <BedModal 
                        bed={editingBed.bed} 
                        isNew={editingBed.isNew} 
                        onClose={() => setEditingBed(null)} 
                        onSave={saveBed} 
                    />
                )}
                {editingBoat && (
                    <BoatModal 
                        boat={editingBoat.boat} 
                        isNew={editingBoat.isNew} 
                        onClose={() => setEditingBoat(null)} 
                        onSave={saveBoat}
                        handleSelectBoat={handleSelectBoat}
                    />
                )}
                {selectedBoatDetails && (
                    <BoatDetailModal 
                        boat={selectedBoatDetails} 
                        onClose={() => setSelectedBoatDetails(null)} 
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// BoatDetailModal Component
interface BoatDetailModalProps {
    boat: Boat;
    onClose: () => void;
}

function BoatDetailModal({ boat, onClose }: BoatDetailModalProps) {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-[#010312]/90 backdrop-blur-xl"
            />
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-xl bg-[#0A0C1A] border border-white/5 rounded-[48px] overflow-hidden shadow-2xl"
            >
                <div className="p-12 space-y-8">
                    <div className="flex justify-between items-center">
                        <h2 className="archivo-black text-3xl text-white uppercase italic tracking-tighter">Détails du Bateau</h2>
                        <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20 hover:text-white transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6 bg-white/3 p-6 rounded-2xl border border-white/5">
                            <div>
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Nom</p>
                                <p className="text-sm font-bold text-white">{boat.nom}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Immatriculation</p>
                                <p className="text-sm font-bold text-white">{boat.immatriculation}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Passagers</p>
                                <p className="text-sm font-bold text-white">{boat.capacite_passagers}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Véhicules</p>
                                <p className="text-sm font-bold text-white">{boat.capacite_vehicules}</p>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-full h-16 rounded-[24px] bg-accent text-primary archivo-black text-sm uppercase tracking-widest italic hover:bg-white transition-all"
                    >
                        Fermer
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// --- Sub-components for Modals ---

interface BoatModalProps {
    boat: Boat;
    isNew: boolean;
    onClose: () => void;
    onSave: (boat: Boat) => void;
    handleSelectBoat: (boat: Boat) => void;
}

function BoatModal({ boat, isNew, onClose, onSave, handleSelectBoat }: BoatModalProps) {
    const [formData, setFormData] = useState<Boat>(boat);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
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
                                <Ship className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="archivo-black text-3xl text-white uppercase italic tracking-tighter leading-none mb-2">
                                    {isNew ? 'Nouveau Bateau' : 'Éditer Bateau'}
                                </h2>
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest italic">Informations d'immatriculation</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20 hover:text-white transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Nom du Bateau</label>
                            <input 
                                type="text"
                                value={formData.nom}
                                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                                className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none transition-all uppercase"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Immatriculation</label>
                            <input 
                                type="text"
                                value={formData.immatriculation}
                                onChange={(e) => setFormData({ ...formData, immatriculation: e.target.value })}
                                className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none transition-all uppercase"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Passagers</label>
                                <input 
                                    type="number"
                                    value={formData.capacite_passagers}
                                    onChange={(e) => setFormData({ ...formData, capacite_passagers: Number(e.target.value) })}
                                    className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Véhicules</label>
                                <input 
                                    type="number"
                                    value={formData.capacite_vehicules}
                                    onChange={(e) => setFormData({ ...formData, capacite_vehicules: Number(e.target.value) })}
                                    className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Statut Opérationnel</label>
                            <select 
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as any, en_maintenance: e.target.value === 'Maintenance' })}
                                className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none transition-all appearance-none"
                            >
                                <option value="Actif">ACTIF / EN SERVICE</option>
                                <option value="Maintenance">MAINTENANCE / RÉPARATION</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-8">
                        {!isNew && (
                            <button
                                onClick={() => { onClose(); handleSelectBoat(formData); }}
                                className="h-16 px-8 rounded-[24px] bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-accent hover:bg-white/10 transition-all flex items-center gap-2"
                            >
                                <Layers className="w-4 h-4" /> Structure
                            </button>
                        )}
                        <button 
                            onClick={onClose}
                            className="flex-1 h-16 rounded-[24px] border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/5 transition-all"
                        >
                            Annuler
                        </button>
                        <button 
                            onClick={() => onSave(formData)}
                            className="flex-1 h-16 rounded-[24px] bg-accent text-primary archivo-black text-sm uppercase tracking-widest italic hover:bg-white transition-all shadow-xl shadow-accent/5"
                        >
                            {isNew ? 'Créer Bateau' : 'Sauvegarder'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

interface RoomModalProps {
    room: Room;
    isNew: boolean;
    onClose: () => void;
    onSave: (room: Room) => void;
}

function RoomModal({ room, isNew, onClose, onSave }: RoomModalProps) {
    const [formData, setFormData] = useState<Room>(room);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-[#010312]/90 backdrop-blur-xl"
            />
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl bg-[#0A0C1A] border border-white/5 rounded-[48px] overflow-hidden shadow-2xl"
            >
                <div className="p-12 space-y-12">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center text-accent">
                                <DoorOpen className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="archivo-black text-3xl text-white uppercase italic tracking-tighter leading-none mb-2">
                                    {isNew ? 'Nouvelle Chambre' : 'Éditer Chambre'}
                                </h2>
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest italic">Configuration spatiale du niveau</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20 hover:text-white transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        {/* Chambre Info */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Numéro de Chambre</label>
                            <input 
                                type="text"
                                value={formData.numero_chambre}
                                onChange={(e) => setFormData({ ...formData, numero_chambre: e.target.value })}
                                className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Type de Chambre</label>
                            <select 
                                value={formData.type_chambre}
                                onChange={(e) => setFormData({ ...formData, type_chambre: e.target.value as any })}
                                className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none transition-all appearance-none"
                            >
                                <option value="Standard">Standard</option>
                                <option value="Luxe">Luxe</option>
                                <option value="Économique">Économique</option>
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Prix de Base ($)</label>
                            <input 
                                type="number"
                                value={formData.prix_base}
                                onChange={(e) => setFormData({ ...formData, prix_base: Number(e.target.value) })}
                                className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none transition-all"
                            />
                        </div>

                        {/* Toggles */}
                        <div className="grid grid-cols-1 gap-4 pt-4">
                            <button 
                                onClick={() => setFormData({ ...formData, fenetre: !formData.fenetre })}
                                className={cn(
                                    "flex items-center justify-between p-4 rounded-2xl border transition-all",
                                    formData.fenetre ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-white/3 border-white/5 text-white/20"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <Eye className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Fenêtre</span>
                                </div>
                                {formData.fenetre ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                            </button>
                            <button 
                                onClick={() => setFormData({ ...formData, salle_de_bain: !formData.salle_de_bain })}
                                className={cn(
                                    "flex items-center justify-between p-4 rounded-2xl border transition-all",
                                    formData.salle_de_bain ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-white/3 border-white/5 text-white/20"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Salle de bain</span>
                                </div>
                                {formData.salle_de_bain ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-8">
                        <button 
                            onClick={onClose}
                            className="flex-1 h-16 rounded-[24px] border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/5 transition-all"
                        >
                            Annuler
                        </button>
                        <button 
                            onClick={() => onSave(formData)}
                            className="flex-1 h-16 rounded-[24px] bg-accent text-primary archivo-black text-sm uppercase tracking-widest italic hover:bg-white transition-all shadow-xl shadow-accent/5"
                        >
                            {isNew ? 'Créer Chambre' : 'Mettre à jour'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

interface BedModalProps {
    bed: BedType;
    isNew: boolean;
    onClose: () => void;
    onSave: (bed: BedType) => void;
}

function BedModal({ bed, isNew, onClose, onSave }: BedModalProps) {
    const [formData, setFormData] = useState<BedType>(bed);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-[#010312]/90 backdrop-blur-xl"
            />
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg bg-[#0A0C1A] border border-white/5 rounded-[48px] overflow-hidden shadow-2xl"
            >
                <div className="p-12 space-y-12">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center text-accent">
                                <Bed className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="archivo-black text-3xl text-white uppercase italic tracking-tighter leading-none mb-2">
                                    {isNew ? 'Nouveau Lit' : 'Éditer Lit'}
                                </h2>
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest italic">Spécifications du couchage</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20 hover:text-white transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Référence Lit</label>
                                <input 
                                    type="text"
                                    value={formData.numero_lit}
                                    onChange={(e) => setFormData({ ...formData, numero_lit: e.target.value })}
                                    maxLength={2}
                                    className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none transition-all uppercase"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Taille (cm)</label>
                                <input 
                                    type="text"
                                    value={formData.taille}
                                    onChange={(e) => setFormData({ ...formData, taille: e.target.value })}
                                    placeholder="Ex: 90x190"
                                    className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Type de Lit</label>
                            <select 
                                value={formData.type_lit}
                                onChange={(e) => setFormData({ ...formData, type_lit: e.target.value as any })}
                                className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none transition-all appearance-none"
                            >
                                <option value="Simple">Simple</option>
                                <option value="Double">Double</option>
                                <option value="Superposé">Superposé</option>
                            </select>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2">Supplément Prix ($)</label>
                            <input 
                                type="number"
                                value={formData.prix_supplementaire}
                                onChange={(e) => setFormData({ ...formData, prix_supplementaire: Number(e.target.value) })}
                                className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-8">
                        <button 
                            onClick={onClose}
                            className="flex-1 h-16 rounded-[24px] border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/5 transition-all"
                        >
                            Annuler
                        </button>
                        <button 
                            onClick={() => onSave(formData)}
                            className="flex-1 h-16 rounded-[24px] bg-accent text-primary archivo-black text-sm uppercase tracking-widest italic hover:bg-white transition-all shadow-xl shadow-accent/5"
                        >
                            {isNew ? 'Ajouter Lit' : 'Sauvegarder'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
