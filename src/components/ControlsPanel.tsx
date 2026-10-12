import React, { useState } from 'react';
import { GlobeSettings } from '../types';
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
} from 'lucide-react';

interface ControlsPanelProps {
  settings: GlobeSettings;
  onUpdateSettings: (updater: (prev: GlobeSettings) => GlobeSettings) => void;
  onResetGlobe: () => void;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  settings,
  onUpdateSettings,
  onResetGlobe,
}) => {
  const [showGuideModal, setShowGuideModal] = useState(false);

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-4 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-cyan-500/15">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span className="text-xs uppercase font-mono tracking-wider font-semibold text-cyan-300">
            System & Visual Controls
          </span>
        </div>
        <button
          onClick={() => setShowGuideModal(!showGuideModal)}
          className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
        >
          <Info className="w-3.5 h-3.5" />
          <span>How to Test</span>
          {showGuideModal ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* How to Test Explanatory Accordion */}
      {showGuideModal && (
        <div className="p-3 bg-slate-950/70 border border-cyan-500/30 rounded-xl space-y-2 text-xs font-mono text-slate-300">
          <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>How to test each gesture with your webcam:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400 leading-relaxed">
            <li>
              <strong className="text-slate-200">Start Camera:</strong> Click "Engage Camera" in the top panel and allow browser webcam permission.
            </li>
            <li>
              <strong className="text-slate-200">Pan:</strong> Raise both hands and move them together to the left, right, up, or down.
            </li>
            <li>
              <strong className="text-slate-200">Zoom:</strong> Pull hands apart sideways to zoom in; bring them close together to zoom out.
            </li>
            <li>
              <strong className="text-slate-200">Rotate:</strong> Move one hand up while the other moves down (or one left, one right).
            </li>
            <li>
              <strong className="text-slate-200">Reset View:</strong> Hold both hands open with flat palms facing the camera for ~1.2s until the HUD circle fills.
            </li>
            <li>
              <strong className="text-slate-200">Pause / Lock:</strong> Make two closed fists with both hands to lock/freeze controls.
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

      {/* Layer Toggles Grid */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
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

        {/* Clouds Layer */}
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

        {/* City Markers */}
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
      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/50 border border-slate-800 text-[11px] font-mono">
        <div className="flex items-center gap-2 text-slate-300">
          <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Idle Planetary Rotation</span>
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
