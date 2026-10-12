import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { Camera, CameraOff, RefreshCw, AlertTriangle, Eye, EyeOff, Layers, Zap } from 'lucide-react';
import { HandData, GestureDetectionResult } from '../types';
import { analyzeHandPosture, GestureProcessor, LM } from '../utils/gestureDetector';

interface WebcamTrackerProps {
  onGestureDetected: (result: GestureDetectionResult) => void;
  onHandsUpdated: (hands: HandData[]) => void;
  isGestureControlsEnabled: boolean;
  sensitivity: number;
}

// MediaPipe standard hand skeleton connections
const HAND_CONNECTIONS: Array<[number, number]> = [
  // Thumb
  [LM.WRIST, LM.THUMB_CMC],
  [LM.THUMB_CMC, LM.THUMB_MCP],
  [LM.THUMB_MCP, LM.THUMB_IP],
  [LM.THUMB_IP, LM.THUMB_TIP],
  // Index
  [LM.WRIST, LM.INDEX_MCP],
  [LM.INDEX_MCP, LM.INDEX_PIP],
  [LM.INDEX_PIP, LM.INDEX_DIP],
  [LM.INDEX_DIP, LM.INDEX_TIP],
  // Middle
  [LM.WRIST, LM.MIDDLE_MCP],
  [LM.MIDDLE_MCP, LM.MIDDLE_PIP],
  [LM.MIDDLE_PIP, LM.MIDDLE_DIP],
  [LM.MIDDLE_DIP, LM.MIDDLE_TIP],
  // Ring
  [LM.WRIST, LM.RING_MCP],
  [LM.RING_MCP, LM.RING_PIP],
  [LM.RING_PIP, LM.RING_DIP],
  [LM.RING_DIP, LM.RING_TIP],
  // Pinky
  [LM.WRIST, LM.PINKY_MCP],
  [LM.PINKY_MCP, LM.PINKY_PIP],
  [LM.PINKY_PIP, LM.PINKY_DIP],
  [LM.PINKY_DIP, LM.PINKY_TIP],
  // Palm Base
  [LM.INDEX_MCP, LM.MIDDLE_MCP],
  [LM.MIDDLE_MCP, LM.RING_MCP],
  [LM.RING_MCP, LM.PINKY_MCP],
];

export const WebcamTracker: React.FC<WebcamTrackerProps> = ({
  onGestureDetected,
  onHandsUpdated,
  isGestureControlsEnabled,
  sensitivity,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const gestureProcessorRef = useRef<GestureProcessor>(new GestureProcessor());
  const requestAnimRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const fpsCountRef = useRef({ frames: 0, lastCheck: performance.now() });

  // Update processor sensitivity
  useEffect(() => {
    gestureProcessorRef.current.sensitivity = sensitivity;
  }, [sensitivity]);

  // Load available camera devices
  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setAvailableCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCameraId) {
        setSelectedCameraId(videoDevices[0].deviceId);
      }
    } catch {
      // Ignored
    }
  }, [selectedCameraId]);

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
    } catch (err: any) {
      console.error('Failed to load MediaPipe HandLandmarker:', err);
      // Fallback with CPU delegate if GPU initialization failed
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
        setCameraError('Failed to initialize AI Hand Tracking model: ' + (cpuErr?.message || 'Network error'));
        return null;
      }
    }
  }, []);

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      const landmarker = await initHandLandmarker();
      if (!landmarker) return;

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined,
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
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
      await refreshDevices();
    } catch (err: any) {
      console.error('Webcam start error:', err);
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera access denied. Please click the camera icon in your browser address bar and grant permission.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No webcam device detected. Please connect a camera.');
      } else {
        setCameraError('Failed to start camera: ' + (err.message || 'Unknown error'));
      }
      setIsCameraActive(false);
    }
  };

  // Stop Camera Stream
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
    setIsCameraActive(false);
    gestureProcessorRef.current.resetTracking();
    onHandsUpdated([]);
    onGestureDetected({
      activeGesture: 'none',
      gestureDescription: 'Camera stopped',
      panDelta: { x: 0, y: 0 },
      zoomDelta: 0,
      rotationDelta: { x: 0, y: 0, roll: 0 },
      resetProgress: 0,
      isPaused: false,
      handCount: 0,
      confidence: 0,
    });
  };

  // Switch Camera Device
  const handleCameraChange = async (newDeviceId: string) => {
    setSelectedCameraId(newDeviceId);
    if (isCameraActive) {
      stopCamera();
      setTimeout(() => {
        startCamera();
      }, 200);
    }
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
        // Calculate FPS
        const now = performance.now();
        fpsCountRef.current.frames++;
        if (now - fpsCountRef.current.lastCheck >= 1000) {
          setFps(fpsCountRef.current.frames);
          fpsCountRef.current.frames = 0;
          fpsCountRef.current.lastCheck = now;
        }

        // Check if new video frame is ready
        if (video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;

          // Sync canvas dimensions
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

                // Draw skeleton landmarks on HUD canvas
                if (showSkeleton) {
                  const isPrimary = i === 0;
                  const neonColor = isPrimary ? '#00f0ff' : '#c084fc';
                  const glowColor = isPrimary ? 'rgba(0, 240, 255, 0.4)' : 'rgba(192, 132, 252, 0.4)';

                  // Draw connections
                  ctx.lineWidth = 3;
                  ctx.strokeStyle = neonColor;
                  ctx.lineCap = 'round';
                  ctx.lineJoin = 'round';
                  ctx.shadowColor = neonColor;
                  ctx.shadowBlur = 8;

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

                  // Draw joints
                  for (let j = 0; j < rawLandmarks.length; j++) {
                    const lm = rawLandmarks[j];
                    const px = lm.x * canvas.width;
                    const py = lm.y * canvas.height;
                    const isTip = [LM.THUMB_TIP, LM.INDEX_TIP, LM.MIDDLE_TIP, LM.RING_TIP, LM.PINKY_TIP].includes(j);

                    ctx.beginPath();
                    ctx.arc(px, py, isTip ? 6 : 4, 0, Math.PI * 2);
                    ctx.fillStyle = isTip ? '#ffffff' : neonColor;
                    ctx.fill();
                    ctx.strokeStyle = glowColor;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                  }

                  // Draw Palm Center Reticle & Posture Tag
                  const cx = postureAnalysis.center.x * canvas.width;
                  const cy = postureAnalysis.center.y * canvas.height;

                  ctx.shadowBlur = 0;
                  ctx.beginPath();
                  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
                  ctx.strokeStyle = neonColor;
                  ctx.lineWidth = 2;
                  ctx.setLineDash([4, 4]);
                  ctx.stroke();
                  ctx.setLineDash([]);

                  // Label badge
                  ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
                  ctx.strokeStyle = neonColor;
                  ctx.lineWidth = 1;
                  const label = `${handedness.toUpperCase()}: ${postureAnalysis.posture.toUpperCase()}`;
                  ctx.font = '600 11px Chakra Petch, monospace';
                  const textWidth = ctx.measureText(label).width;
                  ctx.fillRect(cx - textWidth / 2 - 6, cy - 28, textWidth + 12, 18);
                  ctx.strokeRect(cx - textWidth / 2 - 6, cy - 28, textWidth + 12, 18);

                  ctx.fillStyle = '#ffffff';
                  ctx.fillText(label, cx - textWidth / 2, cy - 15);
                }
              }
            }

            onHandsUpdated(handsList);

            // Run Gesture Processor if controls are enabled
            if (isGestureControlsEnabled) {
              const gestureResult = gestureProcessorRef.current.process(handsList, now);
              onGestureDetected(gestureResult);
            } else {
              gestureProcessorRef.current.resetTracking();
              onGestureDetected({
                activeGesture: 'none',
                gestureDescription: 'Gestures Disabled (Toggle ON below)',
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
      if (requestAnimRef.current) {
        cancelAnimationFrame(requestAnimRef.current);
      }
    };
  }, [isCameraActive, isGestureControlsEnabled, showSkeleton, onGestureDetected, onHandsUpdated]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="flex flex-col bg-slate-900/80 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-4 shadow-2xl shadow-cyan-950/40 relative overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-cyan-500/15">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full animate-pulse bg-cyan-400 shadow-[0_0_8px_#00f0ff]" />
          <h2 className="text-xs uppercase tracking-widest font-semibold font-mono text-cyan-400">
            Aura Vision Tracker
          </h2>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
          <span className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-cyan-300">
            {fps} FPS
          </span>
          <span
            className={`px-1.5 py-0.5 rounded border ${
              isCameraActive
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {isCameraActive ? 'LIVE' : 'STANDBY'}
          </span>
        </div>
      </div>

      {/* Video Viewport with HUD Canvas */}
      <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center group shadow-inner">
        {/* Subtle grid backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#082f4915_1px,transparent_1px),linear-gradient(to_bottom,#082f4915_1px,transparent_1px)] bg-[size:16px_16px]" />

        {/* Video feed (mirrored) */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover transform -scale-x-100 ${
            isCameraActive ? 'block' : 'hidden'
          }`}
        />

        {/* MediaPipe HUD Landmark Canvas (mirrored to match video) */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none transform -scale-x-100 ${
            isCameraActive ? 'block' : 'hidden'
          }`}
        />

        {/* Inactive Standby Screen */}
        {!isCameraActive && !isLoadingModel && (
          <div className="flex flex-col items-center justify-center p-6 text-center z-10 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <Camera className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Optical Sensor Offline</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                Activate webcam to engage dual-hand spatial gesture controls.
              </p>
            </div>
            <button
              onClick={startCamera}
              className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-medium text-xs tracking-wider uppercase transition-all shadow-lg shadow-cyan-500/25 active:scale-95 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              Engage Camera
            </button>
          </div>
        )}

        {/* Loading AI Model Screen */}
        {isLoadingModel && (
          <div className="flex flex-col items-center justify-center p-6 text-center z-10 space-y-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-xs font-mono text-cyan-300 tracking-wider">
              INITIALIZING MEDIAPIPE NEURAL ENGINE...
            </p>
            <p className="text-[11px] text-slate-400">Loading 21-point dual hand landmarker</p>
          </div>
        )}

        {/* Camera Permission / Device Error Overlay */}
        {cameraError && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center z-20 space-y-3">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
            <p className="text-xs font-medium text-amber-300 max-w-[240px] leading-relaxed">
              {cameraError}
            </p>
            <button
              onClick={startCamera}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-xs font-mono transition cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Corner HUD framing brackets */}
        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400/60 pointer-events-none" />
        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400/60 pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400/60 pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400/60 pointer-events-none" />
      </div>

      {/* Camera Controls & Visual toggles */}
      <div className="mt-3 flex items-center justify-between gap-2">
        {isCameraActive ? (
          <button
            onClick={stopCamera}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-950/60 border border-red-500/40 hover:bg-red-900/60 text-red-300 font-mono text-xs transition cursor-pointer"
          >
            <CameraOff className="w-3.5 h-3.5" />
            Disengage Sensor
          </button>
        ) : (
          <button
            onClick={startCamera}
            disabled={isLoadingModel}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 hover:bg-cyan-900/60 text-cyan-300 font-mono text-xs transition cursor-pointer disabled:opacity-50"
          >
            <Camera className="w-3.5 h-3.5" />
            Engage Sensor
          </button>
        )}

        <button
          onClick={() => setShowSkeleton(!showSkeleton)}
          title={showSkeleton ? 'Hide Hand Skeleton' : 'Show Hand Skeleton'}
          className={`p-2 rounded-xl border transition cursor-pointer ${
            showSkeleton
              ? 'bg-violet-950/60 border-violet-500/40 text-violet-300 hover:bg-violet-900/60'
              : 'bg-slate-800/60 border-slate-700 text-slate-400'
          }`}
        >
          {showSkeleton ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>

      {/* Multiple Camera Selector dropdown if available */}
      {availableCameras.length > 1 && (
        <div className="mt-2">
          <select
            value={selectedCameraId}
            onChange={(e) => handleCameraChange(e.target.value)}
            className="w-full bg-slate-950 text-slate-300 text-[11px] font-mono border border-slate-800 rounded-lg p-1.5 focus:border-cyan-500 focus:outline-none"
          >
            {availableCameras.map((device, idx) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${idx + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
