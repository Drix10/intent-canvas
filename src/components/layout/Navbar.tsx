import React from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { Sparkles, LayoutGrid, Move, ArrowRight } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { viewMode, setViewMode } = useCanvasStore();

  return (
    <header className="fixed top-5 left-1/2 z-40 flex -translate-x-1/2 items-center">
      <div className="smoked-glass hairline-border flex items-center gap-4 rounded-full px-5 py-2 shadow-2xl backdrop-blur-xl">
        {/* Minimal Brand Identifier */}
        <div className="flex items-center gap-2 pr-3 border-r border-white/10">
          <div className="rounded-full border border-[#00ff87]/30 bg-[#00ff87]/10 p-1 text-[#00ff87]">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold tracking-tight text-white">Intent Canvas</span>
        </div>

        {/* Minimal Mode Segmented Control */}
        <div className="flex items-center rounded-full border border-white/10 bg-white/[0.04] p-0.5">
          <button
            type="button"
            aria-pressed={viewMode === 'showcase'}
            onClick={() => setViewMode('showcase')}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[11px] font-semibold transition-all ${
              viewMode === 'showcase'
                ? 'bg-[#00ff87]/20 text-[#00ff87] border border-[#00ff87]/30 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="h-3 w-3" /> Showcase
          </button>
          <button
            type="button"
            aria-pressed={viewMode === 'interactive'}
            onClick={() => setViewMode('interactive')}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[11px] font-semibold transition-all ${
              viewMode === 'interactive'
                ? 'bg-[#00ff87]/20 text-[#00ff87] border border-[#00ff87]/30 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Move className="h-3 w-3" /> Spatial Workspace
          </button>
        </div>

        {/* Quick Launch CTA Button */}
        <button
          type="button"
          onClick={() => setViewMode(viewMode === 'showcase' ? 'interactive' : 'showcase')}
          className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <span>{viewMode === 'showcase' ? 'Launch Canvas' : 'View Slides'}</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </header>
  );
};
