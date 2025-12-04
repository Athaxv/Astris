import { GestureType, HandLandmark } from '../types';

function distance(a: HandLandmark, b: HandLandmark): number {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2)
  );
}

// Check if finger is extended by comparing distance from wrist to tip vs wrist to pip
// This is more robust to rotation than checking Y coordinates
function isFingerExtended(landmarks: HandLandmark[], tipIdx: number, pipIdx: number): boolean {
  const wrist = landmarks[0];
  const tip = landmarks[tipIdx];
  const pip = landmarks[pipIdx];
  return distance(wrist, tip) > distance(wrist, pip);
}

// Check if finger is curled (Tip is closer to wrist than MCP)
function isFingerCurl(landmarks: HandLandmark[], tipIdx: number, mcpIdx: number): boolean {
  const wrist = landmarks[0];
  const tip = landmarks[tipIdx];
  const mcp = landmarks[mcpIdx];
  // Slightly relaxed check for curl
  return distance(wrist, tip) < distance(wrist, mcp) * 1.2;
}

export function detectGesture(landmarks: HandLandmark[]): GestureType {
  if (!landmarks || landmarks.length < 21) return GestureType.NONE;

  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  
  const wrist = landmarks[0];

  // Distances between key points
  const thumbIndexDist = distance(thumbTip, indexTip);
  const indexMiddleDist = distance(indexTip, middleTip);

  // Check extensions
  // Thumb is special, we often check if it's "away" from palm, but simplified here:
  // For thumb, we check if tip is far from index base (MCP 5)
  const isThumbExtended = distance(thumbTip, landmarks[5]) > 0.05;

  const isIndexExtended = isFingerExtended(landmarks, 8, 6);
  const isMiddleExtended = isFingerExtended(landmarks, 12, 10);
  const isRingExtended = isFingerExtended(landmarks, 16, 14);
  const isPinkyExtended = isFingerExtended(landmarks, 20, 18);

  const extendedCount = [isIndexExtended, isMiddleExtended, isRingExtended, isPinkyExtended].filter(Boolean).length;

  // 1. PINCH (Index and Thumb close) - HIGHEST PRIORITY
  // Check this first because other fingers might be in various states
  if (thumbIndexDist < 0.04) {
      return GestureType.PINCH;
  }

  // 2. FIST (All fingers curled)
  if (extendedCount === 0) {
      // Thumbs Up check
      if (isThumbExtended) {
          // If thumb tip Y is significantly above wrist Y (remember Y is inverted in screen space: 0 is top)
          // Actually, let's use the fact that thumb tip Y is < wrist Y for Up
          if (thumbTip.y < wrist.y - 0.05) return GestureType.THUMBS_UP;
          // Thumbs Down
          if (thumbTip.y > wrist.y + 0.05) return GestureType.THUMBS_DOWN;
      }
      return GestureType.FIST;
  }

  // 3. POINT (Index extended, others curled)
  if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return GestureType.POINT;
  }

  // 4. VICTORY (Index and Middle extended)
  if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      // V shape check
      if (indexMiddleDist > 0.03) return GestureType.VICTORY;
  }

  // 5. HANG LOOSE (Thumb and Pinky extended)
  if (isThumbExtended && isPinkyExtended && !isIndexExtended && !isMiddleExtended && !isRingExtended) {
      return GestureType.HANG_LOOSE;
  }

  // 6. OPEN PALM (All extended)
  // Allow slightly relaxed ring/pinky for Open Palm as people often curve them slightly
  if (isIndexExtended && isMiddleExtended && (isRingExtended || isPinkyExtended)) {
      return GestureType.OPEN_PALM;
  }

  return GestureType.NONE;
}
