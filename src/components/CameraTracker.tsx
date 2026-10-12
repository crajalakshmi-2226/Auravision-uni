import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { Camera, CameraOff, RefreshCw, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { HandData, HandTrackingState, ActiveGesture, HandLandmark } from '../types';
import { soundFx } from '../utils/audioSynth';

interface CameraTrackerProps {
  onTrackingUpdated: (state: HandTrackingState) => void;
  showSkeleton: boolean;
  sensitivity: number;
}

const LM = {
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

const HAND_CONNECTIONS: Array<[number, number]> = [
  [LM.WRIST, LM.THUMB_CMC],
  [LM.THUMB_CMC, LM.THUMB_MCP],
  [LM.THUMB_MCP, LM.THUMB_IP],
  [LM.THUMB_IP, LM.THUMB_TIP],
  [LM.WRIST, LM.INDEX_MCP],
  [LM.INDEX_MCP, LM.INDEX_PIP],
  [LM.INDEX_PIP, LM.INDEX_DIP],
  [LM.INDEX_DIP, LM.INDEX_TIP],
  [LM.WRIST, LM.MIDDLE_MCP],
  [LM.MIDDLE_MCP, LM.MIDDLE_PIP],
  [LM.MIDDLE_PIP, LM.MIDDLE_DIP],
  [LM.MIDDLE_DIP, LM.MIDDLE_TIP],
  [LM.WRIST, LM.RING_MCP],
  [LM.RING_MCP, LM.RING_PIP],
  [LM.RING_PIP, LM.RING_DIP],
  [LM.RING_DIP, LM.RING_TIP],
  [LM.WRIST, LM.PINKY_MCP],
  [LM.PINKY_MCP, LM.PINKY_PIP],
  [LM.PINKY_PIP, LM.PINKY_DIP],
  [LM.PINKY_DIP, LM.PINKY_TIP],
  [LM.INDEX_MCP, LM.MIDDLE_MCP],
  [LM.MIDDLE_MCP, LM.RING_MCP],
  [LM.RING_MCP, LM.PINKY_MCP],
];

export const CameraTracker: React.FC<CameraTrackerProps> = ({
  onTrackingUpdated,
  showSkeleton,
  sensitivity,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);

  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef(-1);
  const fpsCounter = useRef({ count: 0, lastCheck: performance.now() });

  // State smoothing
  const prevAnchor = useRef<{ x: number; y: number; z: number } | null>(null);
  const prevDistance = useRef<number | null>(null);
  const currentScale = useRef(1.0);
  const resetHoldStart = useRef<number | null>(null);
  const wasPinching = useRef(false);

  // Initialize MediaPipe
  const initLandmarker = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current;
    setIsLoadingModel(true);
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
      );
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      landmarkerRef.current = landmarker;
      setIsLoadingModel(false);
      return landmarker;
    } catch (err) {
      // CPU fallback
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
        );
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.45,
          minHandPresenceConfidence: 0.45,
          minTrackingConfidence: 0.45,
        });
        landmarkerRef.current = landmarker;
        setIsLoadingModel(false);
        return landmarker;
      } catch (cpuErr: any) {
        setIsLoadingModel(false);
        setCameraError('AI Vision Engine load failed: ' + (cpuErr?.message || 'Check network'));
        return null;
      }
    }
  }, []);

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      const landmarker = await initLandmarker();
      if (!landmarker) return;

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraActive(true);
      soundFx.playHologramIgnite();
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera access denied. Please allow camera permission to project the AR hologram into your hands.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No webcam found on this device.');
      } else {
        setCameraError('Camera error: ' + (err.message || 'Unable to open front camera'));
      }
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    onTrackingUpdated({
      hands: [],
      anchorPoint: null,
      handCount: 0,
      activeGesture: 'none',
      gestureDescription: 'Camera Standby',
      zoomScale: 1.0,
      rotationDelta: { x: 0, y: 0, z: 0 },
      isPinching: false,
      resetProgress: 0,
    });
  };

  // Main Detection Loop
  useEffect(() => {
    if (!isCameraActive) return;
    let isRunning = true;

    const loop = () => {
      if (!isRunning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;

      if (video && canvas && landmarker && video.readyState >= 2 && !video.paused) {
        const now = performance.now();
        fpsCounter.current.count++;
        if (now - fpsCounter.current.lastCheck >= 1000) {
          setFps(fpsCounter.current.count);
          fpsCounter.current.count = 0;
          fpsCounter.current.lastCheck = now;
        }

        if (video.currentTime !== lastTimeRef.current) {
          lastTimeRef.current = video.currentTime;

          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const results = landmarker.detectForVideo(video, now);
            const handsList: HandData[] = [];

            if (results && results.landmarks && results.landmarks.length > 0) {
              const detectedCount = results.landmarks.length;

              for (let i = 0; i < detectedCount; i++) {
                const rawLms = results.landmarks[i];
                const handedness = (results.handednesses?.[i]?.[0]?.displayName || (i === 0 ? 'Left' : 'Right')) as any;
                const score = results.handednesses?.[i]?.[0]?.score || 0.85;

                const wrist = rawLms[LM.WRIST];
                const middleMcp = rawLms[LM.MIDDLE_MCP];
                const indexMcp = rawLms[LM.INDEX_MCP];
                const pinkyMcp = rawLms[LM.PINKY_MCP];

                // Palm Center (Under Hand Anchor)
                const palmCenter = {
                  x: (wrist.x + middleMcp.x + indexMcp.x + pinkyMcp.x) / 4,
                  y: (wrist.y + middleMcp.y + indexMcp.y + pinkyMcp.y) / 4,
                  z: (wrist.z + middleMcp.z) / 2,
                };

                // Palm Roll Angle
                const palmRoll = Math.atan2(pinkyMcp.y - indexMcp.y, pinkyMcp.x - indexMcp.x);
                const palmPitch = Math.atan2(middleMcp.y - wrist.y, middleMcp.x - wrist.x);

                // Fingers extension
                const handScale = Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y);
                const isThumbExt = Math.hypot(rawLms[LM.THUMB_TIP].x - pinkyMcp.x, rawLms[LM.THUMB_TIP].y - pinkyMcp.y) > handScale * 0.85;
                const isIndexExt = Math.hypot(rawLms[LM.INDEX_TIP].x - wrist.x, rawLms[LM.INDEX_TIP].y - wrist.y) > handScale * 1.3;
                const isMiddleExt = Math.hypot(rawLms[LM.MIDDLE_TIP].x - wrist.x, rawLms[LM.MIDDLE_TIP].y - wrist.y) > handScale * 1.3;
                const isRingExt = Math.hypot(rawLms[LM.RING_TIP].x - wrist.x, rawLms[LM.RING_TIP].y - wrist.y) > handScale * 1.3;
                const isPinkyExt = Math.hypot(rawLms[LM.PINKY_TIP].x - wrist.x, rawLms[LM.PINKY_TIP].y - wrist.y) > handScale * 1.3;

                const extCount = (isIndexExt ? 1 : 0) + (isMiddleExt ? 1 : 0) + (isRingExt ? 1 : 0) + (isPinkyExt ? 1 : 0);
                const isOpenPalm = extCount >= 3;
                const isFist = extCount <= 1;

                // Pinch detection (Thumb Tip to Index Tip)
                const pinchDist = Math.hypot(
                  rawLms[LM.THUMB_TIP].x - rawLms[LM.INDEX_TIP].x,
                  rawLms[LM.THUMB_TIP].y - rawLms[LM.INDEX_TIP].y
                );
                const isPinching = pinchDist < 0.08;

                handsList.push({
                  handedness,
                  score,
                  landmarks: rawLms,
                  center: palmCenter,
                  palmCenter,
                  palmNormal: { x: 0, y: 0, z: 1 },
                  palmRoll,
                  palmPitch,
                  posture: isOpenPalm ? 'open_palm' : isFist ? 'fist' : isPinching ? 'pinch' : 'neutral',
                  isOpenPalm,
                  isFist,
                  isPinching,
                });

                // Draw AR Holographic Skeleton & Palm Emitter
                if (showSkeleton) {
                  const isPrimary = i === 0;
                  const neonColor = isPrimary ? '#00f0ff' : '#c084fc';

                  // Skeleton Lines
                  ctx.lineWidth = 3;
                  ctx.strokeStyle = neonColor;
                  ctx.shadowColor = neonColor;
                  ctx.shadowBlur = 10;

                  for (const [s, e] of HAND_CONNECTIONS) {
                    const start = rawLms[s];
                    const end = rawLms[e];
                    ctx.beginPath();
                    ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
                    ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
                    ctx.stroke();
                  }

                  // Joint Nodes
                  for (let j = 0; j < rawLms.length; j++) {
                    const pt = rawLms[j];
                    const isTip = [LM.THUMB_TIP, LM.INDEX_TIP, LM.MIDDLE_TIP, LM.RING_TIP, LM.PINKY_TIP].includes(j);
                    ctx.beginPath();
                    ctx.arc(pt.x * canvas.width, pt.y * canvas.height, isTip ? 6 : 3.5, 0, Math.PI * 2);
                    ctx.fillStyle = isTip ? '#ffffff' : neonColor;
                    ctx.fill();
                  }

                  // Holographic Palm Emitter Disk (Where the hologram sits!)
                  const px = palmCenter.x * canvas.width;
                  const py = palmCenter.y * canvas.height;

                  ctx.shadowBlur = 15;
                  ctx.beginPath();
                  ctx.arc(px, py, 26, 0, Math.PI * 2);
                  ctx.strokeStyle = neonColor;
                  ctx.lineWidth = 2.5;
                  ctx.stroke();

                  ctx.beginPath();
                  ctx.arc(px, py, 14, 0, Math.PI * 2);
                  ctx.setLineDash([4, 4]);
                  ctx.stroke();
                  ctx.setLineDash([]);

                  // Upward Holo-Projection Particle Rays
                  ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
                  ctx.lineWidth = 1.5;
                  for (let a = 0; a < 4; a++) {
                    const ang = (a / 4) * Math.PI * 2 + now * 0.002;
                    const rx = px + Math.cos(ang) * 26;
                    const ry = py + Math.sin(ang) * 26;
                    ctx.beginPath();
                    ctx.moveTo(rx, ry);
                    ctx.lineTo(rx, ry - 35);
                    ctx.stroke();
                  }

                  // Pinch Beam
                  if (isPinching) {
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 3.5;
                    ctx.beginPath();
                    ctx.moveTo(rawLms[LM.THUMB_TIP].x * canvas.width, rawLms[LM.THUMB_TIP].y * canvas.height);
                    ctx.lineTo(rawLms[LM.INDEX_TIP].x * canvas.width, rawLms[LM.INDEX_TIP].y * canvas.height);
                    ctx.stroke();
                  }
                }
              }
            }

            // Compute Hand Anchor & Scale
            let anchor: { x: number; y: number; z: number } | null = null;
            let activeGesture: ActiveGesture = 'none';
            let gestureDesc = 'Hold palm up to anchor universe';
            let isAnyPinch = false;
            let resetProgress = 0;
            let roll = 0;

            if (handsList.length === 1) {
              const h = handsList[0];
              anchor = h.palmCenter || h.center;
              roll = h.palmRoll || 0;
              isAnyPinch = h.isPinching || false;

              if (h.isPinching) {
                activeGesture = 'pinch_grab';
                gestureDesc = 'PINCH GRAB — Rotating Hologram';
                if (!wasPinching.current) soundFx.playPinchGrab();
              } else if (h.isFist) {
                activeGesture = 'fist_stasis';
                gestureDesc = 'FIST STASIS — Hologram Locked';
              } else if (h.isOpenPalm) {
                activeGesture = 'palm_hover';
                gestureDesc = 'HOLOGRAM HOVERING IN HAND';
              }
            } else if (handsList.length === 2) {
              const h1 = handsList[0];
              const h2 = handsList[1];
              const p1 = h1.palmCenter || h1.center;
              const p2 = h2.palmCenter || h2.center;
              anchor = {
                x: (p1.x + p2.x) / 2,
                y: (p1.y + p2.y) / 2,
                z: (p1.z + p2.z) / 2,
              };
              roll = ((h1.palmRoll || 0) + (h2.palmRoll || 0)) / 2;
              isAnyPinch = !!(h1.isPinching || h2.isPinching);

              const dist = Math.hypot(
                p2.x - p1.x,
                p2.y - p1.y
              );

              // Two-hand zoom calculation
              if (prevDistance.current !== null) {
                const deltaD = dist - prevDistance.current;
                if (Math.abs(deltaD) > 0.006) {
                  currentScale.current = Math.max(0.4, Math.min(2.8, currentScale.current + deltaD * 3.5 * sensitivity));
                  activeGesture = 'dual_hand_zoom';
                  gestureDesc = deltaD > 0 ? 'EXPANDING UNIVERSE (HANDS APART)' : 'CONTRACTING UNIVERSE (HANDS CLOSER)';
                }
              }
              prevDistance.current = dist;

              // Both Open Palms Hold to Reset
              if (h1.isOpenPalm && h2.isOpenPalm) {
                if (!resetHoldStart.current) resetHoldStart.current = now;
                const elapsed = now - resetHoldStart.current;
                resetProgress = Math.min(1, elapsed / 1100);
                if (resetProgress >= 1) {
                  soundFx.playResetSweep();
                  resetHoldStart.current = null;
                  currentScale.current = 1.0;
                  if ((window as any).__auraResetGlobe) (window as any).__auraResetGlobe();
                } else {
                  activeGesture = 'reset_hold';
                  gestureDesc = `HOLD OPEN PALMS TO RESET (${Math.round(resetProgress * 100)}%)`;
                }
              } else {
                resetHoldStart.current = null;
              }
            } else {
              prevDistance.current = null;
              resetHoldStart.current = null;
            }

            wasPinching.current = isAnyPinch;

            // Emit tracking state
            onTrackingUpdated({
              hands: handsList,
              anchorPoint: anchor,
              handCount: handsList.length,
              activeGesture,
              gestureDescription: gestureDesc,
              zoomScale: currentScale.current,
              rotationDelta: { x: 0, y: 0, z: roll },
              isPinching: isAnyPinch,
              resetProgress,
            });
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isCameraActive, showSkeleton, sensitivity, onTrackingUpdated]);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
      {/* Real Full-Screen Front Webcam Feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${
          isCameraActive ? 'opacity-90' : 'opacity-0'
        } transition-opacity duration-700`}
      />

      {/* AR Hand Skeleton Canvas */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${
          isCameraActive ? 'block' : 'hidden'
        }`}
      />

      {/* Holographic Cyber Scanlines Effect */}
      {isCameraActive && (
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,240,255,0.03)_50%)] bg-[length:100%_4px] pointer-events-none" />
      )}

      {/* Loading AI Vision Model Indicator */}
      {isLoadingModel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md z-40 pointer-events-auto">
          <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin mb-3" />
          <p className="text-sm font-mono text-cyan-300 font-bold tracking-wider">
            ENGAGING MEDIAPIPE AR HAND VISION...
          </p>
          <p className="text-xs text-slate-400 mt-1">Calibrating palm tracking for hand-held hologram</p>
        </div>
      )}

      {/* Camera Error Dialog */}
      {cameraError && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 max-w-md w-[90%] p-4 rounded-2xl bg-amber-950/95 border border-amber-500/50 backdrop-blur-xl text-center z-50 pointer-events-auto shadow-2xl">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="text-xs font-mono text-amber-200 mb-3 leading-relaxed">{cameraError}</p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={startCamera}
              className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-mono font-bold hover:bg-amber-400 transition cursor-pointer"
            >
              Retry Camera
            </button>
            <button
              onClick={() => setCameraError(null)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono hover:text-white transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Camera Controls Toggle */}
      <div className="absolute top-4 right-4 z-30 pointer-events-auto flex items-center gap-2">
        <button
          onClick={() => (isCameraActive ? stopCamera() : startCamera())}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border backdrop-blur-xl transition shadow-xl cursor-pointer ${
            isCameraActive
              ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/80'
              : 'bg-red-950/80 border-red-500/50 text-red-300 hover:bg-red-900/80'
          }`}
        >
          {isCameraActive ? <Camera className="w-3.5 h-3.5 text-cyan-400" /> : <CameraOff className="w-3.5 h-3.5" />}
          <span>{isCameraActive ? 'AR Camera Active' : 'Start Camera'}</span>
        </button>

        {isCameraActive && (
          <div className="px-2.5 py-1 rounded-xl bg-slate-950/80 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 backdrop-blur-xl">
            {fps} FPS
          </div>
        )}
      </div>
    </div>
  );
};
