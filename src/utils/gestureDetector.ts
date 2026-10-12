import { HandData, HandPosture, GestureDetectionResult, ActiveGestureType } from '../types';

export interface RawLandmark {
  x: number;
  y: number;
  z: number;
}

// MediaPipe Landmark Index Map
export const LM = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
};

function distance(a: RawLandmark, b: RawLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distance3D(a: RawLandmark, b: RawLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
}

/**
 * Analyzes raw landmarks to determine hand posture (Open Palm, Fist, Pinch, etc.)
 */
export function analyzeHandPosture(landmarks: RawLandmark[]): {
  posture: HandPosture;
  isOpenPalm: boolean;
  isFist: boolean;
  center: { x: number; y: number; z: number };
} {
  if (!landmarks || landmarks.length < 21) {
    return {
      posture: 'neutral',
      isOpenPalm: false,
      isFist: false,
      center: { x: 0.5, y: 0.5, z: 0 },
    };
  }

  const wrist = landmarks[LM.WRIST];
  const middleMcp = landmarks[LM.MIDDLE_MCP];
  // Hand scale baseline: wrist to middle finger knuckle
  const handScale = Math.max(0.05, distance(wrist, middleMcp));

  // Hand center approximation (palm center)
  const center = {
    x: (wrist.x + middleMcp.x + landmarks[LM.INDEX_MCP].x + landmarks[LM.PINKY_MCP].x) / 4,
    y: (wrist.y + middleMcp.y + landmarks[LM.INDEX_MCP].y + landmarks[LM.PINKY_MCP].y) / 4,
    z: (wrist.z + middleMcp.z) / 2,
  };

  // Finger extension checks
  const indexExtended =
    distance(wrist, landmarks[LM.INDEX_TIP]) > distance(wrist, landmarks[LM.INDEX_PIP]) * 1.15;
  const middleExtended =
    distance(wrist, landmarks[LM.MIDDLE_TIP]) > distance(wrist, landmarks[LM.MIDDLE_PIP]) * 1.15;
  const ringExtended =
    distance(wrist, landmarks[LM.RING_TIP]) > distance(wrist, landmarks[LM.RING_PIP]) * 1.15;
  const pinkyExtended =
    distance(wrist, landmarks[LM.PINKY_TIP]) > distance(wrist, landmarks[LM.PINKY_PIP]) * 1.15;

  const thumbExtended =
    distance(landmarks[LM.THUMB_TIP], landmarks[LM.PINKY_MCP]) > handScale * 0.85;

  // Finger curl checks (close to palm / knuckles)
  const indexCurled = distance(landmarks[LM.INDEX_TIP], landmarks[LM.INDEX_MCP]) < handScale * 0.65;
  const middleCurled = distance(landmarks[LM.MIDDLE_TIP], landmarks[LM.MIDDLE_MCP]) < handScale * 0.65;
  const ringCurled = distance(landmarks[LM.RING_TIP], landmarks[LM.RING_MCP]) < handScale * 0.65;
  const pinkyCurled = distance(landmarks[LM.PINKY_TIP], landmarks[LM.PINKY_MCP]) < handScale * 0.65;

  const extendedCount =
    (indexExtended ? 1 : 0) +
    (middleExtended ? 1 : 0) +
    (ringExtended ? 1 : 0) +
    (pinkyExtended ? 1 : 0) +
    (thumbExtended ? 1 : 0);

  const curledCount =
    (indexCurled ? 1 : 0) +
    (middleCurled ? 1 : 0) +
    (ringCurled ? 1 : 0) +
    (pinkyCurled ? 1 : 0);

  // Pinch check
  const thumbIndexDist = distance(landmarks[LM.THUMB_TIP], landmarks[LM.INDEX_TIP]);
  const isPinch = thumbIndexDist < handScale * 0.32;

  // Open Palm: at least 4 fingers extended & wide spread
  const isOpenPalm =
    extendedCount >= 4 &&
    distance(landmarks[LM.INDEX_TIP], landmarks[LM.PINKY_TIP]) > handScale * 0.7;

  // Fist: at least 3 fingers curled and at most 1 extended
  const isFist = (curledCount >= 3 || extendedCount <= 1) && !isOpenPalm && !isPinch;

  let posture: HandPosture = 'neutral';
  if (isOpenPalm) {
    posture = 'open_palm';
  } else if (isFist) {
    posture = 'fist';
  } else if (isPinch) {
    posture = 'pinch';
  } else if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    posture = 'pointing';
  }

  return {
    posture,
    isOpenPalm,
    isFist,
    center,
  };
}

/**
 * Stateful Gesture Processor that handles 2-hand gestures,
 * smoothing, dead-zones, hold durations, and cooldowns.
 */
export class GestureProcessor {
  // Smoothing parameters
  private prevHand1Center: { x: number; y: number } | null = null;
  private prevHand2Center: { x: number; y: number } | null = null;
  private prevDistance: number | null = null;
  private prevAngle: number | null = null;

  // Hold state for reset
  private resetHoldStartTime: number | null = null;
  private readonly RESET_HOLD_DURATION_MS = 1100;
  private resetCooldownUntil: number = 0;

  // Hold state for pause toggle
  private fistHoldStartTime: number | null = null;
  private isPaused: boolean = false;
  private fistToggleCooldownUntil: number = 0;

  // Sensitivity multiplier
  public sensitivity: number = 1.0;

  // Exponential smoothing factors
  private readonly SMOOTHING_FACTOR = 0.28;
  private smoothedPanX = 0;
  private smoothedPanY = 0;
  private smoothedZoom = 0;
  private smoothedRotX = 0;
  private smoothedRotY = 0;
  private smoothedRotRoll = 0;

  public resetTracking(): void {
    this.prevHand1Center = null;
    this.prevHand2Center = null;
    this.prevDistance = null;
    this.prevAngle = null;
    this.resetHoldStartTime = null;
    this.smoothedPanX = 0;
    this.smoothedPanY = 0;
    this.smoothedZoom = 0;
    this.smoothedRotX = 0;
    this.smoothedRotY = 0;
    this.smoothedRotRoll = 0;
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public process(hands: HandData[], now = performance.now()): GestureDetectionResult {
    // If not exactly 2 hands, or if hands missing, safely stop two-hand controls
    if (!hands || hands.length < 2) {
      this.resetTracking();
      return {
        activeGesture: 'none',
        gestureDescription: hands.length === 1 ? '1 hand detected (need 2 hands)' : 'No hands detected',
        panDelta: { x: 0, y: 0 },
        zoomDelta: 0,
        rotationDelta: { x: 0, y: 0, roll: 0 },
        resetProgress: 0,
        isPaused: this.isPaused,
        handCount: hands ? hands.length : 0,
        confidence: hands && hands[0] ? hands[0].score : 0,
      };
    }

    const hand1 = hands[0];
    const hand2 = hands[1];

    // Check confidence threshold
    const avgConfidence = (hand1.score + hand2.score) / 2;
    if (avgConfidence < 0.5) {
      this.resetTracking();
      return {
        activeGesture: 'none',
        gestureDescription: 'Tracking confidence low',
        panDelta: { x: 0, y: 0 },
        zoomDelta: 0,
        rotationDelta: { x: 0, y: 0, roll: 0 },
        resetProgress: 0,
        isPaused: this.isPaused,
        handCount: 2,
        confidence: avgConfidence,
      };
    }

    // Sort hands horizontally so hand1 is left, hand2 is right for consistent math
    const [leftHand, rightHand] =
      hand1.center.x <= hand2.center.x ? [hand1, hand2] : [hand2, hand1];

    // 1. Check BOTH FISTS => Pause/Resume gesture controls
    const bothFists = leftHand.isFist && rightHand.isFist;
    if (bothFists) {
      if (now > this.fistToggleCooldownUntil) {
        if (!this.fistHoldStartTime) {
          this.fistHoldStartTime = now;
        } else if (now - this.fistHoldStartTime >= 500) {
          // Toggle paused state after 500ms fist hold
          this.isPaused = !this.isPaused;
          this.fistToggleCooldownUntil = now + 1200;
          this.fistHoldStartTime = null;
        }
      }
      return {
        activeGesture: 'paused_fist',
        gestureDescription: this.isPaused
          ? 'GESTURE CONTROLS PAUSED (Hold fists to resume)'
          : 'PAUSING CONTROLS (Both Fists)',
        panDelta: { x: 0, y: 0 },
        zoomDelta: 0,
        rotationDelta: { x: 0, y: 0, roll: 0 },
        resetProgress: 0,
        isPaused: this.isPaused,
        handCount: 2,
        confidence: avgConfidence,
      };
    } else {
      this.fistHoldStartTime = null;
    }

    // If currently paused, ignore other gestures
    if (this.isPaused) {
      return {
        activeGesture: 'paused_fist',
        gestureDescription: 'PAUSED — Hold both fists to unlock controls',
        panDelta: { x: 0, y: 0 },
        zoomDelta: 0,
        rotationDelta: { x: 0, y: 0, roll: 0 },
        resetProgress: 0,
        isPaused: true,
        handCount: 2,
        confidence: avgConfidence,
      };
    }

    // 2. Check BOTH OPEN PALMS => Hold to reset view
    const bothOpenPalms = leftHand.isOpenPalm && rightHand.isOpenPalm;
    let resetProgress = 0;

    if (bothOpenPalms && now > this.resetCooldownUntil) {
      if (!this.resetHoldStartTime) {
        this.resetHoldStartTime = now;
      }
      const elapsed = now - this.resetHoldStartTime;
      resetProgress = Math.min(1, elapsed / this.RESET_HOLD_DURATION_MS);

      if (resetProgress >= 1) {
        // Trigger reset
        this.resetCooldownUntil = now + 1600;
        this.resetHoldStartTime = null;
        this.resetTracking();
        return {
          activeGesture: 'reset_hold',
          gestureDescription: 'VIEW RESET TRIGGERED!',
          panDelta: { x: 0, y: 0 },
          zoomDelta: 0,
          rotationDelta: { x: 0, y: 0, roll: 0 },
          resetProgress: 1,
          isPaused: false,
          handCount: 2,
          confidence: avgConfidence,
        };
      } else {
        return {
          activeGesture: 'reset_hold',
          gestureDescription: `HOLD OPEN PALMS TO RESET (${Math.round(resetProgress * 100)}%)`,
          panDelta: { x: 0, y: 0 },
          zoomDelta: 0,
          rotationDelta: { x: 0, y: 0, roll: 0 },
          resetProgress,
          isPaused: false,
          handCount: 2,
          confidence: avgConfidence,
        };
      }
    } else {
      this.resetHoldStartTime = null;
    }

    // 3. Movement Calculations (Distance, Angle, Direction deltas)
    const currentDistance = Math.hypot(
      rightHand.center.x - leftHand.center.x,
      rightHand.center.y - leftHand.center.y
    );

    const currentAngle = Math.atan2(
      rightHand.center.y - leftHand.center.y,
      rightHand.center.x - leftHand.center.x
    );

    // Initial state setup on first valid detection
    if (this.prevHand1Center === null || this.prevHand2Center === null || this.prevDistance === null) {
      this.prevHand1Center = { x: leftHand.center.x, y: leftHand.center.y };
      this.prevHand2Center = { x: rightHand.center.x, y: rightHand.center.y };
      this.prevDistance = currentDistance;
      this.prevAngle = currentAngle;

      return {
        activeGesture: 'none',
        gestureDescription: 'Tracking 2 hands — Ready',
        panDelta: { x: 0, y: 0 },
        zoomDelta: 0,
        rotationDelta: { x: 0, y: 0, roll: 0 },
        resetProgress: 0,
        isPaused: false,
        handCount: 2,
        confidence: avgConfidence,
      };
    }

    // Deltas for each hand
    const dLeftX = leftHand.center.x - this.prevHand1Center.x;
    const dLeftY = leftHand.center.y - this.prevHand1Center.y;
    const dRightX = rightHand.center.x - this.prevHand2Center.x;
    const dRightY = rightHand.center.y - this.prevHand2Center.y;

    // Update previous centers
    this.prevHand1Center = { x: leftHand.center.x, y: leftHand.center.y };
    this.prevHand2Center = { x: rightHand.center.x, y: rightHand.center.y };

    const distanceDelta = currentDistance - this.prevDistance;
    this.prevDistance = currentDistance;

    let angleDelta = 0;
    if (this.prevAngle !== null) {
      angleDelta = currentAngle - this.prevAngle;
      // Normalize angle delta
      if (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
      if (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
    }
    this.prevAngle = currentAngle;

    // Movement classifications
    // DEAD ZONES:
    const DEAD_ZONE_DIST = 0.007;
    const DEAD_ZONE_PAN = 0.006;
    const DEAD_ZONE_ROT = 0.008;

    // A. ZOOM: Distance changing apart vs together
    const isZooming = Math.abs(distanceDelta) > DEAD_ZONE_DIST;

    // B. DIRECTION COMPARISON:
    // Dot product of hand displacement vectors
    const leftMag = Math.hypot(dLeftX, dLeftY);
    const rightMag = Math.hypot(dRightX, dRightY);
    const avgMovement = (leftMag + rightMag) / 2;

    const dotProduct =
      leftMag > 0.001 && rightMag > 0.001
        ? (dLeftX * dRightX + dLeftY * dRightY) / (leftMag * rightMag)
        : 0;

    // Moving in same direction: dotProduct > 0.45
    // Moving in opposite directions: dotProduct < -0.35 OR opposite vertical motion
    const sameDirection = dotProduct > 0.4 && avgMovement > DEAD_ZONE_PAN;
    const oppositeDirection =
      (dotProduct < -0.35 && avgMovement > DEAD_ZONE_ROT) ||
      (dLeftY * dRightY < -0.0001 && Math.abs(dLeftY - dRightY) > DEAD_ZONE_ROT) ||
      Math.abs(angleDelta) > 0.025;

    let activeGesture: ActiveGestureType = 'none';
    let gestureDesc = 'Holding positions';
    let rawPanX = 0;
    let rawPanY = 0;
    let rawZoom = 0;
    let rawRotX = 0;
    let rawRotY = 0;
    let rawRotRoll = 0;

    // PRIORITY 1: Zooming if distance change is dominant
    if (isZooming && Math.abs(distanceDelta) * 1.5 > avgMovement) {
      if (distanceDelta > 0) {
        activeGesture = 'zoom_in';
        gestureDesc = 'ZOOM IN (PULLING APART)';
        rawZoom = distanceDelta * 4.5 * this.sensitivity;
      } else {
        activeGesture = 'zoom_out';
        gestureDesc = 'ZOOM OUT (PUSHING TOGETHER)';
        rawZoom = distanceDelta * 4.5 * this.sensitivity;
      }
    }
    // PRIORITY 2: Opposite motion -> Rotate the globe
    else if (oppositeDirection) {
      activeGesture = 'rotate';
      gestureDesc = 'ROTATING GLOBE (OPPOSITE MOTION)';

      // Differential Y motion produces globe X rotation (pitch)
      const diffY = dRightY - dLeftY;
      // Differential X motion produces globe Y rotation (yaw)
      const diffX = dRightX - dLeftX;

      rawRotX = diffY * 3.8 * this.sensitivity;
      rawRotY = diffX * 3.8 * this.sensitivity;
      rawRotRoll = angleDelta * 2.5 * this.sensitivity;
    }
    // PRIORITY 3: Same direction -> Pan the globe view
    else if (sameDirection) {
      activeGesture = 'pan';
      gestureDesc = 'PANNING GLOBE (BOTH HANDS)';
      // Video is mirrored horizontally for intuitive user interaction
      rawPanX = -((dLeftX + dRightX) / 2) * 3.5 * this.sensitivity;
      rawPanY = ((dLeftY + dRightY) / 2) * 3.5 * this.sensitivity;
    }

    // Apply exponential smoothing filter (LERP)
    this.smoothedPanX = this.smoothedPanX * (1 - this.SMOOTHING_FACTOR) + rawPanX * this.SMOOTHING_FACTOR;
    this.smoothedPanY = this.smoothedPanY * (1 - this.SMOOTHING_FACTOR) + rawPanY * this.SMOOTHING_FACTOR;
    this.smoothedZoom = this.smoothedZoom * (1 - this.SMOOTHING_FACTOR) + rawZoom * this.SMOOTHING_FACTOR;
    this.smoothedRotX = this.smoothedRotX * (1 - this.SMOOTHING_FACTOR) + rawRotX * this.SMOOTHING_FACTOR;
    this.smoothedRotY = this.smoothedRotY * (1 - this.SMOOTHING_FACTOR) + rawRotY * this.SMOOTHING_FACTOR;
    this.smoothedRotRoll =
      this.smoothedRotRoll * (1 - this.SMOOTHING_FACTOR) + rawRotRoll * this.SMOOTHING_FACTOR;

    return {
      activeGesture,
      gestureDescription: gestureDesc,
      panDelta: { x: this.smoothedPanX, y: this.smoothedPanY },
      zoomDelta: this.smoothedZoom,
      rotationDelta: { x: this.smoothedRotX, y: this.smoothedRotY, roll: this.smoothedRotRoll },
      resetProgress,
      isPaused: false,
      handCount: 2,
      confidence: avgConfidence,
    };
  }
}
