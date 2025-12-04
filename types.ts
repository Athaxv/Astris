
export enum AppMode {
  IDLE = 'IDLE',
  CREATING = 'CREATING',
  MANIPULATING = 'MANIPULATING',
  RENDERING = 'RENDERING',
}

export enum ShapeType {
  CUBE = 'CUBE',
  SPHERE = 'SPHERE',
  CYLINDER = 'CYLINDER',
  TORUS = 'TORUS',
}

export interface SceneObject {
  id: string;
  type: ShapeType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  wireframe: boolean;
}

export enum GestureType {
  NONE = 'NONE',
  OPEN_PALM = 'OPEN_PALM', // Create Cube / Menu
  PINCH = 'PINCH', // Create Sphere / Grab
  VICTORY = 'VICTORY', // Create Cylinder
  HANG_LOOSE = 'HANG_LOOSE', // Create Torus
  FIST = 'FIST', // Delete
  POINT = 'POINT', // Select / Move Cursor
  THUMBS_UP = 'THUMBS_UP', // Confirm
  THUMBS_DOWN = 'THUMBS_DOWN', // Undo
  TWO_HAND_SCALE = 'TWO_HAND_SCALE', // Resize with two hands
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface DetectedGesture {
  type: GestureType;
  handedness: 'Left' | 'Right';
  confidence: number;
  landmarks: HandLandmark[];
}
