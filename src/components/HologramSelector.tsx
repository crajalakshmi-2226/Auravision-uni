import React from 'react';
import { HologramType } from '../types';
import { HOLOGRAM_CATALOG } from '../data/holograms';
import { Globe, Moon, Sparkles, Sun, Orbit, Compass, Info } from 'lucide-react';
import { soundFx } from '../utils/audioSynth';

interface HologramSelectorProps {
  activeType: HologramType;
  onSelectType: (type: HologramType) => void;
  isInspecting: boolean;
  onToggleInspect: () => void;
}

const HOLOGRAM_ICONS: Record<HologramType, React.ReactNode> = {
  earth: <Globe className="w-4 h-4 text-cyan-400" />,
  moon: <Moon className="w-4 h-4 text-slate-300" />,
  galaxy: <Sparkles className="w-4 h-4 text-violet-400" />,
  sun: <Sun className="w-4 h-4 text-amber-400" />,
  mars: <Orbit className="w-4 h-4 text-orange-400" />,
  universe: <Compass className="w-4 h-4 text-sky-400" />,
};

export const HologramSelector: React.FC<HologramSelectorProps> = ({
  activeType,
  onSelectType,
  isInspecting,
  onToggleInspect,
}) => {
  const activeDef = HOLOGRAM_CATALOG.find((h) => h.id === activeType) || HOLOGRAM_CATALOG[0];

  const handleSelect = (id: HologramType) => {
    soundFx.playHologramSwitch();
    onSelectType(id);
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 max-w-2xl w-[94%] flex flex-col items-center gap-2 pointer-events-auto">
      {/* 6 AR Hologram Types Selector Pill Bar */}
      <div className="w-full p-2 bg-slate-950/85 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl flex items-center justify-between gap-1 shadow-2xl overflow-x-auto custom-scrollbar">
        {HOLOGRAM_CATALOG.map((holo) => {
          const isActive = activeType === holo.id;
          return (
            <button
              key={holo.id}
              onClick={() => handleSelect(holo.id)}
              className={`flex-1 min-w-[78px] py-2 px-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-b from-cyan-950/80 to-violet-950/80 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.4)] scale-105'
                  : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                {HOLOGRAM_ICONS[holo.id]}
              </div>
              <span
                className={`text-[10px] font-mono font-bold tracking-tight uppercase truncate ${
                  isActive ? 'text-cyan-200' : 'text-slate-400'
                }`}
              >
                {holo.name.split(' ')[0]}
              </span>
            </button>
          );
        })}

        {/* Quick Info Modal Toggle */}
        <button
          onClick={onToggleInspect}
          title="Inspect Celestial Telemetry"
          className={`p-2.5 rounded-xl border transition cursor-pointer shrink-0 ml-1 ${
            isInspecting
              ? 'bg-violet-950/80 border-violet-400 text-violet-300 shadow-[0_0_10px_rgba(168,85,247,0.4)]'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded Hologram Educational Info Card (When Toggled) */}
      {isInspecting && (
        <div className="w-full p-3.5 bg-slate-950/90 backdrop-blur-2xl border border-cyan-500/40 rounded-2xl shadow-2xl text-xs font-mono text-slate-300 space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between pb-1.5 border-b border-cyan-500/20">
            <div className="flex items-center gap-2">
              <span className="font-bold text-cyan-300 text-sm">{activeDef.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                {activeDef.category}
              </span>
            </div>
            <span className="text-[10px] text-violet-400 font-semibold">{activeDef.tagline}</span>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">{activeDef.description}</p>

          <div className="grid grid-cols-3 gap-2 text-[10px] pt-1 text-slate-400">
            <div>
              <span className="text-slate-500">RADIUS: </span>
              <span className="text-cyan-300 font-bold">{activeDef.realRadius}</span>
            </div>
            <div>
              <span className="text-slate-500">DISTANCE: </span>
              <span className="text-violet-300 font-bold">{activeDef.realDistance}</span>
            </div>
            <div>
              <span className="text-slate-500">TEMP: </span>
              <span className="text-amber-300 font-bold">{activeDef.temperature}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
