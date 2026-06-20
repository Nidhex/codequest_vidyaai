import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface AvatarTeacherProps {
  isSpeaking?: boolean;
  emotionState?: 'happy' | 'encouraging' | 'empathetic' | 'skeptical' | 'excited' | 'serious';
  speechIntensity?: number; // 0 to 1
}

export const AvatarTeacher: React.FC<AvatarTeacherProps> = ({
  isSpeaking = false,
  emotionState = 'encouraging',
  speechIntensity = 0.5
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speechRef = useRef(speechIntensity);
  const speakingRef = useRef(isSpeaking);

  // Sync refs to use in requestAnimationFrame loop
  useEffect(() => {
    speechRef.current = speechIntensity;
    speakingRef.current = isSpeaking;
  }, [speechIntensity, isSpeaking]);

  useEffect(() => {
    if (!mountRef.current || !canvasRef.current) return;

    let isDisposed = false;
    const width = mountRef.current.clientWidth || 300;
    const height = mountRef.current.clientHeight || 300;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x03001e, 0.05);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.5, 6);

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 4. Color map for emotions
    const getEmotionColor = (emotion: string) => {
      switch (emotion) {
        case 'happy': return new THREE.Color(0x00f5d4); // Cyan
        case 'excited': return new THREE.Color(0xf15bb5); // Pink
        case 'serious': return new THREE.Color(0x4f46e5); // Indigo
        case 'skeptical': return new THREE.Color(0x9b5de5); // Purple
        case 'empathetic': return new THREE.Color(0xfee440); // Yellow
        case 'encouraging':
        default: return new THREE.Color(0x00f2fe); // Electric Blue
      }
    };

    let baseColor = getEmotionColor(emotionState);

    // 5. Creating Hologram Head Mesh (Stylized icosahedron)
    const geometry = new THREE.IcosahedronGeometry(1.6, 2);
    // Wireframe material for digital scanning look
    const material = new THREE.MeshBasicMaterial({
      color: baseColor,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });
    const headMesh = new THREE.Mesh(geometry, material);
    headMesh.position.y = 0.5;
    scene.add(headMesh);

    // Inner glowing sphere
    const innerGeom = new THREE.SphereGeometry(1.0, 16, 16);
    const innerMat = new THREE.MeshBasicMaterial({
      color: baseColor,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending
    });
    const innerCore = new THREE.Mesh(innerGeom, innerMat);
    innerCore.position.y = 0.5;
    scene.add(innerCore);

    // 6. Floating Particles Around Head
    const particleCount = 120;
    const particlesGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const speeds: number[] = [];

    for (let i = 0; i < particleCount; i++) {
      // Random coordinates around a cylinder
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.8 + Math.random() * 1.5;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      speeds.push(0.01 + Math.random() * 0.02);
    }

    particlesGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particlesMat = new THREE.PointsMaterial({
      color: 0x00f2fe,
      size: 0.05,
      transparent: true,
      opacity: 0.8
    });
    const particleSystem = new THREE.Points(particlesGeom, particlesMat);
    scene.add(particleSystem);

    // 7. Base Holographic Projector Ring
    const ringGeom = new THREE.RingGeometry(1.2, 1.3, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: baseColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    const projectorRing = new THREE.Mesh(ringGeom, ringMat);
    projectorRing.rotation.x = Math.PI / 2;
    projectorRing.position.y = -1.6;
    scene.add(projectorRing);

    // Secondary ring rotating opposite
    const ringGeom2 = new THREE.RingGeometry(1.4, 1.45, 16);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: baseColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3,
      wireframe: true
    });
    const projectorRing2 = new THREE.Mesh(ringGeom2, ringMat2);
    projectorRing2.rotation.x = Math.PI / 2;
    projectorRing2.position.y = -1.6;
    scene.add(projectorRing2);

    // Grid floor
    const gridHelper = new THREE.GridHelper(10, 15, baseColor, 0x111122);
    gridHelper.position.y = -1.61;
    scene.add(gridHelper);

    // 8. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // Store vertices to deform mesh during speech
    const originalPositions = geometry.attributes.position.clone();

    // 9. Animation Loop
    let clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      if (isDisposed) return;
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();
      const isSpeakingVal = speakingRef.current;
      const intensity = speechRef.current;

      // Slowly rotate components
      headMesh.rotation.y = elapsedTime * 0.2;
      headMesh.rotation.x = Math.sin(elapsedTime * 0.5) * 0.1;
      
      innerCore.rotation.y = -elapsedTime * 0.1;
      projectorRing.rotation.z = elapsedTime * 0.4;
      projectorRing2.rotation.z = -elapsedTime * 0.25;

      // Floating / Bobbing idle motion
      const bobOffset = Math.sin(elapsedTime * 1.5) * 0.08;
      headMesh.position.y = 0.5 + bobOffset;
      innerCore.position.y = 0.5 + bobOffset;

      // Mouth open and facial pulse deformation if speaking
      const posAttribute = geometry.attributes.position;
      const count = posAttribute.count;

      for (let i = 0; i < count; i++) {
        const x = originalPositions.getX(i);
        const y = originalPositions.getY(i);
        const z = originalPositions.getZ(i);

        let factor = 1.0;
        if (isSpeakingVal) {
          // Deform lower vertices (simulating mouth opening) and pulse
          const distanceToBottom = 1.6 - y; // Vertices at bottom get shifted
          const pulse = Math.sin(elapsedTime * 18 + i) * 0.12 * intensity;
          
          if (y < 0) {
            factor = 1.0 + (pulse * (distanceToBottom / 1.6));
          } else {
            factor = 1.0 + pulse * 0.05; // Slight top pulse
          }
        } else {
          // Subtle idle breathing pulse
          factor = 1.0 + Math.sin(elapsedTime * 2 + i * 0.1) * 0.015;
        }

        posAttribute.setXYZ(i, x * factor, y * factor, z * factor);
      }
      posAttribute.needsUpdate = true;

      // Animate floating particles rising up
      const pPositions = particlesGeom.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        pPositions[i * 3 + 1] += speeds[i]; // Move Y up
        
        // Reset particles if they float too high
        if (pPositions[i * 3 + 1] > 2.5) {
          pPositions[i * 3 + 1] = -2.0;
        }
      }
      particlesGeom.attributes.position.needsUpdate = true;

      // Blend color updates smoothly
      const targetColor = getEmotionColor(emotionState);
      baseColor.lerp(targetColor, 0.05);
      material.color.copy(baseColor);
      innerMat.color.copy(baseColor);
      ringMat.color.copy(baseColor);
      ringMat2.color.copy(baseColor);
      particlesMat.color.copy(baseColor);

      renderer.render(scene, camera);
    };

    animate();

    // 10. Resize handler
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      material.dispose();
      innerGeom.dispose();
      innerMat.dispose();
      ringGeom.dispose();
      ringMat.dispose();
      ringGeom2.dispose();
      ringMat2.dispose();
      particlesGeom.dispose();
      particlesMat.dispose();
      gridHelper.dispose();
    };
  }, [emotionState]);

  return (
    <div 
      ref={mountRef} 
      className="relative w-full h-full min-h-[250px] flex items-center justify-center rounded-2xl overflow-hidden hologram-grid"
    >
      {/* Hologram Scanner Line */}
      <div className="hologram-scanner"></div>
      
      {/* Three.js Canvas */}
      <canvas ref={canvasRef} className="w-full h-full z-10" />

      {/* Floating Holographic Labels */}
      <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 bg-cyber-indigo/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-cyber-blue/30 text-xs">
        <span className="w-2 h-2 rounded-full bg-cyber-blue animate-pulse-slow"></span>
        <span className="font-mono text-cyber-blue uppercase tracking-widest text-[10px]">Holo Teacher Online</span>
      </div>

      <div className="absolute bottom-4 right-4 z-20 bg-cyber-card backdrop-blur-md px-3 py-1 border border-cyber-border rounded-lg text-[10px] font-mono flex items-center space-x-2">
        <span className="text-cyber-purple uppercase">EMOTION:</span>
        <span className="text-cyber-cyan font-bold uppercase tracking-wider">{emotionState}</span>
      </div>
    </div>
  );
};
