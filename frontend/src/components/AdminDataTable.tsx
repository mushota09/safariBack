import React from 'react';
import { 
    Search, 
    Filter, 
    Download, 
    ChevronLeft, 
    ChevronRight, 
    MoreHorizontal,
    ArrowUpDown
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Column {
    key: string;
    label: string;
    render?: (val: any, row: any) => React.ReactNode;
}

interface AdminDataTableProps {
    title: string;
    subtitle: string;
    columns: Column[];
    data: any[];
    searchPlaceholder?: string;
    actions?: React.ReactNode;
    onRowClick?: (row: any) => void;
}

export default function AdminDataTable({ 
    title, 
    subtitle, 
    columns, 
    data, 
    searchPlaceholder = "Rechercher...",
    actions,
    onRowClick
}: AdminDataTableProps) {
    return (
        <div className="bg-white/5 border border-white/5 rounded-[48px] overflow-hidden flex flex-col">
            <div className="p-10 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h3 className="archivo-black text-xl text-white uppercase italic tracking-tighter">{title}</h3>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">{subtitle}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center bg-[#010312] py-3 px-5 rounded-2xl border border-white/10 group focus-within:border-accent/40 transition-all">
                        <Search className="w-4 h-4 text-white/20 group-focus-within:text-accent transition-colors" />
                        <input 
                            type="text" 
                            placeholder={searchPlaceholder}
                            className="bg-transparent border-none outline-none text-xs font-bold text-white ml-3 w-48 placeholder:text-white/10"
                        />
                    </div>
                    
                    <button className="h-12 px-6 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3 text-[10px] font-black uppercase text-white/40 hover:text-white hover:bg-white/10 transition-all">
                        <Filter className="w-4 h-4" /> Filtres
                    </button>
                    
                    <button className="h-12 px-6 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3 text-[10px] font-black uppercase text-white/40 hover:text-white hover:bg-white/10 transition-all">
                        <Download className="w-4 h-4" /> Export
                    </button>

                    {actions}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-white/[0.02]">
                            {columns.map((col) => (
                                <th key={col.key} className="text-left py-6 px-10 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] italic">
                                    <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                                        {col.label}
                                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                                    </div>
                                </th>
                            ))}
                            <th className="py-6 px-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.map((row, idx) => (
                            <tr 
                                key={idx} 
                                onClick={() => onRowClick?.(row)}
                                className={cn(
                                    "group transition-colors",
                                    onRowClick ? "cursor-pointer hover:bg-white/[0.04]" : "hover:bg-white/[0.02]"
                                )}
                            >
                                {columns.map((col) => (
                                    <td key={col.key} className="py-6 px-10">
                                        {col.render ? col.render(row[col.key], row) : (
                                            <span className="text-[11px] font-black text-white uppercase tracking-widest">{row[col.key]}</span>
                                        )}
                                    </td>
                                ))}
                                <td className="py-6 px-10 text-right" onClick={(e) => e.stopPropagation()}>
                                    <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20 hover:text-accent hover:border-accent/20 transition-all group-hover:bg-white/10">
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="p-10 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest italic">
                    Affichage de 1 à {data.length} sur {data.length * 5} résultats
                </span>
                
                <div className="flex items-center gap-3">
                    <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20 hover:text-white transition-all disabled:opacity-20 cursor-not-allowed">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        {[1, 2, 3, '...', 12].map((p, i) => (
                            <button 
                                key={i}
                                className={cn(
                                    "w-10 h-10 rounded-xl text-[10px] font-black border transition-all",
                                    p === 1 ? "bg-accent border-accent text-primary" : "bg-white/5 border-white/5 text-white/40 hover:text-white"
                                )}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                    <button className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white hover:text-accent transition-all">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
