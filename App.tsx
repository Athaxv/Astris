import React, { Suspense } from 'react';
import Scene from './components/Scene';
import UIOverlay from './components/UIOverlay';
import HandController from './components/HandController';

const App = () => {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black selection:bg-cyan-500 selection:text-white">
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-cyan-500 font-mono animate-pulse">LOADING ENVIRONMENT...</div>}>
          <Scene />
        </Suspense>
      </div>

      {/* Logic Layer */}
      <HandController />

      {/* UI Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <UIOverlay />
      </div>

      {/* Mobile/No-Camera Fallback Overlay (Optional hint) */}
      <div className="absolute top-4 left-4 z-50 pointer-events-none md:hidden">
        <div className="bg-red-500/20 border border-red-500 p-2 rounded text-red-200 text-xs max-w-[200px]">
          RECOMMENDED: DESKTOP + WEBCAM FOR GESTURE CONTROLS
        </div>
      </div>
    </div>
  );
};

export default App;
