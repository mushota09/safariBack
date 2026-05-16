import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Plus, 
    X, 
    Ship, 
    Clock, 
    MapPin, 
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { cn } from '../../lib/utils';

const events = [
    { id: '1', title: 'M/V SAFARI (Kalemie - Uvira)', start: '2024-05-15T08:00:00', end: '2024-05-15T18:00:00', extendedProps: { status: 'confirmé', boat: 'M/V SAFARI', occupancy: 85 } },
    { id: '2', title: 'M/V SAFARI II (Bukavu - Goma)', start: '2024-05-16T10:00:00', end: '2024-05-16T14:00:00', extendedProps: { status: 'retardé', boat: 'M/V SAFARI II', occupancy: 42 } },
    { id: '3', title: 'M/V SAFARI (Uvira - Kalemie)', start: '2024-05-17T06:00:00', end: '2024-05-17T16:00:00', extendedProps: { status: 'programmé', boat: 'M/V SAFARI', occupancy: 20 } },
];

export default function AdminVoyagesCalendar() {
    const [selectedEvent, setSelectedEvent] = useState<any>(null);

    const handleEventClick = (info: any) => {
        setSelectedEvent(info.event);
    };

    return (
        <div className="space-y-8">
            <div className="bg-white/5 border border-white/5 rounded-[48px] p-8 shadow-2xl relative overflow-hidden h-[800px] flex flex-col">
                <style dangerouslySetInnerHTML={{ __html: `
                    .fc { --fc-border-color: rgba(255,255,255,0.05); font-family: 'Inter', sans-serif; }
                    .fc-header-toolbar { padding-bottom: 2rem; }
                    .fc-toolbar-title { font-family: 'Archivo Black', sans-serif; text-transform: uppercase; font-style: italic; font-size: 1.5rem !important; color: white; letter-spacing: -0.05em; }
                    .fc-button { background: rgba(255,255,255,0.05) !important; border: 1px solid rgba(255,255,255,0.05) !important; font-size: 10px !important; font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; border-radius: 12px !important; padding: 10px 20px !important; color: white !important; transition: all 0.3s !important; }
                    .fc-button-active { background: #DEB507 !important; color: #010312 !important; box-shadow: 0 10px 20px rgba(222,181,7,0.1) !important; }
                    .fc-daygrid-day { background: transparent; }
                    .fc-daygrid-day-number { font-size: 11px; font-weight: 900; opacity: 0.3; padding: 15px !important; }
                    .fc-event { border: none !important; border-radius: 8px !important; padding: 4px 8px !important; margin: 2px !important; cursor: pointer !important; }
                    .fc-day-today { background: rgba(222,181,7,0.02) !important; }
                    .fc-col-header-cell-cushion { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.2); padding: 15px !important; }
                `}} />
                
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    }}
                    events={events}
                    eventClick={handleEventClick}
                    locale="fr"
                    eventContent={(arg) => {
                        const status = arg.event.extendedProps.status;
                        const color = status === 'confirmé' ? 'bg-green-500' : status === 'retardé' ? 'bg-red-500' : 'bg-accent';
                        return (
                            <div className={cn("w-full px-3 py-1.5 rounded-lg flex items-center gap-2 text-primary font-black text-[9px] uppercase tracking-wider italic", color)}>
                                <Ship className="w-3 h-3" />
                                <span className="truncate">{arg.event.title}</span>
                            </div>
                        );
                    }}
                />
            </div>

            <AnimatePresence>
                {selectedEvent && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedEvent(null)}
                            className="fixed inset-0 bg-[#010312]/80 backdrop-blur-md z-[100]"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#0A0C1A] border border-white/5 rounded-[48px] p-12 z-[110] shadow-[0_50px_100px_rgba(0,0,0,0.5)]"
                        >
                            <button 
                                onClick={() => setSelectedEvent(null)}
                                className="absolute top-8 right-8 w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
                            >
                                <X className="w-5 h-5 text-white/40" />
                            </button>

                            <div className="space-y-10">
                                <div className="space-y-2">
                                    <div className={cn(
                                        "inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border mb-4",
                                        selectedEvent.extendedProps.status === 'confirmé' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-accent/10 text-accent border-accent/20"
                                    )}>
                                        {selectedEvent.extendedProps.status}
                                    </div>
                                    <h2 className="archivo-black text-3xl text-white uppercase italic tracking-tighter leading-tight">{selectedEvent.title}</h2>
                                    <p className="text-white/30 text-xs font-black uppercase tracking-widest">{selectedEvent.extendedProps.boat}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-white/3 p-6 rounded-3xl border border-white/5 space-y-2">
                                        <div className="flex items-center gap-3 text-accent">
                                            <Clock className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Horaires</span>
                                        </div>
                                        <p className="text-sm font-bold text-white">08:00 — 18:00</p>
                                    </div>
                                    <div className="bg-white/3 p-6 rounded-3xl border border-white/5 space-y-2">
                                        <div className="flex items-center gap-3 text-accent">
                                            <AlertCircle className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Occupation</span>
                                        </div>
                                        <p className="text-sm font-bold text-white">{selectedEvent.extendedProps.occupancy}%</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <button className="w-full py-5 rounded-[24px] bg-accent text-primary archivo-black text-base uppercase tracking-widest italic hover:bg-white transition-all shadow-xl shadow-accent/5">
                                        Editer le voyage
                                    </button>
                                    <button className="w-full py-5 rounded-[24px] bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all">
                                        Annuler le voyage
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
