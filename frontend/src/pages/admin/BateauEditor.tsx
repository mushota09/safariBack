/**
 * Éditeur de bateaux — entièrement connecté au backend FastAPI.
 *
 * Fonctionnalités :
 *  - Liste de la flotte (GET /bateaux)
 *  - Création d'un bateau via wizard (étape 1 : infos, étape 2 : structure)
 *  - Édition d'un bateau existant (bouton "Modifier")
 *  - Gestion de la galerie d'images : photo principale + album (CRUD complet)
 *  - Édition de la structure : niveaux / chambres / lits (PUT /bateaux/{id}/structure)
 */
import React, { useEffect, useState, useCallback } from 'react';
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
    Image as ImageIcon,
    Star,
    Loader2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import AdminDataTable from '../../components/AdminDataTable';
import { bateauService, Bateau, ImageBateau } from '../../services/bateauService';
import { ApiError } from '../../services/api';

// ---------- Types locaux ----------

interface Level {
    id?: number; // id backend si déjà persisté
    uiId: string; // id stable local
    numero_niveau: number;
    nom: string;
    multiplicateur_prix: number;
    description: string;
    rooms: Room[];
}

interface Room {
    id?: number;
    uiId: string;
    numero_chambre: string;
    type_chambre: 'Luxe' | 'Standard' | 'Économique';
    prix_base: number;
    fenetre: boolean;
    salle_de_bain: boolean;
    beds: BedRow[];
}

interface BedRow {
    id?: number;
    uiId: string;
    numero_lit: string;
    type_lit: 'simple' | 'double' | 'superpose';
    taille: string;
    prix_supplementaire: number;
    disponible: boolean;
}

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

const TYPE_LIT_LABEL: Record<BedRow['type_lit'], string> = {
    simple: 'Simple',
    double: 'Double',
    superpose: 'Superposé',
};

// ---------- Composant principal ----------

type ViewKind = 'list' | 'detail' | 'create_boat' | 'gallery';

export default function AdminBateauEditor() {
    const [view, setView] = useState<ViewKind>('list');
    const [boats, setBoats] = useState<Bateau[]>([]);
    const [loading, setLoading] = useState(true);
    const [globalError, setGlobalError] = useState<string | null>(null);

    const [selectedBoat, setSelectedBoat] = useState<Bateau | null>(null);
    const [boatLevels, setBoatLevels] = useState<Level[]>([]);
    const [activeLevelUiId, setActiveLevelUiId] = useState<string | null>(null);
    const [isSavingStructure, setIsSavingStructure] = useState(false);

    // Modals
    const [editingRoom, setEditingRoom] = useState<{ room: Room; isNew: boolean } | null>(null);
    const [editingBed, setEditingBed] = useState<{ roomUiId: string; bed: BedRow; isNew: boolean } | null>(null);
    const [editingBoat, setEditingBoat] = useState<{ boat: Partial<Bateau>; isNew: boolean } | null>(null);

    // Wizard
    const [wizardNewBoat, setWizardNewBoat] = useState<Partial<Bateau> & { _mainPhoto?: string }>({});
    const [creatingBoat, setCreatingBoat] = useState(false);

    // ---------- Loaders ----------

    const loadBoats = useCallback(async () => {
        try {
            setLoading(true);
            const data = await bateauService.list();
            setBoats(data);
        } catch (err: any) {
            setGlobalError(err?.message || 'Impossible de charger la flotte');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadBoats();
    }, [loadBoats]);

    const loadStructure = useCallback(async (bateau: Bateau) => {
        try {
            setLoading(true);
            const data = await bateauService.structure(bateau.id);
            if (data.niveaux.length === 0) {
                const seed: Level = {
                    uiId: uid('L'),
                    numero_niveau: 1,
                    nom: 'NIVEAU 1',
                    multiplicateur_prix: 1.0,
                    description: 'Niveau principal du bateau.',
                    rooms: [],
                };
                setBoatLevels([seed]);
                setActiveLevelUiId(seed.uiId);
            } else {
                const mapped: Level[] = data.niveaux.map(n => ({
                    id: n.id,
                    uiId: uid('L'),
                    numero_niveau: n.numero_niveau,
                    nom: n.nom,
                    multiplicateur_prix: n.multiplicateur_prix,
                    description: n.description || '',
                    rooms: n.chambres.map(c => ({
                        id: c.id,
                        uiId: uid('R'),
                        numero_chambre: c.numero_chambre,
                        type_chambre: (c.type_chambre as Room['type_chambre']) || 'Standard',
                        prix_base: c.prix_base,
                        fenetre: c.fenetre,
                        salle_de_bain: c.salle_de_bain,
                        beds: c.lits.map(l => ({
                            id: l.id,
                            uiId: uid('B'),
                            numero_lit: l.numero_lit,
                            type_lit: l.type_lit,
                            taille: l.taille || '',
                            prix_supplementaire: l.prix_supplementaire,
                            disponible: l.disponible,
                        })),
                    })),
                }));
                setBoatLevels(mapped);
                setActiveLevelUiId(mapped[0].uiId);
            }
        } catch (err: any) {
            setGlobalError(err?.message || 'Impossible de charger la structure');
        } finally {
            setLoading(false);
        }
    }, []);

    // ---------- Actions Bateau ----------

    const handleSelectBoat = async (boat: Bateau) => {
        setSelectedBoat(boat);
        setView('detail');
        await loadStructure(boat);
    };

    const openAddBoat = () => {
        setWizardNewBoat({
            nom: '',
            immatriculation: '',
            capacite_passagers: 0,
            capacite_vehicules: 0,
            en_maintenance: false,
            photo_principale: '',
        });
        setView('create_boat');
    };

    const createBoatFromWizard = async () => {
        setGlobalError(null);
        if (!wizardNewBoat.nom || !wizardNewBoat.immatriculation || !wizardNewBoat.capacite_passagers) {
            setGlobalError('Veuillez renseigner nom, immatriculation et capacité passagers.');
            return;
        }
        setCreatingBoat(true);
        try {
            const created = await bateauService.create({
                nom: wizardNewBoat.nom!,
                immatriculation: wizardNewBoat.immatriculation!,
                capacite_passagers: Number(wizardNewBoat.capacite_passagers) || 0,
                capacite_vehicules: Number(wizardNewBoat.capacite_vehicules) || 0,
                en_maintenance: !!wizardNewBoat.en_maintenance,
                photo_principale: wizardNewBoat.photo_principale || undefined,
                compagnie_id: undefined as unknown as number, // backend déduira du tenant
            });
            setBoats(prev => [created, ...prev]);
            // Si on a déjà saisi une photo principale, l'ajouter aussi à la galerie
            if (wizardNewBoat.photo_principale) {
                try {
                    await bateauService.addImage(created.id, {
                        url: wizardNewBoat.photo_principale,
                        est_principale: true,
                        ordre: 0,
                        legende: 'Photo principale',
                    });
                } catch { /* non bloquant */ }
            }
            await handleSelectBoat(created);
        } catch (err: any) {
            const msg = err instanceof ApiError
                ? (typeof err.detail === 'string' ? err.detail : err.detail?.detail || err.message)
                : err?.message;
            setGlobalError(msg || 'Erreur lors de la création du bateau.');
        } finally {
            setCreatingBoat(false);
        }
    };

    const saveBoatEdit = async (data: Partial<Bateau>) => {
        if (!editingBoat) return;
        try {
            if (editingBoat.isNew) {
                const created = await bateauService.create({
                    nom: data.nom || '',
                    immatriculation: data.immatriculation || '',
                    capacite_passagers: Number(data.capacite_passagers) || 0,
                    capacite_vehicules: Number(data.capacite_vehicules) || 0,
                    en_maintenance: !!data.en_maintenance,
                    photo_principale: data.photo_principale || undefined,
                });
                setBoats(prev => [created, ...prev]);
            } else if (data.id) {
                const updated = await bateauService.update(data.id, {
                    nom: data.nom,
                    immatriculation: data.immatriculation,
                    capacite_passagers: data.capacite_passagers,
                    capacite_vehicules: data.capacite_vehicules,
                    en_maintenance: data.en_maintenance,
                    photo_principale: data.photo_principale ?? undefined,
                });
                setBoats(prev => prev.map(b => (b.id === updated.id ? updated : b)));
                if (selectedBoat?.id === updated.id) setSelectedBoat(updated);
            }
            setEditingBoat(null);
        } catch (err: any) {
            const msg = err instanceof ApiError
                ? (typeof err.detail === 'string' ? err.detail : err.detail?.detail || err.message)
                : err?.message;
            setGlobalError(msg || 'Erreur lors de la sauvegarde du bateau.');
        }
    };

    const deleteBoat = async (id: number) => {
        if (!confirm('Supprimer définitivement ce bateau ?')) return;
        try {
            await bateauService.remove(id);
            setBoats(prev => prev.filter(b => b.id !== id));
        } catch (err: any) {
            setGlobalError(err?.message || 'Suppression impossible.');
        }
    };

    // ---------- Actions Structure ----------

    const activeLevel = boatLevels.find(l => l.uiId === activeLevelUiId);

    const addNiveau = () => {
        const nextNumber = boatLevels.length + 1;
        const newLevel: Level = {
            uiId: uid('L'),
            numero_niveau: nextNumber,
            nom: `NIVEAU ${nextNumber}`,
            multiplicateur_prix: 1.0,
            description: 'Nouveau niveau ajouté.',
            rooms: [],
        };
        setBoatLevels([...boatLevels, newLevel]);
        setActiveLevelUiId(newLevel.uiId);
    };

    const removeNiveau = (uiId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (boatLevels.length <= 1) return;
        const filtered = boatLevels.filter(l => l.uiId !== uiId);
        setBoatLevels(filtered);
        if (activeLevelUiId === uiId) setActiveLevelUiId(filtered[0].uiId);
    };

    const openAddChambre = () => {
        if (!activeLevel) return;
        const nextRoomNum = activeLevel.rooms.length + 1;
        const newRoom: Room = {
            uiId: uid('R'),
            numero_chambre: `${activeLevel.numero_niveau}0${nextRoomNum}`,
            type_chambre: 'Standard',
            prix_base: 50,
            fenetre: true,
            salle_de_bain: true,
            beds: [],
        };
        setEditingRoom({ room: newRoom, isNew: true });
    };

    const saveRoom = (updatedRoom: Room) => {
        if (!activeLevel || !editingRoom) return;
        setBoatLevels(prev => prev.map(l => {
            if (l.uiId !== activeLevel.uiId) return l;
            if (editingRoom.isNew) {
                return { ...l, rooms: [...l.rooms, updatedRoom] };
            }
            return { ...l, rooms: l.rooms.map(r => (r.uiId === updatedRoom.uiId ? updatedRoom : r)) };
        }));
        setEditingRoom(null);
    };

    const removeChambre = (roomUiId: string) => {
        if (!confirm('Supprimer cette chambre ?')) return;
        if (!activeLevel) return;
        setBoatLevels(prev => prev.map(l =>
            l.uiId === activeLevel.uiId ? { ...l, rooms: l.rooms.filter(r => r.uiId !== roomUiId) } : l
        ));
    };

    const openAddLit = (room: Room) => {
        const nextBedNum = String.fromCharCode(65 + room.beds.length);
        const newBed: BedRow = {
            uiId: uid('B'),
            numero_lit: nextBedNum,
            type_lit: 'simple',
            taille: '90x190',
            prix_supplementaire: 0,
            disponible: true,
        };
        setEditingBed({ roomUiId: room.uiId, bed: newBed, isNew: true });
    };

    const saveBed = (bed: BedRow) => {
        if (!editingBed || !activeLevel) return;
        const { roomUiId, isNew } = editingBed;
        setBoatLevels(prev => prev.map(l => {
            if (l.uiId !== activeLevel.uiId) return l;
            return {
                ...l,
                rooms: l.rooms.map(r => {
                    if (r.uiId !== roomUiId) return r;
                    if (isNew) return { ...r, beds: [...r.beds, bed] };
                    return { ...r, beds: r.beds.map(b => (b.uiId === bed.uiId ? bed : b)) };
                }),
            };
        }));
        setEditingBed(null);
    };

    const removeLit = (roomUiId: string, bedUiId: string) => {
        if (!confirm('Supprimer ce lit ?')) return;
        if (!activeLevel) return;
        setBoatLevels(prev => prev.map(l => {
            if (l.uiId !== activeLevel.uiId) return l;
            return {
                ...l,
                rooms: l.rooms.map(r => (r.uiId !== roomUiId ? r : { ...r, beds: r.beds.filter(b => b.uiId !== bedUiId) })),
            };
        }));
    };

    const handleSaveStructure = async () => {
        if (!selectedBoat) return;
        setIsSavingStructure(true);
        setGlobalError(null);
        try {
            await bateauService.saveStructure(selectedBoat.id, boatLevels.map(l => ({
                id: l.id,
                numero_niveau: l.numero_niveau,
                nom: l.nom,
                multiplicateur_prix: l.multiplicateur_prix,
                description: l.description,
                chambres: l.rooms.map(r => ({
                    id: r.id,
                    numero_chambre: r.numero_chambre,
                    type_chambre: r.type_chambre,
                    prix_base: r.prix_base,
                    fenetre: r.fenetre,
                    salle_de_bain: r.salle_de_bain,
                    lits: r.beds.map(b => ({
                        id: b.id,
                        numero_lit: b.numero_lit,
                        type_lit: b.type_lit,
                        taille: b.taille,
                        prix_supplementaire: b.prix_supplementaire,
                        disponible: b.disponible,
                    })),
                })),
            })));
            // Recharger pour récupérer les IDs des nouvelles entités
            await loadStructure(selectedBoat);
            alert('Structure enregistrée avec succès.');
        } catch (err: any) {
            const msg = err instanceof ApiError
                ? (typeof err.detail === 'string' ? err.detail : err.detail?.detail || err.message)
                : err?.message;
            setGlobalError(msg || 'Erreur lors de la sauvegarde de la structure.');
        } finally {
            setIsSavingStructure(false);
        }
    };

    // ---------- Columns DataTable ----------

    const columns = [
        {
            key: 'photo_principale',
            label: '',
            render: (val: string | null, row: Bateau) => (
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 border border-white/5 flex items-center justify-center">
                    {val ? <img src={val} alt={row.nom} className="w-full h-full object-cover" /> : <Ship className="w-5 h-5 text-white/20" />}
                </div>
            ),
        },
        { key: 'nom', label: 'Nom du Bateau' },
        { key: 'immatriculation', label: 'Immatriculation' },
        { key: 'capacite_passagers', label: 'Passagers', render: (val: number) => <span className="font-mono text-white/60">{val} Pers.</span> },
        { key: 'capacite_vehicules', label: 'Véhicules', render: (val: number) => <span className="font-mono text-white/60">{val ?? 0} Unit.</span> },
        {
            key: 'en_maintenance',
            label: 'Statut',
            render: (val: boolean) => (
                <div className={cn(
                    "inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                    !val ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20",
                )}>
                    {val ? 'Maintenance' : 'Actif'}
                </div>
            ),
        },
        {
            key: 'actions',
            label: 'Action',
            render: (_: any, row: Bateau) => (
                <div className="flex items-center gap-4">
                    <button
                        onClick={(e) => { e.stopPropagation(); setEditingBoat({ boat: { ...row }, isNew: false }); }}
                        className="flex items-center gap-2 text-white/40 hover:text-white archivo-black text-[9px] uppercase tracking-widest"
                    >
                        <Edit2 className="w-3.5 h-3.5" /> Modifier
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setSelectedBoat(row); setView('gallery'); }}
                        className="flex items-center gap-2 text-accent hover:text-white archivo-black text-[9px] uppercase tracking-widest"
                    >
                        <ImageIcon className="w-3.5 h-3.5" /> Galerie
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleSelectBoat(row); }}
                        className="flex items-center gap-2 text-accent hover:text-white archivo-black text-[9px] uppercase tracking-widest"
                    >
                        <Layers className="w-3.5 h-3.5" /> Structure
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); deleteBoat(row.id); }}
                        className="flex items-center gap-2 text-red-500/40 hover:text-red-500 archivo-black text-[9px] uppercase tracking-widest pl-4 border-l border-white/10"
                    >
                        <Trash2 className="w-3.5 h-3.5" /> Supprimer
                    </button>
                </div>
            ),
        },
    ];

    // ---------- Render ----------

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

                {globalError && (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold">{globalError}</div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-24 text-white/30">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                ) : (
                    <AdminDataTable
                        title="Liste des Bateaux"
                        subtitle="Configuration des actifs navals"
                        columns={columns}
                        data={boats}
                    />
                )}

                <AnimatePresence>
                    {editingBoat && (
                        <BoatModal
                            boat={editingBoat.boat}
                            isNew={editingBoat.isNew}
                            onClose={() => setEditingBoat(null)}
                            onSave={saveBoatEdit}
                        />
                    )}
                </AnimatePresence>
            </div>
        );
    }

    if (view === 'create_boat') {
        return (
            <div className="space-y-12">
                <div className="flex items-center gap-8">
                    <button onClick={() => setView('list')} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/40">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="archivo-black text-3xl text-white uppercase italic tracking-tighter leading-none mb-2">Création : {wizardNewBoat.nom || 'Nouveau Bateau'}</h1>
                        <p className="text-[10px] font-black text-accent uppercase tracking-widest italic">Étape 1/2 : Informations + Photo principale</p>
                    </div>
                </div>

                {globalError && (
                    <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold">{globalError}</div>
                )}

                <div className="max-w-2xl bg-[#0A0C1A] border border-white/5 rounded-[48px] p-12 mx-auto">
                    <div className="space-y-6">
                        <PhotoPrincipaleField
                            value={wizardNewBoat.photo_principale || ''}
                            onChange={(url) => setWizardNewBoat(prev => ({ ...prev, photo_principale: url }))}
                        />

                        <Field label="Nom du Bateau">
                            <input
                                type="text"
                                value={wizardNewBoat.nom || ''}
                                onChange={(e) => setWizardNewBoat(prev => ({ ...prev, nom: e.target.value }))}
                                className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none uppercase"
                            />
                        </Field>
                        <Field label="Immatriculation">
                            <input
                                type="text"
                                value={wizardNewBoat.immatriculation || ''}
                                onChange={(e) => setWizardNewBoat(prev => ({ ...prev, immatriculation: e.target.value }))}
                                className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none uppercase"
                            />
                        </Field>
                        <div className="grid grid-cols-2 gap-6">
                            <Field label="Passagers">
                                <input
                                    type="number"
                                    value={wizardNewBoat.capacite_passagers || 0}
                                    onChange={(e) => setWizardNewBoat(prev => ({ ...prev, capacite_passagers: Number(e.target.value) }))}
                                    className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none"
                                />
                            </Field>
                            <Field label="Véhicules">
                                <input
                                    type="number"
                                    value={wizardNewBoat.capacite_vehicules || 0}
                                    onChange={(e) => setWizardNewBoat(prev => ({ ...prev, capacite_vehicules: Number(e.target.value) }))}
                                    className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none"
                                />
                            </Field>
                        </div>

                        <button
                            onClick={createBoatFromWizard}
                            disabled={creatingBoat}
                            className="w-full h-16 rounded-[24px] bg-accent text-primary archivo-black text-sm uppercase tracking-widest italic hover:bg-white disabled:opacity-50 transition-all shadow-xl shadow-accent/5 mt-8 flex items-center justify-center gap-3"
                        >
                            {creatingBoat ? <><Loader2 className="w-5 h-5 animate-spin" /> Création…</> : 'Suivant (Structure du Bateau)'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'gallery' && selectedBoat) {
        return (
            <GalleryView
                bateau={selectedBoat}
                onBack={() => { setView('list'); setSelectedBoat(null); }}
                onMainPhotoChanged={(url) => {
                    setSelectedBoat(prev => prev ? { ...prev, photo_principale: url } : prev);
                    setBoats(prev => prev.map(b => b.id === selectedBoat.id ? { ...b, photo_principale: url } : b));
                }}
            />
        );
    }

    // Vue détail : structure
    return (
        <div className="space-y-12">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="flex items-center gap-8">
                    <button onClick={() => setView('list')} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/40">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="archivo-black text-3xl text-white uppercase italic tracking-tighter leading-none mb-2">{selectedBoat?.nom}</h1>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest italic">Immatriculation: {selectedBoat?.immatriculation}</span>
                            <div className="w-1 h-1 bg-white/10 rounded-full" />
                            <span className="text-[10px] font-black text-accent uppercase tracking-widest italic">Édition des Niveaux</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => selectedBoat && setView('gallery')}
                        className="h-12 px-6 rounded-2xl bg-white/5 border border-white/5 text-[9px] font-black uppercase text-white/40 hover:text-white transition-all flex items-center gap-3"
                    >
                        <ImageIcon className="w-4 h-4" /> Galerie
                    </button>
                    <button
                        onClick={() => selectedBoat && setEditingBoat({ boat: { ...selectedBoat }, isNew: false })}
                        className="h-12 px-6 rounded-2xl bg-white/5 border border-white/5 text-[9px] font-black uppercase text-white/40 hover:text-white transition-all flex items-center gap-3"
                    >
                        <Edit2 className="w-4 h-4" /> Modifier le bateau
                    </button>
                    <button
                        onClick={handleSaveStructure}
                        disabled={isSavingStructure}
                        className={cn(
                            "h-12 px-8 rounded-2xl bg-accent text-primary archivo-black text-[10px] uppercase tracking-widest italic flex items-center gap-3 transition-all",
                            isSavingStructure && "opacity-50 cursor-wait",
                        )}
                    >
                        {isSavingStructure ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isSavingStructure ? 'Enregistrement...' : 'Enregistrer la Structure'}
                    </button>
                </div>
            </div>

            {globalError && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold">{globalError}</div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar niveaux */}
                <div className="lg:col-span-1">
                    <div className="bg-white/5 border border-white/5 rounded-[40px] p-8 space-y-8 sticky top-8">
                        <div className="flex items-center justify-between">
                            <h3 className="archivo-black text-xs text-white/30 uppercase tracking-[0.2em] italic leading-none">Niveaux du Bateau</h3>
                            <button onClick={addNiveau} className="w-8 h-8 rounded-xl bg-accent/20 border border-accent/20 flex items-center justify-center text-accent hover:bg-accent hover:text-primary transition-all">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {boatLevels.map(level => (
                                <button
                                    key={level.uiId}
                                    onClick={() => setActiveLevelUiId(level.uiId)}
                                    className={cn(
                                        "w-full flex items-center justify-between p-6 rounded-3xl border transition-all group",
                                        activeLevelUiId === level.uiId ? "bg-accent border-accent text-primary" : "bg-white/3 border-white/5 text-white/40 hover:bg-white/5",
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <Layers className="w-5 h-5" />
                                        <div className="text-left">
                                            <p className="text-[11px] font-black uppercase tracking-widest leading-none mb-1">{level.nom}</p>
                                            <p className="text-[9px] font-bold opacity-60 italic">{level.rooms.length} Chambres</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {boatLevels.length > 1 && (
                                            <Trash2
                                                onClick={(e) => removeNiveau(level.uiId, e)}
                                                className={cn("w-3.5 h-3.5 opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-all", activeLevelUiId === level.uiId ? "text-primary" : "text-red-500")}
                                            />
                                        )}
                                        <ChevronRight className={cn("w-4 h-4 transition-all", activeLevelUiId === level.uiId ? "text-primary" : "text-white/10")} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Console édition */}
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
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] italic">Configuration des Chambres — Niveau {activeLevel?.numero_niveau}</p>
                                    </div>
                                </div>
                                {activeLevel && (
                                    <input
                                        type="text"
                                        value={activeLevel.description}
                                        onChange={(e) => setBoatLevels(prev => prev.map(l => l.uiId === activeLevel.uiId ? { ...l, description: e.target.value } : l))}
                                        className="bg-white/3 p-4 rounded-2xl border border-white/5 max-w-xl text-[11px] text-white/60 italic outline-none focus:border-accent/40 w-full"
                                        placeholder="Description du niveau"
                                    />
                                )}
                            </div>
                            <button onClick={openAddChambre} className="h-16 px-10 rounded-[28px] bg-accent text-primary archivo-black text-xs uppercase tracking-widest italic flex items-center gap-3 shadow-xl">
                                <Plus className="w-5 h-5" /> Ajouter une Chambre
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 relative z-10">
                            {activeLevel?.rooms.map(room => (
                                <RoomCard
                                    key={room.uiId}
                                    room={room}
                                    onEdit={() => setEditingRoom({ room: { ...room }, isNew: false })}
                                    onDelete={() => removeChambre(room.uiId)}
                                    onAddBed={() => openAddLit(room)}
                                    onEditBed={(bed) => setEditingBed({ roomUiId: room.uiId, bed: { ...bed }, isNew: false })}
                                    onDeleteBed={(bedUiId) => removeLit(room.uiId, bedUiId)}
                                />
                            ))}
                            <button
                                onClick={openAddChambre}
                                className="aspect-[4/5] flex flex-col items-center justify-center gap-8 rounded-[48px] border-2 border-dashed border-white/5 hover:border-accent/40 hover:bg-accent/5 transition-all group"
                            >
                                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-accent group-hover:text-primary transition-all">
                                    <Plus className="w-10 h-10" />
                                </div>
                                <p className="text-[11px] font-black text-white/30 uppercase tracking-widest group-hover:text-white">Ajouter une Chambre</p>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {editingRoom && <RoomModal room={editingRoom.room} isNew={editingRoom.isNew} onClose={() => setEditingRoom(null)} onSave={saveRoom} />}
                {editingBed && <BedModal bed={editingBed.bed} isNew={editingBed.isNew} onClose={() => setEditingBed(null)} onSave={saveBed} />}
                {editingBoat && <BoatModal boat={editingBoat.boat} isNew={editingBoat.isNew} onClose={() => setEditingBoat(null)} onSave={saveBoatEdit} />}
            </AnimatePresence>
        </div>
    );
}

// ============================================================
//  Sous-composants
// ============================================================

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic px-2 block">{label}</label>
            {children}
        </div>
    );
}

function PhotoPrincipaleField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const onFile = (file: File | null) => {
        if (!file) return;
        // Pas d'upload backend disponible : on stocke en base64 (data URL).
        const reader = new FileReader();
        reader.onload = () => onChange(String(reader.result || ''));
        reader.readAsDataURL(file);
    };
    return (
        <Field label="Photo principale">
            <div className="flex gap-6 items-stretch">
                <div
                    onClick={() => inputRef.current?.click()}
                    className={cn(
                        "w-40 h-32 rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden relative bg-white/3",
                        value ? "border-accent" : "border-white/10 hover:border-accent/40",
                    )}
                >
                    <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] || null)} />
                    {value
                        ? <img src={value} alt="principale" className="absolute inset-0 w-full h-full object-cover" />
                        : <div className="flex flex-col items-center gap-2 text-white/20"><ImageIcon className="w-6 h-6" /><span className="text-[9px] uppercase font-black tracking-widest">Choisir</span></div>
                    }
                </div>
                <div className="flex-grow flex flex-col gap-2">
                    <input
                        type="url"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="… ou coller une URL d'image"
                        className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none"
                    />
                    {value && (
                        <button type="button" onClick={() => onChange('')} className="self-start text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline">
                            Retirer la photo
                        </button>
                    )}
                </div>
            </div>
        </Field>
    );
}

// ----- Galerie -----

function GalleryView({ bateau, onBack, onMainPhotoChanged }: { bateau: Bateau; onBack: () => void; onMainPhotoChanged: (url: string) => void }) {
    const [images, setImages] = useState<ImageBateau[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [newUrl, setNewUrl] = useState('');
    const [newLegende, setNewLegende] = useState('');
    const fileRef = React.useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await bateauService.galerie(bateau.id);
            setImages(data.images);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [bateau.id]);

    useEffect(() => { load(); }, [load]);

    const handleAdd = async (url: string, legende?: string, principale = false) => {
        if (!url) return;
        setAdding(true);
        try {
            const img = await bateauService.addImage(bateau.id, { url, legende, est_principale: principale, ordre: images.length });
            setImages(prev => [...prev, img]);
            if (principale) {
                onMainPhotoChanged(url);
                // les autres ne sont plus principales
                setImages(prev => prev.map(i => i.id === img.id ? i : { ...i, est_principale: false }));
            }
            setNewUrl(''); setNewLegende('');
        } catch (err: any) {
            alert(err?.message || 'Erreur ajout image');
        } finally {
            setAdding(false);
        }
    };

    const handleSetPrincipale = async (img: ImageBateau) => {
        try {
            await bateauService.updateImage(bateau.id, img.id, { est_principale: true });
            setImages(prev => prev.map(i => ({ ...i, est_principale: i.id === img.id })));
            onMainPhotoChanged(img.url);
        } catch (err: any) {
            alert(err?.message || 'Erreur mise à jour');
        }
    };

    const handleDelete = async (img: ImageBateau) => {
        if (!confirm('Supprimer cette image ?')) return;
        try {
            await bateauService.removeImage(bateau.id, img.id);
            setImages(prev => prev.filter(i => i.id !== img.id));
        } catch (err: any) {
            alert(err?.message || 'Erreur suppression');
        }
    };

    const onPickFile = (file: File | null) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => handleAdd(String(reader.result || ''), file.name);
        reader.readAsDataURL(file);
    };

    return (
        <div className="space-y-12">
            <div className="flex items-center gap-8">
                <button onClick={onBack} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/40">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="archivo-black text-3xl text-white uppercase italic tracking-tighter mb-2">Galerie — {bateau.nom}</h1>
                    <p className="text-[10px] font-black text-accent uppercase tracking-widest italic">Photo principale + Album du bateau</p>
                </div>
            </div>

            <div className="bg-[#0A0C1A] border border-white/5 rounded-[40px] p-8 space-y-6">
                <h3 className="archivo-black text-sm uppercase italic text-white tracking-tighter">Ajouter une photo</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                        type="url"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        placeholder="URL de l'image"
                        className="md:col-span-2 h-12 bg-white/3 border border-white/5 rounded-xl px-4 text-sm text-white outline-none focus:border-accent/40"
                    />
                    <input
                        type="text"
                        value={newLegende}
                        onChange={(e) => setNewLegende(e.target.value)}
                        placeholder="Légende (optionnel)"
                        className="h-12 bg-white/3 border border-white/5 rounded-xl px-4 text-sm text-white outline-none focus:border-accent/40"
                    />
                </div>
                <div className="flex gap-3 flex-wrap">
                    <button
                        onClick={() => handleAdd(newUrl, newLegende || undefined, false)}
                        disabled={adding || !newUrl}
                        className="h-11 px-6 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/70 hover:bg-white/10 disabled:opacity-50"
                    >
                        Ajouter à l'album
                    </button>
                    <button
                        onClick={() => handleAdd(newUrl, newLegende || undefined, true)}
                        disabled={adding || !newUrl}
                        className="h-11 px-6 rounded-xl bg-accent text-primary text-[10px] font-black uppercase tracking-widest disabled:opacity-50 flex items-center gap-2"
                    >
                        <Star className="w-3.5 h-3.5" /> Définir comme principale
                    </button>
                    <button
                        onClick={() => fileRef.current?.click()}
                        className="h-11 px-6 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/70 hover:bg-white/10 flex items-center gap-2"
                    >
                        <ImageIcon className="w-3.5 h-3.5" /> Choisir un fichier
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickFile(e.target.files?.[0] || null)} />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16 text-white/30"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {images.map(img => (
                        <div key={img.id} className={cn("rounded-3xl overflow-hidden border bg-[#0A0C1A] relative group", img.est_principale ? "border-accent" : "border-white/5")}>
                            <div className="aspect-square overflow-hidden">
                                <img src={img.url} alt={img.legende || ''} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                            </div>
                            {img.est_principale && (
                                <div className="absolute top-3 left-3 bg-accent text-primary px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                    <Star className="w-3 h-3" /> Principale
                                </div>
                            )}
                            <div className="p-4 space-y-3">
                                <p className="text-[11px] font-bold text-white truncate">{img.legende || 'Sans légende'}</p>
                                <div className="flex items-center gap-2">
                                    {!img.est_principale && (
                                        <button onClick={() => handleSetPrincipale(img)} className="flex-1 h-8 rounded-lg bg-white/5 text-[9px] font-black uppercase tracking-widest text-accent hover:bg-accent hover:text-primary transition-all">
                                            Principale
                                        </button>
                                    )}
                                    <button onClick={() => handleDelete(img)} className="h-8 px-3 rounded-lg bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-primary transition-all">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {images.length === 0 && (
                        <div className="col-span-full text-center py-16 text-white/20 text-xs uppercase tracking-widest font-black">Aucune image — ajoutez la première !</div>
                    )}
                </div>
            )}
        </div>
    );
}

// ----- RoomCard -----

function RoomCard({ room, onEdit, onDelete, onAddBed, onEditBed, onDeleteBed }: {
    room: Room;
    onEdit: () => void;
    onDelete: () => void;
    onAddBed: () => void;
    onEditBed: (bed: BedRow) => void;
    onDeleteBed: (bedUiId: string) => void;
}) {
    return (
        <div className="bg-white/2 border border-white/5 rounded-[48px] p-8 space-y-10 group hover:border-accent/40 hover:bg-white/5 transition-all duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-accent/40 group-hover:bg-accent group-hover:text-primary transition-all">
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

            <div className="space-y-5">
                <div className="flex justify-between items-center text-[10px] font-black text-white/20 uppercase tracking-widest border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2"><Bed className="w-3.5 h-3.5" /><span>Lits ({room.beds.length})</span></div>
                    <button onClick={onAddBed} className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-white/20 hover:text-accent">
                        <Plus className="w-3 h-3" />
                    </button>
                </div>
                <div className="space-y-3">
                    {room.beds.map(bed => (
                        <div key={bed.uiId} className="flex items-center justify-between p-4 bg-white/3 rounded-2xl border border-white/5 group/bed">
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/30">
                                    <Bed className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-white uppercase tracking-widest leading-none mb-1">Lit {bed.numero_lit}</p>
                                    <p className="text-[9px] font-bold text-white/20 italic">{TYPE_LIT_LABEL[bed.type_lit]} — {bed.taille}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover/bed:opacity-100 transition-all">
                                <button onClick={() => onEditBed(bed)} className="w-8 h-8 rounded-lg bg-white/5 text-white/20 hover:text-accent">
                                    <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => onDeleteBed(bed.uiId)} className="w-8 h-8 rounded-lg bg-red-500/5 text-red-500/20 hover:text-red-500">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {room.beds.length === 0 && <p className="text-[10px] text-white/10 italic text-center py-2">Aucun lit configuré</p>}
                </div>
            </div>

            <div className="flex flex-wrap gap-3">
                <div className={cn(
                    "flex items-center gap-3 px-4 py-2 rounded-2xl border text-[9px] font-black uppercase tracking-widest",
                    room.fenetre ? "bg-green-500/5 border-green-500/10 text-green-500" : "bg-white/3 border-white/5 text-white/10",
                )}>
                    <Eye className="w-3.5 h-3.5" /> Fenêtre
                </div>
                <div className={cn(
                    "flex items-center gap-3 px-4 py-2 rounded-2xl border text-[9px] font-black uppercase tracking-widest",
                    room.salle_de_bain ? "bg-green-500/5 border-green-500/10 text-green-500" : "bg-white/3 border-white/5 text-white/10",
                )}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Salle de bain
                </div>
            </div>

            <div className="pt-6 flex gap-4 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={onEdit} className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black uppercase text-white/40 hover:text-white hover:bg-white/10">
                    Éditer Chambre
                </button>
                <button onClick={onDelete} className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-primary">
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}

// ----- Modals -----

function BoatModal({ boat, isNew, onClose, onSave }: { boat: Partial<Bateau>; isNew: boolean; onClose: () => void; onSave: (b: Partial<Bateau>) => void }) {
    const [formData, setFormData] = useState<Partial<Bateau>>(boat);

    return (
        <ModalShell onClose={onClose} title={isNew ? 'Nouveau Bateau' : 'Éditer Bateau'} icon={<Ship className="w-8 h-8" />}>
            <div className="space-y-6">
                <PhotoPrincipaleField
                    value={formData.photo_principale || ''}
                    onChange={(url) => setFormData({ ...formData, photo_principale: url })}
                />
                <Field label="Nom du Bateau">
                    <input
                        type="text"
                        value={formData.nom || ''}
                        onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                        className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none uppercase"
                    />
                </Field>
                <Field label="Immatriculation">
                    <input
                        type="text"
                        value={formData.immatriculation || ''}
                        onChange={(e) => setFormData({ ...formData, immatriculation: e.target.value })}
                        className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none uppercase"
                    />
                </Field>
                <div className="grid grid-cols-2 gap-6">
                    <Field label="Passagers">
                        <input
                            type="number"
                            value={formData.capacite_passagers || 0}
                            onChange={(e) => setFormData({ ...formData, capacite_passagers: Number(e.target.value) })}
                            className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none"
                        />
                    </Field>
                    <Field label="Véhicules">
                        <input
                            type="number"
                            value={formData.capacite_vehicules || 0}
                            onChange={(e) => setFormData({ ...formData, capacite_vehicules: Number(e.target.value) })}
                            className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none"
                        />
                    </Field>
                </div>
                <Field label="Statut Opérationnel">
                    <select
                        value={formData.en_maintenance ? 'maintenance' : 'actif'}
                        onChange={(e) => setFormData({ ...formData, en_maintenance: e.target.value === 'maintenance' })}
                        className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none appearance-none"
                    >
                        <option value="actif">ACTIF / EN SERVICE</option>
                        <option value="maintenance">MAINTENANCE / RÉPARATION</option>
                    </select>
                </Field>
            </div>
            <div className="flex gap-4 pt-8">
                <button onClick={onClose} className="flex-1 h-16 rounded-[24px] border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/5">Annuler</button>
                <button onClick={() => onSave(formData)} className="flex-1 h-16 rounded-[24px] bg-accent text-primary archivo-black text-sm uppercase tracking-widest italic hover:bg-white">
                    {isNew ? 'Créer Bateau' : 'Sauvegarder'}
                </button>
            </div>
        </ModalShell>
    );
}

function RoomModal({ room, isNew, onClose, onSave }: { room: Room; isNew: boolean; onClose: () => void; onSave: (r: Room) => void }) {
    const [formData, setFormData] = useState<Room>(room);
    return (
        <ModalShell onClose={onClose} title={isNew ? 'Nouvelle Chambre' : 'Éditer Chambre'} icon={<DoorOpen className="w-8 h-8" />}>
            <div className="grid grid-cols-2 gap-8">
                <Field label="Numéro de Chambre">
                    <input type="text" value={formData.numero_chambre} onChange={(e) => setFormData({ ...formData, numero_chambre: e.target.value })} className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none" />
                </Field>
                <Field label="Type de Chambre">
                    <select value={formData.type_chambre} onChange={(e) => setFormData({ ...formData, type_chambre: e.target.value as any })} className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none">
                        <option value="Standard">Standard</option>
                        <option value="Luxe">Luxe</option>
                        <option value="Économique">Économique</option>
                    </select>
                </Field>
                <Field label="Prix de Base ($)">
                    <input type="number" value={formData.prix_base} onChange={(e) => setFormData({ ...formData, prix_base: Number(e.target.value) })} className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none" />
                </Field>
                <div className="grid grid-cols-1 gap-4 pt-4">
                    <ToggleButton label="Fenêtre" icon={<Eye className="w-4 h-4" />} value={formData.fenetre} onChange={(v) => setFormData({ ...formData, fenetre: v })} />
                    <ToggleButton label="Salle de bain" icon={<CheckCircle2 className="w-4 h-4" />} value={formData.salle_de_bain} onChange={(v) => setFormData({ ...formData, salle_de_bain: v })} />
                </div>
            </div>
            <div className="flex gap-4 pt-8">
                <button onClick={onClose} className="flex-1 h-16 rounded-[24px] border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/5">Annuler</button>
                <button onClick={() => onSave(formData)} className="flex-1 h-16 rounded-[24px] bg-accent text-primary archivo-black text-sm uppercase tracking-widest italic hover:bg-white">
                    {isNew ? 'Créer Chambre' : 'Mettre à jour'}
                </button>
            </div>
        </ModalShell>
    );
}

function BedModal({ bed, isNew, onClose, onSave }: { bed: BedRow; isNew: boolean; onClose: () => void; onSave: (b: BedRow) => void }) {
    const [formData, setFormData] = useState<BedRow>(bed);
    return (
        <ModalShell onClose={onClose} title={isNew ? 'Nouveau Lit' : 'Éditer Lit'} icon={<Bed className="w-8 h-8" />}>
            <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                    <Field label="Référence Lit">
                        <input type="text" maxLength={2} value={formData.numero_lit} onChange={(e) => setFormData({ ...formData, numero_lit: e.target.value })} className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none uppercase" />
                    </Field>
                    <Field label="Taille (cm)">
                        <input type="text" value={formData.taille} onChange={(e) => setFormData({ ...formData, taille: e.target.value })} placeholder="Ex: 90x190" className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none" />
                    </Field>
                </div>
                <Field label="Type de Lit">
                    <select value={formData.type_lit} onChange={(e) => setFormData({ ...formData, type_lit: e.target.value as any })} className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none">
                        <option value="simple">Simple</option>
                        <option value="double">Double</option>
                        <option value="superpose">Superposé</option>
                    </select>
                </Field>
                <Field label="Supplément Prix ($)">
                    <input type="number" value={formData.prix_supplementaire} onChange={(e) => setFormData({ ...formData, prix_supplementaire: Number(e.target.value) })} className="w-full h-14 bg-white/3 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:border-accent/40 outline-none" />
                </Field>
                <ToggleButton label="Disponible" icon={<CheckCircle2 className="w-4 h-4" />} value={formData.disponible} onChange={(v) => setFormData({ ...formData, disponible: v })} />
            </div>
            <div className="flex gap-4 pt-8">
                <button onClick={onClose} className="flex-1 h-16 rounded-[24px] border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/5">Annuler</button>
                <button onClick={() => onSave(formData)} className="flex-1 h-16 rounded-[24px] bg-accent text-primary archivo-black text-sm uppercase tracking-widest italic hover:bg-white">
                    {isNew ? 'Ajouter Lit' : 'Sauvegarder'}
                </button>
            </div>
        </ModalShell>
    );
}

function ToggleButton({ label, icon, value, onChange }: { label: string; icon: React.ReactNode; value: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!value)}
            className={cn(
                "flex items-center justify-between p-4 rounded-2xl border transition-all",
                value ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-white/3 border-white/5 text-white/20",
            )}
        >
            <div className="flex items-center gap-3">
                {icon}
                <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
            </div>
            <span className="text-[10px] font-black uppercase">{value ? 'ON' : 'OFF'}</span>
        </button>
    );
}

function ModalShell({ onClose, title, icon, children }: { onClose: () => void; title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#010312]/90 backdrop-blur-xl" />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl bg-[#0A0C1A] border border-white/5 rounded-[48px] overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
                <div className="p-12 space-y-12">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center text-accent">{icon}</div>
                            <h2 className="archivo-black text-3xl text-white uppercase italic tracking-tighter leading-none">{title}</h2>
                        </div>
                        <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    {children}
                </div>
            </motion.div>
        </div>
    );
}
