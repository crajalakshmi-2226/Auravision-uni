import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { Camera, CameraOff, RefreshCw, AlertTriangle, Eye, EyeOff, Sparkles, Hand, Zap } from 'lucide-react';
import { HandData, GestureDetectionResult } from '../types';
import { analyzeHandPosture, GestureProcessor, LM } from '../utils/gestureDetector';

interface CameraHandTrackerProps {
  onGestureDetected: (result: GestureDetectionResult) => void;
  onHandsUpdated: (hands: HandData[]) => void;
  onHandAnchoringUpdated: (midpoint: { x: number; y: number } | null, distance: number | null, isPinching: boolean) => void;
  isGestureControlsEnabled: boolean;
  sensitivity: number;
  isCameraActive: boolean;
  onToggleCamera: (active: boolean) => void;
}

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

export const CameraHandTracker: React.FC<CameraHandTrackerProps> = ({
  onGestureDetected,
  onHandsUpdated,
  onHandAnchoringUpdated,
  isGestureControlsEnabled,
  sensitivity,
  isCameraActive,
  onToggleCamera,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(true);

  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const gestureProcessorRef = useRef<GestureProcessor>(new GestureProcessor());
  const requestAnimRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const fpsCountRef = useRef({ frames: 0, lastCheck: performance.now() });

  useEffect(() => {
    gestureProcessorRef.current.sensitivity = sensitivity;
  }, [sensitivity]);

  // Initialize MediaPipe HandLandmarker
  const initHandLandmarker = useCallback(async () => {
    if (handLandmarkerRef.current) return handLandmarkerRef.current;
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
      handLandmarkerRef.current = landmarker;
      setIsLoadingModel(false);
      return landmarker;
    } catch (err) {
      console.warn('GPU delegate failed for MediaPipe, attempting CPU fallback:', err);
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
        handLandmarkerRef.current = landmarker;
        setIsLoadingModel(false);
        return landmarker;
      } catch (cpuErr: any) {
        setIsLoadingModel(false);
        setCameraError('AI Hand Tracking Model loading error: ' + (cpuErr?.message || 'Check network'));
        return null;
      }
    }
  }, []);

  // Start Front Webcam Stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      const landmarker = await initHandLandmarker();
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

      onToggleCamera(true);
    } catch (err: any) {
      console.error('Webcam start error:', err);
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera access denied. Please allow camera permission in your browser URL bar to use AR hand tracking.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera detected on this device. Mouse & touch controls are available.');
      } else {
        setCameraError('Camera error: ' + (err.message || 'Unable to access front camera'));
      }
      onToggleCamera(false);
    }
  };

  // Stop Webcam Stream
  const stopCamera = () => {
    if (requestAnimRef.current) {
      cancelAnimationFrame(requestAnimRef.current);
      requestAnimRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    onToggleCamera(false);
    gestureProcessorRef.current.resetTracking();
    onHandsUpdated([]);
    onHandAnchoringUpdated(null, null, false);
    onGestureDetected({
      activeGesture: 'none',
      gestureDescription: 'Camera Offline',
      panDelta: { x: 0, y: 0 },
      zoomDelta: 0,
      rotationDelta: { x: 0, y: 0, roll: 0 },
      resetProgress: 0,
      isPaused: false,
      handCount: 0,
      confidence: 0,
    });
  };

  // Main Detection Loop
  useEffect(() => {
    if (!isCameraActive) return;

    let isRunning = true;

    const detectLoop = () => {
      if (!isRunning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = handLandmarkerRef.current;

      if (
        video &&
        canvas &&
        landmarker &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        !video.paused
      ) {
        const now = performance.now();
        fpsCountRef.current.frames++;
        if (now - fpsCountRef.current.lastCheck >= 1000) {
          setFps(fpsCountRef.current.frames);
          fpsCountRef.current.frames = 0;
          fpsCountRef.current.lastCheck = now;
        }

        if (video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;

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
                const rawLandmarks = results.landmarks[i];
                const handednessInfo = results.handednesses?.[i]?.[0];
                const score = handednessInfo ? handednessInfo.score : 0.85;
                const handedness = (handednessInfo ? handednessInfo.displayName : 'Hand ' + (i + 1)) as any;

                const postureAnalysis = analyzeHandPosture(rawLandmarks);

                handsList.push({
                  handedness,
                  score,
                  landmarks: rawLandmarks,
                  center: postureAnalysis.center,
                  posture: postureAnalysis.posture,
                  isOpenPalm: postureAnalysis.isOpenPalm,
                  isFist: postureAnalysis.isFist,
                });

                // Draw AR Hologram Skeleton Over Real Hands
                if (showSkeleton) {
                  const isPrimary = i === 0;
                  const neonColor = isPrimary ? '#00f0ff' : '#c084fc';
                  const glowColor = isPrimary ? 'rgba(0, 240, 255, 0.5)' : 'rgba(192, 132, 252, 0.5)';

                  // Connections
                  ctx.lineWidth = 3.5;
                  ctx.strokeStyle = neonColor;
                  ctx.shadowColor = neonColor;
                  ctx.shadowBlur = 12;

                  for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
                    const start = rawLandmarks[startIdx];
                    const end = rawLandmarks[endIdx];
                    if (start && end) {
                      ctx.beginPath();
                      ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
                      ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
                      ctx.stroke();
                    }
                  }

                  // Joint Nodes
                  for (let j = 0; j < rawLandmarks.length; j++) {
                    const lm = rawLandmarks[j];
                    const px = lm.x * canvas.width;
                    const py = lm.y * canvas.height;
                    const isTip = [LM.THUMB_TIP, LM.INDEX_TIP, LM.MIDDLE_TIP, LM.RING_TIP, LM.PINKY_TIP].includes(j);

                    ctx.beginPath();
                    ctx.arc(px, py, isTip ? 7 : 4.5, 0, Math.PI * 2);
                    ctx.fillStyle = isTip ? '#ffffff' : neonColor;
                    ctx.fill();
                    ctx.strokeStyle = glowColor;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                  }

                  // Palm Center Energy Core
                  const cx = postureAnalysis.center.x * canvas.width;
                  const cy = postureAnalysis.center.y * canvas.height;
                  ctx.beginPath();
                  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
                  ctx.strokeStyle = neonColor;
                  ctx.lineWidth = 2;
                  ctx.stroke();

                  // Pinch Beam
                  const thumbTip = rawLandmarks[LM.THUMB_TIP];
                  const indexTip = rawLandmarks[LM.INDEX_TIP];
                  const pinchDist = Math.hypot(
                    (thumbTip.x - indexTip.x) * canvas.width,
                    (thumbTip.y - indexTip.y) * canvas.height
                  );
                  if (pinchDist < 35) {
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.moveTo(thumbTip.x * canvas.width, thumbTip.y * canvas.height);
                    ctx.lineTo(indexTip.x * canvas.width, indexTip.y * canvas.height);
                    ctx.stroke();
                  }
                }
              }

              // Draw Inter-Hand Holographic Quantum Anchor Beam
              if (handsList.length === 2 && showSkeleton) {
                const h1 = handsList[0].center;
                const h2 = handsList[1].center;
                ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 6]);
                ctx.beginPath();
                ctx.moveTo(h1.x * canvas.width, h1.y * canvas.height);
                ctx.lineTo(h2.x * canvas.width, h2.y * canvas.height);
                ctx.stroke();
                ctx.setLineDash([]);
              }
            }

            onHandsUpdated(handsList);

            // Compute Hand Midpoint & Distance for Hologram Anchoring
            if (handsList.length === 2) {
              const h1 = handsList[0];
              const h2 = handsList[1];
              const mid = {
                x: (h1.center.x + h2.center.x) / 2,
                y: (h1.center.y + h2.center.y) / 2,
              };
              const dist = Math.hypot(h2.center.x - h1.center.x, h2.center.y - h1.center.y);
              const isPinching = h1.posture === 'pinch' || h2.posture === 'pinch';
              onHandAnchoringUpdated(mid, dist, isPinching);
            } else if (handsList.length === 1) {
              onHandAnchoringUpdated(handsList[0].center, 0.35, handsList[0].posture === 'pinch');
            } else {
              onHandAnchoringUpdated(null, null, false);
            }

            // Process Gestures
            if (isGestureControlsEnabled) {
              const gestureResult = gestureProcessorRef.current.process(handsList, now);
              onGestureDetected(gestureResult);
            } else {
              gestureProcessorRef.current.resetTracking();
              onGestureDetected({
                activeGesture: 'none',
                gestureDescription: 'Gestures Paused',
                panDelta: { x: 0, y: 0 },
                zoomDelta: 0,
                rotationDelta: { x: 0, y: 0, roll: 0 },
                resetProgress: 0,
                isPaused: true,
                handCount: handsList.length,
                confidence: handsList[0]?.score || 0,
              });
            }
          }
        }
      }

      requestAnimRef.current = requestAnimationFrame(detectLoop);
    };

    requestAnimRef.current = requestAnimationFrame(detectLoop);

    return () => {
      isRunning = false;
      if (requestAnimRef.current) cancelAnimationFrame(requestAnimRef.current);
    };
  }, [isCameraActive, isGestureControlsEnabled, showSkeleton]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none">
      {/* Real Full-Screen Front Webcam Feed (Mirrored) */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${
          isCameraActive ? 'opacity-85' : 'opacity-0'
        } transition-opacity duration-700`}
      />

      {/* Full-Screen AR Hand Landmark Overlay Canvas (Mirrored) */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${
          isCameraActive ? 'block' : 'hidden'
        }`}
      />

      {/* Cyber Optical Holographic Scanline & Vignette Shader Effect */}
      {isCameraActive && (
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,240,255,0.025)_50%)] bg-[length:100%_4px] pointer-events-none" />
      )}

      {/* Inactive Deep Space Ambient Backdrop (When Camera is Off) */}
      {!isCameraActive && (
        <div className="absolute inset-0 bg-radial-[at_center] from-slate-900/40 via-slate-950/90 to-slate-950 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(88,28,135,0.18)_0%,transparent_70%)]" />
        </div>
      )}

      {/* Loading AI Model Indicator */}
      {isLoadingModel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md z-40 pointer-events-auto">
          <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin mb-3" />
          <p className="text-sm font-mono text-cyan-300 font-bold tracking-wider">
            ENGAGING MEDIAPIPE NEURAL AR ENGINE...
          </p>
          <p className="text-xs text-slate-400 mt-1">Calibrating 21-point dual hand spatial coordinates</p>
        </div>
      )}

      {/* Camera Permission / Error Dialog */}
      {cameraError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 max-w-md w-[90%] p-4 rounded-2xl bg-amber-950/95 border border-amber-500/50 backdrop-blur-xl text-center z-50 pointer-events-auto shadow-2xl">
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

      {/* Top Floating Optical Sensor Status Pill */}
      <div className="absolute top-20 right-4 z-20 pointer-events-auto flex items-center gap-2">
        <button
          onClick={() => (isCameraActive ? stopCamera() : startCamera())}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border backdrop-blur-xl transition shadow-xl cursor-pointer ${
            isCameraActive
              ? 'bg-red-950/80 border-red-500/50 text-red-300 hover:bg-red-900/80'
              : 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/80'
          }`}
        >
          {isCameraActive ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
          <span>{isCameraActive ? 'Disengage AR Camera' : 'Engage AR Camera'}</span>
        </button>

        {isCameraActive && (
          <button
            onClick={() => setShowSkeleton(!showSkeleton)}
            title={showSkeleton ? 'Hide Hand Skeleton Overlay' : 'Show Hand Skeleton Overlay'}
            className="p-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white backdrop-blur-xl transition cursor-pointer"
          >
            {showSkeleton ? <Eye className="w-4 h-4 text-cyan-400" /> : <EyeOff className="w-4 h-4" />}
          </button>
        )}

        {isCameraActive && (
          <div className="px-2 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-cyan-400 backdrop-blur-xl">
            {fps} FPS
          </div>
        )}
      </div>
    </div>
  );
};
