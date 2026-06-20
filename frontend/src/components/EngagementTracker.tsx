import React, { useRef, useEffect, useState } from 'react';
import { useMainStore } from '../store/mainStore';
import { Camera, AlertCircle, Eye, ShieldAlert } from 'lucide-react';

export const EngagementTracker: React.FC = () => {
  const { engagement, updateEngagement } = useMainStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState<boolean>(false);
  const [simulationActive, setSimulationActive] = useState<boolean>(false);

  // Load MediaPipe FaceMesh from jsDelivr dynamically to avoid Vite build breaks
  useEffect(() => {
    let active = true;
    
    const loadScripts = async () => {
      try {
        if ((window as any).FaceMesh) {
          setIsModelLoaded(true);
          return;
        }

        // 1. Inject Camera utils
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Camera script load fail"));
          document.head.appendChild(script);
        });

        // 2. Inject FaceMesh utils
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("FaceMesh script load fail"));
          document.head.appendChild(script);
        });

        if (active) {
          setIsModelLoaded(true);
          console.log("MediaPipe FaceMesh loaded successfully via CDN.");
        }
      } catch (err) {
        console.error("Failed to load MediaPipe from CDN, enabling automatic tracking simulation:", err);
        if (active) {
          setSimulationActive(true);
        }
      }
    };

    loadScripts();

    return () => {
      active = false;
    };
  }, []);

  // Initialize Web Camera Stream
  useEffect(() => {
    if (!videoRef.current || !isModelLoaded || simulationActive) return;

    let cameraInstance: any = null;
    let faceMeshInstance: any = null;

    const setupFaceTracking = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasCameraAccess(true);

        const FaceMeshClass = (window as any).FaceMesh;
        if (!FaceMeshClass) {
          setSimulationActive(true);
          return;
        }

        faceMeshInstance = new FaceMeshClass({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });

        faceMeshInstance.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        faceMeshInstance.onResults((results: any) => {
          if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            // No face detected -> drop attention score
            updateEngagement(30, 0.0, false);
            return;
          }

          const landmarks = results.multiFaceLandmarks[0];

          // Compute EAR (Eye Aspect Ratio) for blink/drowsiness detection
          // Left Eye Landmarks: 159 & 145 (vertical height), 33 & 133 (horizontal width)
          const p159 = landmarks[159];
          const p145 = landmarks[145];
          const p33 = landmarks[33];
          const p133 = landmarks[133];

          const eyeHeight = Math.sqrt(Math.pow(p159.x - p145.x, 2) + Math.pow(p159.y - p145.y, 2));
          const eyeWidth = Math.sqrt(Math.pow(p33.x - p133.x, 2) + Math.pow(p33.y - p133.y, 2));
          const ear = eyeHeight / (eyeWidth || 1);

          // Head Pose Rotation estimation (Yaw and Pitch)
          // Nose tip (1) vs Left Face Edge (234) and Right Face Edge (454)
          const nose = landmarks[1];
          const leftFace = landmarks[234];
          const rightFace = landmarks[454];
          
          const noseToLeft = Math.abs(nose.x - leftFace.x);
          const noseToRight = Math.abs(nose.x - rightFace.x);
          const ratio = noseToLeft / (noseToRight || 1);
          
          // If looking center, ratio is near 1.0. If turned away, it deviates significantly
          const yawDeviation = Math.abs(ratio - 1.0);

          // Calculate Engagement / Attention Score
          let attentionScore = 95;
          let drowsy = ear < 0.16; // Low Eye Aspect Ratio indicates blinking or closing eyes

          if (drowsy) {
            attentionScore -= 40;
          }
          if (yawDeviation > 0.35) {
            attentionScore -= 45; // Turn head away
          }
          
          // Constrain between 0 and 100
          attentionScore = Math.max(10, Math.min(100, attentionScore));
          
          updateEngagement(Math.round(attentionScore), parseFloat(ear.toFixed(2)), drowsy);
        });

        const CameraClass = (window as any).Camera;
        if (CameraClass && videoRef.current) {
          cameraInstance = new CameraClass(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && faceMeshInstance) {
                await faceMeshInstance.send({ image: videoRef.current });
              }
            },
            width: 320,
            height: 240
          });
          cameraInstance.start();
        }
      } catch (err) {
        console.warn("Camera streaming permission denied, falling back to simulated engagement metrics:", err);
        setHasCameraAccess(false);
        setSimulationActive(true);
      }
    };

    setupFaceTracking();

    return () => {
      if (cameraInstance) cameraInstance.stop();
      if (videoRef.current) {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
    };
  }, [isModelLoaded, simulationActive]);

  // Simulation fallback interval
  useEffect(() => {
    if (!simulationActive) return;

    const interval = setInterval(() => {
      // Simulate typical attention fluctuations
      const randomFactor = Math.random();
      let simulatedScore = 92;
      let ear = 0.28;
      let drowsy = false;

      if (randomFactor > 0.85) {
        simulatedScore = Math.floor(40 + Math.random() * 20); // Simulates looking away
        ear = 0.25;
      } else if (randomFactor < 0.10) {
        simulatedScore = 30; // Simulates blink / closing eyes
        ear = 0.12;
        drowsy = true;
      } else {
        simulatedScore = Math.floor(88 + Math.random() * 8); // Peak focus
      }

      updateEngagement(simulatedScore, ear, drowsy);
    }, 3000);

    return () => clearInterval(interval);
  }, [simulationActive]);

  return (
    <div className="glass-panel rounded-2xl p-4 border border-cyber-border/40 flex flex-col items-center space-y-3 relative overflow-hidden">
      <div className="absolute top-2 right-2 bg-cyber-blue/15 px-2 py-0.5 rounded text-[8px] font-mono text-cyber-blue">
        {simulationActive ? "SIMULATION MODE" : "LIVE CAM TRACKING"}
      </div>

      <h3 className="text-xs font-mono font-semibold tracking-wider text-cyber-blue uppercase self-start flex items-center gap-1.5">
        <Eye className="w-3.5 h-3.5" /> Client-side Attention Core
      </h3>

      <div className="relative w-full h-[120px] bg-black/60 rounded-xl overflow-hidden flex items-center justify-center border border-cyber-border/20">
        {!simulationActive && hasCameraAccess !== false && (
          <video 
            ref={videoRef} 
            className="w-full h-full object-cover scale-x-[-1]" 
            autoPlay 
            playsInline 
            muted 
          />
        )}

        {(simulationActive || hasCameraAccess === false) && (
          <div className="flex flex-col items-center justify-center text-center p-3 space-y-1">
            <Camera className="w-8 h-8 text-cyber-purple animate-pulse" />
            <span className="text-[10px] font-mono text-cyber-text/80">Camera simulated under privacy boundaries</span>
            <span className="text-[8px] text-cyber-cyan font-mono">Calculations fully sandboxed inside browser</span>
          </div>
        )}

        {/* Dynamic Scan overlays */}
        <div className="absolute inset-0 border border-cyber-blue/20 pointer-events-none rounded-xl"></div>
        {engagement.isDrowsy && (
          <div className="absolute inset-0 bg-red-600/35 border border-red-500 animate-pulse flex items-center justify-center z-20">
            <div className="bg-black/90 px-3 py-1.5 rounded-lg border border-red-500 flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <span className="text-[10px] font-bold text-red-500 tracking-wide uppercase font-mono">DROWSINESS DETECTED</span>
            </div>
          </div>
        )}
      </div>

      {/* Focus Meter Readout */}
      <div className="w-full grid grid-cols-2 gap-2 text-center text-xs font-mono">
        <div className="bg-cyber-bg/50 p-2 rounded-lg border border-cyber-border/20">
          <div className="text-[10px] text-cyber-text/60 uppercase">Attention Score</div>
          <div className={`text-base font-bold ${engagement.currentScore >= 75 ? 'text-cyber-cyan' : 'text-cyber-pink'}`}>
            {engagement.currentScore}%
          </div>
        </div>
        <div className="bg-cyber-bg/50 p-2 rounded-lg border border-cyber-border/20">
          <div className="text-[10px] text-cyber-text/60 uppercase">Eye Aspect Ratio</div>
          <div className="text-base font-bold text-cyber-purple">
            {engagement.ear > 0 ? engagement.ear : '0.28'}
          </div>
        </div>
      </div>

      <div className="w-full text-[9px] text-cyber-text/60 text-center font-mono flex items-center justify-center gap-1">
        <AlertCircle className="w-2.5 h-2.5 text-cyber-cyan" /> Secure Local Processing: No image data will leave your device.
      </div>
    </div>
  );
};
