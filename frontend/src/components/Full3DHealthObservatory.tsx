import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Moon,
  Zap,
  HeartPulse,
  Maximize2,
  Minimize2,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { fluidEase } from '../animations';

interface Full3DHealthObservatoryProps {
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
}

type StreamMode = 'cardiac' | 'circadian' | 'metabolic';

export default function Full3DHealthObservatory({ onOpenAuth }: Full3DHealthObservatoryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStream, setActiveStream] = useState<StreamMode>('cardiac');
  const [pulseBpm, setPulseBpm] = useState<number>(72);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // References to communicate between React state and Three.js animation loop
  const paramsRef = useRef({
    bpm: 72,
    activeStream: 'cardiac' as StreamMode,
  });

  useEffect(() => {
    paramsRef.current.bpm = pulseBpm;
  }, [pulseBpm]);

  useEffect(() => {
    paramsRef.current.activeStream = activeStream;
  }, [activeStream]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xe8ecef, 0.035);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0.2, 5.0);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // 3. OrbitControls (Smooth, dampened 360° inspection)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 7.0;
    controls.minDistance = 2.4;
    controls.maxPolarAngle = Math.PI / 1.7;
    controls.minPolarAngle = Math.PI / 4.5;
    controls.enablePan = false;

    // 4. Studio Lighting (Clinical, soft, modern)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(4, 6, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(-3, -2, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x4a7bb0, 1.6);
    rimLight.position.set(-4, 3, -4);
    scene.add(rimLight);

    const coreLight = new THREE.PointLight(0xe07e56, 2.5, 5);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);

    // 5. Master 3D Group
    const masterGroup = new THREE.Group();
    scene.add(masterGroup);

    // -----------------------------------------------------------------
    // THE VITAL BIOMETRIC CORE (Minimal, Clinical, Professional)
    // -----------------------------------------------------------------

    // Outer Translucent Glass Biosphere
    const outerSphereGeo = new THREE.SphereGeometry(1.05, 48, 48);
    const outerSphereMat = new THREE.MeshPhysicalMaterial({
      color: 0x4a7bb0,
      roughness: 0.18,
      metalness: 0.05,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      transmission: 0.45,
      transparent: true,
      opacity: 0.5,
    });
    const outerSphere = new THREE.Mesh(outerSphereGeo, outerSphereMat);
    masterGroup.add(outerSphere);

    // Inner Glowing Physiological Core Node
    const innerCoreGeo = new THREE.SphereGeometry(0.58, 32, 32);
    const innerCoreMat = new THREE.MeshStandardMaterial({
      color: 0xe07e56,
      emissive: 0xc8663d,
      emissiveIntensity: 0.55,
      roughness: 0.25,
      metalness: 0.1,
    });
    const innerCore = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    masterGroup.add(innerCore);

    // Concentric Cardiac Pulse Ripple Ring
    const pulseRingGeo = new THREE.TorusGeometry(1.2, 0.008, 16, 64);
    const pulseRingMat = new THREE.MeshBasicMaterial({
      color: 0xe07e56,
      transparent: true,
      opacity: 0.5,
    });
    const pulseRing = new THREE.Mesh(pulseRingGeo, pulseRingMat);
    masterGroup.add(pulseRing);

    // -----------------------------------------------------------------
    // 3 CLEAN TELEMETRY ORBITAL TRACKS
    // -----------------------------------------------------------------

    // Track 1: Cardiovascular Telemetry (Tranquil Blue)
    const track1Geo = new THREE.TorusGeometry(1.6, 0.009, 16, 100);
    const track1Mat = new THREE.MeshBasicMaterial({
      color: 0x4a7bb0,
      transparent: true,
      opacity: 0.55,
    });
    const track1 = new THREE.Mesh(track1Geo, track1Mat);
    track1.rotation.x = Math.PI / 3;
    track1.rotation.y = Math.PI / 8;
    masterGroup.add(track1);

    // Sensor Node orbiting Track 1 (Smartwatch stream)
    const node1Geo = new THREE.SphereGeometry(0.045, 16, 16);
    const node1Mat = new THREE.MeshBasicMaterial({ color: 0x4a7bb0 });
    const node1 = new THREE.Mesh(node1Geo, node1Mat);
    masterGroup.add(node1);

    // Track 2: Circadian Sleep & Recovery (Soft Mint)
    const track2Geo = new THREE.TorusGeometry(1.95, 0.007, 16, 100);
    const track2Mat = new THREE.MeshBasicMaterial({
      color: 0x4a9671,
      transparent: true,
      opacity: 0.45,
    });
    const track2 = new THREE.Mesh(track2Geo, track2Mat);
    track2.rotation.x = -Math.PI / 3.5;
    track2.rotation.y = Math.PI / 4;
    masterGroup.add(track2);

    // Node orbiting Track 2
    const node2Geo = new THREE.SphereGeometry(0.04, 16, 16);
    const node2Mat = new THREE.MeshBasicMaterial({ color: 0x4a9671 });
    const node2 = new THREE.Mesh(node2Geo, node2Mat);
    masterGroup.add(node2);

    // Track 3: Diagnostic Lab Panels (Tranquil Lavender)
    const track3Geo = new THREE.TorusGeometry(2.3, 0.006, 16, 100);
    const track3Mat = new THREE.MeshBasicMaterial({
      color: 0xbaa5e2,
      transparent: true,
      opacity: 0.35,
    });
    const track3 = new THREE.Mesh(track3Geo, track3Mat);
    track3.rotation.x = Math.PI / 2.2;
    track3.rotation.z = Math.PI / 5;
    masterGroup.add(track3);

    // Node orbiting Track 3
    const node3Geo = new THREE.SphereGeometry(0.038, 16, 16);
    const node3Mat = new THREE.MeshBasicMaterial({ color: 0xbaa5e2 });
    const node3 = new THREE.Mesh(node3Geo, node3Mat);
    masterGroup.add(node3);

    // Delicate background constellation (Minimal, 100 particles)
    const particleCount = 100;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const radius = 1.8 + Math.random() * 1.8;
      const theta = THREE.MathUtils.randFloatSpread(360);
      const phi = THREE.MathUtils.randFloatSpread(360);

      particlePositions[i * 3] = radius * Math.sin(theta) * Math.cos(phi);
      particlePositions[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
      particlePositions[i * 3 + 2] = radius * Math.cos(theta);
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x4a7bb0,
      size: 0.025,
      transparent: true,
      opacity: 0.35,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    masterGroup.add(particles);

    // Colors for smooth stream transition
    const cardiacColor = new THREE.Color('#E07E56');
    const circadianColor = new THREE.Color('#4A9671');
    const metabolicColor = new THREE.Color('#BAA5E2');

    // 6. Resize Handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // 7. Animation Loop
    let animId: number;
    const startTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const now = performance.now();
      const elapsed = (now - startTime) * 0.001;
      const currentBpm = paramsRef.current.bpm;
      const bps = currentBpm / 60;

      controls.update();

      // Slow, serene planetary yaw rotation
      masterGroup.rotation.y = elapsed * 0.12;

      // Organic cardiac heartbeat rhythm
      const cycle = (elapsed * bps) % 1;
      let pulseBeat = 0;
      if (cycle < 0.14) {
        pulseBeat = Math.sin((cycle / 0.14) * Math.PI) * 0.14;
      } else if (cycle > 0.18 && cycle < 0.32) {
        pulseBeat = Math.sin(((cycle - 0.18) / 0.14) * Math.PI) * 0.07;
      }

      // Smooth inner core & light pulse
      const coreScale = 1.0 + pulseBeat;
      innerCore.scale.setScalar(coreScale);
      outerSphere.scale.setScalar(1.0 + pulseBeat * 0.35);
      coreLight.intensity = 1.8 + pulseBeat * 3.5;

      // Pulse wave ripple expanding outward
      pulseRing.scale.setScalar(1.0 + cycle * 0.9);
      pulseRingMat.opacity = Math.max(0, (1 - cycle) * 0.45);

      // Orbital rotations for telemetry tracks
      track1.rotation.z = elapsed * 0.25;
      track2.rotation.z = -elapsed * 0.2;
      track3.rotation.y = elapsed * 0.15;

      // Orbiting satellite nodes along tracks
      const a1 = elapsed * 0.6;
      node1.position.x = Math.cos(a1) * 1.6 * Math.cos(Math.PI / 8);
      node1.position.y = Math.sin(a1) * 1.6 * Math.cos(Math.PI / 3);
      node1.position.z = Math.sin(a1) * 1.6 * Math.sin(Math.PI / 3);

      const a2 = -elapsed * 0.5;
      node2.position.x = Math.cos(a2) * 1.95 * Math.cos(Math.PI / 4);
      node2.position.y = Math.sin(a2) * 1.95 * Math.cos(-Math.PI / 3.5);
      node2.position.z = Math.sin(a2) * 1.95 * Math.sin(-Math.PI / 3.5);

      const a3 = elapsed * 0.4;
      node3.position.x = Math.cos(a3) * 2.3 * Math.cos(Math.PI / 5);
      node3.position.y = Math.sin(a3) * 2.3 * Math.sin(Math.PI / 2.2);
      node3.position.z = Math.sin(a3) * 2.3 * Math.cos(Math.PI / 2.2);

      // Smooth color interpolation based on active stream
      const targetColor =
        paramsRef.current.activeStream === 'circadian'
          ? circadianColor
          : paramsRef.current.activeStream === 'metabolic'
          ? metabolicColor
          : cardiacColor;

      innerCoreMat.color.lerp(targetColor, 0.05);

      // Particles gentle breathing
      particles.rotation.y = -elapsed * 0.08;

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
      outerSphereGeo.dispose();
      outerSphereMat.dispose();
      innerCoreGeo.dispose();
      innerCoreMat.dispose();
      pulseRingGeo.dispose();
      pulseRingMat.dispose();
      track1Geo.dispose();
      track1Mat.dispose();
      track2Geo.dispose();
      track2Mat.dispose();
      track3Geo.dispose();
      track3Mat.dispose();
      node1Geo.dispose();
      node1Mat.dispose();
      node2Geo.dispose();
      node2Mat.dispose();
      node3Geo.dispose();
      node3Mat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, []);

  return (
    <div
      className={`relative w-full rounded-3xl overflow-hidden border border-[#DCE2EA] shadow-float bg-gradient-to-b from-white via-[#F8FAFC] to-[#E8ECEF] transition-all duration-500 ${
        isFullscreen
          ? 'fixed inset-4 z-50 rounded-2xl shadow-2xl'
          : 'min-h-[580px] sm:min-h-[660px]'
      }`}
    >
      {/* 3D WebGL Canvas Layer */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-0"
      />

      {/* Top Left: Clean, Minimal Title */}
      <div className="absolute top-5 left-5 z-20 space-y-1.5 pointer-events-none">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-[#DCE2EA] shadow-xs text-xs">
          <div className="w-2 h-2 rounded-full bg-softMint-500 animate-ping" />
          <span className="font-semibold text-slateInk-900 tracking-wider font-mono text-[10px] uppercase">
            3D Physiological Core
          </span>
          <span className="text-slateInk-300">•</span>
          <span className="text-[10px] text-tranquil-700 font-medium">Live Telemetry</span>
        </div>

        <h3 className="font-serif text-2xl sm:text-3xl font-normal text-slateInk-900 drop-shadow-xs">
          How Vigil Maps Your Biology
        </h3>
        <p className="text-xs text-slateInk-600 max-w-sm drop-shadow-xs">
          Drag to inspect 360°. Continuous wearable telemetry harmonized with clinical laboratory records.
        </p>
      </div>

      {/* Top Right: Fullscreen Button */}
      <div className="absolute top-5 right-5 z-20">
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2.5 rounded-2xl bg-white/85 hover:bg-white backdrop-blur-md border border-[#DCE2EA] text-slateInk-700 hover:text-slateInk-900 shadow-xs transition-colors cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Bottom Center: Minimal 3-Stream Selector */}
      <div className="absolute bottom-6 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-20 flex justify-center">
        <div className="bg-white/95 backdrop-blur-xl p-1.5 rounded-2xl border border-[#DCE2EA] shadow-card flex items-center gap-1.5">
          {[
            { id: 'cardiac' as StreamMode, label: 'Cardiac Rhythm', icon: Heart },
            { id: 'circadian' as StreamMode, label: 'Sleep Recovery', icon: Moon },
            { id: 'metabolic' as StreamMode, label: 'Lab Biomarkers', icon: Zap },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeStream === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveStream(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slateInk-900 text-white shadow-soft scale-102'
                    : 'text-slateInk-700 hover:bg-slate-100 hover:text-slateInk-900'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive ? 'text-softMint-300' : 'text-slateInk-500'
                  }`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Left: Cardiac Cadence Slider */}
      <div className="absolute bottom-6 left-5 z-20 hidden md:block">
        <div className="p-3.5 rounded-2xl bg-white/90 backdrop-blur-xl border border-[#DCE2EA] shadow-card space-y-2 w-56">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slateInk-800 flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-peach-600 animate-pulse-soft" />
              <span>Simulate Cadence</span>
            </span>
            <span className="font-mono font-bold text-tranquil-700 text-xs">{pulseBpm} BPM</span>
          </div>

          <input
            type="range"
            min="50"
            max="110"
            step="1"
            value={pulseBpm}
            onChange={(e) => setPulseBpm(Number(e.target.value))}
            className="w-full accent-tranquil-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
          />

          <div className="flex justify-between text-[9px] text-slateInk-400 font-mono">
            <span>50 Rest</span>
            <span>72 Baseline</span>
            <span>110 Active</span>
          </div>
        </div>
      </div>

      {/* Bottom Right: Quick Action Button */}
      <div className="absolute bottom-6 right-5 z-20 hidden sm:block">
        <button
          onClick={() => onOpenAuth('signup')}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-white/95 hover:bg-white backdrop-blur-xl border border-[#DCE2EA] text-slateInk-900 hover:text-tranquil-700 text-xs font-semibold shadow-card transition-all cursor-pointer"
        >
          <span>Connect Your Telemetry</span>
          <ArrowRight className="w-3.5 h-3.5 text-tranquil-600" />
        </button>
      </div>

      {/* Floating Single Minimal Pill (Top-Right of center) */}
      <div className="absolute top-20 right-5 z-20 hidden lg:block pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStream}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: fluidEase }}
            className="p-3.5 rounded-2xl bg-white/95 backdrop-blur-xl border border-[#DCE2EA] shadow-float max-w-xs space-y-1.5 text-xs"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slateInk-900">
              <span>
                {activeStream === 'cardiac'
                  ? 'Cardiovascular Stream'
                  : activeStream === 'circadian'
                  ? 'Circadian Sleep Nadir'
                  : 'Diagnostic Lab Ingestion'}
              </span>
              <span className="font-mono text-softMint-700 font-semibold">
                {activeStream === 'cardiac'
                  ? `${pulseBpm} BPM`
                  : activeStream === 'circadian'
                  ? '36.2 °C'
                  : 'Optimal'}
              </span>
            </div>

            <p className="text-[11px] text-slateInk-600 leading-snug">
              {activeStream === 'cardiac'
                ? 'Passive resting heart rate & HRV trajectory tracking to catch subtle physiological drift early.'
                : activeStream === 'circadian'
                ? 'Monitors nocturnal core temperature dips and deep sleep latency to assess authentic autonomic recovery.'
                : 'OCR extraction of clinical blood panels (hs-CRP, lipid profiles, glucose) with zero hallucinations.'}
            </p>

            <div className="pt-1 text-[10px] font-medium text-softMint-700 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-softMint-600" />
              <span>Normal Sinus Baseline • Encrypted</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
