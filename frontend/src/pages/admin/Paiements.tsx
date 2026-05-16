import React from 'react';
import { CreditCard } from 'lucide-react';

export default function AdminPaiements() {
    return (
        <div className="space-y-8">
            <h1 className="archivo-black text-4xl text-white uppercase italic tracking-tighter">Paiements</h1>
            <div className="bg-[#0A0C1A] border border-white/5 rounded-[32px] p-12 flex flex-col items-center justify-center text-center gap-6">
                <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center border border-white/5">
                    <CreditCard className="w-10 h-10 text-white/20" />
                </div>
                <h2 className="text-xl font-bold text-white uppercase tracking-widest">Gestion des Paiements</h2>
                <p className="text-white/40 max-w-sm">Cette section est en cours de développement. Vous pourrez bientôt gérer les transactions, les remboursements et les historiques de paiement ici.</p>
            </div>
        </div>
    );
}
