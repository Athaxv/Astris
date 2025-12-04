import { create } from 'zustand';
import { AppMode, SceneObject, ShapeType, GestureType } from './types';
import { v4 as uuidv4 } from 'uuid';

interface AppState {
  objects: SceneObject[];
  selectedId: string | null;
  mode: AppMode;
  lastGesture: GestureType;
  gestureHistory: string[];
  
  // Actions
  addObject: (type: ShapeType, position?: [number, number, number]) => void;
  removeObject: (id: string) => void;
  updateObject: (id: string, updates: Partial<SceneObject>) => void;
  selectObject: (id: string | null) => void;
  setMode: (mode: AppMode) => void;
  setLastGesture: (gesture: GestureType) => void;
  resetScene: () => void;
}

export const useStore = create<AppState>((set) => ({
  objects: [],
  selectedId: null,
  mode: AppMode.IDLE,
  lastGesture: GestureType.NONE,
  gestureHistory: [],

  addObject: (type, position = [0, 0, 0] as [number, number, number]) => set((state) => {
    const newObject: SceneObject = {
      id: uuidv4(),
      type,
      position,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#e2e8f0', // Aerospace White Default
      wireframe: false,
    };
    return { 
      objects: [...state.objects, newObject],
      selectedId: newObject.id, // Auto-select new object for immediate manipulation
      gestureHistory: [`Created ${type}`, ...state.gestureHistory.slice(0, 4)]
    };
  }),

  removeObject: (id) => set((state) => ({
    objects: state.objects.filter((obj) => obj.id !== id),
    selectedId: state.selectedId === id ? null : state.selectedId,
    gestureHistory: ['Deleted Object', ...state.gestureHistory.slice(0, 4)]
  })),

  updateObject: (id, updates) => set((state) => ({
    objects: state.objects.map((obj) => (obj.id === id ? { ...obj, ...updates } : obj)),
  })),

  selectObject: (id) => set({ selectedId: id }),

  setMode: (mode) => set({ mode }),

  setLastGesture: (gesture) => set((state) => {
    if (gesture === state.lastGesture) return {};
    return { 
      lastGesture: gesture,
      gestureHistory: gesture !== GestureType.NONE ? [`Detected: ${gesture}`, ...state.gestureHistory.slice(0, 4)] : state.gestureHistory
    };
  }),

  resetScene: () => set({ objects: [], selectedId: null, gestureHistory: ['Scene Reset'] }),
}));