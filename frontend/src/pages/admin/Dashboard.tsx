import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
    TrendingUp, 
    Ship, 
    Ticket, 
    AlertCircle, 
    Eye, 
    ArrowUpRight, 
    ArrowDownRight,
    QrCode,
    CreditCard
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell
} from 'recharts';

const data = [
    { name: '1 Mai', sales: 4500, occupation: 65, reservations: 120 },
    { name: '5 Mai', sales: 5200, occupation: 72, reservations: 145 },
    { name: '10 Mai', sales: 4800, occupation: 68, reservations: 132 },
    { name: '15 Mai', sales: 6100, occupation: 85, reservations: 178 },
    { name: '20 Mai', sales: 5900, occupation: 82, reservations: 165 },
    { name: '25 Mai', sales: 7200, occupation: 92, reservations: 198 },
    { name: '30 Mai', sales: 8500, occupation: 95, reservations: 245 },
];

const pieData = [
    { name: 'Mobile Money', value: 65, color: '#DEB507' },
    { name: 'Carte Bancaire', value: 25, color: '#6366f1' },
    { name: 'Espèces Bord', value: 10, color: '#10b981' },
];

const kpis = [
    { name: 'Chiffre d\'Affaires J-30', value: '$84,200', change: '+12.5%', isUp: true, desc: 'Revenu des 30 derniers jours', icon: TrendingUp },
    { name: 'Taux d\'Occupation', value: '82.4%', change: '+5.2%', isUp: true, desc: 'Moyenne par voyage', icon: Ship },
    { name: 'Réservations en Attente', value: '142', change: '-8.1%', isUp: false, desc: 'Paiements non confirmés', icon: Ticket },
    { name: 'Paiements Échoués', value: '12', change: '+2.4%', isUp: true, desc: '24 dernières heures', icon: CreditCard },
];

const agentsActivity = [
    { id: 1, agent: "Pierre Mani", port: "Kalemie", scans: 45, status: "Actif", lastScan: "Il y a 2 min" },
    { id: 2, agent: "Marie Kabange", port: "Moba", scans: 32, status: "Actif", lastScan: "Il y a 5 min" },
    { id: 3, agent: "John Doe", port: "Uvira", scans: 0, status: "Inactif", lastScan: "Il y a 2 h" },
    { id: 4, agent: "Alice Mweze", port: "Bukavu", scans: 89, status: "Actif", lastScan: "À l'instant" },
];

export default function AdminDashboard() {
    const [filterBoat, setFilterBoat] = useState('Tous');
    const [filterVoyage, setFilterVoyage] = useState('Tous');
    const [timeframe, setTimeframe] = useState('30 Derniers Jours');

    // Mocks for filters
    const boats = ['Tous', 'M/V SAFARI', 'M/V SAFARI II'];
    const voyages = ['Tous', 'V092', 'V093', 'V094'];

    return (
        <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="archivo-black text-4xl text-white uppercase italic tracking-tighter leading-none mb-4">Vue d'ensemble</h1>
                    <p className="text-white/30 text-xs font-black uppercase tracking-widest italic border-l-2 border-accent pl-4">Performances et activités en temps réel</p>
                </div>
                
                <div className="flex flex-wrap gap-4">
                    <select value={filterBoat} onChange={(e) => { setFilterBoat(e.target.value); setFilterVoyage('Tous'); }} className="bg-[#0A0C1A] text-white text-xs font-black p-3 rounded-lg border border-white/5 outline-none uppercase italic tracking-widest">
                        {boats.map(boat => <option key={boat} value={boat}>{boat}</option>)}
                    </select>
                    <select value={filterVoyage} onChange={(e) => setFilterVoyage(e.target.value)} className="bg-[#0A0C1A] text-white text-xs font-black p-3 rounded-lg border border-white/5 outline-none uppercase italic tracking-widest">
                        {voyages.map(voyage => <option key={voyage} value={voyage}>{voyage}</option>)}
                    </select>
                    <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="bg-[#0A0C1A] text-white text-xs font-black p-3 rounded-lg border border-white/5 outline-none uppercase italic tracking-widest">
                        <option>30 Derniers Jours</option>
                        <option>Cette Semaine</option>
                        <option>Cette Année</option>
                    </select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi, idx) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={kpi.name}
                        className="bg-white/5 border border-white/5 rounded-[32px] p-8 relative overflow-hidden group hover:bg-white/[0.07] transition-all"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-accent/10 transition-colors" />
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-primary transition-all duration-500">
                                    <kpi.icon className="w-6 h-6" />
                                </div>
                                <div className={cn(
                                    "flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black italic",
                                    kpi.isUp ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                                )}>
                                    {kpi.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {kpi.change}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none">{kpi.name}</p>
                                <h3 className="archivo-black text-4xl text-white tracking-tighter leading-none">{kpi.value}</h3>
                                <p className="text-[10px] font-bold text-white/10 italic">{kpi.desc}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white/5 border border-white/5 rounded-[48px] p-10 space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="archivo-black text-xl text-white uppercase italic tracking-tighter">Évolution du CA ({timeframe})</h3>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Revenus générés par jour ($) - Bateau: {filterBoat}</p>
                        </div>
                    </div>

                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#DEB507" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#DEB507" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis 
                                    dataKey="name" 
                                    stroke="#ffffff20" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    dy={10}
                                    fontFamily="Inter"
                                    fontWeight="bold"
                                />
                                <YAxis 
                                    stroke="#ffffff20" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    tickFormatter={(v) => `$${v}`}
                                    fontFamily="Inter"
                                    fontWeight="bold"
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#1E1E2D', 
                                        border: '1px solid #ffffff10', 
                                        borderRadius: '16px',
                                        color: '#fff',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.1em'
                                    }} 
                                    itemStyle={{ color: '#DEB507' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="sales" 
                                    stroke="#DEB507" 
                                    strokeWidth={4} 
                                    fillOpacity={1} 
                                    fill="url(#colorSales)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-[48px] p-10 space-y-8 flex flex-col items-center justify-center">
                    <div className="text-center space-y-1 w-full">
                        <h3 className="archivo-black text-xl text-white uppercase italic tracking-tighter">Mode de Paiement</h3>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Répartition des transactions</p>
                    </div>

                    <div className="h-[250px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    innerRadius={80}
                                    outerRadius={100}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#1E1E2D', 
                                        border: '1px solid #ffffff10', 
                                        borderRadius: '16px' 
                                    }} 
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center flex-col pt-4">
                            <span className="text-3xl archivo-black text-white leading-none">65%</span>
                            <span className="text-[10px] font-black text-accent uppercase tracking-widest">Mobile</span>
                        </div>
                    </div>

                    <div className="space-y-4 w-full">
                        {pieData.map((item) => (
                            <div key={item.name} className="flex items-center justify-between group cursor-default">
                                <div className="flex items-center gap-4">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-[11px] font-black text-white/40 uppercase tracking-widest group-hover:text-white transition-colors">{item.name}</span>
                                </div>
                                <span className="text-[11px] font-black text-white/60 tracking-widest">{item.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Real-time Agents Activity */}
            <div className="bg-white/5 border border-white/5 rounded-[48px] p-10 space-y-10 group overflow-hidden relative">
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-[120px] -mr-48 -mb-48" />
                
                <div className="flex items-center justify-between relative z-10">
                    <div className="space-y-1">
                        <h3 className="archivo-black text-xl text-white uppercase italic tracking-tighter flex items-center gap-4">
                            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                            Activité des Agents en temps réel
                        </h3>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Surveillance des points d'embarquement</p>
                    </div>
                </div>

                <div className="overflow-x-auto relative z-10">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="text-left py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] italic">Agent</th>
                                <th className="text-left py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] italic">Port</th>
                                <th className="text-center py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] italic">Scans (J+0)</th>
                                <th className="text-center py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] italic">Statut</th>
                                <th className="text-right py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] italic">Dernier Scan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {agentsActivity.map((agent) => (
                                <tr key={agent.id} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                                                <QrCode className="w-4 h-4 text-accent/40" />
                                            </div>
                                            <span className="text-[11px] font-black text-white uppercase tracking-widest">{agent.agent}</span>
                                        </div>
                                    </td>
                                    <td className="py-6">
                                        <span className="text-[11px] font-bold text-white/40 italic">{agent.port}</span>
                                    </td>
                                    <td className="py-6 text-center">
                                        <span className="archivo-black text-white/60">{agent.scans}</span>
                                    </td>
                                    <td className="py-6 text-center">
                                        <div className={cn(
                                            "inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                            agent.status === 'Actif' ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-white/5 text-white/20 border border-white/5"
                                        )}>
                                            {agent.status}
                                        </div>
                                    </td>
                                    <td className="py-6 text-right">
                                        <span className="text-[10px] font-black text-accent uppercase tracking-widest opacity-60">{agent.lastScan}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

