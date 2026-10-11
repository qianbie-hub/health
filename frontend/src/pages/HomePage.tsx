import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Activity,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  FileText,
  Users,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cpu,
  Layers,
  HeartPulse,
  Check,
  Stethoscope,
  Info,
  Lock,
  Zap,
  Database,
  Flame,
  Award,
  Sliders,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import { microSpring, fluidEase, materializeVariant, fadeUpVariant } from '../animations';
import Biometric3DCanvas from '../components/Biometric3DCanvas';
import Card3DTilt from '../components/Card3DTilt';
import Full3DHealthObservatory from '../components/Full3DHealthObservatory';
import LiquidNegateCursor from '../components/LiquidNegateCursor';

interface HomePageProps {
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
}

export default function HomePage({ onOpenAuth }: HomePageProps) {
  // Global Color Negate / Bio-Spectral Inversion Mode
  const [isNegateMode, setIsNegateMode] = useState(false);

  // Interactive Color Negate X-Ray Slider position (0 - 100)
  const [xRayPosition, setXRayPosition] = useState(54);

  // Interactive Product Architecture Tab (Showcasing how the platform works for any user)
  const [activeFeatureTab, setActiveFeatureTab] = useState<'wearables' | 'ocr' | 'drift' | 'care'>('wearables');

  // FAQ Accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Pricing Billing cycle state
  const [isAnnualBilling, setIsAnnualBilling] = useState(true);

  // Interactive 3D Simulation toggle for the Hero
  const [active3DMode, setActive3DMode] = useState<'vital' | 'molecular' | 'orbital'>('vital');

  // Platform capabilities data (Universal, product-focused)
  const featureTabs = {
    wearables: {
      badge: 'STREAM 1: CONTINUOUS SENSORS',
      title: 'Real-Time Telemetry Without Device Fatigue',
      description:
        'Vigil syncs passively with your Apple Watch, Oura Ring, Whoop, or Garmin. It tracks resting heart rate, heart rate variability (HRV), peripheral temperature trends, and nocturnal recovery cycles in real time without draining your battery.',
      metric1Label: 'Sensor Telemetry',
      metric1Val: '24/7 Passive Stream',
      metric2Label: 'Baseline Calibration',
      metric2Val: '90-Day Moving Window',
      points: [
        'Passive background sync via HealthKit and Cloud APIs',
        'Circadian body temperature drift analysis',
        'Autonomic sympathetic vs. parasympathetic tone balance',
        'Sleep stage architecture (Deep, REM, Latency)'
      ]
    },
    ocr: {
      badge: 'STREAM 2: OPTICAL LAB EXTRACTION',
      title: 'Instant Ingestion of Clinical Blood Panels & ECGs',
      description:
        'Simply snap a smartphone photo or drop a PDF of your diagnostic lab reports. Vigil uses high-precision clinical OCR to extract every biomarker, unit, and reference interval, categorizing metabolic, lipid, and inflammatory health markers automatically.',
      metric1Label: 'Extraction Precision',
      metric1Val: '99.8% Token Accuracy',
      metric2Label: 'Supported Formats',
      metric2Val: 'PDF, JPG, DICOM, FHIR',
      points: [
        'Automatic reference range boundary parsing',
        'Instant flagging of out-of-range indicators (hs-CRP, LDL, HbA1c)',
        'Historical cross-matching with previous lab panels',
        'Local on-device encryption before processing'
      ]
    },
    drift: {
      badge: 'STREAM 3: PREDICTIVE PATTERN ENGINE',
      title: 'Multi-Day Drift Detection Days Before Flare-Ups',
      description:
        'Isolated daily vitals mislead; sustained physiological drift reveals the truth. Vigil correlates subtle multi-day shifts—such as a 4-day heart rate creep coupled with shortened sleep and sub-febrile temperature—giving you proactive clarity.',
      metric1Label: 'Predictive Horizon',
      metric1Val: '8 to 14 Days Early',
      metric2Label: 'Clinical Grounding',
      metric2Val: 'Zero AI Hallucinations',
      points: [
        'Correlates blood panel biomarkers with continuous wearable streams',
        'Differentiates acute stress spikes from chronic physiological strain',
        'Answers backed strictly by peer-reviewed clinical citations',
        'Generates 1-page pre-visit summary briefs for your doctor'
      ]
    },
    care: {
      badge: 'STREAM 4: CARE CIRCLE & SAFETY DIRECTIVES',
      title: 'Protect Loved Ones & Empower Physicians',
      description:
        'Share peace of mind with family members or your primary care physician. Set granular permission tiers—from morning wellness digest checks to full emergency proxy passes with high-contrast Medical ICE cards for first responders.',
      metric1Label: 'Emergency Dispatch',
      metric1Val: 'One-Tap ICE Directives',
      metric2Label: 'Physician Portal',
      metric2Val: 'Exportable FHIR Briefs',
      points: [
        'Family check-in digests without invasive micro-monitoring',
        'Printable high-contrast Emergency Medical ID with QR code',
        'Direct caregiver notification if vital thresholds cross safety limits',
        'Pre-formatted doctor appointment discussion briefs'
      ]
    }
  };

  const currentTab = featureTabs[activeFeatureTab];

  // Frequently Asked Questions (Universal product questions)
  const faqs = [
    {
      q: 'What is Vigil and how does it work?',
      a: 'Vigil is an AI-powered personal health companion designed to bridge the gap between continuous wearable data (smartwatches, rings) and episodic medical records (blood tests, prescriptions, ECGs). By continuously analyzing your vitals against your personal 90-day baseline and lab findings, Vigil identifies subtle multi-day physiological patterns before they manifest as acute symptoms.'
    },
    {
      q: 'Do I need to sign up to use Vigil?',
      a: 'Yes. Because Vigil securely links private personal telemetry from your wearables and parses sensitive clinical laboratory reports, an encrypted personal account is required to calibrate your baseline, store your records, and view your private dashboard.'
    },
    {
      q: 'Does Vigil replace my doctor or diagnose medical conditions?',
      a: 'No. Vigil is built on strict clinical safety principles. It does not diagnose illnesses or replace emergency medical care. Instead, it provides you with clear, evidence-grounded insights and generates formatted 1-page summaries so you can walk into appointments with your physician fully prepared.'
    },
    {
      q: 'How does Vigil prevent AI hallucinations in medical questions?',
      a: 'Generic conversational AI often hallucinates medical advice. Vigil eliminates this by strictly restricting its reasoning engine to peer-reviewed clinical literature (such as the American Heart Association and endocrine guidelines) and your actual verified laboratory records. Every answer includes expandable clinical source citations.'
    },
    {
      q: 'Is my health data private and HIPAA-compliant?',
      a: 'Yes. Vigil adheres to strict HIPAA security principles. All biometric streams, laboratory documents, and health notes are encrypted using AES-256 at rest and TLS 1.3 in transit. We never sell health telemetry to third-party advertisers or insurance data brokers.'
    },
    {
      q: 'Which wearables and devices are supported?',
      a: 'Vigil connects seamlessly with Apple HealthKit, Oura Ring, WHOOP, Garmin Connect, Withings smart scales, Dexcom continuous glucose monitors, and standard FHIR/EHR patient portal exports.'
    }
  ];

  return (
    <div
      className={`min-h-screen font-sans selection:bg-tranquil-100 selection:text-tranquil-900 relative overflow-x-hidden fluid-transition ${
        isNegateMode ? 'sensory-negate-active text-white' : 'bg-[#E8ECEF] text-slateInk-900'
      }`}
    >
      {/* Interactive Liquid Color-Negate Cursor Follower */}
      <LiquidNegateCursor />

      {/* ==================== FLUID MORPHING AMBIENT AURORAS ==================== */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Liquid Morphing Organic Blobs */}
        <div className="absolute -top-40 left-1/4 w-[650px] h-[650px] rounded-full bg-gradient-to-br from-tranquil-200/40 via-tranquil-300/20 to-transparent blur-[130px] animate-liquid-morph" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-softMint-200/35 via-softMint-100/20 to-transparent blur-[140px] animate-aurora-2" />
        <div className="absolute bottom-1/4 -left-32 w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-lavender-200/30 via-peach-100/20 to-transparent blur-[130px] animate-aurora-3" />
        <div className="absolute inset-0 subtle-biometric-grid opacity-60" />
      </div>

      {/* ==================== STICKY FLOATING GLASS NAVBAR ==================== */}
      <header className="sticky top-0 z-40 px-3 sm:px-6 lg:px-12 py-3 backdrop-blur-xl bg-white/75 border-b border-[#DCE2EA]/80 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="relative">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-tranquil-600 to-tranquil-700 text-white flex items-center justify-center shadow-soft animate-breathe">
                <HeartPulse className="w-5 h-5" />
              </div>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-softMint-500 animate-ping" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-softMint-500" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif text-2xl font-normal tracking-tight text-slateInk-900 leading-none">
                  Vigil
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-softMint-100 text-softMint-800 text-[10px] font-semibold tracking-wide border border-softMint-200">
                  HEALTH INTELLIGENCE
                </span>
              </div>
              <span className="text-[11px] text-slateInk-500 font-sans tracking-wide block">
                Continuous Telemetry × Clinical OCR
              </span>
            </div>
          </div>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center space-x-1 font-medium text-xs text-slateInk-600 bg-white/60 p-1 rounded-2xl border border-[#DCE2EA]">
            <a href="#observatory-3d" className="px-3.5 py-1.5 rounded-xl hover:text-slateInk-900 hover:bg-white transition-all font-semibold text-tranquil-700">
              3D Observatory
            </a>
            <a href="#color-negate-lens" className="px-3.5 py-1.5 rounded-xl hover:text-slateInk-900 hover:bg-white transition-all">
              Spectral Negate
            </a>
            <a href="#architecture" className="px-3.5 py-1.5 rounded-xl hover:text-slateInk-900 hover:bg-white transition-all">
              Platform Architecture
            </a>
            <a href="#security" className="px-3.5 py-1.5 rounded-xl hover:text-slateInk-900 hover:bg-white transition-all">
              HIPAA Vault
            </a>
            <a href="#pricing" className="px-3.5 py-1.5 rounded-xl hover:text-slateInk-900 hover:bg-white transition-all">
              Membership
            </a>
            <a href="#faq" className="px-3.5 py-1.5 rounded-xl hover:text-slateInk-900 hover:bg-white transition-all">
              FAQ
            </a>
          </nav>

          {/* Action CTAs & Color Negate Toggle */}
          <div className="flex items-center space-x-2.5">
            {/* Color Negate Mode Toggle Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsNegateMode(!isNegateMode)}
              title="Toggle Color Negate & Bio-Luminescence Mode"
              className={`px-3 py-2 rounded-2xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                isNegateMode
                  ? 'bg-amber-400 text-slateInk-900 shadow-card animate-pulse-soft'
                  : 'bg-white hover:bg-slate-50 text-slateInk-700 border border-[#DCE2EA] shadow-xs'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-tranquil-600" />
              <span className="hidden sm:inline">{isNegateMode ? 'Inverted Active' : 'Color Negate'}</span>
            </motion.button>

            <button
              onClick={() => onOpenAuth('signin')}
              className="px-3.5 py-2 rounded-2xl text-xs font-semibold text-slateInk-700 hover:text-slateInk-900 hover:bg-white/80 transition-all border border-transparent hover:border-[#DCE2EA] cursor-pointer"
            >
              Sign In
            </button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={microSpring}
              onClick={() => onOpenAuth('signup')}
              className="inline-flex items-center space-x-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl bg-gradient-to-r from-tranquil-600 via-tranquil-700 to-slateInk-900 hover:from-tranquil-700 hover:to-slateInk-900 text-white text-xs sm:text-sm font-semibold shadow-soft hover:shadow-card transition-all cursor-pointer glow-beacon-tranquil"
            >
              <Sparkles className="w-4 h-4 text-softMint-300" />
              <span>Get Started Free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>

        </div>
      </header>

      {/* ==================== HERO SECTION: APPEAR OUT OF NOWHERE MATERIALIZATION ==================== */}
      <section className="relative z-10 pt-10 pb-16 sm:pt-16 sm:pb-24 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Materializing Value Proposition */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={materializeVariant}
            className="lg:col-span-7 space-y-6 text-center lg:text-left"
          >
            
            {/* Top Category Badge (Materializes out of thin air) */}
            <motion.div
              variants={fadeUpVariant}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-tranquil-200/90 shadow-xs backdrop-blur-md"
            >
              <span className="w-2 h-2 rounded-full bg-softMint-500 animate-ping" />
              <span className="text-xs font-semibold text-slateInk-800 tracking-wide">
                Next-Gen Health AI • 3D Biometric Engine
              </span>
              <span className="text-slateInk-300">•</span>
              <span className="text-[11px] font-medium text-tranquil-700 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-tranquil-600" />
                Continuous Telemetry × Lab OCR
              </span>
            </motion.div>

            {/* Main Editorial Headline with Shimmer */}
            <motion.h1
              variants={fadeUpVariant}
              className="font-serif text-4xl sm:text-6xl lg:text-7xl font-normal tracking-tight text-slateInk-900 leading-[1.08]"
            >
              Your body speaks in whispers.{' '}
              <span className="font-serif italic font-normal text-gradient-shimmer block sm:inline">
                Vigil understands them
              </span>{' '}
              before symptoms sound alarms.
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={fadeUpVariant}
              className="text-base sm:text-lg text-slateInk-600 max-w-2xl mx-auto lg:mx-0 font-sans leading-relaxed"
            >
              The AI health companion that bridges continuous wearable sensor feeds with clinical laboratory diagnostics. Detect subtle multi-day physiological drift, receive verifiable medical reasoning, and keep loved ones safe.
            </motion.p>

            {/* Action Buttons: Sign Up / Sign In */}
            <motion.div
              variants={fadeUpVariant}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2"
            >
              {/* Liquid Shimmer Glowing CTA Button */}
              <div className="relative p-0.5 rounded-2xl liquid-shimmer-border">
                <button
                  onClick={() => onOpenAuth('signup')}
                  className="inline-flex items-center space-x-2.5 px-6 py-3.5 rounded-2xl bg-slateInk-900 hover:bg-slateInk-800 text-white font-semibold text-sm shadow-card hover:shadow-float transition-all transform active:scale-98 cursor-pointer"
                >
                  <Activity className="w-4 h-4 text-softMint-300" />
                  <span>Start Your Health Vigil</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <a
                href="#observatory-3d"
                className="inline-flex items-center space-x-2 px-5 py-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-[#DCE2EA] text-slateInk-800 font-semibold text-sm shadow-xs transition-all card-hover-effect cursor-pointer"
              >
                <Cpu className="w-4 h-4 text-tranquil-600" />
                <span>Launch 3D Screen</span>
              </a>

              <button
                onClick={() => onOpenAuth('signin')}
                className="inline-flex items-center space-x-2 px-5 py-3.5 rounded-2xl bg-white/70 hover:bg-white border border-[#DCE2EA] text-slateInk-700 font-semibold text-sm shadow-xs transition-all cursor-pointer"
              >
                <span>Existing User? Sign In</span>
              </button>
            </motion.div>

            {/* Trust Wall Badges */}
            <motion.div
              variants={fadeUpVariant}
              className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-5 text-xs text-slateInk-500 font-medium"
            >
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-softMint-600" />
                <span>HIPAA Encrypted Vault</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-tranquil-600" />
                <span>99.8% Medical Tokenization</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-lavender-500" />
                <span>Zero AI Hallucinations</span>
              </span>
            </motion.div>

          </motion.div>

          {/* Right Column: Interactive 3D WebGL Biometric Holographic Sphere */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={materializeVariant}
            id="platform-3d"
            className="lg:col-span-5 relative"
          >
            <Card3DTilt intensity={14} className="rounded-3xl">
              <div className="relative rounded-3xl overflow-hidden border border-[#DCE2EA] shadow-float bg-gradient-to-b from-white/95 to-[#F1F5F9]/90 backdrop-blur-xl p-4 sm:p-6">
                
                {/* 3D Interactive Header Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-[#DCE2EA]">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-softMint-500 animate-ping" />
                    <span className="text-[11px] font-semibold tracking-wider uppercase text-slateInk-700 font-mono">
                      3D BIOMETRIC NEURAL CORE
                    </span>
                  </div>

                  {/* 3D Mode Toggles */}
                  <div className="flex bg-[#E8ECEF] p-0.5 rounded-xl text-[10px] font-semibold">
                    <button
                      onClick={() => setActive3DMode('vital')}
                      className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                        active3DMode === 'vital' ? 'bg-white text-slateInk-900 shadow-xs' : 'text-slateInk-500'
                      }`}
                    >
                      Sensors
                    </button>
                    <button
                      onClick={() => setActive3DMode('molecular')}
                      className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                        active3DMode === 'molecular' ? 'bg-white text-slateInk-900 shadow-xs' : 'text-slateInk-500'
                      }`}
                    >
                      Molecules
                    </button>
                    <button
                      onClick={() => setActive3DMode('orbital')}
                      className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                        active3DMode === 'orbital' ? 'bg-white text-slateInk-900 shadow-xs' : 'text-slateInk-500'
                      }`}
                    >
                      Orbits
                    </button>
                  </div>
                </div>

                {/* The 3D WebGL Canvas */}
                <div className="relative w-full h-[340px] sm:h-[400px] flex items-center justify-center">
                  <Biometric3DCanvas className="w-full h-full" />

                  {/* Overlay 3D Floating Hologram Pill */}
                  <div className="absolute top-4 left-4 p-2.5 rounded-2xl bg-white/90 backdrop-blur-md border border-[#DCE2EA] shadow-xs text-xs space-y-0.5 pointer-events-none">
                    <div className="flex items-center space-x-1.5 text-tranquil-700 font-semibold text-[10px]">
                      <Heart className="w-3 h-3 text-peach-600 fill-current animate-pulse-soft" />
                      <span>Circadian Pulse Model</span>
                    </div>
                    <div className="text-[11px] font-medium text-slateInk-800">
                      70 bpm Resting Cadence
                    </div>
                  </div>

                  {/* Overlay 3D Floating Sensor Ring Badge */}
                  <div className="absolute bottom-4 right-4 p-2.5 rounded-2xl bg-white/90 backdrop-blur-md border border-softMint-200 shadow-xs text-xs space-y-0.5 pointer-events-none">
                    <div className="flex items-center space-x-1.5 text-softMint-700 font-semibold text-[10px]">
                      <Sparkles className="w-3 h-3 text-softMint-600" />
                      <span>90-Day Calibration</span>
                    </div>
                    <div className="text-[11px] font-medium text-slateInk-800">
                      Personalized Baseline
                    </div>
                  </div>
                </div>

                {/* Subtitle Under 3D Canvas */}
                <div className="pt-3 border-t border-[#DCE2EA] flex items-center justify-between text-[11px] text-slateInk-500">
                  <span>Interactive 3D WebGL • Move mouse to rotate perspective</span>
                  <span className="font-semibold text-tranquil-600">60 FPS Render</span>
                </div>

              </div>
            </Card3DTilt>
          </motion.div>

        </div>
      </section>

      {/* ==================== WHOLE 3D SCREEN: VIGIL SPATIAL BIOMETRIC OBSERVATORY ==================== */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={materializeVariant}
        id="observatory-3d"
        className="relative z-10 py-12 sm:py-20 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto"
      >
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-softMint-100 text-softMint-800 text-xs font-semibold border border-softMint-200">
            <HeartPulse className="w-3.5 h-3.5 text-softMint-600 animate-pulse-soft" />
            <span>INTERACTIVE 3D PLATFORM SCREEN</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-5xl font-normal text-slateInk-900">
            The 3D Physiological Digital Twin
          </h2>
          <p className="text-sm text-slateInk-600 leading-relaxed">
            Drag to orbit 360°, inspect anatomical biomarker nodes, simulate cardiac cadence, and explore how Vigil unifies continuous wearable streams with diagnostic clinical laboratory reports.
          </p>
        </div>

        {/* Full-Screen 3D Interactive Observatory */}
        <Full3DHealthObservatory onOpenAuth={onOpenAuth} />
      </motion.section>

      {/* ==================== INTERACTIVE COLOR NEGATE & SENSORY FLUOROSCOPY STAGE ==================== */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={materializeVariant}
        id="color-negate-lens"
        className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto"
      >
        <div className="bg-gradient-to-br from-white via-[#F8FAFC] to-[#F0F5FA] border border-[#DCE2EA] rounded-3xl p-6 sm:p-12 shadow-float">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left: Explaining the Color Negate / Bio-Fluoroscopy Principle */}
            <div className="lg:col-span-5 space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-200">
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-700" />
                <span>COLOR NEGATE & BIO-SPECTRAL VISION</span>
              </div>

              <h2 className="font-serif text-3xl sm:text-4xl font-normal text-slateInk-900">
                Negate The Noise. Reveal Sub-Surface Biological Drift.
              </h2>

              <p className="text-xs sm:text-sm text-slateInk-600 leading-relaxed">
                Just as clinical fluoroscopy inverts optical light to isolate micro-vascular blockages, Vigil's neural vision negates statistical noise in raw wearable streams to expose sustained baseline shifts before symptoms manifest.
              </p>

              {/* Slider Control */}
              <div className="p-4 rounded-2xl bg-white border border-[#DCE2EA] space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slateInk-800">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-tranquil-600" />
                    <span>Drag Negate Lens Divider</span>
                  </span>
                  <span className="font-mono text-tranquil-700">{xRayPosition}% Spectral Invert</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={xRayPosition}
                  onChange={(e) => setXRayPosition(Number(e.target.value))}
                  className="w-full accent-tranquil-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slateInk-400 font-mono">
                  <span>Standard Spectrum (0%)</span>
                  <span>Full Negate Inversion (100%)</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setIsNegateMode(!isNegateMode)}
                  className="px-5 py-2.5 rounded-2xl bg-slateInk-900 hover:bg-slateInk-800 text-white text-xs font-semibold transition-all shadow-card flex items-center space-x-2 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isNegateMode ? 'Disable Global Negate Mode' : 'Toggle Full-Site Color Negate Mode'}</span>
                </button>
              </div>
            </div>

            {/* Right: Interactive Split-View Negate Stage */}
            <div className="lg:col-span-7">
              <div className="relative rounded-3xl overflow-hidden border border-[#DCE2EA] shadow-card bg-slateInk-900 min-h-[360px] sm:min-h-[420px] select-none">
                
                {/* Layer 1: Normal Standard Spectrum Graphic */}
                <div className="absolute inset-0 flex items-center justify-center p-6 bg-gradient-to-br from-[#18202A] via-[#263240] to-[#18202A] text-white">
                  <div className="w-full space-y-4">
                    <div className="flex items-center justify-between text-xs pb-3 border-b border-white/10">
                      <span className="font-mono text-softMint-300 font-semibold">NORMAL COLOR SPECTRUM</span>
                      <span className="text-white/60">Standard Wearable Photoplethysmography</span>
                    </div>

                    <div className="h-28 flex items-center justify-center">
                      <svg className="w-full h-20" viewBox="0 0 400 80" fill="none">
                        <path
                          d="M0 40 Q50 40 70 20 T110 40 T150 10 T170 70 T190 35 T220 40 T270 40 T290 20 T330 40 T400 40"
                          stroke="#4A7BB0"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-xl bg-white/10">RHR: 70 bpm</div>
                      <div className="p-2.5 rounded-xl bg-white/10">Sleep: 6.8h</div>
                      <div className="p-2.5 rounded-xl bg-white/10">Baseline: Calibrated</div>
                    </div>
                  </div>
                </div>

                {/* Layer 2: Color-Negated Inverted Bio-Spectral Scan (Masked by xRayPosition) */}
                <div
                  className="absolute inset-0 flex items-center justify-center p-6 bg-gradient-to-br from-[#18202A] via-[#263240] to-[#18202A] text-white pointer-events-none"
                  style={{
                    clipPath: `polygon(0 0, ${xRayPosition}% 0, ${xRayPosition}% 100%, 0% 100%)`,
                    filter: 'invert(1) hue-rotate(180deg)',
                  }}
                >
                  <div className="w-full space-y-4">
                    <div className="flex items-center justify-between text-xs pb-3 border-b border-black/20">
                      <span className="font-mono text-purple-900 font-bold">NEGATED BIO-SPECTRAL INVERSION</span>
                      <span className="text-black/70">Sub-surface Vascular Density Isolated</span>
                    </div>

                    <div className="h-28 flex items-center justify-center">
                      <svg className="w-full h-20" viewBox="0 0 400 80" fill="none">
                        <path
                          d="M0 40 Q50 40 70 20 T110 40 T150 10 T170 70 T190 35 T220 40 T270 40 T290 20 T330 40 T400 40"
                          stroke="#E07E56"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                      <div className="p-2.5 rounded-xl bg-black/10">RHR Drift: +9 bpm</div>
                      <div className="p-2.5 rounded-xl bg-black/10">hs-CRP: 3.4 mg/L</div>
                      <div className="p-2.5 rounded-xl bg-black/10">Vagal Tone: Suppressed</div>
                    </div>
                  </div>
                </div>

                {/* The Divider Line with Drag Grip */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-30 shadow-[0_0_12px_#22d3ee] pointer-events-none"
                  style={{ left: `${xRayPosition}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white border-2 border-cyan-400 text-slateInk-900 flex items-center justify-center shadow-float font-bold text-xs">
                    ⟷
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </motion.section>

      {/* ==================== 4-PILLAR ARCHITECTURE PLATFORM SHOWCASE ==================== */}
      <section id="architecture" className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-tranquil-100 text-tranquil-800 text-xs font-semibold border border-tranquil-200">
            <Layers className="w-3.5 h-3.5 text-tranquil-600" />
            <span>HOW VIGIL OPERATES</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-5xl font-normal text-slateInk-900">
            A Unified Biological Intelligence System
          </h2>
          <p className="text-sm text-slateInk-600 leading-relaxed">
            Every component is engineered to provide grounded medical truth rather than isolated scores or alarmist notifications.
          </p>

          {/* Interactive Stream Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
            {[
              { id: 'wearables', label: '1. Continuous Sensors', icon: Activity },
              { id: 'ocr', label: '2. Optical Lab OCR', icon: FileText },
              { id: 'drift', label: '3. Multi-Day Drift Engine', icon: Flame },
              { id: 'care', label: '4. Care Circle & Safety', icon: Users },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeFeatureTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFeatureTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slateInk-900 text-white shadow-card scale-102'
                      : 'bg-white hover:bg-slate-50 text-slateInk-600 border border-[#DCE2EA]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-softMint-400' : 'text-slateInk-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Architecture Showcase Card */}
        <div className="bg-white/90 backdrop-blur-xl border border-[#DCE2EA] rounded-3xl p-6 sm:p-10 shadow-card">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left: Stream Information */}
            <div className="lg:col-span-7 space-y-5">
              <span className="inline-block px-3 py-1 rounded-full bg-tranquil-50 text-tranquil-800 text-xs font-semibold border border-tranquil-200">
                {currentTab.badge}
              </span>

              <h3 className="font-serif text-2xl sm:text-3xl font-normal text-slateInk-900">
                {currentTab.title}
              </h3>

              <p className="text-xs sm:text-sm text-slateInk-600 leading-relaxed">
                {currentTab.description}
              </p>

              {/* Bullet checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {currentTab.points.map((pt, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-xs text-slateInk-700">
                    <CheckCircle2 className="w-4 h-4 text-softMint-600 shrink-0 mt-0.5" />
                    <span>{pt}</span>
                  </div>
                ))}
              </div>

              {/* Action */}
              <div className="pt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => onOpenAuth('signup')}
                  className="px-5 py-2.5 rounded-2xl bg-tranquil-600 hover:bg-tranquil-700 text-white text-xs font-semibold shadow-soft transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <span>Sign Up to Unlock This Stream</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right: Technical Metric Cards */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA] space-y-1 negate-on-hover cursor-pointer">
                <div className="text-[11px] font-semibold text-slateInk-500 uppercase tracking-wider">
                  {currentTab.metric1Label}
                </div>
                <div className="font-serif text-2xl font-normal text-slateInk-900">
                  {currentTab.metric1Val}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA] space-y-1 negate-on-hover cursor-pointer">
                <div className="text-[11px] font-semibold text-slateInk-500 uppercase tracking-wider">
                  {currentTab.metric2Label}
                </div>
                <div className="font-serif text-2xl font-normal text-slateInk-900">
                  {currentTab.metric2Val}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-softMint-50 border border-softMint-200 text-softMint-800 text-xs flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-softMint-600 shrink-0" />
                <span>Protected by AES-256 encryption & strictly confidential user isolation.</span>
              </div>
            </div>

          </div>
        </div>

        {/* 3D Tilted Feature Bento Grid Cards with "Appear Out of Nowhere" Materialization */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-10">
          
          {/* Card 1 */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={materializeVariant}
          >
            <Card3DTilt intensity={10}>
              <div className="glass-card-interactive p-7 rounded-3xl space-y-4 flex flex-col justify-between h-full">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-tranquil-100 text-tranquil-600 flex items-center justify-center border border-tranquil-200">
                    <Activity className="w-6 h-6 animate-pulse-soft" />
                  </div>
                  <h4 className="font-serif text-xl font-normal text-slateInk-900">
                    Continuous Wearable Telemetry
                  </h4>
                  <p className="text-xs text-slateInk-600 leading-relaxed">
                    Passive ingestion of photoplethysmography, heart rate variability, and wrist circadian skin temperature.
                  </p>
                </div>
                <div className="pt-2 text-[11px] font-semibold text-tranquil-700 flex items-center gap-1">
                  <span>Requires account calibration</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </Card3DTilt>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={materializeVariant}
          >
            <Card3DTilt intensity={10}>
              <div className="glass-card-interactive p-7 rounded-3xl space-y-4 flex flex-col justify-between h-full">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-softMint-100 text-softMint-700 flex items-center justify-center border border-softMint-200">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h4 className="font-serif text-xl font-normal text-slateInk-900">
                    Clinical Document OCR Ingestion
                  </h4>
                  <p className="text-xs text-slateInk-600 leading-relaxed">
                    Extracts lab panels, lipid panels, prescription slips, and ECG rhythm strips with reference interval tokenization.
                  </p>
                </div>
                <div className="pt-2 text-[11px] font-semibold text-softMint-700 flex items-center gap-1">
                  <span>Supports PDF, Scans & EHR</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </Card3DTilt>
          </motion.div>

          {/* Card 3 */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={materializeVariant}
          >
            <Card3DTilt intensity={10}>
              <div className="glass-card-interactive p-7 rounded-3xl space-y-4 flex flex-col justify-between h-full">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-lavender-100 text-lavender-700 flex items-center justify-center border border-lavender-200">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h4 className="font-serif text-xl font-normal text-slateInk-900">
                    Zero-Hallucination Clinical AI
                  </h4>
                  <p className="text-xs text-slateInk-600 leading-relaxed">
                    Strictly grounded in peer-reviewed medical journals and verifiable clinical citations rather than unverified guessing.
                  </p>
                </div>
                <div className="pt-2 text-[11px] font-semibold text-lavender-700 flex items-center gap-1">
                  <span>PubMed & AHA Grounding</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </Card3DTilt>
          </motion.div>

          {/* Card 4 */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={materializeVariant}
          >
            <Card3DTilt intensity={10}>
              <div className="glass-card-interactive p-7 rounded-3xl space-y-4 flex flex-col justify-between h-full">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-peach-100 text-peach-700 flex items-center justify-center border border-peach-200">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h4 className="font-serif text-xl font-normal text-slateInk-900">
                    Daily Care Protocols
                  </h4>
                  <p className="text-xs text-slateInk-600 leading-relaxed">
                    Track medications, recovery rituals, and habits with dopamine-rich tactile feedback and encrypted database persistence.
                  </p>
                </div>
                <div className="pt-2 text-[11px] font-semibold text-peach-700 flex items-center gap-1">
                  <span>Pill check-offs & reminders</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </Card3DTilt>
          </motion.div>

          {/* Card 5 */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={materializeVariant}
          >
            <Card3DTilt intensity={10}>
              <div className="glass-card-interactive p-7 rounded-3xl space-y-4 flex flex-col justify-between h-full">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-tranquil-100 text-tranquil-600 flex items-center justify-center border border-tranquil-200">
                    <Users className="w-6 h-6" />
                  </div>
                  <h4 className="font-serif text-xl font-normal text-slateInk-900">
                    Care Circle & Emergency ICE
                  </h4>
                  <p className="text-xs text-slateInk-600 leading-relaxed">
                    Coordinate with adult children, spouses, or physicians with custom permission tiers and printable emergency passes.
                  </p>
                </div>
                <div className="pt-2 text-[11px] font-semibold text-tranquil-700 flex items-center gap-1">
                  <span>Emergency QR & ICE Directives</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </Card3DTilt>
          </motion.div>

          {/* Card 6 */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={materializeVariant}
          >
            <Card3DTilt intensity={10}>
              <div className="glass-card-interactive p-7 rounded-3xl space-y-4 flex flex-col justify-between h-full">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-softMint-100 text-softMint-700 flex items-center justify-center border border-softMint-200">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <h4 className="font-serif text-xl font-normal text-slateInk-900">
                    1-Page Physician Visit Briefs
                  </h4>
                  <p className="text-xs text-slateInk-600 leading-relaxed">
                    Export weeks of multi-metric data into concise, FHIR-compliant clinical briefing sheets for your primary doctor.
                  </p>
                </div>
                <div className="pt-2 text-[11px] font-semibold text-softMint-700 flex items-center gap-1">
                  <span>Doctor-ready PDF summaries</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </Card3DTilt>
          </motion.div>

        </div>
      </section>

      {/* ==================== SECURITY & HIPAA TRUST FORTRESS ==================== */}
      <section id="security" className="relative z-10 py-16 sm:py-20 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-white via-[#F8FAFC] to-[#F1F5F9] border border-[#DCE2EA] rounded-3xl p-8 sm:p-14 shadow-card">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-softMint-100 text-softMint-800 text-xs font-semibold border border-softMint-200">
              <Lock className="w-3.5 h-3.5 text-softMint-600" />
              <span>CLINICAL PRIVACY & SECURITY</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-normal text-slateInk-900">
              Your Health Data Is Encrypted, Isolated, and Owned by You
            </h2>
            <p className="text-xs sm:text-sm text-slateInk-600 leading-relaxed">
              Medical intelligence requires uncompromising privacy standards. Vigil guarantees that no user data is ever sold, mined for advertising, or shared without explicit permission.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-[#DCE2EA] space-y-2.5 text-center sm:text-left">
              <div className="w-10 h-10 rounded-xl bg-tranquil-50 text-tranquil-600 flex items-center justify-center mx-auto sm:mx-0">
                <Database className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-sm text-slateInk-900">AES-256 Vault Encryption</h4>
              <p className="text-xs text-slateInk-500 leading-relaxed">
                Biometric records and lab reports are encrypted at rest with military-grade 256-bit AES encryption.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#DCE2EA] space-y-2.5 text-center sm:text-left">
              <div className="w-10 h-10 rounded-xl bg-softMint-50 text-softMint-600 flex items-center justify-center mx-auto sm:mx-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-sm text-slateInk-900">Strict HIPAA Compliance</h4>
              <p className="text-xs text-slateInk-500 leading-relaxed">
                Engineered from the ground up according to HIPAA Privacy, Security, and Breach Notification rules.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#DCE2EA] space-y-2.5 text-center sm:text-left">
              <div className="w-10 h-10 rounded-xl bg-lavender-50 text-lavender-600 flex items-center justify-center mx-auto sm:mx-0">
                <Award className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-sm text-slateInk-900">Zero Data Brokerage</h4>
              <p className="text-xs text-slateInk-500 leading-relaxed">
                We never monetize your medical records. Your health data belongs strictly to you and your care circle.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== MEMBERSHIP & PLANS ==================== */}
      <section id="pricing" className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-tranquil-100 text-tranquil-800 text-xs font-semibold border border-tranquil-200">
            <Award className="w-3.5 h-3.5 text-tranquil-600" />
            <span>TRANSPARENT MEMBERSHIP</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-5xl font-normal text-slateInk-900">
            Invest in Proactive Health Longevity
          </h2>
          <p className="text-sm text-slateInk-600">
            Free forever for personal tracking. Upgrade anytime for unlimited OCR and family care circles.
          </p>

          {/* Monthly / Annual Toggle */}
          <div className="flex items-center justify-center space-x-3 pt-3">
            <span className={`text-xs font-semibold ${!isAnnualBilling ? 'text-slateInk-900' : 'text-slateInk-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsAnnualBilling(!isAnnualBilling)}
              className="relative w-12 h-6 rounded-full bg-[#DCE2EA] p-0.5 transition-colors cursor-pointer"
            >
              <div
                className={`w-5 h-5 rounded-full bg-tranquil-600 transition-transform ${
                  isAnnualBilling ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-xs font-semibold flex items-center gap-1.5 ${isAnnualBilling ? 'text-slateInk-900' : 'text-slateInk-500'}`}>
              <span>Annual</span>
              <span className="px-2 py-0.5 rounded-full bg-softMint-100 text-softMint-800 text-[10px] font-bold">
                Save 20%
              </span>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Free Tier */}
          <div className="glass-card-interactive p-7 rounded-3xl space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="font-serif text-2xl font-normal text-slateInk-900">Essential</h3>
                <p className="text-xs text-slateInk-500 mt-1">Daily health awareness & checklists</p>
              </div>
              <div className="font-serif text-4xl font-normal text-slateInk-900">
                $0 <span className="text-xs font-sans text-slateInk-500">/ forever</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slateInk-600 pt-2 border-t border-[#DCE2EA]">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-softMint-600" />
                  <span>24/7 Wearable vitals sync (RHR, Temp, Sleep)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-softMint-600" />
                  <span>Daily Care Protocol checklist</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-softMint-600" />
                  <span>1 Lab document OCR scan per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-softMint-600" />
                  <span>Standard Night Help Copilot (10 queries/mo)</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onOpenAuth('signup')}
              className="w-full py-3 rounded-2xl bg-white hover:bg-slate-50 border border-[#DCE2EA] text-slateInk-900 font-semibold text-xs shadow-xs transition-all cursor-pointer"
            >
              Get Started Free
            </button>
          </div>

          {/* Pro Tier (Featured) */}
          <div className="glass-card-interactive p-7 rounded-3xl space-y-6 flex flex-col justify-between border-tranquil-400 ring-2 ring-tranquil-200 relative bg-white">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-tranquil-600 text-white text-[10px] font-bold tracking-wide uppercase">
              Most Popular
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-serif text-2xl font-normal text-slateInk-900">Vigil Pro</h3>
                <p className="text-xs text-slateInk-500 mt-1">For proactive health intelligence</p>
              </div>
              <div className="font-serif text-4xl font-normal text-slateInk-900">
                {isAnnualBilling ? '$11' : '$14'} <span className="text-xs font-sans text-slateInk-500">/ month</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slateInk-700 pt-2 border-t border-[#DCE2EA]">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-softMint-600" />
                  <span>Everything in Essential</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-softMint-600" />
                  <span><strong>Unlimited</strong> AI Lab OCR PDF ingestion</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-softMint-600" />
                  <span>Real-time streaming Copilot with lab citations</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-softMint-600" />
                  <span>8-Day predictive anomaly drift alerts</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-softMint-600" />
                  <span>Exportable 1-page Physician Visit Briefs</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onOpenAuth('signup')}
              className="w-full py-3 rounded-2xl bg-tranquil-600 hover:bg-tranquil-700 text-white font-semibold text-xs shadow-soft transition-all cursor-pointer glow-beacon-tranquil"
            >
              Start 14-Day Free Trial
            </button>
          </div>

          {/* Care Circle Family Tier */}
          <div className="glass-card-interactive p-7 rounded-3xl space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="font-serif text-2xl font-normal text-slateInk-900">Care Circle</h3>
                <p className="text-xs text-slateInk-500 mt-1">Multi-member family & caregiver hub</p>
              </div>
              <div className="font-serif text-4xl font-normal text-slateInk-900">
                {isAnnualBilling ? '$23' : '$29'} <span className="text-xs font-sans text-slateInk-500">/ month</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slateInk-600 pt-2 border-t border-[#DCE2EA]">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-softMint-600" />
                  <span>Up to 5 Family / Dependent Accounts</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-softMint-600" />
                  <span>Emergency ICE Medical Passes for first responders</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-softMint-600" />
                  <span>Dedicated physician & caregiver invite portal</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-softMint-600" />
                  <span>Priority 24/7 clinical AI processing</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onOpenAuth('signup')}
              className="w-full py-3 rounded-2xl bg-white hover:bg-slate-50 border border-[#DCE2EA] text-slateInk-900 font-semibold text-xs shadow-xs transition-all cursor-pointer"
            >
              Explore Family Pass
            </button>
          </div>

        </div>
      </section>

      {/* ==================== FREQUENTLY ASKED QUESTIONS ACCORDION ==================== */}
      <section id="faq" className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-12 max-w-4xl mx-auto">
        <div className="text-center space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-tranquil-100 text-tranquil-800 text-xs font-semibold border border-tranquil-200">
            <Info className="w-3.5 h-3.5 text-tranquil-600" />
            <span>CLINICAL CLARITY</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-5xl font-normal text-slateInk-900">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-slateInk-600">
            Answers regarding account setup, biometric sync, and data privacy.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white/80 border border-[#DCE2EA] rounded-2xl overflow-hidden transition-all shadow-xs"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between text-xs sm:text-sm font-semibold text-slateInk-900 hover:text-tranquil-700 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={microSpring}
                    className="inline-flex shrink-0 ml-3 text-slateInk-400"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: fluidEase }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 text-xs text-slateInk-600 leading-relaxed border-t border-[#F1F5F9] pt-3">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* ==================== FINAL CALL TO ACTION (CTA) ==================== */}
      <section className="relative z-10 py-16 sm:py-20 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={materializeVariant}
          className="rounded-3xl bg-gradient-to-br from-slateInk-900 via-[#203C59] to-slateInk-900 text-white p-8 sm:p-16 text-center space-y-6 relative overflow-hidden shadow-float"
        >
          {/* Ambient Orbs */}
          <div className="absolute top-0 right-1/4 w-80 h-80 rounded-full bg-softMint-500/15 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 rounded-full bg-tranquil-400/20 blur-3xl pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-softMint-300 text-xs font-semibold border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-softMint-400" />
            <span>CONTINUOUS PEACE OF MIND</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-5xl font-normal text-white max-w-2xl mx-auto leading-tight">
            Ready to hear your body's whispers before they become alarms?
          </h2>

          <p className="text-xs sm:text-sm text-slateInk-200 max-w-xl mx-auto leading-relaxed">
            Create your private encrypted account today. Connect your devices and begin calibrating your personalized 90-day baseline.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              onClick={() => onOpenAuth('signup')}
              className="inline-flex items-center space-x-2 px-7 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slateInk-900 font-semibold text-xs sm:text-sm shadow-card transition-all transform active:scale-98 cursor-pointer"
            >
              <Activity className="w-4 h-4 text-tranquil-600" />
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onOpenAuth('signin')}
              className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs sm:text-sm transition-all cursor-pointer"
            >
              <span>Sign In to Your Account</span>
            </button>
          </div>

          <div className="pt-4 text-[11px] text-slateInk-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-softMint-400" />
            <span>Strict HIPAA principles • End-to-end encrypted telemetry • Zero medical ads</span>
          </div>
        </motion.div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="relative z-10 border-t border-[#DCE2EA] bg-white/60 py-12 px-4 sm:px-6 lg:px-12 text-xs text-slateInk-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-xl bg-tranquil-600 text-white flex items-center justify-center">
              <HeartPulse className="w-4 h-4" />
            </div>
            <span className="font-serif text-lg font-medium text-slateInk-900">Vigil</span>
            <span className="text-slateInk-300">|</span>
            <span className="text-[11px] text-slateInk-500">Daily Health Companion & Sensor Copilot</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs">
            <a href="#observatory-3d" className="hover:text-slateInk-900 transition-colors">
              3D Observatory
            </a>
            <a href="#color-negate-lens" className="hover:text-slateInk-900 transition-colors">
              Color Negate
            </a>
            <a href="#architecture" className="hover:text-slateInk-900 transition-colors">
              Architecture
            </a>
            <a href="#security" className="hover:text-slateInk-900 transition-colors">
              HIPAA & Security
            </a>
            <a href="#pricing" className="hover:text-slateInk-900 transition-colors">
              Membership
            </a>
            <button onClick={() => onOpenAuth('signin')} className="hover:text-slateInk-900 transition-colors cursor-pointer">
              Sign In
            </button>
            <button onClick={() => onOpenAuth('signup')} className="hover:text-slateInk-900 transition-colors cursor-pointer font-semibold text-tranquil-700">
              Create Account
            </button>
          </div>

          <div className="text-[11px] text-slateInk-400 text-center md:text-right">
            © {new Date().getFullYear()} Vigil Health Technologies. Non-emergency wellness intelligence.
          </div>

        </div>
      </footer>

    </div>
  );
}
