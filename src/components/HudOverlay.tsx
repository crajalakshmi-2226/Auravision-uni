import React from 'react';
import {
  Globe,
  Radio,
  Maximize2,
  Minimize2,
  RotateCcw,
  Navigation,
  Compass,
  Lock,
  Unlock,
  Sparkles,
} from 'lucide-react';
import { GestureDetectionResult, CityMarker } from '../types';
import { CITIES } from './Globe3D';

interface HudOverlayProps {
  gestureResult: GestureDetectionResult | null;
  onResetGlobe: () => void;
  selectedCity: CityMarker | null;
  onSelectCity: (city: CityMarker | null) => void;
  isGestureControlsEnabled: boolean;
  onToggleGestureControls: () => void;
}

export const HudOverlay: React.FC<HudOverlayProps> = ({
  gestureResult,
  onResetGlobe,
  selectedCity,
  onSelectCity,
  isGestureControlsEnabled,
  onToggleGestureControls,
}) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const getGestureBanner = () => {
    if (!isGestureControlsEnabled) {
      return {
        text: 'MANUAL MOUSE CONTROLS ONLY',
        subtext: 'Gesture sensor offline or disabled',
        color: 'border-slate-700 bg-slate-900/80 text-slate-400',
        dot: 'bg-slate-500',
      };
    }

    if (!gestureResult) {
      return {
        text: 'AWAITING OPTICAL SENSOR',
        subtext: 'Start camera on left panel',
        color: 'border-cyan-500/30 bg-slate-900/80 text-cyan-400',
        dot: 'bg-cyan-500 animate-pulse',
      };
    }

    if (gestureResult.isPaused) {
      return {
        text: 'GESTURE CONTROLS LOCKED',
        subtext: 'Hold both fists to unlock controls',
        color: 'border-amber-500/40 bg-amber-950/80 text-amber-300',
        dot: 'bg-amber-400',
      };
    }

    switch (gestureResult.activeGesture) {
      case 'zoom_in':
        return {
          text: 'ZOOM IN — APART',
          subtext: 'Moving dual hands apart',
          color: 'border-cyan-400 bg-cyan-950/90 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.4)]',
          dot: 'bg-cyan-300 animate-ping',
        };
      case 'zoom_out':
        return {
          text: 'ZOOM OUT — TOGETHER',
          subtext: 'Moving dual hands closer',
          color: 'border-cyan-400 bg-cyan-950/90 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.4)]',
          dot: 'bg-cyan-300 animate-ping',
        };
      case 'pan':
        return {
          text: 'PANNING GLOBE VIEW',
          subtext: 'Both hands moving in unison',
          color: 'border-emerald-400 bg-emerald-950/90 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.4)]',
          dot: 'bg-emerald-300 animate-pulse',
        };
      case 'rotate':
        return {
          text: 'ROTATING GLOBE',
          subtext: 'Opposite hand motion vector',
          color: 'border-violet-400 bg-violet-950/90 text-violet-200 shadow-[0_0_20px_rgba(168,85,247,0.4)]',
          dot: 'bg-violet-300 animate-pulse',
        };
      case 'reset_hold':
        return {
          text: `RESETTING VIEW (${Math.round(gestureResult.resetProgress * 100)}%)`,
          subtext: 'Holding dual open palms steady',
          color: 'border-rose-400 bg-rose-950/90 text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.5)]',
          dot: 'bg-rose-400 animate-spin',
        };
      case 'paused_fist':
        return {
          text: 'DUAL FIST DETECTED — PAUSE',
          subtext: 'Controls freeze state active',
          color: 'border-amber-400 bg-amber-950/90 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.4)]',
          dot: 'bg-amber-400',
        };
      default:
        return {
          text: gestureResult.handCount === 2 ? 'DUAL HANDS LINKED — READY' : `${gestureResult.handCount}/2 HANDS IN SENSOR`,
          subtext: gestureResult.handCount === 2 ? 'Perform any of the 5 spatial gestures' : 'Bring 2 hands in view',
          color: 'border-cyan-500/30 bg-slate-900/80 text-cyan-300',
          dot: 'bg-cyan-400 animate-pulse',
        };
    }
  };

  const banner = getGestureBanner();

  return (
    <div className="pointer-events-none absolute inset-0 p-4 flex flex-col justify-between z-10">
      {/* Top Bar HUD */}
      <div className="flex items-start justify-between gap-4 pointer-events-auto">
        {/* App Title & Branding */}
        <div className="flex items-center gap-3 bg-slate-900/85 backdrop-blur-xl border border-cyan-500/30 rounded-2xl px-4 py-2.5 shadow-2xl shadow-cyan-950/50">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 via-violet-600 to-indigo-700 flex items-center justify-center text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <Globe className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-['Chakra_Petch'] text-sm md:text-base font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-slate-100 to-violet-300">
                AURAVISION AI
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                v2.4
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 tracking-wide">
              3D Spatial Gesture Globe System
            </p>
          </div>
        </div>

        {/* Center Prominent Gesture Recognition Banner */}
        <div
          className={`hidden sm:flex items-center gap-3 px-5 py-2.5 rounded-2xl border backdrop-blur-xl transition-all duration-300 ${banner.color}`}
        >
          <div className={`w-3 h-3 rounded-full shrink-0 ${banner.dot}`} />
          <div className="text-left">
            <div className="text-xs font-mono font-bold tracking-widest uppercase">
              {banner.text}
            </div>
            <div className="text-[10px] font-mono opacity-80">
              {banner.subtext}
            </div>
          </div>
        </div>

        {/* Quick Actions (Reset, Controls Toggle, Fullscreen) */}
        <div className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-1.5 shadow-xl">
          <button
            onClick={onToggleGestureControls}
            title={isGestureControlsEnabled ? 'Disable Gesture Controls' : 'Enable Gesture Controls'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition cursor-pointer border ${
              isGestureControlsEnabled
                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/80 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {isGestureControlsEnabled ? <Unlock className="w-3.5 h-3.5 text-cyan-400" /> : <Lock className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">Gestures {isGestureControlsEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={onResetGlobe}
            title="Reset Globe Orientation & Zoom"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-950/60 border border-violet-500/40 text-violet-300 hover:bg-violet-900/60 text-xs font-mono transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset Globe</span>
          </button>

          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen Mode"
            className="p-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Gesture Banner */}
      <div className="sm:hidden pointer-events-auto my-2">
        <div
          className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border backdrop-blur-xl text-left ${banner.color}`}
        >
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${banner.dot}`} />
          <div>
            <div className="text-[11px] font-mono font-bold tracking-wider uppercase">
              {banner.text}
            </div>
            <div className="text-[9px] font-mono opacity-80">{banner.subtext}</div>
          </div>
        </div>
      </div>

      {/* Bottom Floating Telemetry & City Quick-Selector */}
      <div className="flex flex-col md:flex-row items-end md:items-center justify-between gap-3 pointer-events-auto">
        {/* City Focus Pill Bar */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-900/85 backdrop-blur-xl border border-cyan-500/25 rounded-2xl max-w-full overflow-x-auto shadow-xl">
          <div className="flex items-center gap-1 px-2 text-[10px] font-mono text-cyan-400 font-bold shrink-0">
            <Navigation className="w-3.5 h-3.5" />
            <span>LOCATIONS:</span>
          </div>
          {CITIES.slice(0, 6).map((city) => (
            <button
              key={city.name}
              onClick={() => onSelectCity(city)}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-mono transition shrink-0 cursor-pointer border ${
                selectedCity?.name === city.name
                  ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 font-bold shadow-[0_0_8px_#00f0ff]'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {city.name}
            </button>
          ))}
        </div>

        {/* Manual mouse control hint badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 text-[10px] font-mono text-slate-400">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>Mouse Fallback: Drag to Rotate • Wheel to Zoom • Shift+Drag to Pan</span>
        </div>
      </div>
    </div>
  );
};
