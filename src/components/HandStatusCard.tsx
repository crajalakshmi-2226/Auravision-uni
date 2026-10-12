import React from 'react';
import { HandData } from '../types';
import { Hand, ShieldAlert, CheckCircle2, UserCheck } from 'lucide-react';

interface HandStatusCardProps {
  hands: HandData[];
  isGestureControlsEnabled: boolean;
}

export const HandStatusCard: React.FC<HandStatusCardProps> = ({ hands, isGestureControlsEnabled }) => {
  const handCount = hands.length;

  const getPostureBadge = (hand: HandData) => {
    switch (hand.posture) {
      case 'open_palm':
        return { label: 'OPEN PALM', bg: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300' };
      case 'fist':
        return { label: 'FIST', bg: 'bg-amber-950/70 border-amber-500/40 text-amber-300' };
      case 'pinch':
        return { label: 'PINCH', bg: 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300' };
      case 'pointing':
        return { label: 'POINTING', bg: 'bg-violet-950/70 border-violet-500/40 text-violet-300' };
      default:
        return { label: 'NEUTRAL', bg: 'bg-slate-800/80 border-slate-700 text-slate-300' };
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between pb-2 border-b border-cyan-500/15">
        <div className="flex items-center gap-2">
          <Hand className="w-4 h-4 text-cyan-400" />
          <span className="text-xs uppercase font-mono tracking-wider font-semibold text-cyan-300">
            Biometric Telemetry
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              handCount === 2
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : handCount === 1
                ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                : 'bg-slate-600'
            }`}
          />
          <span className="text-[11px] font-mono text-slate-300 font-semibold">
            {handCount} / 2 Hands
          </span>
        </div>
      </div>

      {/* Hands detail cards */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[0, 1].map((index) => {
          const hand = hands[index];
          if (!hand) {
            return (
              <div
                key={index}
                className="bg-slate-950/50 border border-dashed border-slate-800 rounded-xl p-2.5 flex flex-col items-center justify-center text-center py-4"
              >
                <div className="w-7 h-7 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-1.5">
                  <Hand className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  Hand {index + 1}: Unbound
                </span>
                <span className="text-[9px] text-slate-600">Awaiting sensor</span>
              </div>
            );
          }

          const badge = getPostureBadge(hand);
          const isLeft = index === 0;

          return (
            <div
              key={index}
              className={`rounded-xl p-2.5 border backdrop-blur-md flex flex-col justify-between ${
                isLeft
                  ? 'bg-cyan-950/30 border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.1)]'
                  : 'bg-violet-950/30 border-violet-500/30 shadow-[0_0_12px_rgba(168,85,247,0.1)]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-[11px] font-mono font-bold ${
                    isLeft ? 'text-cyan-300' : 'text-violet-300'
                  }`}
                >
                  {hand.handedness.toUpperCase()}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {Math.round(hand.score * 100)}%
                </span>
              </div>

              <div className="my-1">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border tracking-wider ${badge.bg}`}
                >
                  {badge.label}
                </span>
              </div>

              <div className="mt-2 text-[9px] font-mono text-slate-400 flex items-center justify-between">
                <span>X:{hand.center.x.toFixed(2)}</span>
                <span>Y:{hand.center.y.toFixed(2)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two-hand control readiness notice */}
      <div className="mt-3">
        {handCount === 2 ? (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Dual-Hand Link Active: Gestures operational</span>
          </div>
        ) : handCount === 1 ? (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[11px] font-mono">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Raise 2nd hand into view for full gesture control</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-[11px] font-mono">
            <UserCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Raise both hands in front of camera</span>
          </div>
        )}
      </div>
    </div>
  );
};
