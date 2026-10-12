import React, { useState } from 'react';
import {
  Satellite,
  Maximize2,
  Minimize2,
  RotateCcw,
  Navigation,
  Compass,
  Lock,
  Unlock,
  Radio,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  GestureDetectionResult,
  CityMarker,
  SatelliteEntity,
  SatelliteLayerMode,
} from '../types';
import { CITIES, REAL_SATELLITES } from './Globe3D';
import { PWAInstallButton } from './PWAInstallButton';

interface HudOverlayProps {
  gestureResult: GestureDetectionResult | null;
  onResetGlobe: () => void;
  selectedCity: CityMarker | null;
  onSelectCity: (city: CityMarker | null) => void;
  selectedSatellite: SatelliteEntity | null;
  onSelectSatellite: (sat: SatelliteEntity | null) => void;
  satelliteLayer: SatelliteLayerMode;
  onSelectLayer: (layer: SatelliteLayerMode) => void;
  isGestureControlsEnabled: boolean;
  onToggleGestureControls: () => void;
}

export const HudOverlay: React.FC<HudOverlayProps> = ({
  gestureResult,
  onResetGlobe,
  selectedCity,
  onSelectCity,
  selectedSatellite,
  onSelectSatellite,
  satelliteLayer,
  onSelectLayer,
  isGestureControlsEnabled,
  onToggleGestureControls,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

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
        text: 'MANUAL SPACE CONTROLS',
        subtext: 'Webcam gesture sensor disabled',
        color: 'border-slate-800 bg-slate-950/85 text-slate-400',
        dot: 'bg-slate-500',
      };
    }

    if (!gestureResult) {
      return {
        text: 'AWAITING OPTICAL SENSOR',
        subtext: 'Engage camera in left panel',
        color: 'border-cyan-500/30 bg-slate-950/85 text-cyan-400',
        dot: 'bg-cyan-500 animate-pulse',
      };
    }

    if (gestureResult.isPaused) {
      return {
        text: 'GESTURE CONTROLS LOCKED',
        subtext: 'Hold both fists to unlock controls',
        color: 'border-amber-500/40 bg-amber-950/85 text-amber-300',
        dot: 'bg-amber-400',
      };
    }

    switch (gestureResult.activeGesture) {
      case 'zoom_in':
        return {
          text: 'ZOOM IN (SPREADING HANDS)',
          subtext: 'Descending towards satellite surface',
          color: 'border-cyan-400 bg-cyan-950/90 text-cyan-200 shadow-[0_0_25px_rgba(6,182,212,0.4)]',
          dot: 'bg-cyan-300 animate-ping',
        };
      case 'zoom_out':
        return {
          text: 'ZOOM OUT (CLOSING HANDS)',
          subtext: 'Ascending into deep space panorama',
          color: 'border-cyan-400 bg-cyan-950/90 text-cyan-200 shadow-[0_0_25px_rgba(6,182,212,0.4)]',
          dot: 'bg-cyan-300 animate-ping',
        };
      case 'pan':
        return {
          text: 'PANNING COSMIC VIEW',
          subtext: 'Dual hands moving together in unison',
          color: 'border-emerald-400 bg-emerald-950/90 text-emerald-200 shadow-[0_0_25px_rgba(16,185,129,0.4)]',
          dot: 'bg-emerald-300 animate-pulse',
        };
      case 'rotate':
        return {
          text: 'ROTATING CELESTIAL VIEW',
          subtext: 'Dual hands moving in opposite directions',
          color: 'border-violet-400 bg-violet-950/90 text-violet-200 shadow-[0_0_25px_rgba(168,85,247,0.4)]',
          dot: 'bg-violet-300 animate-pulse',
        };
      case 'reset_hold':
        return {
          text: `RESETTING VIEW (${Math.round(gestureResult.resetProgress * 100)}%)`,
          subtext: 'Holding dual open palms flat',
          color: 'border-rose-400 bg-rose-950/90 text-rose-200 shadow-[0_0_30px_rgba(244,63,94,0.5)]',
          dot: 'bg-rose-400 animate-spin',
        };
      case 'paused_fist':
        return {
          text: 'DUAL FIST DETECTED — FREEZE',
          subtext: 'Controls pause state engaged',
          color: 'border-amber-400 bg-amber-950/90 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.4)]',
          dot: 'bg-amber-400',
        };
      default:
        return {
          text:
            gestureResult.handCount === 2
              ? 'DUAL HANDS LINKED — READY'
              : `${gestureResult.handCount} / 2 HANDS IN VIEW`,
          subtext:
            gestureResult.handCount === 2
              ? 'Move, spread, or rotate hands in 3D space'
              : 'Bring 2nd hand in view for full gestures',
          color: 'border-cyan-500/30 bg-slate-950/85 text-cyan-300',
          dot: 'bg-cyan-400 animate-pulse',
        };
    }
  };

  const banner = getGestureBanner();

  return (
    <div className="pointer-events-none absolute inset-0 p-3 sm:p-4 flex flex-col justify-between z-10">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        {/* Brand Title */}
        <div className="flex items-center gap-3 bg-slate-950/85 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl px-4 py-2.5 shadow-2xl shadow-cyan-950/40">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-violet-600 to-fuchsia-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(6,182,212,0.45)]">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-['Chakra_Petch'] text-sm sm:text-base font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-slate-100 to-violet-300">
                AURAVERSE-UNI
              </h1>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                PRO-SPACE
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400 tracking-wider">
              Cosmic Satellite &amp; Celestial Space Explorer
            </p>
          </div>
        </div>

        {/* Center Prominent Gesture Recognition Banner */}
        <div
          className={`hidden md:flex items-center gap-3 px-5 py-2 rounded-2xl border backdrop-blur-2xl transition-all duration-300 ${banner.color}`}
        >
          <div className={`w-3 h-3 rounded-full shrink-0 ${banner.dot}`} />
          <div className="text-left">
            <div className="text-xs font-mono font-bold tracking-widest uppercase">
              {banner.text}
            </div>
            <div className="text-[10px] font-mono opacity-80">{banner.subtext}</div>
          </div>
        </div>

        {/* Right Tools (PWA Install Button, Gesture Toggle, Reset, Fullscreen) */}
        <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl p-1.5 shadow-xl">
          {/* PWA Install Button */}
          <PWAInstallButton />

          <button
            onClick={onToggleGestureControls}
            title={isGestureControlsEnabled ? 'Disable Gesture Controls' : 'Enable Gesture Controls'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition cursor-pointer border ${
              isGestureControlsEnabled
                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/80 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {isGestureControlsEnabled ? <Unlock className="w-3.5 h-3.5 text-cyan-400" /> : <Lock className="w-3.5 h-3.5" />}
            <span className="hidden lg:inline">Gestures {isGestureControlsEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={onResetGlobe}
            title="Reset Space Orientation & Zoom"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-violet-950/60 border border-violet-500/40 text-violet-300 hover:bg-violet-900/60 text-xs font-mono transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Reset View</span>
          </button>

          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Satellite Imagery Layer Selector Pill Bar */}
      <div className="pointer-events-auto my-2 self-start bg-slate-950/85 backdrop-blur-2xl border border-cyan-500/25 rounded-2xl p-1.5 flex items-center gap-1.5 overflow-x-auto max-w-full shadow-2xl">
        <div className="flex items-center gap-1 px-2 text-[10px] font-mono text-cyan-400 font-bold shrink-0">
          <Layers className="w-3.5 h-3.5" />
          <span>SATELLITE VIEW:</span>
        </div>

        <button
          onClick={() => onSelectLayer('blue_marble')}
          className={`px-2.5 py-1 rounded-xl text-[10px] font-mono transition shrink-0 cursor-pointer border ${
            satelliteLayer === 'blue_marble'
              ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 font-bold shadow-[0_0_10px_#00f0ff]'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          🌍 NASA Blue Marble (Optical)
        </button>

        <button
          onClick={() => onSelectLayer('black_marble_night')}
          className={`px-2.5 py-1 rounded-xl text-[10px] font-mono transition shrink-0 cursor-pointer border ${
            satelliteLayer === 'black_marble_night'
              ? 'bg-amber-500/25 border-amber-400 text-amber-200 font-bold shadow-[0_0_10px_#fbbf24]'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          🌃 NASA Black Marble (Night Lights)
        </button>

        <button
          onClick={() => onSelectLayer('topography')}
          className={`px-2.5 py-1 rounded-xl text-[10px] font-mono transition shrink-0 cursor-pointer border ${
            satelliteLayer === 'topography'
              ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 font-bold shadow-[0_0_10px_#34d399]'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          🏔️ Topographic Relief
        </button>

        <button
          onClick={() => onSelectLayer('galaxy_milkyway')}
          className={`px-2.5 py-1 rounded-xl text-[10px] font-mono transition shrink-0 cursor-pointer border ${
            satelliteLayer === 'galaxy_milkyway'
              ? 'bg-violet-500/25 border-violet-400 text-violet-200 font-bold shadow-[0_0_10px_#c084fc]'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          🌌 Milky Way Galactic Explorer
        </button>
      </div>

      {/* Bottom Floating Bar: Active Satellites & Location Targets */}
      <div className="flex flex-col md:flex-row items-end md:items-center justify-between gap-3 pointer-events-auto">
        {/* Real Orbiting Satellites Selector */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-950/85 backdrop-blur-2xl border border-cyan-500/25 rounded-2xl max-w-full overflow-x-auto shadow-xl">
          <div className="flex items-center gap-1 px-2 text-[10px] font-mono text-cyan-400 font-bold shrink-0">
            <Satellite className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '20s' }} />
            <span>ORBITING CRAFT:</span>
          </div>
          {REAL_SATELLITES.map((sat) => (
            <button
              key={sat.id}
              onClick={() => onSelectSatellite(sat)}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-mono transition shrink-0 cursor-pointer border flex items-center gap-1.5 ${
                selectedSatellite?.id === sat.id
                  ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 font-bold shadow-[0_0_10px_#00f0ff]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sat.color }} />
              <span>{sat.code}</span>
              <span className="text-[8px] opacity-70 hidden sm:inline">({sat.altitudeKm} km)</span>
            </button>
          ))}
        </div>

        {/* Mouse Fallback Tip */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[10px] font-mono text-slate-400">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>Mouse/Touch: Drag to Rotate • Wheel to Zoom • Shift+Drag to Pan</span>
        </div>
      </div>
    </div>
  );
};
