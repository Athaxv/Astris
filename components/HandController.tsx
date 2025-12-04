import React, { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { useStore } from '../store';
import { detectGesture } from '../utils/gestureRecognizer';
import { GestureType, ShapeType } from '../types';

const HandController: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);
  
  // Store setters
  const setLastGesture = useStore(state => state.setLastGesture);
  const addObject = useStore(state => state.addObject);
  const removeObject = useStore(state => state.removeObject);
  const updateObject = useStore(state => state.updateObject);
  const selectObject = useStore(state => state.selectObject);

  // State refs for logic loop
  const lastActionTime = useRef<number>(0);
  const GESTURE_COOLDOWN = 600; 

  // Debounce/Stability Refs
  const pendingGestureRef = useRef<GestureType>(GestureType.NONE);
  const gestureFrameCountRef = useRef<number>(0);
  const confirmedGestureRef = useRef<GestureType>(GestureType.NONE);
  const GESTURE_PERSISTENCE = 5; // Number of frames a gesture must be held to count

  useEffect(() => {
    let handLandmarker: HandLandmarker | null = null;
    let animationFrameId: number;

    const setupMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2 // Enable 2 hand detection
        });

        startWebcam(handLandmarker);
      } catch (error) {
        console.error("Error initializing MediaPipe:", error);
      }
    };

    const startWebcam = async (landmarker: HandLandmarker) => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 }
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener('loadeddata', () => {
              setIsReady(true);
              predictWebcam(landmarker);
            });
          }
        } catch (err) {
          console.error("Error accessing webcam:", err);
        }
      }
    };

    const predictWebcam = (landmarker: HandLandmarker) => {
      if (!videoRef.current || !canvasRef.current) return;
      
      const startTimeMs = performance.now();
      if (videoRef.current.currentTime > 0) {
        const results = landmarker.detectForVideo(videoRef.current, startTimeMs);
        const canvasCtx = canvasRef.current.getContext('2d');
        
        // Clear canvas
        if (canvasCtx) {
          canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        }

        if (results.landmarks && results.landmarks.length > 0) {
          let rawGesture = GestureType.NONE;
          let scaleDistance = 0;

          // TWO HAND LOGIC
          if (results.landmarks.length === 2) {
            // Calculate distance between Index Tips (Landmark 8) of both hands
            const hand1 = results.landmarks[0][8];
            const hand2 = results.landmarks[1][8];
            
            // Euclidean distance in normalized coords (0-1)
            scaleDistance = Math.sqrt(
              Math.pow(hand1.x - hand2.x, 2) + 
              Math.pow(hand1.y - hand2.y, 2)
            );

            // Trigger Two Hand Gesture
            rawGesture = GestureType.TWO_HAND_SCALE;
          } 
          // SINGLE HAND LOGIC
          else {
            const landmarks = results.landmarks[0];
            rawGesture = detectGesture(landmarks);
          }
          
          // --- STABILIZATION / DEBOUNCE LOGIC ---
          // Debounce single hand gestures, but let TWO_HAND_SCALE pass instantly for responsiveness
          if (rawGesture === GestureType.TWO_HAND_SCALE) {
             confirmedGestureRef.current = rawGesture;
             setLastGesture(rawGesture);
          } else {
             if (rawGesture === pendingGestureRef.current) {
               gestureFrameCountRef.current++;
             } else {
               pendingGestureRef.current = rawGesture;
               gestureFrameCountRef.current = 0;
             }
   
             if (gestureFrameCountRef.current > GESTURE_PERSISTENCE) {
               if (confirmedGestureRef.current !== rawGesture) {
                  confirmedGestureRef.current = rawGesture;
                  setLastGesture(rawGesture);
               }
             }
          }

          let effectiveGesture = confirmedGestureRef.current;
          
          // Force scale gesture if we detected it this frame
          if (rawGesture === GestureType.TWO_HAND_SCALE) effectiveGesture = GestureType.TWO_HAND_SCALE;

          // --- VISUALIZATION (Atom Strings) ---
          if (canvasCtx) {
            // Iterate through ALL detected hands
            for (const landmarks of results.landmarks) {
               drawAtomStrings(canvasCtx, landmarks, effectiveGesture);
            }
          }
          
          // --- INTERACTION LOGIC ---
          // Pass the calculated distance if we are in scale mode
          handleGestureLogic(effectiveGesture, results.landmarks[0], scaleDistance);

        } else {
          // Reset if no hands
          if (confirmedGestureRef.current !== GestureType.NONE) {
            confirmedGestureRef.current = GestureType.NONE;
            setLastGesture(GestureType.NONE);
          }
        }
      }
      
      animationFrameId = requestAnimationFrame(() => predictWebcam(landmarker));
    };

    // Draw the "Atom Strings" skeleton
    const drawAtomStrings = (ctx: CanvasRenderingContext2D, landmarks: any[], gesture: GestureType) => {
       const connections = HandLandmarker.HAND_CONNECTIONS;
       
       // Determine color based on gesture state - SOLAR / AMBER THEME
       let color = '#fbbf24'; // Default Amber-400
       if (gesture === GestureType.PINCH) color = '#ffffff'; // White (Sphere)
       if (gesture === GestureType.OPEN_PALM) color = '#f59e0b'; // Amber-500 (Cube)
       if (gesture === GestureType.VICTORY) color = '#d97706'; // Amber-600 (Rotate)
       if (gesture === GestureType.FIST) color = '#ef4444'; // Red (Delete)
       if (gesture === GestureType.THUMBS_UP) color = '#34d399'; // Emerald (Confirm)
       if (gesture === GestureType.TWO_HAND_SCALE) color = '#fcd34d'; // Amber-300 (Scale)

       ctx.lineWidth = 2;
       ctx.strokeStyle = color;
       ctx.fillStyle = color;

       // Draw Connections (Strings)
       for (const connection of connections) {
          const start = landmarks[connection.start];
          const end = landmarks[connection.end];
          
          const startX = start.x * ctx.canvas.width;
          const startY = start.y * ctx.canvas.height;
          const endX = end.x * ctx.canvas.width;
          const endY = end.y * ctx.canvas.height;

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
       }

       // Draw Nodes (Atoms)
       for (const landmark of landmarks) {
         const x = landmark.x * ctx.canvas.width;
         const y = landmark.y * ctx.canvas.height;
         
         ctx.beginPath();
         ctx.arc(x, y, 3, 0, 2 * Math.PI);
         ctx.fillStyle = '#ffffff'; // White joints
         ctx.fill();
       }
    };

    const handleGestureLogic = (gesture: GestureType, primaryLandmarks: any[], scaleDistance: number) => {
      const now = Date.now();
      const state = useStore.getState();
      const { selectedId, objects } = state;
      const isSelected = !!selectedId;

      // CONTINUOUS MANIPULATION
      if (isSelected && selectedId) {
         const obj = objects.find(o => o.id === selectedId);
         if (!obj) return;

         // 1. POINT -> MOVE (One Hand)
         if (gesture === GestureType.POINT && primaryLandmarks) {
            const indexTip = primaryLandmarks[8];
            const x = (0.5 - indexTip.x) * 16; 
            const y = (0.5 - indexTip.y) * 12;
            updateObject(selectedId, { position: [x, y, obj.position[2]] });
            return;
         }

         // 2. TWO HANDS -> SCALE (Distance Based)
         if (gesture === GestureType.TWO_HAND_SCALE && scaleDistance > 0) {
            // Map distance (approx 0.1 to 0.8) to scale (0.5 to 5.0)
            let newScale = scaleDistance * 5.0;
            newScale = Math.max(0.5, Math.min(newScale, 6.0));
            updateObject(selectedId, { scale: [newScale, newScale, newScale] });
            return;
         }

         // 3. VICTORY -> ROTATE (One Hand)
         if (gesture === GestureType.VICTORY && primaryLandmarks) {
            const wrist = primaryLandmarks[0];
            const rotationY = (wrist.x - 0.5) * 6;
            updateObject(selectedId, { rotation: [obj.rotation[0], rotationY, obj.rotation[2]] });
            return;
         }
      }

      // DISCRETE ACTIONS
      if (now - lastActionTime.current < GESTURE_COOLDOWN) return;

      if (gesture === GestureType.THUMBS_UP) {
          if (isSelected) selectObject(null); 
          lastActionTime.current = now;
          return;
      }

      if (gesture === GestureType.FIST && isSelected && selectedId) {
           removeObject(selectedId);
           lastActionTime.current = now;
           return;
      }

      if (!isSelected) {
        switch (gesture) {
          case GestureType.OPEN_PALM: addObject(ShapeType.CUBE); lastActionTime.current = now; break;
          case GestureType.PINCH: addObject(ShapeType.SPHERE); lastActionTime.current = now; break;
          case GestureType.VICTORY: addObject(ShapeType.CYLINDER); lastActionTime.current = now; break;
          case GestureType.HANG_LOOSE: addObject(ShapeType.TORUS); lastActionTime.current = now; break;
        }
      }
    };

    setupMediaPipe();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
      cancelAnimationFrame(animationFrameId);
      if (handLandmarker) handLandmarker.close();
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 pointer-events-none transition-opacity hover:opacity-100">
      <div className="relative border border-amber-500/30 rounded-lg overflow-hidden shadow-[0_0_20px_rgba(245,158,11,0.1)] bg-slate-900/80">
        {/* Video layer - Hidden but processing */}
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline
          muted
          className={`w-64 h-48 object-cover transform -scale-x-100 opacity-60 mix-blend-screen grayscale`}
        />
        
        {/* Visualization Overlay - The Atom Strings */}
        <canvas 
          ref={canvasRef}
          className="absolute inset-0 w-full h-full transform -scale-x-100"
        />

        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center text-amber-500 text-xs font-mono animate-pulse bg-black/90">
            INITIALIZING SENSORS...
          </div>
        )}
        <div className="absolute top-1 left-2 text-[10px] text-amber-500 font-mono tracking-widest bg-black/50 px-1 rounded">
          SENSORS: {isReady ? 'ONLINE' : 'SYNCING'}
        </div>
      </div>
    </div>
  );
};

export default HandController;