import React from 'react';
import { useStore } from '../store';
import { GestureType } from '../types';
import { Activity, Box, Circle, Trash2, Hand, Move, Check, Scaling, Rotate3d, Square, Hexagon } from 'lucide-react';

const GestureHint = ({ gesture, label, icon: Icon }: { gesture: string, label: string, icon: any }) => (
  <div className="flex items-center gap-3 p-3 border-l border-white/10 bg-black/20 hover:bg-white/5 transition-all mb-1 group">
    <div className="text-amber-500/80 group-hover:text-amber-400 transition-colors"><Icon size={16} strokeWidth={1.5} /></div>
    <div className="flex flex-col">
      <span className="text-[9px] text-slate-500 uppercase tracking-widest leading-none mb-1">Gesture</span>
      <span className="text-sm font-medium text-slate-200">{gesture}</span>
    </div>
    <div className="ml-auto text-[10px] text-amber-500/80 font-mono tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
      {label}
    </div>
  </div>
);

const UIOverlay = () => {
  const lastGesture = useStore(state => state.lastGesture);
  const gestureHistory = useStore(state => state.gestureHistory);
  const selectedId = useStore(state => state.selectedId);
  const objects = useStore(state => state.objects);

  const isEditing = !!selectedId;

  return (
    <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between overflow-hidden">
      
      {/* Header / Top Bar */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Hexagon size={20} className="text-amber-500" strokeWidth={1.5} />
            <h1 className="text-2xl font-bold text-white tracking-widest font-mono">
              ASTRIS<span className="text-white/20 font-thin"> // </span>ORBITAL
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-1 ml-1 pl-6 border-l border-white/10">
            <span className={`w-1.5 h-1.5 rounded-full ${isEditing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
            <span className={`text-[10px] font-mono tracking-[0.2em] ${isEditing ? 'text-amber-500/80' : 'text-emerald-500/80'}`}>
              {isEditing ? 'SYSTEM: MANIPULATION' : 'SYSTEM: CONSTRUCTION'}
            </span>
          </div>
        </div>

        {/* Selected Object Status */}
        <div className={`transition-all duration-500 transform ${selectedId ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-3 min-w-[180px]">
            <div className="flex justify-between items-end border-b border-white/5 pb-2 mb-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest">Target Lock</span>
              <Activity size={12} className="text-amber-500 animate-pulse" />
            </div>
            <div className="font-mono text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>ID</span>
                <span className="text-white">{selectedId?.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>STATUS</span>
                <span className="text-amber-500">ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Center - Gesture Feedback Pulse */}
      {lastGesture !== GestureType.NONE && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none z-50">
           <div className="text-xs font-mono text-amber-500 tracking-[0.5em] mb-4 opacity-80">DETECTED</div>
           <h2 className="text-5xl font-thin text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
             {lastGesture.replace(/_/g, ' ')}
           </h2>
        </div>
      )}

      {/* Main Layout Bottom */}
      <div className="flex items-end justify-between w-full">
        
        {/* Left Panel - Gesture Dictionary */}
        <div className="w-64 pointer-events-auto">
          <div className="bg-black/20 backdrop-blur-xl border border-white/5 p-1">
             <div className="p-2 mb-1 flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                <span>{isEditing ? 'Edit Mode' : 'Create Mode'}</span>
                <span className="text-white/20">v2.4</span>
             </div>
             <div className="space-y-px">
                {!isEditing ? (
                  <>
                    <GestureHint gesture="Open Palm" label="Spawn Cube" icon={Box} />
                    <GestureHint gesture="Pinch" label="Spawn Sphere" icon={Circle} />
                    <GestureHint gesture="Victory" label="Spawn Cylinder" icon={Square} />
                    <GestureHint gesture="Hang Loose" label="Spawn Torus" icon={Circle} />
                  </>
                ) : (
                  <>
                    <GestureHint gesture="Two Hands" label="Scale Object" icon={Scaling} />
                    <GestureHint gesture="Point" label="Move Object" icon={Move} />
                    <GestureHint gesture="Victory" label="Rotate Axis" icon={Rotate3d} />
                    <GestureHint gesture="Fist" label="Delete" icon={Trash2} />
                  </>
                )}
                <div className="pt-1">
                   <GestureHint gesture="Thumbs Up" label={isEditing ? "Unlock" : "Confirm"} icon={Check} />
                </div>
             </div>
          </div>
        </div>

        {/* Center Bottom - History Feed */}
        <div className="flex flex-col items-center mb-10">
           <div className="flex flex-col items-center gap-1">
              {gestureHistory.map((log, i) => (
                <div key={i} className={`text-xs font-mono transition-all duration-300 ${i === 0 ? 'text-amber-400 opacity-100' : 'text-slate-600 opacity-50 scale-95'}`}>
                  {i === 0 && <span className="inline-block w-1 h-1 bg-amber-500 rounded-full mr-2"></span>}
                  {log}
                </div>
              ))}
           </div>
        </div>

        {/* Right Panel - Scene Stats */}
        <div className="w-56 flex flex-col items-end">
           <div className="bg-black/20 backdrop-blur-xl border border-white/5 p-4 w-full">
             <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">Objects</span>
                <span className="text-xl font-thin text-white font-mono">{objects.length.toString().padStart(2, '0')}</span>
             </div>
             <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>RENDER</span>
                  <span className="text-emerald-500">60 FPS</span>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>PHYSICS</span>
                  <span className="text-emerald-500">IDLE</span>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>NETWORK</span>
                  <span className="text-emerald-500">OFFLINE</span>
                </div>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default UIOverlay;