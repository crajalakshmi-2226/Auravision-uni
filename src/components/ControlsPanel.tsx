import React, { useState } from 'react';
import { GlobeSettings, SatelliteEntity } from '../types';
import {
  Sliders,
  RotateCw,
  Cloud,
  Grid,
  MapPin,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Satellite,
  Stars,
  Compass,
} from 'lucide-react';

interface ControlsPanelProps {
  settings: GlobeSettings;
  onUpdateSettings: (updater: (prev: GlobeSettings) => GlobeSettings) => void;
  onResetGlobe: () => void;
  selectedSatellite?: SatelliteEntity | null;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  settings,
  onUpdateSettings,
  onResetGlobe,
  selectedSatellite,
}) => {
  const [showGuideModal, setShowGuideModal] = useState(false);

  return (
    <div className="bg-slate-950/80 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-4 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-cyan-500/15">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span className="text-xs uppercase font-mono tracking-wider font-semibold text-cyan-300">
            Orbital &amp; Visual Controls
          </span>
        </div>
        <button
          onClick={() => setShowGuideModal(!showGuideModal)}
          className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
        >
          <Info className="w-3.5 h-3.5" />
          <span>Gestures Guide</span>
          {showGuideModal ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Selected Satellite Telemetry HUD card */}
      {selectedSatellite && (
        <div className="p-3 bg-gradient-to-r from-cyan-950/60 to-violet-950/60 border border-cyan-500/40 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Satellite className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-cyan-200">
                {selectedSatellite.code}
              </span>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
              {selectedSatellite.category.toUpperCase()}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 font-mono leading-tight">
            {selectedSatellite.name}
          </p>
          <p className="text-[10px] text-slate-400 leading-snug">
            {selectedSatellite.mission}
          </p>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1 border-t border-cyan-500/20 text-slate-400">
            <div>
              <span className="text-slate-500">ALTITUDE: </span>
              <span className="text-cyan-300 font-bold">{selectedSatellite.altitudeKm.toLocaleString()} km</span>
            </div>
            <div>
              <span className="text-slate-500">VELOCITY: </span>
              <span className="text-cyan-300 font-bold">{selectedSatellite.speedKmh.toLocaleString()} km/h</span>
            </div>
            <div>
              <span className="text-slate-500">INCLINATION: </span>
              <span className="text-violet-300 font-bold">{selectedSatellite.inclination}°</span>
            </div>
            <div>
              <span className="text-slate-500">AGENCY: </span>
              <span className="text-slate-300">{selectedSatellite.agency.split('/')[0]}</span>
            </div>
          </div>
        </div>
      )}

      {/* How to Test Guide */}
      {showGuideModal && (
        <div className="p-3 bg-slate-950/90 border border-cyan-500/30 rounded-xl space-y-2 text-xs font-mono text-slate-300">
          <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>How to navigate space with your hands:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400 leading-relaxed">
            <li>
              <strong className="text-slate-200">Engage Sensor:</strong> Click "Engage Camera" to initialize the 21-point dual-hand tracker.
            </li>
            <li>
              <strong className="text-slate-200">Pan View:</strong> Move both hands together in any direction to smoothly pan the celestial view.
            </li>
            <li>
              <strong className="text-slate-200">Zoom In:</strong> Spread your hands apart horizontally to descend towards Earth or satellites.
            </li>
            <li>
              <strong className="text-slate-200">Zoom Out:</strong> Bring your hands closer together to pull back into deep space.
            </li>
            <li>
              <strong className="text-slate-200">Rotate View:</strong> Move hands in opposite directions (e.g. left up, right down) to orbit the sphere.
            </li>
            <li>
              <strong className="text-slate-200">Hold to Reset:</strong> Hold both open flat palms towards the sensor for ~1.2s.
            </li>
            <li>
              <strong className="text-slate-200">Hold Fists to Freeze:</strong> Close both hands into fists to lock or unlock controls.
            </li>
          </ol>
        </div>
      )}

      {/* Sensitivity Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-400">Gesture Sensitivity</span>
          <span className="text-cyan-300 font-bold">{settings.gestureSensitivity.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="2.5"
          step="0.1"
          value={settings.gestureSensitivity}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            onUpdateSettings((prev) => ({ ...prev, gestureSensitivity: val }));
          }}
          className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
        />
        <div className="flex justify-between text-[9px] font-mono text-slate-500">
          <span>0.5x Smooth</span>
          <span>1.0x Default</span>
          <span>2.5x Reactive</span>
        </div>
      </div>

      {/* Visual Layer Toggles Grid */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
        {/* Satellites */}
        <button
          onClick={() =>
            onUpdateSettings((prev) => ({ ...prev, showSatellites: !prev.showSatellites }))
          }
          className={`p-2 rounded-xl border flex items-center justify-between transition cursor-pointer ${
            settings.showSatellites
              ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.15)]'
              : 'bg-slate-950/40 border-slate-800 text-slate-500'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Satellite className="w-3.5 h-3.5" />
            <span>Satellites</span>
          </div>
          <span className="text-[10px]">{settings.showSatellites ? 'ON' : 'OFF'}</span>
        </button>

        {/* Cosmic Nebulae */}
        <button
          onClick={() =>
            onUpdateSettings((prev) => ({ ...prev, showNebula: !prev.showNebula }))
          }
          className={`p-2 rounded-xl border flex items-center justify-between transition cursor-pointer ${
            settings.showNebula
              ? 'bg-violet-950/40 border-violet-500/40 text-violet-300 shadow-[0_0_8px_rgba(168,85,247,0.15)]'
              : 'bg-slate-950/40 border-slate-800 text-slate-500'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Stars className="w-3.5 h-3.5" />
            <span>Nebulae</span>
          </div>
          <span className="text-[10px]">{settings.showNebula ? 'ON' : 'OFF'}</span>
        </button>

        {/* Atmosphere */}
        <button
          onClick={() =>
            onUpdateSettings((prev) => ({ ...prev, showAtmosphere: !prev.showAtmosphere }))
          }
          className={`p-2 rounded-xl border flex items-center justify-between transition cursor-pointer ${
            settings.showAtmosphere
              ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
              : 'bg-slate-950/40 border-slate-800 text-slate-500'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Atmosphere</span>
          </div>
          <span className="text-[10px]">{settings.showAtmosphere ? 'ON' : 'OFF'}</span>
        </button>

        {/* Clouds */}
        <button
          onClick={() =>
            onUpdateSettings((prev) => ({ ...prev, showClouds: !prev.showClouds }))
          }
          className={`p-2 rounded-xl border flex items-center justify-between transition cursor-pointer ${
            settings.showClouds
              ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
              : 'bg-slate-950/40 border-slate-800 text-slate-500'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5" />
            <span>Clouds</span>
          </div>
          <span className="text-[10px]">{settings.showClouds ? 'ON' : 'OFF'}</span>
        </button>

        {/* Cyber Grid */}
        <button
          onClick={() =>
            onUpdateSettings((prev) => ({ ...prev, showGrid: !prev.showGrid }))
          }
          className={`p-2 rounded-xl border flex items-center justify-between transition cursor-pointer ${
            settings.showGrid
              ? 'bg-violet-950/40 border-violet-500/40 text-violet-300'
              : 'bg-slate-950/40 border-slate-800 text-slate-500'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Grid className="w-3.5 h-3.5" />
            <span>Cyber Grid</span>
          </div>
          <span className="text-[10px]">{settings.showGrid ? 'ON' : 'OFF'}</span>
        </button>

        {/* City Beacons */}
        <button
          onClick={() =>
            onUpdateSettings((prev) => ({ ...prev, showMarkers: !prev.showMarkers }))
          }
          className={`p-2 rounded-xl border flex items-center justify-between transition cursor-pointer ${
            settings.showMarkers
              ? 'bg-violet-950/40 border-violet-500/40 text-violet-300'
              : 'bg-slate-950/40 border-slate-800 text-slate-500'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>City Beacons</span>
          </div>
          <span className="text-[10px]">{settings.showMarkers ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Auto Rotate Toggle */}
      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] font-mono">
        <div className="flex items-center gap-2 text-slate-300">
          <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Idle Celestial Drift</span>
        </div>
        <button
          onClick={() =>
            onUpdateSettings((prev) => ({ ...prev, autoRotate: !prev.autoRotate }))
          }
          className={`px-2 py-0.5 rounded text-[10px] border cursor-pointer ${
            settings.autoRotate
              ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}
        >
          {settings.autoRotate ? 'ENABLED' : 'PAUSED'}
        </button>
      </div>
    </div>
  );
};
