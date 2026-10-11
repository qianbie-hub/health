import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Activity,
  Sparkles,
  ArrowRight,
  Layers,
  HeartPulse,
  Maximize2,
  Minimize2,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { fluidEase } from '../animations';

interface Full3DHealthObservatoryProps {
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
}

type ViewMode = 'holistic' | 'cardiac' | 'metabolic' | 'circadian';

export default function Full3DHealthObservatory({ onOpenAuth }: Full3DHealthObservatoryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeView, setActiveView] = useState<ViewMode>('holistic');
  const [pulseBpm, setPulseBpm] = useState<number>(72);
  const [renderMode, setRenderMode] = useState<'hologram' | 'particles' | 'wireframe'>('hologram');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // References to communicate between React state and Three.js animation loop
  const sceneParamsRef = useRef({
    bpm: 72,
    renderMode: 'hologram',
    targetCameraPos: new THREE.Vector3(0, 0.4, 5.2),
    targetLookAt: new THREE.Vector3(0, 0, 0),
  });

  useEffect(() => {
    sceneParamsRef.current.bpm = pulseBpm;
  }, [pulseBpm]);

  useEffect(() => {
    sceneParamsRef.current.renderMode = renderMode;
  }, [renderMode]);

  // Adjust camera targets based on active view mode
  useEffect(() => {
    if (activeView === 'holistic') {
      sceneParamsRef.current.targetCameraPos.set(0, 0.4, 5.4);
      sceneParamsRef.current.targetLookAt.set(0, 0, 0);
    } else if (activeView === 'cardiac') {
      sceneParamsRef.current.targetCameraPos.set(0, 0.35, 2.7);
      sceneParamsRef.current.targetLookAt.set(0, 0.35, 0);
    } else if (activeView === 'metabolic') {
      sceneParamsRef.current.targetCameraPos.set(1.4, -0.2, 3.2);
      sceneParamsRef.current.targetLookAt.set(0.3, -0.2, 0);
    } else if (activeView === 'circadian') {
      sceneParamsRef.current.targetCameraPos.set(-1.6, 0.6, 3.8);
      sceneParamsRef.current.targetLookAt.set(-0.2, 0.2, 0);
    }
  }, [activeView]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Three.js Scene Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xE8ECEF, 0.045);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0.4, 5.4);

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 8.5;
    controls.minDistance = 2.0;
    controls.maxPolarAngle = Math.PI / 1.7;
    controls.minPolarAngle = Math.PI / 4.5;
    controls.enablePan = false;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1.4);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x4A7BB0, 2.5); // Tranquil Blue
    dirLight1.position.set(5, 8, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x4A9671, 2.0); // Soft Mint
    dirLight2.position.set(-5, -4, -3);
    scene.add(dirLight2);

    const pointLightHeart = new THREE.PointLight(0xE07E56, 3.0, 5); // Terracotta heart glow
    pointLightHeart.position.set(0, 0.35, 0.2);
    scene.add(pointLightHeart);

    // 6. Master Model Group
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // -------------------------------------------------------------
    // ANATOMICAL PHYSIOLOGICAL SILHOUETTE & BIOMETRIC TWIN
    // -------------------------------------------------------------

    // A. Torso Translucent Mannequin Wireframe (Curved Lathe / Cylinder)
    const torsoPoints: THREE.Vector2[] = [];
    torsoPoints.push(new THREE.Vector2(0.55, 1.4)); // Neck
    torsoPoints.push(new THREE.Vector2(1.15, 1.1)); // Shoulders
    torsoPoints.push(new THREE.Vector2(0.95, 0.5)); // Chest
    torsoPoints.push(new THREE.Vector2(0.85, 0.0)); // Diaphragm
    torsoPoints.push(new THREE.Vector2(0.78, -0.6)); // Abdomen
    torsoPoints.push(new THREE.Vector2(0.92, -1.2)); // Pelvis
    torsoPoints.push(new THREE.Vector2(0.5, -1.5)); // Base

    const torsoGeo = new THREE.LatheGeometry(torsoPoints, 32);
    const torsoMat = new THREE.MeshStandardMaterial({
      color: 0x4A7BB0,
      wireframe: true,
      transparent: true,
      opacity: 0.16,
      roughness: 0.2,
      metalness: 0.1,
    });
    const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    modelGroup.add(torsoMesh);

    // B. Central Cardiac Core Node (Resting HR & Autonomic Vagal Tone)
    const heartGeo = new THREE.IcosahedronGeometry(0.38, 2);
    const heartMat = new THREE.MeshStandardMaterial({
      color: 0xE07E56, // Terracotta / Peach pulse
      roughness: 0.3,
      metalness: 0.2,
      emissive: 0xC8663D,
      emissiveIntensity: 0.4,
      wireframe: false,
    });
    const heartMesh = new THREE.Mesh(heartGeo, heartMat);
    heartMesh.position.set(0, 0.35, 0.15);
    modelGroup.add(heartMesh);

    // Heart Outer Aura Mesh
    const heartAuraGeo = new THREE.IcosahedronGeometry(0.52, 1);
    const heartAuraMat = new THREE.MeshBasicMaterial({
      color: 0xF7C7B2,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const heartAuraMesh = new THREE.Mesh(heartAuraGeo, heartAuraMat);
    heartAuraMesh.position.set(0, 0.35, 0.15);
    modelGroup.add(heartAuraMesh);

    // C. Vascular / Arterial Energy Loops (Connecting Continuous Telemetry)
    const arterialCurve1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.35, 0.15),
      new THREE.Vector3(0.5, 0.8, 0.2),
      new THREE.Vector3(0.9, 0.4, 0.1),
      new THREE.Vector3(0.6, -0.4, 0.2),
      new THREE.Vector3(0, -1.0, 0.1),
      new THREE.Vector3(-0.6, -0.4, 0.2),
      new THREE.Vector3(-0.9, 0.4, 0.1),
      new THREE.Vector3(-0.5, 0.8, 0.2),
      new THREE.Vector3(0, 0.35, 0.15),
    ]);
    const arterialGeo1 = new THREE.TubeGeometry(arterialCurve1, 80, 0.016, 8, true);
    const arterialMat1 = new THREE.MeshBasicMaterial({
      color: 0x4A7BB0, // Tranquil Blue
      transparent: true,
      opacity: 0.65,
    });
    const arterialMesh1 = new THREE.Mesh(arterialGeo1, arterialMat1);
    modelGroup.add(arterialMesh1);

    // D. Molecular Biomarker Cluster (Representing Lab OCR Ingestion: hs-CRP, LDL, Glucose)
    const biomarkerCount = 140;
    const biomarkerGeo = new THREE.BufferGeometry();
    const biomarkerPositions = new Float32Array(biomarkerCount * 3);
    const biomarkerColors = new Float32Array(biomarkerCount * 3);

    const cMint = new THREE.Color('#4A9671');
    const cBlue = new THREE.Color('#4A7BB0');
    const cAmber = new THREE.Color('#E07E56');

    for (let i = 0; i < biomarkerCount; i++) {
      // Clustered around hepatic/metabolic region (y: -0.2 to 0.1, x: -0.5 to 0.5)
      const u = Math.random();
      const radius = 0.2 + Math.random() * 0.65;
      const angle = Math.random() * Math.PI * 2;
      const y = -0.4 + Math.random() * 0.8;

      biomarkerPositions[i * 3] = Math.cos(angle) * radius;
      biomarkerPositions[i * 3 + 1] = y;
      biomarkerPositions[i * 3 + 2] = Math.sin(angle) * radius * 0.6 + 0.1;

      const col = u < 0.45 ? cMint : u < 0.8 ? cBlue : cAmber;
      biomarkerColors[i * 3] = col.r;
      biomarkerColors[i * 3 + 1] = col.g;
      biomarkerColors[i * 3 + 2] = col.b;
    }

    biomarkerGeo.setAttribute('position', new THREE.BufferAttribute(biomarkerPositions, 3));
    biomarkerGeo.setAttribute('color', new THREE.BufferAttribute(biomarkerColors, 3));

    const biomarkerMat = new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const biomarkerPoints = new THREE.Points(biomarkerGeo, biomarkerMat);
    modelGroup.add(biomarkerPoints);

    // E. Circadian Thermoregulation & Sleep Rings (Multi-tier Telemetry Orbitals)
    const orbitalGroup = new THREE.Group();
    modelGroup.add(orbitalGroup);

    const ringGeo1 = new THREE.TorusGeometry(1.5, 0.012, 16, 90);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x6FA4D4, transparent: true, opacity: 0.5 });
    const ringMesh1 = new THREE.Mesh(ringGeo1, ringMat1);
    ringMesh1.rotation.x = Math.PI / 2.3;
    orbitalGroup.add(ringMesh1);

    const ringGeo2 = new THREE.TorusGeometry(1.85, 0.01, 16, 90);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x92C6AB, transparent: true, opacity: 0.4 });
    const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
    ringMesh2.rotation.x = -Math.PI / 3;
    ringMesh2.rotation.y = Math.PI / 5;
    orbitalGroup.add(ringMesh2);

    const ringGeo3 = new THREE.TorusGeometry(2.15, 0.008, 16, 90);
    const ringMat3 = new THREE.MeshBasicMaterial({ color: 0xBAA5E2, transparent: true, opacity: 0.35 });
    const ringMesh3 = new THREE.Mesh(ringGeo3, ringMat3);
    ringMesh3.rotation.z = Math.PI / 4;
    ringMesh3.rotation.y = Math.PI / 2.2;
    orbitalGroup.add(ringMesh3);

    // F. Ambient Floating Data Particles (Constellation of 280 particles)
    const ambientCount = 280;
    const ambientGeo = new THREE.BufferGeometry();
    const ambientPos = new Float32Array(ambientCount * 3);

    for (let i = 0; i < ambientCount; i++) {
      const rad = 1.4 + Math.random() * 2.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;

      ambientPos[i * 3] = rad * Math.cos(phi) * Math.cos(theta);
      ambientPos[i * 3 + 1] = rad * Math.sin(phi);
      ambientPos[i * 3 + 2] = rad * Math.cos(phi) * Math.sin(theta);
    }
    ambientGeo.setAttribute('position', new THREE.BufferAttribute(ambientPos, 3));
    const ambientMat = new THREE.PointsMaterial({
      color: 0x4A7BB0,
      size: 0.035,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const ambientParticles = new THREE.Points(ambientGeo, ambientMat);
    modelGroup.add(ambientParticles);

    // 7. Resize Handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // 8. Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();
      const currentBpm = sceneParamsRef.current.bpm;
      const pulseFrequency = (currentBpm / 60) * Math.PI * 2;

      // Camera lerp towards target position and lookAt
      camera.position.lerp(sceneParamsRef.current.targetCameraPos, 0.04);
      controls.target.lerp(sceneParamsRef.current.targetLookAt, 0.04);
      controls.update();

      // Slow gentle model yaw rotation
      modelGroup.rotation.y = elapsed * 0.12;

      // Heart Cardiac Pulse Expansion (Synchronized with selected BPM)
      const heartPulse = 1 + Math.sin(elapsed * pulseFrequency) * 0.09 + Math.sin(elapsed * pulseFrequency * 2) * 0.03;
      heartMesh.scale.set(heartPulse, heartPulse, heartPulse);
      heartAuraMesh.scale.set(heartPulse * 1.05, heartPulse * 1.05, heartPulse * 1.05);
      pointLightHeart.intensity = 2.0 + Math.sin(elapsed * pulseFrequency) * 1.5;

      // Orbital Rings Rotation
      ringMesh1.rotation.z = elapsed * 0.25;
      ringMesh2.rotation.z = -elapsed * 0.2;
      ringMesh3.rotation.x = elapsed * 0.15;

      // Biomarker Molecular Cloud gentle vortex
      biomarkerPoints.rotation.y = -elapsed * 0.35;

      // Render mode adjustments
      const currentMode = sceneParamsRef.current.renderMode;
      if (currentMode === 'wireframe') {
        torsoMat.wireframe = true;
        torsoMat.opacity = 0.25;
        heartMesh.visible = false;
        heartAuraMesh.visible = true;
        biomarkerPoints.visible = false;
      } else if (currentMode === 'particles') {
        torsoMat.wireframe = true;
        torsoMat.opacity = 0.06;
        heartMesh.visible = false;
        heartAuraMesh.visible = true;
        biomarkerPoints.visible = true;
      } else {
        torsoMat.wireframe = true;
        torsoMat.opacity = 0.16;
        heartMesh.visible = true;
        heartAuraMesh.visible = true;
        biomarkerPoints.visible = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      torsoGeo.dispose();
      torsoMat.dispose();
      heartGeo.dispose();
      heartMat.dispose();
      heartAuraGeo.dispose();
      heartAuraMat.dispose();
      arterialGeo1.dispose();
      arterialMat1.dispose();
      biomarkerGeo.dispose();
      biomarkerMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      ringGeo3.dispose();
      ringMat3.dispose();
      ambientGeo.dispose();
      ambientMat.dispose();
    };
  }, []);

  return (
    <div
      className={`relative w-full rounded-3xl overflow-hidden border border-[#DCE2EA] shadow-float bg-gradient-to-b from-white via-[#F8FAFC] to-[#E8ECEF] transition-all duration-500 ${
        isFullscreen ? 'fixed inset-4 z-50 rounded-2xl shadow-2xl' : 'min-h-[640px] sm:min-h-[720px] lg:min-h-[780px]'
      }`}
    >
      {/* 3D WebGL Canvas Layer */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-0"
      />

      {/* ==================== SPATIAL 3D HUD OVERLAY ==================== */}

      {/* Top Left: Platform 3D Title & Stream Badges */}
      <div className="absolute top-5 left-5 z-20 space-y-2 pointer-events-none">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-[#DCE2EA] shadow-xs text-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-softMint-500 animate-ping" />
          <span className="font-semibold text-slateInk-900 tracking-wide font-mono text-[11px]">
            SPATIAL BIOMETRIC OBSERVATORY
          </span>
          <span className="text-slateInk-300">•</span>
          <span className="text-[10px] text-tranquil-700 font-medium">3D Neural Twin</span>
        </div>

        <h3 className="font-serif text-2xl sm:text-3xl font-normal text-slateInk-900 drop-shadow-xs">
          How Vigil Maps Your Biology
        </h3>
        <p className="text-xs text-slateInk-600 max-w-sm drop-shadow-xs">
          Drag to orbit 360°. Zoom to inspect how continuous sensor streams correlate with clinical lab biomarkers.
        </p>
      </div>

      {/* Top Right: View Switchers & Fullscreen Button */}
      <div className="absolute top-5 right-5 z-20 flex items-center space-x-2">
        {/* Render mode selector */}
        <div className="hidden sm:flex bg-white/85 backdrop-blur-md p-1 rounded-2xl border border-[#DCE2EA] shadow-xs text-xs font-semibold">
          {[
            { id: 'hologram', label: 'Hologram' },
            { id: 'particles', label: 'Biomarkers' },
            { id: 'wireframe', label: 'Wireframe' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setRenderMode(m.id as any)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                renderMode === m.id
                  ? 'bg-slateInk-900 text-white shadow-xs'
                  : 'text-slateInk-600 hover:text-slateInk-900'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Fullscreen Expand Button */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2.5 rounded-2xl bg-white/85 hover:bg-white backdrop-blur-md border border-[#DCE2EA] text-slateInk-700 hover:text-slateInk-900 shadow-xs transition-colors cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Bottom Center: Camera Focal Views (Stream Selector) */}
      <div className="absolute bottom-6 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-20 flex justify-center">
        <div className="bg-white/90 backdrop-blur-xl p-1.5 rounded-2xl border border-[#DCE2EA] shadow-card flex flex-wrap justify-center gap-1.5 max-w-xl">
          {[
            { id: 'holistic', label: 'Holistic Twin', icon: Layers },
            { id: 'cardiac', label: 'Cardiovascular Stream', icon: Heart },
            { id: 'metabolic', label: 'Lab Biomarkers', icon: Zap },
            { id: 'circadian', label: 'Circadian Orbits', icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-tranquil-600 text-white shadow-soft scale-102'
                    : 'text-slateInk-700 hover:bg-slate-100 hover:text-slateInk-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-softMint-300' : 'text-slateInk-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Left: Interactive Heartbeat BPM Scrubber */}
      <div className="absolute bottom-6 left-5 z-20 hidden md:block">
        <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-[#DCE2EA] shadow-card space-y-2.5 w-64">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slateInk-800 flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-peach-600 animate-pulse-soft" />
              <span>Simulate Cardiac Cadence</span>
            </span>
            <span className="font-mono font-bold text-tranquil-700 text-xs">{pulseBpm} BPM</span>
          </div>

          <input
            type="range"
            min="50"
            max="120"
            step="1"
            value={pulseBpm}
            onChange={(e) => setPulseBpm(Number(e.target.value))}
            className="w-full accent-tranquil-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
          />

          <div className="flex justify-between text-[10px] text-slateInk-400 font-mono">
            <span>50 (Nocturnal)</span>
            <span>72 (Baseline)</span>
            <span>120 (Strain)</span>
          </div>
        </div>
      </div>

      {/* Bottom Right: Call To Action to Unlock Personal Model */}
      <div className="absolute bottom-6 right-5 z-20 hidden lg:block">
        <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-[#DCE2EA] shadow-card space-y-2 max-w-xs text-right">
          <div className="text-[11px] font-semibold text-slateInk-700">
            Ready to calibrate your real telemetry?
          </div>
          <p className="text-[10px] text-slateInk-500 leading-tight">
            Sign up to link Apple Health, Oura, and blood reports to your private encrypted twin.
          </p>
          <button
            onClick={() => onOpenAuth('signup')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-tranquil-600 hover:bg-tranquil-700 text-white text-xs font-semibold shadow-soft transition-all cursor-pointer mt-1"
          >
            <span>Create Account</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Spatial 3D Floating Node Tooltip (when active) */}
      <div className="absolute top-1/2 left-8 -translate-y-1/2 z-20 hidden xl:block pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.3, ease: fluidEase }}
            className="p-4 rounded-2xl bg-white/95 backdrop-blur-xl border border-tranquil-200 shadow-float max-w-xs space-y-2 text-xs"
          >
            <div className="flex items-center space-x-1.5 text-tranquil-700 font-bold uppercase tracking-wider text-[10px]">
              <Sparkles className="w-3 h-3 text-tranquil-600" />
              <span>
                {activeView === 'holistic'
                  ? 'All Streams Correlated'
                  : activeView === 'cardiac'
                  ? 'Resting Pulse & HRV Stream'
                  : activeView === 'metabolic'
                  ? 'Biomarker Extraction OCR'
                  : 'Circadian Core Sleep Nadir'}
              </span>
            </div>

            <p className="text-slateInk-700 leading-relaxed text-[11px]">
              {activeView === 'holistic'
                ? 'Vigil cross-correlates multi-channel biosignals into an interconnected biological graph, catching drift that isolated metrics miss.'
                : activeView === 'cardiac'
                ? 'Monitors nocturnal resting heart rate trajectory and vagal recovery tone, flagging consecutive upward drift.'
                : activeView === 'metabolic'
                ? 'Extracts lipid panels, hs-CRP, and metabolic labs via clinical OCR, anchoring answers in lab baselines.'
                : 'Tracks the nocturnal temperature dip and sleep debt, differentiating acute fatigue from chronic inflammation.'}
            </p>

            <div className="pt-1 text-[10px] font-semibold text-softMint-700 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Grounded in Peer-Reviewed Clinical Standards</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
