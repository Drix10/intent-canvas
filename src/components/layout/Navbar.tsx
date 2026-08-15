import React from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="fixed top-5 left-1/2 z-40 flex -translate-x-1/2 items-center">
      <div className="smoked-glass hairline-border flex items-center gap-4 rounded-full px-5 py-2 shadow-2xl backdrop-blur-xl">
        {/* Minimal Brand Identifier */}
        <div className="flex items-center gap-2 pr-3 border-r border-white/10">
          <div className="rounded-full border border-[#00ff87]/30 bg-[#00ff87]/10 p-1 text-[#00ff87]">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold tracking-tight text-white">Intent Canvas <span className="text-[#00ff87]">· Revenue Rescue</span></span>
        </div>

        <span className="flex items-center gap-1.5 rounded-full border border-[#00ff87]/25 bg-[#00ff87]/10 px-3 py-1 text-[10px] font-semibold text-[#b8ffd9]"><ShieldCheck className="h-3 w-3" /> Human-approved operations</span>
      </div>
    </header>
  );
};
