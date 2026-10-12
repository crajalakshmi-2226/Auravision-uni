import React from 'react';
import { ActiveGestureType } from '../types';
import { Move, ZoomIn, ZoomOut, RotateCw, RotateCcw, Hand, Lock, HelpCircle } from 'lucide-react';

interface GestureGuideProps {
  activeGesture: ActiveGestureType;
  resetProgress: number;
  isPaused: boolean;
}

export const GestureGuide: React.FC<GestureGuideProps> = ({
  activeGesture,
  resetProgress,
  isPaused,
}) => {
  const gestures = [
    {
      id: 'pan',
      title: 'Pan View',
      desc: 'Move both hands together in unison',
      icon: <Move className="w-4 h-4" />,
      isActive: activeGesture === 'pan',
      badge: 'BOTH IN SAME DIRECTION',
    },
    {
      id: 'zoom',
      title: 'Zoom In / Out',
      desc: 'Pull hands apart (Zoom In) or push together (Zoom Out)',
      icon: activeGesture === 'zoom_out' ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />,
      isActive: activeGesture === 'zoom_in' || activeGesture === 'zoom_out',
      badge: activeGesture === 'zoom_in' ? 'ZOOMING IN' : activeGesture === 'zoom_out' ? 'ZOOMING OUT' : 'DISTANCE DELTA',
    },
    {
      id: 'rotate',
      title: 'Rotate Globe',
      desc: 'Move hands in opposite directions (up/down or left/right)',
      icon: <RotateCw className="w-4 h-4" />,
      isActive: activeGesture === 'rotate',
      badge: 'OPPOSITE VECTOR',
    },
    {
      id: 'reset',
      title: 'Reset View',
      desc: 'Hold both open palms flat towards sensor (~1.2s)',
      icon: <Hand className="w-4 h-4" />,
      isActive: activeGesture === 'reset_hold',
      badge: resetProgress > 0 ? `CHARGING ${Math.round(resetProgress * 100)}%` : 'HOLD OPEN PALMS',
      progress: resetProgress,
    },
    {
      id: 'pause',
      title: 'Pause / Resume',
      desc: 'Hold both hands in tight fists to toggle freeze lock',
      icon: <Lock className="w-4 h-4" />,
      isActive: activeGesture === 'paused_fist' || isPaused,
      badge: isPaused ? 'LOCKED' : 'HOLD BOTH FISTS',
    },
  ];

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-cyan-500/15">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-violet-400" />
          <span className="text-xs uppercase font-mono tracking-wider font-semibold text-violet-300">
            Spatial Gesture Matrix
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          5 Core Commands
        </span>
      </div>

      <div className="space-y-2">
        {gestures.map((g) => (
          <div
            key={g.id}
            className={`p-2.5 rounded-xl border transition-all duration-200 relative overflow-hidden ${
              g.isActive
                ? 'bg-gradient-to-r from-cyan-950/70 to-violet-950/70 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.25)] translate-x-1'
                : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            {/* Live progress fill bar for reset hold */}
            {g.progress !== undefined && g.progress > 0 && (
              <div
                className="absolute inset-y-0 left-0 bg-cyan-500/20 transition-all duration-75 pointer-events-none"
                style={{ width: `${g.progress * 100}%` }}
              />
            )}

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    g.isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_8px_#00f0ff]'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {g.icon}
                </div>
                <div>
                  <h4
                    className={`text-xs font-semibold font-mono ${
                      g.isActive ? 'text-cyan-200' : 'text-slate-200'
                    }`}
                  >
                    {g.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {g.desc}
                  </p>
                </div>
              </div>

              <span
                className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold tracking-wider uppercase border shrink-0 ${
                  g.isActive
                    ? 'bg-cyan-950 border-cyan-400 text-cyan-300 animate-pulse'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                {g.badge}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
