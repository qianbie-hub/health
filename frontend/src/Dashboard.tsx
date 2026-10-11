import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll } from 'framer-motion';
import { fluidEase, cardSpring, microSpring, drawerSpring } from './animations';
import {
  Heart,
  Thermometer,
  Moon,
  Activity,
  CheckCircle2,
  Circle,
  Send,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  X,
  FileText,
  Users,
  Menu,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  User,
  Battery,
  Download,
  Smartphone,
  Phone,
  AlertTriangle,
  Share2,
  UserPlus,
  Check,
  ExternalLink,
  UploadCloud,
  Sparkles,
  ArrowLeft,
  LogOut,
  Calendar,
  Clock,
  Layers,
  HelpCircle,
  Utensils,
  Pill
} from 'lucide-react';

interface VitalItem {
  name: string;
  value: string;
  status: string;
  trend: string;
  is_alert: boolean;
}

interface TrendItem {
  metric: string;
  observed: string;
  baseline: string;
}

interface FlaggedPattern {
  title: string;
  description: string;
  reason: string;
  guidance: string;
  disclaimer: string;
  trends: TrendItem[];
}

interface PatientData {
  id: number;
  name: string;
  greeting_date: string;
  flagged_pattern: FlaggedPattern;
  vitals: VitalItem[];
  active_conditions: string[];
}

interface Medication {
  id: number;
  name: string;
  dosage: string;
  timing: string;
  scheduled_time?: string;
  meal_relation?: string;
  category: string;
  taken_today: boolean;
}

// Medication helpers for scheduled time & before/after meal indicators
const getMedicationTime = (med: Medication): string => {
  if (med.scheduled_time && med.scheduled_time.trim().length > 0) {
    return med.scheduled_time;
  }
  const nameL = med.name.toLowerCase();
  const timeL = (med.timing || '').toLowerCase();
  if (nameL.includes('metformin')) return '08:00 AM';
  if (nameL.includes('vitamin d')) return '08:30 AM';
  if (nameL.includes('coq10') || timeL.includes('afternoon') || timeL.includes('lunch')) return '01:00 PM';
  if (nameL.includes('atorvastatin') || timeL.includes('evening') || timeL.includes('dinner')) return '08:00 PM';
  if (nameL.includes('magnesium') || timeL.includes('night') || timeL.includes('bed')) return '09:45 PM';
  if (timeL.includes('morning')) return '08:00 AM';
  return '08:30 AM';
};

interface MealRelationInfo {
  label: 'Before Meal' | 'After Meal' | 'With Meal';
  badgeClass: string;
  iconClass: string;
  tip: string;
}

const getMedicationMealInfo = (med: Medication): MealRelationInfo => {
  const rawMeal = (med.meal_relation || '').toLowerCase();
  const rawDose = (med.dosage || '').toLowerCase();
  const nameL = med.name.toLowerCase();

  if (rawMeal.includes('before') || rawDose.includes('before') || nameL.includes('magnesium')) {
    return {
      label: 'Before Meal',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/90',
      iconClass: 'text-amber-600',
      tip: 'Take on empty stomach or 30m prior to food/sleep for optimal bioavailability.',
    };
  }

  if (rawMeal.includes('with') || rawDose.includes('with') || nameL.includes('metformin')) {
    return {
      label: 'With Meal',
      badgeClass: 'bg-tranquil-100 text-tranquil-800 border-tranquil-200/90',
      iconClass: 'text-tranquil-600',
      tip: 'Take directly alongside food to buffer gastric mucosal lining and aid digestion.',
    };
  }

  return {
    label: 'After Meal',
    badgeClass: 'bg-softMint-100 text-softMint-800 border-softMint-200/90',
    iconClass: 'text-softMint-700',
    tip: 'Take within 30 minutes following your meal for smooth metabolic absorption.',
  };
};

const MED_TIME_SORT_ORDER: Record<string, number> = {
  '08:00 AM': 1,
  '08:30 AM': 2,
  '09:00 AM': 3,
  '12:00 PM': 4,
  '01:00 PM': 5,
  '02:00 PM': 6,
  '06:00 PM': 7,
  '07:00 PM': 8,
  '08:00 PM': 9,
  '09:00 PM': 10,
  '09:45 PM': 11,
  '10:00 PM': 12,
};

interface Biomarker {
  id: number;
  name: string;
  value: string;
  unit: string;
  reference_range: string;
  status: string;
  interpretation?: string;
  report_title?: string;
}

interface DiagnosticReport {
  id: number;
  title: string;
  date: string;
  facility: string;
  category: string;
  summary: string;
  biomarkers: Biomarker[];
}

interface Citation {
  source: string;
  detail: string;
  relevance: string;
}

interface ChatMessage {
  id: number | string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  created_at?: string;
  isStreaming?: boolean;
}

const dayDataMap: Record<number, { rhr: string; sleep: string; temp: string; note: string }> = {
  1: { rhr: '69 bpm', sleep: '6.8h', temp: '36.6°C', note: 'Balanced baseline' },
  2: { rhr: '70 bpm', sleep: '6.7h', temp: '36.7°C', note: 'Normal daily movement' },
  3: { rhr: '71 bpm', sleep: '6.4h', temp: '36.8°C', note: 'Slightly shorter sleep' },
  4: { rhr: '72 bpm', sleep: '6.2h', temp: '36.8°C', note: 'Mild work fatigue' },
  5: { rhr: '74 bpm', sleep: '6.0h', temp: '36.9°C', note: 'Higher evening heart rate' },
  6: { rhr: '75 bpm', sleep: '5.9h', temp: '37.0°C', note: 'Recovery taking longer' },
  7: { rhr: '76 bpm', sleep: '5.8h', temp: '37.0°C', note: 'Continued trend noted' },
  8: { rhr: '78 bpm', sleep: '5.7h', temp: '37.1°C', note: 'Today: 8 consecutive days' },
};

// -------------------------------------------------------------
// FRAMER MOTION PHYSICS HELPERS & MICRO-INTERACTIONS
// -------------------------------------------------------------
interface MetricHistoryPoint {
  day: string;
  value: number | string;
  unit: string;
  isPeak?: boolean;
}

interface MetricDetail {
  id: string;
  name: string;
  icon: any;
  iconColor: string;
  value: string;
  unit?: string;
  isAlert: boolean;
  statusText: string;
  usualRange: string;
  clinicalThreshold: string;
  guidance: string;
  copilotPrompt: string;
  history8Day: MetricHistoryPoint[];
}

const BURST_PARTICLES = [
  { x: 22, y: 0, color: '#10B981' },
  { x: 11, y: 19, color: '#F59E0B' },
  { x: -11, y: 19, color: '#10B981' },
  { x: -22, y: 0, color: '#F59E0B' },
  { x: -11, y: -19, color: '#10B981' },
  { x: 11, y: -19, color: '#F59E0B' },
];

export function LiquidMetricBadge({ text = "Outside your usual range" }: { text?: string }) {
  return (
    <span className="relative inline-flex items-center">
      <motion.span
        className="absolute -inset-1 rounded-full bg-peach-500/25 pointer-events-none"
        animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="relative inline-block bg-peach-100 text-peach-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-peach-200">
        {text}
      </span>
    </span>
  );
}

export function AccordionCitations({ citations }: { citations: Citation[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-3 pt-2.5 border-t border-slateInk-100">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slateInk-500 hover:text-slateInk-800 transition-colors py-1 cursor-pointer"
      >
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-softMint-600" />
          <span>Clinical Evidence & Lab Citations ({citations.length})</span>
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={microSpring}
          className="inline-flex"
        >
          <ChevronDown className="w-3.5 h-3.5 text-slateInk-400" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: fluidEase }}
            className="overflow-hidden"
          >
            <div className="space-y-1.5 pt-2 pb-1">
              {citations.map((cite, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-[#DCE2EA] rounded-xl p-2.5 text-xs shadow-xs"
                >
                  <div className="font-semibold text-slateInk-900 flex justify-between items-center">
                    <span>{cite.source}</span>
                    <span className="text-[10px] text-slateInk-500 font-normal bg-slate-100 px-1.5 py-0.5 rounded">
                      {cite.relevance}
                    </span>
                  </div>
                  <div className="text-slateInk-600 text-[11px] mt-1 leading-relaxed">
                    {cite.detail}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export interface DashboardProps {
  onNavigateToHome?: () => void;
  onSignOut?: () => void;
  initialTab?: 'today' | 'intake' | 'night-help' | 'records' | 'family';
}

export default function Dashboard({ onNavigateToHome, onSignOut, initialTab }: DashboardProps) {
  // Framer Motion shared layout & micro-interaction states
  const [selectedMetric, setSelectedMetric] = useState<MetricDetail | null>(null);
  const [burstMedId, setBurstMedId] = useState<number | null>(null);
  const [toggledMedId, setToggledMedId] = useState<number | null>(null);
  const [medTimingFilter, setMedTimingFilter] = useState<'All' | 'Morning' | 'Afternoon' | 'Evening' | 'Night'>('All');
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // useScroll hook for Module 3 (Header scroll morph)
  const { scrollY } = useScroll();
  const [isScrolledPast60, setIsScrolledPast60] = useState(false);

  useEffect(() => {
    return scrollY.on('change', (y) => {
      setIsScrolledPast60(y > 60);
    });
  }, [scrollY]);
  const [activeTab, setActiveTab] = useState<'today' | 'intake' | 'night-help' | 'records' | 'family'>(initialTab || 'today');
  
  // Data states
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [reports, setReports] = useState<DiagnosticReport[]>([]);
  const [outOfRangeBiomarkers, setOutOfRangeBiomarkers] = useState<Biomarker[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Core Problem Statement Pillars: Medical Record Intelligence, Plain Language Explainer & Unified Profile
  const [recordsSubTab, setRecordsSubTab] = useState<'reports' | 'plain_summary' | 'timeline'>('reports');
  const [plainSummaryData, setPlainSummaryData] = useState<any | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [timelineFilter, setTimelineFilter] = useState<string>('all');
  const [unifiedProfileData, setUnifiedProfileData] = useState<any | null>(null);
  const [diagnosesList, setDiagnosesList] = useState<any[]>([]);
  const [explainingModalBiomarker, setExplainingModalBiomarker] = useState<any | null>(null);
  
  // Interactive UI states
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(8);
  const [isTrendTableOpen, setIsTrendTableOpen] = useState(false);
  
  // Unique Scroll Progress Tracking
  const [scrollProgress, setScrollProgress] = useState(0);

  // Document Upload & AI Intake States
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);
  const [analysisStage, setAnalysisStage] = useState(0); // 0: idle, 1: OCR, 2: wearable correlation, 3: biomarker extraction, 4: dashboard synthesis
  const [analyzedDocResult, setAnalyzedDocResult] = useState<any | null>(null);
  const [showAnalyzedBanner, setShowAnalyzedBanner] = useState(false);
  const [selectedDocumentPreset, setSelectedDocumentPreset] = useState<'quest_panel' | 'jenkins_rx' | 'mercy_discharge' | 'holter_ecg'>('quest_panel');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  
  // User Profile & Care Circle interactive states
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [checkInSent, setCheckInSent] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [emergencyAlertDispatched, setEmergencyAlertDispatched] = useState(false);
  const [notifyCareCircle, setNotifyCareCircle] = useState(true);
  const [windDownReminder, setWindDownReminder] = useState(true);
  const [autoSyncDoctor, setAutoSyncDoctor] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteRelationship, setInviteRelationship] = useState('Partner / Spouse');
  const [inviteContact, setInviteContact] = useState('');
  const [inviteAccess, setInviteAccess] = useState('Full Emergency Proxy & Vitals');
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [copiedMedicalId, setCopiedMedicalId] = useState(false);

  // Care circle permission toggles
  const [autoSmsThreshold, setAutoSmsThreshold] = useState(true);
  const [shareSleepRecovery, setShareSleepRecovery] = useState(true);
  const [shareMedicationStatus, setShareMedicationStatus] = useState(true);
  const [allowEmergencyGps, setAllowEmergencyGps] = useState(true);

  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Scroll listener for dynamic scroll transition progress bar
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress(Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100)));
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = typeof window !== 'undefined' ? localStorage.getItem('vigil_token') : null;
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [patientRes, medsRes, reportsRes, chatRes] = await Promise.all([
        fetch('/api/patient', { headers: authHeaders }),
        fetch('/api/medications', { headers: authHeaders }),
        fetch('/api/reports', { headers: authHeaders }),
        fetch('/api/chat/history', { headers: authHeaders })
      ]);

      if (!patientRes.ok || !medsRes.ok || !reportsRes.ok) {
        throw new Error('Could not fetch data from backend');
      }

      const patientData = await patientRes.json();
      const medsData = await medsRes.json();
      const reportsData = await reportsRes.json();
      const chatData = chatRes.ok ? await chatRes.json() : [];

      setPatient(patientData);
      setMedications(medsData);
      setReports(reportsData.reports || []);
      setOutOfRangeBiomarkers(reportsData.out_of_range_biomarkers || []);
      setChatMessages(chatData);

      // Fetch unified profile, plain-language summary, and chronological timeline
      try {
        const [plainRes, timelineRes, profileRes, diagRes] = await Promise.all([
          fetch('/api/records/summary/plain-language', { headers: authHeaders }),
          fetch('/api/timeline', { headers: authHeaders }),
          fetch('/api/profile/unified', { headers: authHeaders }),
          fetch('/api/diagnoses', { headers: authHeaders })
        ]);
        if (plainRes.ok) setPlainSummaryData(await plainRes.json());
        if (timelineRes.ok) setTimelineEvents(await timelineRes.json());
        if (profileRes.ok) setUnifiedProfileData(await profileRes.json());
        if (diagRes.ok) setDiagnosesList(await diagRes.json());
      } catch (subErr) {
        console.warn('Sub-intelligence data fetch:', subErr);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to connect to Vigil API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Document Upload & AI Analysis Flow
  const handleRunDocumentAnalysis = async (presetOverride?: 'quest_panel' | 'jenkins_rx' | 'holter_ecg') => {
    const preset = presetOverride || selectedDocumentPreset;
    setIsAnalyzingDoc(true);
    setAnalysisStage(1);

    // Stage 1: Optical Tokenization & OCR
    await new Promise(r => setTimeout(r, 650));
    setAnalysisStage(2);

    // Stage 2: Cross-referencing 90-day wearable baselines
    await new Promise(r => setTimeout(r, 750));
    setAnalysisStage(3);

    // Stage 3: Biomarker & Prescription extraction
    await new Promise(r => setTimeout(r, 750));
    setAnalysisStage(4);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('vigil_token') : null;
      const res = await fetch('/api/documents/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          preset_id: preset,
          title: preset === 'quest_panel' 
            ? 'Quest Comprehensive Metabolic & Lipid Panel'
            : preset === 'jenkins_rx'
            ? 'Dr. Sarah Jenkins Rx Prescription Slip'
            : preset === 'mercy_discharge'
            ? 'Mercy Health Clinical Inpatient Discharge Summary'
            : 'Ambulatory Holter & Rhythm Strip (24h)',
          document_type: preset === 'jenkins_rx' ? 'prescription' : preset === 'mercy_discharge' ? 'discharge_summary' : preset === 'holter_ecg' ? 'diagnostic_record' : 'lab_report',
          filename: uploadedFile ? uploadedFile.name : `${preset}_scan.pdf`
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAnalyzedDocResult(data);
        setShowAnalyzedBanner(true);
        await fetchData();
      }
    } catch (err) {
      console.error('Document analysis error:', err);
    } finally {
      await new Promise(r => setTimeout(r, 500));
      setIsAnalyzingDoc(false);
      setAnalysisStage(0);
      setActiveTab('today');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isSending]);

  // Toggle Medication Taken Status with Dopamine Pill-Check & Particles
  const handleToggleMedication = async (id: number) => {
    const medToToggle = medications.find(m => m.id === id);
    const willBeTaken = medToToggle ? !medToToggle.taken_today : true;

    setToggledMedId(id);
    if (willBeTaken) {
      setBurstMedId(id);
      setTimeout(() => setBurstMedId(null), 400);
    }
    setTimeout(() => setToggledMedId(null), 400);

    setMedications(prev =>
      prev.map(m => (m.id === id ? { ...m, taken_today: willBeTaken } : m))
    );

    try {
      const res = await fetch(`/api/medications/${id}/toggle`, {
        method: 'PATCH',
      });
      if (!res.ok) {
        throw new Error('Failed to update medication status');
      }
      const updatedMed = await res.json();
      setMedications(prev =>
        prev.map(m => (m.id === id ? updatedMed : m))
      );
    } catch (err) {
      console.error('Error toggling medication:', err);
      fetchData();
    }
  };

  // Mark All or Reset All Medications
  const handleMarkAllMedications = async (targetTaken: boolean) => {
    setMedications(prev => prev.map(m => ({ ...m, taken_today: targetTaken })));
    try {
      const promises = medications
        .filter(m => m.taken_today !== targetTaken)
        .map(m => fetch(`/api/medications/${m.id}/toggle`, { method: 'PATCH' }));
      await Promise.all(promises);
    } catch (err) {
      console.error('Error batch updating medications:', err);
      fetchData();
    }
  };

  // Send Chat Message with Streaming Support
  const handleSendMessage = async (textToSend?: string) => {
    const message = textToSend || inputMessage;
    if (!message.trim() || isSending) return;

    setInputMessage('');
    setIsSending(true);

    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: message,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const tempAssistantId = Date.now() + 1;
    const tempAssistantMsg: ChatMessage = {
      id: tempAssistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      citations: []
    };

    setChatMessages(prev => [...prev, tempUserMsg, tempAssistantMsg]);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('vigil_token') : null;
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ message })
      });

      if (!response.ok || !response.body) {
        throw new Error('Chat API returned an error');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let streamedContent = '';
      let receivedCitations: Citation[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') continue;

            try {
              const data = JSON.parse(dataStr);
              if (data.token) {
                streamedContent += data.token;
                setChatMessages(prev =>
                  prev.map(m =>
                    m.id === tempAssistantId
                      ? { ...m, content: streamedContent }
                      : m
                  )
                );
              }
              if (data.citations) {
                receivedCitations = data.citations;
              }
            } catch {
              // Ignore partial JSON
            }
          }
        }
      }

      setChatMessages(prev =>
        prev.map(m =>
          m.id === tempAssistantId
            ? {
                ...m,
                content: streamedContent,
                citations: receivedCitations,
                isStreaming: false,
                created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            : m
        )
      );
    } catch (err: any) {
      console.error('Chat streaming failed:', err);
      setChatMessages(prev =>
        prev.map(m =>
          m.id === tempAssistantId
            ? {
                ...m,
                content: 'I apologize, but I encountered an issue retrieving clinical notes. Please verify your connection.',
                isStreaming: false
              }
            : m
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  const completedMedsCount = medications.filter(m => m.taken_today).length;
  const currentDayInfo = dayDataMap[selectedDay] || dayDataMap[8];

  // 2x2 Metric dataset with 8-day historical trajectory for Morphing Shared Surface (Option 1.C)
  const metricCards: MetricDetail[] = [
    {
      id: 'rhr',
      name: 'Resting Heart Rate',
      icon: Heart,
      iconColor: 'text-peach-700',
      value: patient?.vitals?.find(v => v.name.toLowerCase().includes('heart'))?.value || '78',
      unit: 'bpm',
      isAlert: true,
      statusText: 'Outside your usual range',
      usualRange: '60–75 bpm',
      clinicalThreshold: 'Baseline 60–75 bpm • Sustained upward shift of +9 bpm over 8 consecutive nights triggers trend assessment.',
      guidance: 'Resting heart rate elevation is strongly correlated with shortened sleep (5.7h) and autonomic strain. Prioritize hydration, early evening calm, and restful nocturnal recovery.',
      copilotPrompt: 'Explain why my resting heart rate has risen from 69 to 78 bpm over the last 8 days.',
      history8Day: [
        { day: 'Oct 4', value: 69, unit: 'bpm' },
        { day: 'Oct 5', value: 70, unit: 'bpm' },
        { day: 'Oct 6', value: 71, unit: 'bpm' },
        { day: 'Oct 7', value: 72, unit: 'bpm' },
        { day: 'Oct 8', value: 74, unit: 'bpm' },
        { day: 'Oct 9', value: 75, unit: 'bpm' },
        { day: 'Oct 10', value: 76, unit: 'bpm' },
        { day: 'Oct 11', value: 78, unit: 'bpm', isPeak: true }
      ]
    },
    {
      id: 'temp',
      name: 'Skin Temperature',
      icon: Thermometer,
      iconColor: 'text-softMint-700',
      value: patient?.vitals?.find(v => v.name.toLowerCase().includes('temp'))?.value || '37.1',
      unit: '°C',
      isAlert: false,
      statusText: 'In your usual range',
      usualRange: '36.5–37.3°C',
      clinicalThreshold: 'Circadian oral range 36.5–37.3°C • Sub-febrile boundary threshold: > 37.5°C',
      guidance: 'Mild upper baseline shift noted over 4 days (+0.5°C), remaining safely sub-febrile. Consistent with physiological recovery or early immune response.',
      copilotPrompt: 'Explain my 8-day temperature trend and whether 37.1°C is significant.',
      history8Day: [
        { day: 'Oct 4', value: 36.6, unit: '°C' },
        { day: 'Oct 5', value: 36.7, unit: '°C' },
        { day: 'Oct 6', value: 36.7, unit: '°C' },
        { day: 'Oct 7', value: 36.8, unit: '°C' },
        { day: 'Oct 8', value: 36.9, unit: '°C' },
        { day: 'Oct 9', value: 37.0, unit: '°C' },
        { day: 'Oct 10', value: 37.0, unit: '°C' },
        { day: 'Oct 11', value: 37.1, unit: '°C', isPeak: true }
      ]
    },
    {
      id: 'sleep',
      name: 'Sleep Duration',
      icon: Moon,
      iconColor: 'text-lavender-700',
      value: patient?.vitals?.find(v => v.name.toLowerCase().includes('sleep'))?.value || '5.7',
      unit: 'hours',
      isAlert: true,
      statusText: 'Outside your usual range',
      usualRange: '7.0–9.0 h',
      clinicalThreshold: 'Target restful window: 7.0–9.0 hours • Sleep deficit alert threshold: < 6.0 hours',
      guidance: 'Restorative nocturnal sleep duration has dropped below 6.0 hours for 3 consecutive nights. Decreased deep restorative sleep limits parasympathetic rebound.',
      copilotPrompt: 'How does my sleep deprivation affect my cardiovascular metrics and recovery?',
      history8Day: [
        { day: 'Oct 4', value: 6.8, unit: 'h' },
        { day: 'Oct 5', value: 6.7, unit: 'h' },
        { day: 'Oct 6', value: 6.5, unit: 'h' },
        { day: 'Oct 7', value: 6.4, unit: 'h' },
        { day: 'Oct 8', value: 6.1, unit: 'h' },
        { day: 'Oct 9', value: 6.0, unit: 'h' },
        { day: 'Oct 10', value: 5.9, unit: 'h' },
        { day: 'Oct 11', value: 5.7, unit: 'h', isPeak: true }
      ]
    },
    {
      id: 'bp',
      name: 'Blood Pressure',
      icon: Activity,
      iconColor: 'text-tranquil-700',
      value: patient?.vitals?.find(v => v.name.toLowerCase().includes('blood pressure'))?.value || '129',
      unit: '/ 82 mmHg',
      isAlert: false,
      statusText: 'In your usual range',
      usualRange: '< 130 mmHg',
      clinicalThreshold: 'Normal systolic: < 120 mmHg • Elevated boundary: 120–129 mmHg • Stage 1 boundary: ≥ 130 mmHg',
      guidance: 'Systolic blood pressure remains within normative personal bounds at 129 mmHg, tracking steadily alongside recent ambulatory readings.',
      copilotPrompt: 'Review my blood pressure history and stability over the past week.',
      history8Day: [
        { day: 'Oct 4', value: 124, unit: 'mmHg' },
        { day: 'Oct 5', value: 125, unit: 'mmHg' },
        { day: 'Oct 6', value: 126, unit: 'mmHg' },
        { day: 'Oct 7', value: 126, unit: 'mmHg' },
        { day: 'Oct 8', value: 128, unit: 'mmHg' },
        { day: 'Oct 9', value: 127, unit: 'mmHg' },
        { day: 'Oct 10', value: 128, unit: 'mmHg' },
        { day: 'Oct 11', value: 129, unit: 'mmHg', isPeak: true }
      ]
    }
  ];

  return (
    <div className="bg-[#E8ECEF] text-slateInk-900 min-h-screen antialiased flex flex-col lg:flex-row selection:bg-tranquil-100 selection:text-tranquil-900 relative">

      {/* Unique Ambient Scroll Progress Bar */}
      <div
        className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-tranquil-500 via-softMint-500 to-tranquil-600 z-50 transition-all duration-75 shadow-xs pointer-events-none"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slateInk-900/30 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* ==================== CALM HUMAN SIDEBAR ==================== */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 lg:w-64 xl:w-72 bg-[#DEE3E9] border-r border-[#DCE2EA] flex flex-col justify-between transition-transform duration-300 ease-out shadow-lg lg:shadow-none ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 pb-4">
          {/* Calm Brand Header */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={onNavigateToHome}
              title="Return to Home Landing"
              className="flex items-center space-x-3 text-left group hover:opacity-85 transition-opacity"
            >
              <div className="w-8 h-8 rounded-full bg-tranquil-100 border border-tranquil-200 flex items-center justify-center text-tranquil-600 animate-breathe group-hover:scale-105 transition-transform">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 01-9-9c0-4.97 4.03-9 9-9 4.14 0 7.6 2.8 8.66 6.64.12.44-.22.86-.68.86h-4.32a3 3 0 00-2.83 2 3 3 0 00.7 3.23l2.87 2.87A9.03 9.03 0 0112 21z" />
                </svg>
              </div>
              <div>
                <span className="font-serif text-xl font-medium tracking-tight text-slateInk-900 block leading-none">
                  Vigil
                </span>
                <span className="text-[11px] text-slateInk-500 font-sans tracking-wide">
                  Daily health companion
                </span>
              </div>
            </button>

            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 text-slateInk-400 hover:text-slateInk-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Return to Landing Page Action */}
          {onNavigateToHome && (
            <button
              onClick={onNavigateToHome}
              className="w-full mb-4 flex items-center justify-center space-x-2 py-2 px-3 rounded-2xl bg-white hover:bg-slate-50 border border-[#DCE2EA] hover:border-tranquil-300 text-slateInk-700 hover:text-slateInk-900 text-xs font-medium shadow-xs transition-all card-hover-effect cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-tranquil-600" />
              <span>Back to Home Page</span>
            </button>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1.5 font-sans">
            <div className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slateInk-500">
              Everyday Health
            </div>

            {/* Tab: Today's Overview */}
            <button
              onClick={() => {
                setActiveTab('today');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm transition-all card-hover-effect relative ${
                activeTab === 'today'
                  ? 'text-slateInk-900 font-semibold'
                  : 'text-slateInk-700 hover:bg-white/60 font-medium'
              }`}
            >
              {activeTab === 'today' && (
                <motion.div
                  layoutId="sidebarActivePill"
                  className="absolute inset-0 bg-white rounded-2xl shadow-xs border border-tranquil-200/80 -z-0"
                  transition={cardSpring}
                />
              )}
              <div className="flex items-center space-x-3 relative z-10">
                <svg
                  className={`w-4 h-4 ${activeTab === 'today' ? 'text-tranquil-600' : 'text-slateInk-400'}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Today's Overview</span>
              </div>
              <div className="relative z-10">
                {activeTab === 'today' && <span className="w-1.5 h-1.5 rounded-full bg-tranquil-600 animate-pulse-soft block"></span>}
              </div>
            </button>

            {/* Tab: Clinical Intake & Document Upload */}
            <button
              onClick={() => {
                setActiveTab('intake');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm transition-all card-hover-effect relative ${
                activeTab === 'intake'
                  ? 'text-slateInk-900 font-semibold'
                  : 'text-slateInk-700 hover:bg-white/60 font-medium'
              }`}
            >
              {activeTab === 'intake' && (
                <motion.div
                  layoutId="sidebarActivePill"
                  className="absolute inset-0 bg-white rounded-2xl shadow-xs border border-tranquil-200/80 -z-0"
                  transition={cardSpring}
                />
              )}
              <div className="flex items-center space-x-3 relative z-10">
                <UploadCloud className={`w-4 h-4 ${activeTab === 'intake' ? 'text-tranquil-600' : 'text-slateInk-400'}`} />
                <span>Upload & Analyze</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-softMint-100 text-softMint-800 border border-softMint-200 relative z-10">
                AI Intake
              </span>
            </button>

            {/* Tab: Night Help / Consultation */}
            <button
              onClick={() => {
                setActiveTab('night-help');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm transition-all card-hover-effect relative ${
                activeTab === 'night-help'
                  ? 'text-slateInk-900 font-semibold'
                  : 'text-slateInk-700 hover:bg-white/60 font-medium'
              }`}
            >
              {activeTab === 'night-help' && (
                <motion.div
                  layoutId="sidebarActivePill"
                  className="absolute inset-0 bg-white rounded-2xl shadow-xs border border-tranquil-200/80 -z-0"
                  transition={cardSpring}
                />
              )}
              <div className="flex items-center space-x-3 relative z-10">
                <Moon className={`w-4 h-4 ${activeTab === 'night-help' ? 'text-tranquil-600' : 'text-slateInk-400'}`} />
                <span>Night & Rest</span>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-lavender-100 text-lavender-700 border border-lavender-200 relative z-10">
                1 note
              </span>
            </button>

            {/* Tab: Records */}
            <button
              onClick={() => {
                setActiveTab('records');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm transition-all card-hover-effect relative ${
                activeTab === 'records'
                  ? 'text-slateInk-900 font-semibold'
                  : 'text-slateInk-700 hover:bg-white/60 font-medium'
              }`}
            >
              {activeTab === 'records' && (
                <motion.div
                  layoutId="sidebarActivePill"
                  className="absolute inset-0 bg-white rounded-2xl shadow-xs border border-tranquil-200/80 -z-0"
                  transition={cardSpring}
                />
              )}
              <div className="flex items-center space-x-3 relative z-10">
                <FileText className={`w-4 h-4 ${activeTab === 'records' ? 'text-tranquil-600' : 'text-slateInk-400'}`} />
                <span>Health Records</span>
              </div>
              <span className="text-xs text-slateInk-500 font-medium relative z-10">{reports.length} reports</span>
            </button>

            <div className="px-2.5 pt-5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slateInk-500">
              Circle & Care
            </div>

            {/* Tab: Family */}
            <button
              onClick={() => {
                setActiveTab('family');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm transition-all card-hover-effect relative ${
                activeTab === 'family'
                  ? 'text-slateInk-900 font-semibold'
                  : 'text-slateInk-700 hover:bg-white/60 font-medium'
              }`}
            >
              {activeTab === 'family' && (
                <motion.div
                  layoutId="sidebarActivePill"
                  className="absolute inset-0 bg-white rounded-2xl shadow-xs border border-tranquil-200/80 -z-0"
                  transition={cardSpring}
                />
              )}
              <div className="flex items-center space-x-3 relative z-10">
                <Users className={`w-4 h-4 ${activeTab === 'family' ? 'text-tranquil-600' : 'text-slateInk-400'}`} />
                <span>Family Circle</span>
              </div>
              <span className="text-xs text-slateInk-500 font-medium relative z-10">4 active</span>
            </button>

            {/* Doctor Note Modal Trigger */}
            <button
              onClick={() => setIsDoctorModalOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-medium text-slateInk-700 hover:bg-white/60 transition-all text-left card-hover-effect"
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-4 h-4 text-slateInk-400" />
                <span>Doctor's Visit Note</span>
              </div>
              <span className="text-[11px] font-medium text-tranquil-700 bg-tranquil-100 px-2 py-0.5 rounded-full border border-tranquil-200">
                PDF ready
              </span>
            </button>
          </nav>
        </div>

        {/* Sidebar Bottom: Connected Wearable & User Profile */}
        <div className="p-5 border-t border-[#DCE2EA] space-y-3.5">
          <div className="p-3.5 rounded-2xl bg-white border border-[#DCE2EA] shadow-xs card-hover-effect">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-softMint-600 animate-pulse-soft"></span>
                <span className="font-semibold text-slateInk-800">Oura Ring connected</span>
              </div>
              <span className="text-slateInk-500 font-medium text-[11px]">88%</span>
            </div>
            <p className="text-[11px] text-slateInk-500 mt-1">Calm morning sync at 7:30 am</p>
          </div>

          {/* LOWER LEFT USER PROFILE BUTTON (Interactive Click to Open Profile Modal) */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            title="Click to view health passport & profile details"
            className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white hover:bg-white/90 border border-[#DCE2EA] shadow-xs transition-all duration-300 card-hover-effect group text-left"
          >
            <div className="flex items-center space-x-2.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-tranquil-100 border-2 border-white shadow-xs flex items-center justify-center font-serif text-sm font-semibold text-tranquil-700 group-hover:scale-105 transition-transform">
                  {patient?.name ? patient.name.charAt(0) : 'M'}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-softMint-600 border-2 border-white animate-pulse-soft"></span>
              </div>
              <div className="leading-tight">
                <p className="text-xs font-semibold text-slateInk-900 group-hover:text-tranquil-700 transition-colors">
                  {patient?.name || 'Meera Sharma'}
                </p>
                <p className="text-[10px] text-slateInk-500 mt-0.5">Health Passport & Vitals →</p>
              </div>
            </div>

            <div className="p-1 rounded-lg text-slateInk-400 group-hover:text-slateInk-800 transition-colors">
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Sign Out / Log Out Button */}
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-white hover:bg-slate-50 border border-[#DCE2EA] text-slateInk-600 hover:text-peach-700 text-[11px] font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-slateInk-400 hover:text-peach-600" />
              <span>Sign Out of Dashboard</span>
            </button>
          )}
        </div>
      </aside>

      {/* ==================== MAIN CONTENT WRAPPER WITH MOTION PUSH ==================== */}
      <motion.div
        animate={
          selectedMetric
            ? { filter: 'blur(4px)', scale: 0.98 }
            : isCopilotOpen
            ? { scale: 0.97, filter: 'blur(1px)' }
            : { filter: 'blur(0px)', scale: 1 }
        }
        transition={selectedMetric ? cardSpring : drawerSpring}
        className="flex-1 min-w-0 lg:pl-64 xl:pl-72 flex flex-col min-h-screen origin-top transition-transform"
      >

        {/* Top Header Bar with Scroll Morph into Compact Glass Dock (Option 2.B) */}
        <header className="bg-white/85 backdrop-blur-md border-b border-black/[0.05] px-5 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 transition-all duration-300">
          <div className="flex items-center space-x-3 flex-1 min-w-0 mr-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-2xl bg-white border border-[#DCE2EA] text-slateInk-700 shadow-xs shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0 flex-1">
              <AnimatePresence mode="wait">
                {!isScrolledPast60 ? (
                  <motion.div
                    key="normal-greeting"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={microSpring}
                  >
                    <p className="text-[11px] font-medium text-slateInk-500 font-sans tracking-wide">
                      {patient?.greeting_date || 'Sunday, 11 October'}
                    </p>
                    <h1 className="font-serif text-lg sm:text-xl font-normal text-slateInk-900 leading-tight truncate">
                      Good morning, {patient?.name || 'Meera'}
                    </h1>
                  </motion.div>
                ) : (
                  <motion.div
                    key="compact-dock"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={microSpring}
                    className="flex items-center space-x-2 text-xs font-semibold text-slateInk-800 truncate"
                  >
                    <span className="text-slateInk-900 font-bold shrink-0">{patient?.name || 'Meera'}</span>
                    <span className="text-slateInk-300 shrink-0">•</span>
                    <span className="text-peach-800 bg-peach-100 border border-peach-200 px-2.5 py-0.5 rounded-full text-[11px] font-medium shrink-0 flex items-center gap-1">
                      <Heart className="w-3 h-3 text-peach-700 fill-current" />
                      RHR 78 bpm (Outside range)
                    </span>
                    <span className="text-slateInk-300 hidden sm:inline shrink-0">•</span>
                    <span className="text-softMint-800 bg-softMint-100 border border-softMint-200 px-2.5 py-0.5 rounded-full text-[11px] font-medium hidden sm:inline shrink-0">
                      {completedMedsCount}/{medications.length} Meds
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-softMint-100/90 text-softMint-800 border border-softMint-200 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-softMint-600 animate-pulse-soft"></span>
              Restful morning rhythm
            </span>

            {/* Return to Home Landing */}
            {onNavigateToHome && (
              <button
                onClick={onNavigateToHome}
                title="Return to Home Landing"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-white hover:bg-slate-50 text-slateInk-700 hover:text-slateInk-900 text-xs font-semibold border border-[#DCE2EA] shadow-xs transition-all transform active:scale-95 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-tranquil-600" />
                <span className="hidden sm:inline">Landing</span>
              </button>
            )}

            {/* Quick Upload & Analyze Button */}
            <button
              onClick={() => {
                setActiveTab('intake');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-white hover:bg-slate-50 text-tranquil-700 text-xs font-semibold border border-tranquil-200 shadow-xs transition-all transform active:scale-95"
            >
              <UploadCloud className="w-3.5 h-3.5 text-tranquil-600" />
              <span>Upload Doc</span>
            </button>

            {/* Emergency Medical ID Quick Access */}
            <button
              onClick={() => setIsEmergencyModalOpen(true)}
              title="Emergency Medical ID for first responders & bystanders"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-peach-100 hover:bg-peach-200 text-peach-800 text-xs font-semibold border border-peach-300 shadow-xs transition-all transform active:scale-95"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-peach-700 animate-pulse-soft" />
              <span>Emergency ID</span>
            </button>

            {/* Quick Profile Pill on Header */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-white hover:bg-slate-50 text-slateInk-700 text-xs font-medium border border-[#DCE2EA] shadow-xs transition-all"
            >
              <User className="w-3.5 h-3.5 text-tranquil-600" />
              <span>Passport</span>
            </button>

            <button
              onClick={fetchData}
              title="Refresh health readings"
              className="p-2 rounded-2xl bg-white border border-[#DCE2EA] hover:border-tranquil-400 text-slateInk-600 hover:text-slateInk-900 shadow-xs transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Ask Vigil Copilot Drawer Button */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={microSpring}
              onClick={() => setIsCopilotOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-slateInk-900 hover:bg-slateInk-800 text-white text-xs font-semibold shadow-xs transition-all transform active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Ask Vigil</span>
            </motion.button>

            <button
              onClick={() => setIsDoctorModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-tranquil-600 hover:bg-tranquil-700 text-white text-xs font-semibold shadow-xs border border-tranquil-700 transition-all transform active:scale-95"
            >
              Doctor Note
            </button>
          </div>
        </header>

        {/* Main Workspace Body */}
        <main className="w-full max-w-5xl mx-auto px-5 sm:px-10 py-8 pb-28 space-y-8 flex-1">

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-peach-50 border border-peach-200 text-peach-800 flex items-start space-x-3 text-sm animate-modal-enter">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-peach-600" />
              <div>
                <p className="font-semibold">Notice Connecting to Backend</p>
                <p className="text-xs text-peach-700 mt-0.5">{error}. Displaying calibrated baseline view.</p>
                <button onClick={fetchData} className="mt-2 text-xs font-semibold underline">
                  Retry connection
                </button>
              </div>
            </div>
          )}

          {/* ==================== TAB 1: TODAY'S OVERVIEW (SORTED & MINIMALIST) ==================== */}
          {activeTab === 'today' && (
            <div className="space-y-8 animate-tab-switch">
              
              {/* Dynamic Newly Analyzed Clinical Document Findings Presentation Banner */}
              {showAnalyzedBanner && analyzedDocResult && (
                <section className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-softMint-400 shadow-md relative overflow-hidden animate-scroll-reveal">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-softMint-500 via-tranquil-500 to-softMint-400" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DCE2EA]">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-softMint-100 flex items-center justify-center text-softMint-700 shrink-0">
                        <Sparkles className="w-5 h-5 text-softMint-700 animate-pulse-soft" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-softMint-100 text-softMint-800 border border-softMint-200">
                            New Document Analyzed & Integrated
                          </span>
                          <span className="text-xs text-slateInk-400 font-mono">Real-time sync</span>
                        </div>
                        <h3 className="font-serif text-lg font-semibold text-slateInk-900 mt-0.5">
                          {analyzedDocResult.title || 'Clinical Analysis Results'}
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setActiveTab('intake')}
                        className="px-3.5 py-1.5 rounded-xl bg-tranquil-50 hover:bg-tranquil-100 text-tranquil-800 text-xs font-semibold border border-tranquil-200 transition-colors"
                      >
                        View Full Intake Summary →
                      </button>
                      <button
                        onClick={() => setShowAnalyzedBanner(false)}
                        className="p-1.5 rounded-xl text-slateInk-400 hover:text-slateInk-700 hover:bg-slate-100 transition-colors"
                        title="Dismiss banner"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Key Extracted Findings Grid */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Metrics parsed */}
                    <div className="bg-[#F8FAFC] rounded-2xl p-3.5 border border-[#DCE2EA]">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slateInk-500">Biomarkers Extracted</p>
                      <p className="text-lg font-bold text-slateInk-900 mt-1">
                        {analyzedDocResult.extracted_biomarkers?.length || 0} Key Lab Signals
                      </p>
                      <div className="mt-2 space-y-1">
                        {analyzedDocResult.extracted_biomarkers?.slice(0, 2).map((bm: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-slateInk-600 font-medium">{bm.name}:</span>
                            <span className={`font-semibold ${bm.is_out_of_range ? 'text-peach-700' : 'text-softMint-700'}`}>
                              {bm.value} {bm.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Medication / Regimen Status */}
                    <div className="bg-[#F8FAFC] rounded-2xl p-3.5 border border-[#DCE2EA]">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slateInk-500">Medication / Regimen Status</p>
                      <p className="text-lg font-bold text-slateInk-900 mt-1">
                        {analyzedDocResult.extracted_medications?.length > 0 ? 'Adjunct Added' : 'Safety Verified'}
                      </p>
                      <p className="text-xs text-slateInk-600 mt-1">
                        {analyzedDocResult.extracted_medications?.[0]
                          ? `${analyzedDocResult.extracted_medications[0].name} (${analyzedDocResult.extracted_medications[0].dosage}) added to morning routine.`
                          : 'No drug interactions with Atorvastatin or Losartan detected.'}
                      </p>
                    </div>

                    {/* Clinical Correlation */}
                    <div className="bg-[#F8FAFC] rounded-2xl p-3.5 border border-[#DCE2EA]">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slateInk-500">Wearable Correlated Insight</p>
                      <p className="text-xs text-slateInk-700 leading-relaxed mt-1 line-clamp-3">
                        {analyzedDocResult.summary || 'Correlated with 8-day resting heart rate drift (+9 bpm) and sleep duration metrics.'}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* Headline Observation Card (Comforting Subtle Peach Accent) */}
              <section className="bg-[#FDF4EF] rounded-3xl p-7 sm:p-9 border border-[#F7C7B2] shadow-card relative overflow-hidden transition-all">
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 bg-white text-peach-700 text-xs font-semibold px-3 py-1 rounded-full border border-[#F7C7B2] shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-peach-600 animate-pulse-soft"></span>
                      Gentle Health Note • 8 Days
                    </span>
                    <span className="text-xs text-slateInk-500 font-sans">October Rhythm Drift</span>
                  </div>

                  <div>
                    <h2 className="font-serif text-2xl sm:text-3xl font-normal text-slateInk-900 tracking-tight leading-snug">
                      {patient?.flagged_pattern?.title || 'A steady shift in your resting rhythm'}
                    </h2>
                    <p className="text-slateInk-700 text-base sm:text-lg leading-relaxed mt-2 max-w-2xl font-light">
                      {patient?.flagged_pattern?.description ||
                        'Resting heart rate has risen 8 days in a row, from 69 to 78 bpm, accompanied by a 1.1-hour reduction in restful sleep.'}
                    </p>
                  </div>

                  {/* Clean 3-Signal Metric Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                    <div className="bg-white p-4 rounded-2xl border border-[#F7C7B2] shadow-xs">
                      <span className="text-[11px] font-medium text-slateInk-500 block">Resting Heart Rate</span>
                      <span className="text-lg font-serif font-bold text-peach-700 mt-0.5 block">69 → 78 bpm</span>
                      <span className="text-[11px] text-slateInk-500 mt-0.5 block">+9 bpm over 8 nights</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#F7C7B2] shadow-xs">
                      <span className="text-[11px] font-medium text-slateInk-500 block">Sleep Window</span>
                      <span className="text-lg font-serif font-bold text-lavender-700 mt-0.5 block">6.8 → 5.7 hours</span>
                      <span className="text-[11px] text-slateInk-500 mt-0.5 block">1.1h shorter than baseline</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#F7C7B2] shadow-xs">
                      <span className="text-[11px] font-medium text-slateInk-500 block">Skin Temperature</span>
                      <span className="text-lg font-serif font-bold text-softMint-700 mt-0.5 block">36.6 → 37.1°C</span>
                      <span className="text-[11px] text-slateInk-500 mt-0.5 block">+0.5° warm shift (safe zone)</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setIsDoctorModalOpen(true)}
                      className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-tranquil-600 text-white text-xs sm:text-sm font-semibold shadow-soft hover:bg-tranquil-700 border border-tranquil-700 transition-all transform active:scale-95"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Prepare Doctor Note (PDF)</span>
                    </button>
                    <a
                      href="#pattern-insight"
                      className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slateInk-800 text-xs sm:text-sm font-medium border border-[#DCE2EA] shadow-xs transition-all"
                    >
                      <span>View 8-Day Rhythm Details</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slateInk-500" />
                    </a>
                  </div>
                </div>
              </section>

              {/* Clean Sorted Readings (Crisp White Bento Grid) */}
              <section className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slateInk-500 font-sans">
                    Today's Biological Readings
                  </h3>
                  <span className="text-xs text-slateInk-500 font-sans">Compared with 90-day baseline</span>
                </div>

                {/* ========================================================================= */}
                {/* MODULE 2: Option 1.C — Morphing Shared Surface 2x2 Metric Cards           */}
                {/* ========================================================================= */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {metricCards.map((metric) => (
                    <motion.div
                      key={metric.id}
                      layoutId={`metric-card-${metric.id}`}
                      onClick={() => setSelectedMetric(metric)}
                      transition={cardSpring}
                      whileHover={{ y: -3, transition: microSpring }}
                      whileTap={{ scale: 0.98 }}
                      className="bg-white rounded-3xl p-6 border border-[#DCE2EA] shadow-card flex flex-col justify-between cursor-pointer hover:shadow-lg transition-shadow relative overflow-hidden group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <motion.span
                            layoutId={`metric-title-${metric.id}`}
                            className="text-xs font-medium text-slateInk-600"
                          >
                            {metric.name}
                          </motion.span>
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center ${
                            metric.id === 'rhr' ? 'bg-peach-100 text-peach-700' :
                            metric.id === 'temp' ? 'bg-softMint-100 text-softMint-700' :
                            metric.id === 'sleep' ? 'bg-lavender-100 text-lavender-700' :
                            'bg-tranquil-100 text-tranquil-700'
                          }`}>
                            <metric.icon className="w-3.5 h-3.5" />
                          </span>
                        </div>
                        <div className="flex items-baseline space-x-1.5">
                          <motion.span
                            layoutId={`metric-val-${metric.id}`}
                            className="text-3xl font-serif font-normal text-slateInk-900"
                          >
                            {metric.value}
                          </motion.span>
                          {metric.unit && (
                            <span className="text-xs font-medium text-slateInk-500">{metric.unit}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slateInk-500 mt-1">Usual envelope: {metric.usualRange}</p>
                      </div>

                      <div className="pt-4 mt-2 border-t border-[#DCE2EA]">
                        <motion.div layoutId={`metric-badge-${metric.id}`}>
                          {metric.isAlert ? (
                            <LiquidMetricBadge text={metric.statusText} />
                          ) : (
                            <span className="inline-block text-[11px] font-medium text-softMint-800 bg-softMint-100 px-2.5 py-0.5 rounded-full border border-softMint-200">
                              {metric.statusText}
                            </span>
                          )}
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Pattern Insight Section (Sorted & Comforting) */}
              <section id="pattern-insight" className="bg-white rounded-3xl p-7 sm:p-8 border border-[#DCE2EA] shadow-card space-y-6">
                <div className="border-b border-[#DCE2EA] pb-5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-tranquil-800 bg-tranquil-100 px-2.5 py-1 rounded-full border border-tranquil-200">
                    Observation Context
                  </span>
                  <h3 className="font-serif text-2xl font-normal text-slateInk-900 mt-2">Why these signals moved together</h3>
                  <p className="text-slateInk-600 text-sm mt-1 leading-relaxed max-w-3xl font-light">
                    Over the last 8 days, resting heart rate, sleep duration, and body temperature shifted simultaneously. When multiple biological indicators move together, the autonomic nervous system is typically managing cumulative workload fatigue or early immune defense.
                  </p>
                </div>

                {/* Day Selector Pill Row */}
                <div className="space-y-3 bg-[#F8FAFC] p-4 sm:p-5 rounded-2xl border border-[#DCE2EA]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slateInk-600">Select day:</span>
                    <span className="font-semibold text-slateInk-900 font-sans">
                      Day {selectedDay} {selectedDay === 8 ? '(Today)' : ''} — {currentDayInfo.rhr} • {currentDayInfo.sleep} sleep ({currentDayInfo.note})
                    </span>
                  </div>

                  <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(day => (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`py-2 px-1 rounded-xl text-center transition-all ${
                          selectedDay === day
                            ? 'bg-white border-2 border-tranquil-600 shadow-xs scale-105'
                            : 'bg-white border border-[#DCE2EA] hover:bg-slate-50'
                        }`}
                      >
                        <span className={`block text-[10px] ${selectedDay === day ? 'text-tranquil-700 font-semibold' : 'text-slateInk-400'}`}>
                          {day === 8 ? 'Today' : `D${day}`}
                        </span>
                        <span className={`block text-xs ${selectedDay === day ? 'font-bold text-slateInk-900' : 'font-medium text-slateInk-700'}`}>
                          {dayDataMap[day].rhr.split(' ')[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3 Clean Trajectory Rows */}
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA] flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="w-48 shrink-0">
                      <p className="font-semibold text-xs sm:text-sm text-slateInk-900">Resting Heart Rate</p>
                      <p className="text-[11px] text-slateInk-500">Baseline 69 → Current 78 bpm</p>
                    </div>
                    <div className="flex-1 max-w-md">
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-peach-500 rounded-full transition-all duration-500" style={{ width: '82%' }}></div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-peach-700 text-right shrink-0">
                      +9 bpm drift
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA] flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="w-48 shrink-0">
                      <p className="font-semibold text-xs sm:text-sm text-slateInk-900">Nightly Sleep</p>
                      <p className="text-[11px] text-slateInk-500">Baseline 6.8h → Current 5.7h</p>
                    </div>
                    <div className="flex-1 max-w-md">
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-lavender-500 rounded-full transition-all duration-500" style={{ width: '58%' }}></div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-lavender-700 text-right shrink-0">
                      -1.1h deficit
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA] flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="w-48 shrink-0">
                      <p className="font-semibold text-xs sm:text-sm text-slateInk-900">Oral Temperature</p>
                      <p className="text-[11px] text-slateInk-500">Baseline 36.6°C → Current 37.1°C</p>
                    </div>
                    <div className="flex-1 max-w-md">
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-softMint-500 rounded-full transition-all duration-500" style={{ width: '70%' }}></div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-softMint-700 text-right shrink-0">
                      +0.5° warm shift
                    </span>
                  </div>
                </div>

                {/* Table Toggle */}
                <div>
                  <button
                    onClick={() => setIsTrendTableOpen(!isTrendTableOpen)}
                    className="inline-flex items-center text-xs font-semibold text-tranquil-700 hover:text-tranquil-800 transition-colors"
                  >
                    <span>{isTrendTableOpen ? 'Hide daily 8-day reading log' : 'View daily 8-day reading log'}</span>
                    {isTrendTableOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 ml-1" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 ml-1" />
                    )}
                  </button>
                </div>

                {isTrendTableOpen && (
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA] overflow-x-auto text-xs animate-scroll-reveal">
                    <table className="w-full text-left font-sans text-xs">
                      <thead>
                        <tr className="text-slateInk-500 border-b border-[#DCE2EA] pb-1">
                          <th className="py-1 font-medium">Metric</th>
                          <th className="py-1">Day 1</th>
                          <th className="py-1">Day 3</th>
                          <th className="py-1">Day 5</th>
                          <th className="py-1">Day 7</th>
                          <th className="py-1">Day 8 (Today)</th>
                          <th className="py-1">Net Change</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DCE2EA] text-slateInk-700">
                        <tr>
                          <td className="py-2 font-medium text-slateInk-900">Resting HR</td>
                          <td>69 bpm</td>
                          <td>71 bpm</td>
                          <td>74 bpm</td>
                          <td>76 bpm</td>
                          <td className="font-semibold text-peach-700">78 bpm</td>
                          <td className="text-peach-700 font-semibold">+9 bpm</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-medium text-slateInk-900">Sleep</td>
                          <td>6.8 h</td>
                          <td>6.4 h</td>
                          <td>6.0 h</td>
                          <td>5.8 h</td>
                          <td className="font-semibold text-lavender-700">5.7 h</td>
                          <td className="text-lavender-700 font-semibold">-1.1 h</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-medium text-slateInk-900">Temperature</td>
                          <td>36.6°C</td>
                          <td>36.8°C</td>
                          <td>36.9°C</td>
                          <td>37.0°C</td>
                          <td className="font-semibold text-softMint-800">37.1°C</td>
                          <td className="text-softMint-700 font-semibold">+0.5°C</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Calming Clinical Guidance */}
                <div className="bg-[#FDF4EF] rounded-2xl p-4 sm:p-5 border border-[#F7C7B2] space-y-1.5">
                  <p className="text-xs sm:text-sm text-slateInk-800 leading-relaxed font-normal">
                    This subtle rise is not a diagnosis. It is a gentle prompt to rest tonight and discuss with your physician if the trajectory persists past 10 days.
                  </p>
                </div>
              </section>

              {/* ========================================================================= */}
              {/* MEDICINES FOR TODAY CHECKLIST (WITH TIME & BEFORE / AFTER MEAL)          */}
              {/* ========================================================================= */}
              <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#DCE2EA] shadow-card space-y-6 relative overflow-hidden">
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#DCE2EA]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-tranquil-100 text-tranquil-800 border border-tranquil-200 flex items-center gap-1.5">
                        <Pill className="w-3 h-3 text-tranquil-700" />
                        Daily Care Protocol
                      </span>
                      <span className="text-xs text-slateInk-400 font-sans">• Real-Time Regimen</span>
                    </div>
                    <h3 className="font-serif text-2xl font-normal text-slateInk-900 mt-1">
                      Medicines for Today
                    </h3>
                    <p className="text-xs sm:text-sm text-slateInk-600 mt-0.5 font-light">
                      Scheduled prescription regimen & supportive therapies, coordinated with specific clock times and meal intake.
                    </p>
                  </div>

                  {/* Adherence Progress Counter & Bar */}
                  <div className="flex flex-col sm:items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slateInk-600">Daily Adherence:</span>
                      <span className="text-xs font-bold text-softMint-800 bg-softMint-100 px-2.5 py-0.5 rounded-full border border-softMint-200">
                        {completedMedsCount} of {medications.length} taken ({medications.length > 0 ? Math.round((completedMedsCount / medications.length) * 100) : 0}%)
                      </span>
                    </div>
                    {/* Animated Progress Bar */}
                    <div className="w-full sm:w-48 h-2 bg-slate-100 rounded-full overflow-hidden border border-[#DCE2EA]">
                      <motion.div
                        className="h-full bg-gradient-to-r from-softMint-500 via-tranquil-500 to-softMint-400 rounded-full"
                        initial={false}
                        animate={{
                          width: `${medications.length > 0 ? (completedMedsCount / medications.length) * 100 : 0}%`
                        }}
                        transition={{ duration: 0.4, ease: fluidEase }}
                      />
                    </div>
                  </div>
                </div>

                {/* Filter Pills & Batch Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {(['All', 'Morning', 'Afternoon', 'Evening', 'Night'] as const).map(timing => {
                      const count = timing === 'All'
                        ? medications.length
                        : medications.filter(m => m.timing.toLowerCase() === timing.toLowerCase()).length;
                      const isActive = medTimingFilter === timing;

                      return (
                        <button
                          key={timing}
                          onClick={() => setMedTimingFilter(timing)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            isActive
                              ? 'bg-slateInk-900 text-white shadow-xs'
                              : 'bg-[#F8FAFC] text-slateInk-600 hover:bg-slate-100 border border-[#DCE2EA]'
                          }`}
                        >
                          <span>{timing}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slateInk-700'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Batch Action Buttons */}
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => handleMarkAllMedications(true)}
                      className="px-2.5 py-1 rounded-lg bg-softMint-50 text-softMint-800 hover:bg-softMint-100 border border-softMint-200/80 font-medium transition-colors cursor-pointer"
                    >
                      Mark All Taken
                    </button>
                    <button
                      onClick={() => handleMarkAllMedications(false)}
                      className="px-2.5 py-1 rounded-lg bg-slate-50 text-slateInk-600 hover:bg-slate-100 border border-[#DCE2EA] font-medium transition-colors cursor-pointer"
                    >
                      Reset All
                    </button>
                  </div>
                </div>

                {/* Main 2-Column Responsive Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left 7 Cols: Medicines Interactive Checklist */}
                  <div className="lg:col-span-7 space-y-3">
                    {medications
                      .filter(m => {
                        if (medTimingFilter === 'All') return true;
                        return m.timing.toLowerCase() === medTimingFilter.toLowerCase();
                      })
                      .sort((a, b) => {
                        const timeA = getMedicationTime(a);
                        const timeB = getMedicationTime(b);
                        const orderA = MED_TIME_SORT_ORDER[timeA] || 99;
                        const orderB = MED_TIME_SORT_ORDER[timeB] || 99;
                        return orderA - orderB;
                      })
                      .map(med => {
                        const medTime = getMedicationTime(med);
                        const mealInfo = getMedicationMealInfo(med);

                        return (
                          <div
                            key={med.id}
                            onClick={() => handleToggleMedication(med.id)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                              med.taken_today
                                ? 'bg-[#F8FAFC] border-[#DCE2EA] opacity-85 hover:opacity-100'
                                : 'bg-white border-[#DCE2EA] hover:border-tranquil-300 hover:shadow-xs'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              {/* Left Side: Checkbox, Name, Dose, Category */}
                              <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                                {/* Dopamine Checkbox */}
                                <div className="relative flex items-center justify-center w-6 h-6 mt-0.5 shrink-0">
                                  <motion.div
                                    key={med.taken_today ? 'taken' : 'pending'}
                                    initial={false}
                                    animate={
                                      toggledMedId === med.id
                                        ? { scale: [1, 1.3, 0.9, 1] }
                                        : { scale: 1 }
                                    }
                                    transition={{ duration: 0.35, ease: fluidEase }}
                                    className="flex items-center justify-center cursor-pointer"
                                  >
                                    {med.taken_today ? (
                                      <CheckCircle2 className="w-5 h-5 text-softMint-600 fill-softMint-100" />
                                    ) : (
                                      <Circle className="w-5 h-5 text-[#A7B3C2] group-hover:text-tranquil-600 transition-colors" />
                                    )}
                                  </motion.div>

                                  {/* Particle Burst on Click */}
                                  {burstMedId === med.id && (
                                    <span className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                      {BURST_PARTICLES.map((p, pIdx) => (
                                        <motion.span
                                          key={pIdx}
                                          className="absolute rounded-full pointer-events-none"
                                          style={{
                                            width: 4,
                                            height: 4,
                                            backgroundColor: p.color,
                                          }}
                                          initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                                          animate={{
                                            scale: [0, 1.4, 0],
                                            x: p.x * 1.2,
                                            y: p.y * 1.2,
                                            opacity: [1, 1, 0],
                                          }}
                                          transition={{ duration: 0.35, ease: fluidEase }}
                                        />
                                      ))}
                                    </span>
                                  )}
                                </div>

                                {/* Text Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="relative inline-block">
                                      <span
                                        className={`font-semibold text-sm transition-colors duration-200 ${
                                          med.taken_today ? 'text-slateInk-400' : 'text-slateInk-900'
                                        }`}
                                      >
                                        {med.name}
                                      </span>
                                      <motion.span
                                        className="absolute left-0 top-1/2 h-[1.5px] bg-slateInk-400 pointer-events-none"
                                        style={{ originX: 0, width: '100%' }}
                                        initial={false}
                                        animate={{ scaleX: med.taken_today ? 1 : 0 }}
                                        transition={microSpring}
                                      />
                                    </div>

                                    <span className="text-xs text-slateInk-500 font-medium">
                                      • {med.dosage}
                                    </span>

                                    <span className="text-[10px] font-medium text-slateInk-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60 hidden sm:inline-block">
                                      {med.category}
                                    </span>
                                  </div>

                                  <p className="text-[11px] text-slateInk-500 mt-1 line-clamp-1">
                                    {mealInfo.tip}
                                  </p>
                                </div>
                              </div>

                              {/* Right Side: TIME BADGE and BEFORE / AFTER MEAL BADGE */}
                              <div className="flex items-center gap-2 shrink-0 pl-9 sm:pl-0">
                                {/* Scheduled Time Badge */}
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-white border border-[#DCE2EA] text-slateInk-800 shadow-2xs">
                                  <Clock className="w-3.5 h-3.5 text-tranquil-600" />
                                  <span>{medTime}</span>
                                </span>

                                {/* Before / After Meal Badge */}
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border shadow-2xs ${mealInfo.badgeClass}`}
                                  title={mealInfo.tip}
                                >
                                  <Utensils className={`w-3.5 h-3.5 ${mealInfo.iconClass}`} />
                                  <span>{mealInfo.label}</span>
                                </span>

                                {/* Status Tag */}
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                    med.taken_today
                                      ? 'bg-softMint-100 text-softMint-800 border-softMint-200'
                                      : 'bg-slate-100 text-slateInk-500 border-slate-200'
                                  }`}
                                >
                                  {med.taken_today ? 'Taken ✓' : 'Due'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                    {medications.filter(m => medTimingFilter === 'All' || m.timing.toLowerCase() === medTimingFilter.toLowerCase()).length === 0 && (
                      <div className="p-8 text-center bg-[#F8FAFC] rounded-2xl border border-dashed border-[#DCE2EA]">
                        <p className="text-sm text-slateInk-500">No medicines scheduled for {medTimingFilter.toLowerCase()}.</p>
                      </div>
                    )}
                  </div>

                  {/* Right 5 Cols: Meal Timing Rationale Guide & Evening Wind-Down */}
                  <div className="lg:col-span-5 space-y-4">
                    {/* Meal Timing Clinical Guide Card */}
                    <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#DCE2EA] space-y-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-tranquil-100 flex items-center justify-center text-tranquil-700 shrink-0">
                          <Utensils className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slateInk-900">
                            Meal Timing Protocols
                          </h4>
                          <p className="text-[11px] text-slateInk-500">Biological reasons for time & meal coordination</p>
                        </div>
                      </div>

                      <div className="space-y-2.5 text-xs text-slateInk-700 pt-1">
                        <div className="p-3 rounded-xl bg-white border border-[#DCE2EA]">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-amber-800 flex items-center gap-1.5 text-xs">
                              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                              Before Meal / Bedtime
                            </span>
                            <span className="text-[10px] font-mono text-slateInk-400">09:45 PM</span>
                          </div>
                          <p className="text-[11px] text-slateInk-600 mt-1 leading-relaxed">
                            <strong>Magnesium Glycinate:</strong> Best absorbed on an emptier stomach prior to sleep to trigger parasympathetic vagal recovery and deepen slow-wave sleep.
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-white border border-[#DCE2EA]">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-tranquil-800 flex items-center gap-1.5 text-xs">
                              <span className="w-2 h-2 rounded-full bg-tranquil-500"></span>
                              With Meal / Breakfast
                            </span>
                            <span className="text-[10px] font-mono text-slateInk-400">08:00 AM</span>
                          </div>
                          <p className="text-[11px] text-slateInk-600 mt-1 leading-relaxed">
                            <strong>Metformin:</strong> Coordinated directly with breakfast food to blunt postprandial glucose spikes and protect the gastric mucosal barrier from GI irritation.
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-white border border-[#DCE2EA]">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-softMint-800 flex items-center gap-1.5 text-xs">
                              <span className="w-2 h-2 rounded-full bg-softMint-500"></span>
                              After Meal (Lunch & Dinner)
                            </span>
                            <span className="text-[10px] font-mono text-slateInk-400">01:00 PM & 08:00 PM</span>
                          </div>
                          <p className="text-[11px] text-slateInk-600 mt-1 leading-relaxed">
                            <strong>Vitamin D3, CoQ10 & Atorvastatin:</strong> Fat-soluble vitamins require dietary lipids for micellar transport, while statins target nocturnal liver cholesterol synthesis.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Evening Wind-Down Card */}
                    <div className="bg-gradient-to-br from-lavender-50 via-white to-lavender-50/50 rounded-2xl p-5 border border-lavender-200/90 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-lavender-800 bg-lavender-100 px-2.5 py-0.5 rounded-full border border-lavender-200">
                          Recovery Protocol
                        </span>
                        <span className="text-xs text-slateInk-500 font-mono font-medium">9:45 pm</span>
                      </div>

                      <h4 className="font-serif text-base font-semibold text-slateInk-900">
                        Protect your rest tonight
                      </h4>
                      <p className="text-xs text-slateInk-600 leading-relaxed font-light">
                        Because resting heart rate is elevated (+9 bpm over 8 days) and sleep dropped to 5.7h, log your night dose and enjoy a calming evening without strenuous screen work.
                      </p>

                      <div className="pt-2 border-t border-lavender-200/70 flex items-center justify-between text-xs text-slateInk-500">
                        <span>Care Circle: Rohan informed</span>
                        <span className="text-softMint-800 font-medium bg-softMint-100 px-2 py-0.5 rounded-full border border-softMint-200">
                          Synced with morning log
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

            </div>
          )}

          {/* ==================== TAB: DOCUMENT INTAKE & ANALYSIS (PRESCRIPTIONS, LABS & HOLTER) ==================== */}
          {activeTab === 'intake' && (
            <div className="space-y-8 animate-tab-switch">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-tranquil-100 text-tranquil-800 border border-tranquil-200">
                      Multi-Modal Clinical Intelligence
                    </span>
                    <span className="text-xs text-slateInk-400 font-sans">FastAPI & AI Vision</span>
                  </div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-normal text-slateInk-900 mt-1">
                    Upload Documents, Reports & Prescriptions
                  </h2>
                  <p className="text-slateInk-600 text-sm mt-1 max-w-2xl font-light">
                    Upload official laboratory panels, physician prescriptions, or ambulatory ECG strips. Vigil tokenizes the clinical findings, audits pharmacological contraindications, and correlates findings with your 90-day wearable physiological baseline.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-softMint-100 text-softMint-800 border border-softMint-200 text-xs font-medium">
                    <ShieldCheck className="w-4 h-4 text-softMint-700" />
                    HIPAA & De-identified
                  </span>
                </div>
              </div>

              {/* 3 Quick Demo Preset Tiles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slateInk-500 font-sans">
                    Quick Clinical Presets for Demonstration
                  </p>
                  <span className="text-xs text-slateInk-400">Click a sample to test analysis</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* Preset 1: Quest Comprehensive Metabolic & Lipid Panel (Lab Report) */}
                  <div
                    onClick={() => {
                      setSelectedDocumentPreset('quest_panel');
                      setUploadedFile(null);
                    }}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer card-hover-effect relative ${
                      selectedDocumentPreset === 'quest_panel'
                        ? 'bg-white border-2 border-tranquil-600 shadow-md ring-2 ring-tranquil-100'
                        : 'bg-white border-[#DCE2EA] shadow-xs hover:border-tranquil-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-9 h-9 rounded-2xl bg-tranquil-100 text-tranquil-700 flex items-center justify-center font-bold text-xs">
                        LAB
                      </div>
                      <span className="text-[10px] font-semibold text-tranquil-800 bg-tranquil-50 border border-tranquil-200 px-2 py-0.5 rounded-full">
                        Lab Report
                      </span>
                    </div>
                    <h3 className="font-serif text-sm font-semibold text-slateInk-900 mt-2.5">
                      Quest Diagnostics Metabolic & Lipid Panel
                    </h3>
                    <p className="text-xs text-slateInk-500 mt-1 line-clamp-2">
                      Venous blood serum panel: hs-CRP, LDL Cholesterol, Fasting Glucose, eGFR, ALT.
                    </p>
                    <div className="mt-3 pt-2.5 border-t border-[#DCE2EA] flex items-center justify-between text-[11px]">
                      <span className="text-slateInk-400 font-mono">14 Biomarkers</span>
                      <span className="text-peach-700 font-medium">hs-CRP 3.4 mg/L</span>
                    </div>
                  </div>

                  {/* Preset 2: Dr. Sarah Jenkins Rx Prescription Slip (Prescription) */}
                  <div
                    onClick={() => {
                      setSelectedDocumentPreset('jenkins_rx');
                      setUploadedFile(null);
                    }}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer card-hover-effect relative ${
                      selectedDocumentPreset === 'jenkins_rx'
                        ? 'bg-white border-2 border-tranquil-600 shadow-md ring-2 ring-tranquil-100'
                        : 'bg-white border-[#DCE2EA] shadow-xs hover:border-tranquil-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-9 h-9 rounded-2xl bg-softMint-100 text-softMint-700 flex items-center justify-center font-bold text-xs">
                        Rx
                      </div>
                      <span className="text-[10px] font-semibold text-softMint-800 bg-softMint-50 border border-softMint-200 px-2 py-0.5 rounded-full">
                        Prescription
                      </span>
                    </div>
                    <h3 className="font-serif text-sm font-semibold text-slateInk-900 mt-2.5">
                      Dr. Sarah Jenkins Rx (CoQ10 Adjunct)
                    </h3>
                    <p className="text-xs text-slateInk-500 mt-1 line-clamp-2">
                      CoQ10 (Ubiquinol 100mg) statin adjunct with Atorvastatin 20mg and Magnesium Glycinate.
                    </p>
                    <div className="mt-3 pt-2.5 border-t border-[#DCE2EA] flex items-center justify-between text-[11px]">
                      <span className="text-slateInk-400 font-mono">Mercy Cardiology</span>
                      <span className="text-softMint-700 font-medium">Care Protocol</span>
                    </div>
                  </div>

                  {/* Preset 3: Mercy Health Hospital Discharge Summary (Discharge Summary) */}
                  <div
                    onClick={() => {
                      setSelectedDocumentPreset('mercy_discharge');
                      setUploadedFile(null);
                    }}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer card-hover-effect relative ${
                      selectedDocumentPreset === 'mercy_discharge'
                        ? 'bg-white border-2 border-tranquil-600 shadow-md ring-2 ring-tranquil-100'
                        : 'bg-white border-[#DCE2EA] shadow-xs hover:border-tranquil-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-9 h-9 rounded-2xl bg-peach-100 text-peach-700 flex items-center justify-center font-bold text-xs">
                        SUM
                      </div>
                      <span className="text-[10px] font-semibold text-peach-800 bg-peach-50 border border-peach-200 px-2 py-0.5 rounded-full">
                        Discharge Summary
                      </span>
                    </div>
                    <h3 className="font-serif text-sm font-semibold text-slateInk-900 mt-2.5">
                      Mercy Hospital Inpatient Discharge Summary
                    </h3>
                    <p className="text-xs text-slateInk-500 mt-1 line-clamp-2">
                      Evaluated for 8-day RHR rise and sleep deficit. Troponin negative, discharge diagnoses & directives.
                    </p>
                    <div className="mt-3 pt-2.5 border-t border-[#DCE2EA] flex items-center justify-between text-[11px]">
                      <span className="text-slateInk-400 font-mono">Admit: Oct 08–10</span>
                      <span className="text-peach-700 font-medium">Troponin Negative</span>
                    </div>
                  </div>

                  {/* Preset 4: Ambulatory Holter Rhythm Strip (Diagnostic Record) */}
                  <div
                    onClick={() => {
                      setSelectedDocumentPreset('holter_ecg');
                      setUploadedFile(null);
                    }}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer card-hover-effect relative ${
                      selectedDocumentPreset === 'holter_ecg'
                        ? 'bg-white border-2 border-tranquil-600 shadow-md ring-2 ring-tranquil-100'
                        : 'bg-white border-[#DCE2EA] shadow-xs hover:border-tranquil-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-9 h-9 rounded-2xl bg-lavender-100 text-lavender-700 flex items-center justify-center font-bold text-xs">
                        ECG
                      </div>
                      <span className="text-[10px] font-semibold text-lavender-800 bg-lavender-50 border border-lavender-200 px-2 py-0.5 rounded-full">
                        Diagnostic Record
                      </span>
                    </div>
                    <h3 className="font-serif text-sm font-semibold text-slateInk-900 mt-2.5">
                      Ambulatory 24h Holter Rhythm Strip
                    </h3>
                    <p className="text-xs text-slateInk-500 mt-1 line-clamp-2">
                      24h telemetry correlating nocturnal tachycardia arousals (91 bpm) with wearable logs. No malignant arrhythmia.
                    </p>
                    <div className="mt-3 pt-2.5 border-t border-[#DCE2EA] flex items-center justify-between text-[11px]">
                      <span className="text-slateInk-400 font-mono">112,410 Beats</span>
                      <span className="text-lavender-700 font-medium">Benign Sinus</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Dropzone & Analysis Engine */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#DCE2EA] shadow-card space-y-6 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCE2EA] pb-4">
                  <div>
                    <h3 className="font-serif text-xl font-normal text-slateInk-900">
                      Document Processing & Visualizer
                    </h3>
                    <p className="text-xs text-slateInk-500 mt-0.5">
                      Selected: <strong className="text-slateInk-900 font-semibold">{uploadedFile ? uploadedFile.name : selectedDocumentPreset === 'quest_panel' ? 'Quest Metabolic & Lipid Panel' : selectedDocumentPreset === 'jenkins_rx' ? 'Dr. Sarah Jenkins Rx Slip' : 'Ambulatory Holter Strip (24h)'}</strong>
                    </p>
                  </div>

                  <button
                    onClick={() => handleRunDocumentAnalysis()}
                    disabled={isAnalyzingDoc}
                    className="inline-flex items-center justify-center space-x-2 px-6 py-2.5 rounded-2xl bg-tranquil-600 hover:bg-tranquil-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold shadow-soft border border-tranquil-700 transition-all transform active:scale-95"
                  >
                    {isAnalyzingDoc ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Analyzing with Vigil AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-white" />
                        <span>Analyze & Present to Dashboard</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Dropzone Container */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      setUploadedFile(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all relative overflow-hidden ${
                    isDraggingFile
                      ? 'border-tranquil-500 bg-tranquil-50/60'
                      : isAnalyzingDoc
                      ? 'border-softMint-400 bg-[#F8FAFC]'
                      : 'border-[#CCD4DF] bg-[#F8FAFC] hover:border-tranquil-400'
                  }`}
                >
                  {/* Laser Scan Animation Bar during analysis */}
                  {isAnalyzingDoc && (
                    <div className="absolute inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-softMint-500 to-transparent shadow-[0_0_12px_rgba(74,150,113,0.8)] animate-laser-scan pointer-events-none" />
                  )}

                  <div className="max-w-md mx-auto space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-[#DCE2EA] shadow-xs flex items-center justify-center mx-auto text-tranquil-600">
                      <UploadCloud className={`w-7 h-7 ${isAnalyzingDoc ? 'animate-bounce text-softMint-600' : 'text-tranquil-600'}`} />
                    </div>

                    <div>
                      <h4 className="font-serif text-base font-semibold text-slateInk-900">
                        {uploadedFile ? uploadedFile.name : 'Drag & drop reports, scans or prescriptions here'}
                      </h4>
                      <p className="text-xs text-slateInk-500 mt-1">
                        Supports PDF lab reports, prescription images (PNG/JPG), and Holter rhythm strips up to 50MB
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-center space-x-3">
                      <label className="px-4 py-2 rounded-2xl bg-white hover:bg-slate-50 border border-[#DCE2EA] text-xs font-semibold text-slateInk-800 shadow-xs cursor-pointer transition-colors">
                        Browse Local Files
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.dcm"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              setUploadedFile(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                      {uploadedFile && (
                        <button
                          onClick={() => setUploadedFile(null)}
                          className="text-xs text-peach-700 hover:text-peach-800 font-medium"
                        >
                          Clear File
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Multi-Stage AI Laser Progress Box */}
                {isAnalyzingDoc && (
                  <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA] space-y-3 animate-scroll-reveal">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-softMint-600 animate-pulse"></span>
                        <span className="font-semibold text-slateInk-900">
                          {analysisStage === 1 && 'Stage 1/4: High-fidelity optical character tokenization & OCR parsing...'}
                          {analysisStage === 2 && 'Stage 2/4: Cross-referencing 90-day continuous wearable baselines (Oura & HealthKit)...'}
                          {analysisStage === 3 && 'Stage 3/4: Auditing biomarker bounds and pharmacological contraindications...'}
                          {analysisStage === 4 && 'Stage 4/4: Synthesizing clinical correlations & formatting dashboard presentation...'}
                        </span>
                      </div>
                      <span className="font-mono text-softMint-800 font-semibold">{analysisStage * 25}%</span>
                    </div>

                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-softMint-500 via-tranquil-500 to-softMint-600 transition-all duration-500 rounded-full"
                        style={{ width: `${analysisStage * 25}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Analysis Completed Presentation Card */}
                {analyzedDocResult && !isAnalyzingDoc && (
                  <div className="p-6 rounded-3xl bg-[#F8FAFC] border-2 border-softMint-400 shadow-sm space-y-5 animate-scroll-reveal">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DCE2EA]">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-softMint-100 text-softMint-800 border border-softMint-200">
                            ✓ Analysis Complete & Integrated
                          </span>
                          <span className="text-xs text-slateInk-400 font-sans">
                            {analyzedDocResult.document_type}
                          </span>
                        </div>
                        <h4 className="font-serif text-lg font-semibold text-slateInk-900 mt-1">
                          {analyzedDocResult.title}
                        </h4>
                      </div>

                      <button
                        onClick={() => {
                          setActiveTab('today');
                          setShowAnalyzedBanner(true);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl bg-tranquil-600 hover:bg-tranquil-700 text-white text-xs font-semibold shadow-soft transition-all transform active:scale-95"
                      >
                        <span>Present Findings on Today's Dashboard →</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Summary */}
                    <p className="text-xs sm:text-sm text-slateInk-700 leading-relaxed bg-white p-4 rounded-2xl border border-[#DCE2EA]">
                      {analyzedDocResult.summary}
                    </p>

                    {/* Parsed Biomarkers Table */}
                    {analyzedDocResult.extracted_biomarkers?.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slateInk-500 font-sans block">
                          Extracted Biomarkers ({analyzedDocResult.extracted_biomarkers.length})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {analyzedDocResult.extracted_biomarkers.map((bm: any, idx: number) => (
                            <div
                              key={idx}
                              className={`p-3.5 rounded-2xl border bg-white ${
                                bm.is_out_of_range
                                  ? 'border-peach-300 ring-1 ring-peach-100'
                                  : 'border-[#DCE2EA]'
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slateInk-900">{bm.name}</span>
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                    bm.is_out_of_range
                                      ? 'bg-peach-100 text-peach-800 border border-peach-200'
                                      : 'bg-softMint-100 text-softMint-800 border border-softMint-200'
                                  }`}
                                >
                                  {bm.is_out_of_range ? 'Out of Range' : 'Normal'}
                                </span>
                              </div>
                              <div className="text-lg font-serif font-bold text-slateInk-900 mt-1">
                                {bm.value} <span className="text-xs font-sans text-slateInk-500">{bm.unit}</span>
                              </div>
                              <p className="text-[11px] text-slateInk-500 mt-0.5">Ref: {bm.reference_range}</p>
                              {bm.notes && (
                                <p className="text-[11px] text-slateInk-600 mt-1 italic">{bm.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Extracted Medications if any */}
                    {analyzedDocResult.extracted_medications?.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slateInk-500 font-sans block">
                          Pharmacological Additions / Regimen
                        </span>
                        <div className="space-y-2">
                          {analyzedDocResult.extracted_medications.map((med: any, idx: number) => {
                            const mealInfo = getMedicationMealInfo(med);
                            const medTime = getMedicationTime(med);
                            return (
                              <div key={idx} className="p-3.5 rounded-2xl bg-white border border-[#DCE2EA] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <p className="font-semibold text-xs text-slateInk-900">{med.name} • {med.dosage}</p>
                                  <p className="text-[11px] text-slateInk-500 mt-0.5">{med.instructions} • Timing: {med.timing}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-white border border-[#DCE2EA] text-slateInk-800">
                                    <Clock className="w-3 h-3 text-tranquil-600" />
                                    <span>{medTime}</span>
                                  </span>
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${mealInfo.badgeClass}`}>
                                    <Utensils className={`w-3 h-3 ${mealInfo.iconClass}`} />
                                    <span>{mealInfo.label}</span>
                                  </span>
                                  <span className="text-[10px] font-medium bg-softMint-100 text-softMint-800 border border-softMint-200 px-2 py-0.5 rounded-full">
                                    Added to Daily Regimen
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Extracted Clinical Diagnoses & ICD Codes */}
                    {analyzedDocResult.diagnoses?.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slateInk-500 font-sans block">
                          Extracted Clinical Diagnoses ({analyzedDocResult.diagnoses.length})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {analyzedDocResult.diagnoses.map((diag: any, idx: number) => (
                            <div key={idx} className="p-3 rounded-2xl bg-white border border-[#DCE2EA] flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-xs text-slateInk-900">{diag.condition}</p>
                                <p className="text-[11px] text-slateInk-500 mt-0.5 font-mono">ICD-10: {diag.icd10 || diag.icd_10_code || 'Clinical Assessment'}</p>
                              </div>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-peach-50 text-peach-800 border border-peach-200">
                                Diagnosed
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Extracted Chronological Dates */}
                    {analyzedDocResult.dates && (
                      <div className="p-3.5 rounded-2xl bg-white border border-[#DCE2EA] space-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slateInk-500 font-sans block">
                          Chronological Dates Detected
                        </span>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {analyzedDocResult.dates.document_date && (
                            <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slateInk-700 border border-slate-200 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slateInk-500" />
                              Doc Date: <strong>{analyzedDocResult.dates.document_date}</strong>
                            </span>
                          )}
                          {analyzedDocResult.dates.admission_date && (
                            <span className="px-2.5 py-1 rounded-xl bg-tranquil-50 text-tranquil-800 border border-tranquil-200 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-tranquil-600" />
                              Admission: <strong>{analyzedDocResult.dates.admission_date}</strong>
                            </span>
                          )}
                          {analyzedDocResult.dates.discharge_date && (
                            <span className="px-2.5 py-1 rounded-xl bg-softMint-50 text-softMint-800 border border-softMint-200 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-softMint-600" />
                              Discharge: <strong>{analyzedDocResult.dates.discharge_date}</strong>
                            </span>
                          )}
                          {analyzedDocResult.dates.follow_up_date && (
                            <span className="px-2.5 py-1 rounded-xl bg-peach-50 text-peach-800 border border-peach-200 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-peach-600" />
                              Follow-Up: <strong>{analyzedDocResult.dates.follow_up_date}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* AI Health Summary in Simple Language Preview */}
                    {analyzedDocResult.ai_health_summary && (
                      <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] space-y-2.5">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-softMint-700" />
                          <h5 className="text-xs font-semibold uppercase tracking-wider text-softMint-900 font-sans">
                            AI Plain-Language Summary
                          </h5>
                        </div>
                        <p className="text-xs text-slateInk-800 leading-relaxed">
                          {analyzedDocResult.ai_health_summary.plain_language_overview}
                        </p>
                        {analyzedDocResult.ai_health_summary.action_items?.length > 0 && (
                          <div className="pt-2 border-t border-[#BBF7D0]">
                            <p className="text-[11px] font-semibold text-softMint-900 mb-1">Recommended Everyday Steps:</p>
                            <ul className="text-xs text-slateInk-700 space-y-1 list-disc list-inside">
                              {analyzedDocResult.ai_health_summary.action_items.slice(0, 3).map((item: string, idx: number) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB 2: NIGHT & REST (CALM CLINICAL REFLECTION) ==================== */}
          {activeTab === 'night-help' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#DCE2EA] shadow-card flex flex-col h-[75vh] animate-tab-switch">
              <header className="pb-4 border-b border-[#DCE2EA] flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-normal text-slateInk-900">Night Reflection & Health Notes</h2>
                  <p className="text-xs text-slateInk-500 mt-0.5 font-sans">
                    Personal clinical consultation grounded in your records & sensor streams
                  </p>
                </div>
                <span className="text-xs text-softMint-800 bg-softMint-100 border border-softMint-200 px-3 py-1 rounded-full font-medium">
                  Confidential & Encrypted
                </span>
              </header>

              {/* Chat Messages */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
                {chatMessages.length === 0 && (
                  <div className="text-center py-12 text-slateInk-400">
                    <Moon className="w-8 h-8 mx-auto mb-2 opacity-40 text-tranquil-600" />
                    <p className="text-sm font-serif">A quiet space for health questions.</p>
                    <p className="text-xs text-slateInk-500 mt-1">Ask about your sleep, vitals, or doctor notes.</p>
                  </div>
                )}

                {chatMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-end space-x-2 max-w-[85%]">
                      {msg.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-full bg-tranquil-100 text-tranquil-800 border border-tranquil-300 flex items-center justify-center shrink-0 mb-1 font-serif text-xs font-semibold">
                          V
                        </div>
                      )}
                      <div
                        className={`p-4 rounded-3xl text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-tranquil-700 text-white rounded-br-none shadow-soft'
                            : 'bg-[#F8FAFC] border border-[#DCE2EA] text-slateInk-900 rounded-bl-none shadow-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>

                        {msg.isStreaming && (
                          <span className="inline-block w-2 h-3.5 bg-slateInk-400 animate-pulse ml-1 align-middle"></span>
                        )}

                        {/* Citations */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-[#DCE2EA]">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slateInk-500 mb-1.5 flex items-center gap-1 font-sans">
                              <ShieldCheck className="w-3.5 h-3.5 text-softMint-700" />
                              Clinical Records & Lab References
                            </p>
                            <div className="space-y-1.5">
                              {msg.citations.map((cite, idx) => (
                                <div key={idx} className="bg-white border border-[#DCE2EA] rounded-xl p-2.5 text-xs">
                                  <div className="font-semibold text-slateInk-900 flex justify-between">
                                    <span>{cite.source}</span>
                                    <span className="text-[10px] text-slateInk-500 font-normal">{cite.relevance}</span>
                                  </div>
                                  <div className="text-slateInk-600 text-[11px] mt-0.5">{cite.detail}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {msg.created_at && (
                      <span className="text-[10px] text-slateInk-400 mt-1 px-1">
                        {msg.created_at}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Quick Prompts */}
              <div className="py-2 flex items-center space-x-2 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => handleSendMessage("Why is my resting heart rate climbing?")}
                  className="text-xs bg-[#F8FAFC] border border-[#DCE2EA] hover:bg-slate-100 px-3.5 py-1.5 rounded-full text-slateInk-800 whitespace-nowrap shrink-0 transition-colors"
                >
                  Heart rate trend
                </button>
                <button
                  onClick={() => handleSendMessage("What should I take for sleep tonight?")}
                  className="text-xs bg-[#F8FAFC] border border-[#DCE2EA] hover:bg-slate-100 px-3.5 py-1.5 rounded-full text-slateInk-800 whitespace-nowrap shrink-0 transition-colors"
                >
                  Sleep support tonight
                </button>
                <button
                  onClick={() => handleSendMessage("Review my latest cholesterol and glucose labs")}
                  className="text-xs bg-[#F8FAFC] border border-[#DCE2EA] hover:bg-slate-100 px-3.5 py-1.5 rounded-full text-slateInk-800 whitespace-nowrap shrink-0 transition-colors"
                >
                  Review latest labs
                </button>
              </div>

              {/* Input Form */}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="pt-2 flex items-center space-x-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  placeholder="Ask a question about your labs, sleep, or vitals..."
                  className="flex-1 bg-[#F8FAFC] border border-[#DCE2EA] focus:border-tranquil-600 focus:bg-white focus:outline-none rounded-2xl py-3 px-4 text-xs sm:text-sm text-slateInk-900 shadow-xs transition-all placeholder:text-slateInk-400"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isSending}
                  className="p-3 bg-tranquil-600 hover:bg-tranquil-700 disabled:opacity-40 text-white rounded-2xl transition-all shadow-soft"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* ==================== TAB 3: RECORDS, PLAIN LANGUAGE & UNIFIED PROFILE ==================== */}
          {activeTab === 'records' && (
            <div className="space-y-6 animate-tab-switch">
              {/* Header with Sub-Tab Navigation */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#DCE2EA]">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-tranquil-100 text-tranquil-800 border border-tranquil-200">
                      Unified Medical Intelligence
                    </span>
                    <span className="text-xs text-slateInk-400 font-sans">Core Health Record Pillars</span>
                  </div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-normal text-slateInk-900 mt-1">
                    Medical Records & Unified Profile
                  </h2>
                  <p className="text-slateInk-600 text-sm mt-0.5 max-w-2xl font-light">
                    Ingested diagnostic reports, empathetic plain-language interpretations, and chronological multi-source health timeline.
                  </p>
                </div>

                {/* Sub-tab Pill Switcher */}
                <div className="inline-flex p-1 bg-[#F1F5F9] rounded-2xl border border-[#DCE2EA] shadow-xs self-start sm:self-auto">
                  <button
                    onClick={() => setRecordsSubTab('reports')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      recordsSubTab === 'reports'
                        ? 'bg-white text-slateInk-900 shadow-xs border border-[#CBD5E1]'
                        : 'text-slateInk-600 hover:text-slateInk-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-tranquil-600" />
                    <span>Clinical Reports</span>
                  </button>

                  <button
                    onClick={() => setRecordsSubTab('plain_summary')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      recordsSubTab === 'plain_summary'
                        ? 'bg-white text-slateInk-900 shadow-xs border border-[#CBD5E1]'
                        : 'text-slateInk-600 hover:text-slateInk-900'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-softMint-600 animate-pulse-soft" />
                    <span>AI Plain-Language Summary</span>
                  </button>

                  <button
                    onClick={() => setRecordsSubTab('timeline')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      recordsSubTab === 'timeline'
                        ? 'bg-white text-slateInk-900 shadow-xs border border-[#CBD5E1]'
                        : 'text-slateInk-600 hover:text-slateInk-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-tranquil-600" />
                    <span>Unified Profile & Timeline</span>
                  </button>
                </div>
              </div>

              {/* ----------------- SUB-VIEW 1: CLINICAL REPORTS & OUT-OF-RANGE BIOMARKERS ----------------- */}
              {recordsSubTab === 'reports' && (
                <div className="space-y-6">
                  {/* Out of Range Biomarkers Banner (Subtle Peach Accent) */}
                  {outOfRangeBiomarkers.length > 0 && (
                    <section className="bg-[#FDF4EF] border border-[#F7C7B2] rounded-3xl p-5 sm:p-6 shadow-soft">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-peach-700 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-peach-600" />
                          Flagged Out-of-Range Biomarkers ({outOfRangeBiomarkers.length})
                        </h3>
                        <button
                          onClick={() => setRecordsSubTab('plain_summary')}
                          className="text-xs text-peach-800 hover:text-peach-900 font-semibold underline underline-offset-2 flex items-center gap-1"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-peach-700" />
                          Explain All in Plain Language →
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {outOfRangeBiomarkers.map((bio, i) => (
                          <div key={i} className="bg-white p-4 rounded-2xl border border-[#F7C7B2] shadow-xs card-hover-effect">
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-semibold text-slateInk-900">{bio.name}</span>
                              <span className="text-[10px] font-semibold text-peach-700 bg-peach-100 border border-peach-200 px-2 py-0.5 rounded-full">
                                Outside Target
                              </span>
                            </div>
                            <div className="text-xl font-serif text-slateInk-900 mt-1">
                              {bio.value} <span className="text-xs font-sans text-slateInk-500">{bio.unit}</span>
                            </div>
                            <p className="text-[11px] text-slateInk-500 mt-0.5">Ref: {bio.reference_range}</p>
                            {bio.interpretation && (
                              <p className="text-[11px] text-slateInk-600 mt-1 italic">{bio.interpretation}</p>
                            )}

                            <div className="mt-3 pt-2.5 border-t border-[#F1F5F9] flex justify-end">
                              <button
                                onClick={() => setExplainingModalBiomarker(bio)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-tranquil-700 hover:text-tranquil-900 transition-colors"
                              >
                                <Sparkles className="w-3 h-3 text-softMint-600" />
                                <span>Explain in Everyday Words →</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Diagnostic Reports Ingested */}
                  <div className="space-y-4">
                    {reports.map(report => (
                      <div key={report.id} className="bg-white rounded-3xl p-6 border border-[#DCE2EA] shadow-card card-hover-effect">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-semibold text-slateInk-400 uppercase tracking-wider font-sans">
                                {report.facility} • {report.date}
                              </span>
                            </div>
                            <h4 className="text-lg font-serif text-slateInk-900 mt-0.5">{report.title}</h4>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span className="text-xs bg-tranquil-100 text-tranquil-800 border border-tranquil-200 px-3 py-1 rounded-full font-medium">
                              {report.category}
                            </span>
                            <button
                              onClick={() => setRecordsSubTab('plain_summary')}
                              className="text-xs px-2.5 py-1 rounded-full bg-softMint-50 text-softMint-800 border border-softMint-200 hover:bg-softMint-100 transition-colors font-medium flex items-center gap-1"
                              title="View plain language translation"
                            >
                              <Sparkles className="w-3 h-3 text-softMint-600" />
                              <span>AI Explanation</span>
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slateInk-700 bg-[#F8FAFC] p-3.5 rounded-2xl mb-4 border border-[#DCE2EA] leading-relaxed">
                          {report.summary}
                        </p>

                        <div className="divide-y divide-[#DCE2EA]">
                          {report.biomarkers.map(bio => (
                            <div key={bio.id} className="py-2.5 flex items-center justify-between text-sm">
                              <div>
                                <div className="font-medium text-slateInk-900">{bio.name}</div>
                                <div className="text-xs text-slateInk-400">Ref: {bio.reference_range}</div>
                              </div>
                              <div className="text-right flex items-center gap-3">
                                <div>
                                  <div className="font-semibold text-slateInk-900 font-sans">
                                    {bio.value} {bio.unit}
                                  </div>
                                  <div>
                                    {bio.status === 'out_of_range' ? (
                                      <span className="inline-block text-[10px] font-medium text-peach-700 bg-peach-100 px-2 py-0.5 rounded-full border border-peach-200">
                                        Outside range
                                      </span>
                                    ) : (
                                      <span className="inline-block text-[10px] font-medium text-softMint-800 bg-softMint-100 px-2 py-0.5 rounded-full border border-softMint-200">
                                        Normal
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {bio.status === 'out_of_range' && (
                                  <button
                                    onClick={() => setExplainingModalBiomarker(bio)}
                                    className="p-1.5 rounded-xl bg-peach-50 text-peach-700 hover:bg-peach-100 border border-peach-200 transition-all text-xs"
                                    title="Explain what this means in plain language"
                                  >
                                    <HelpCircle className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ----------------- SUB-VIEW 2: AI HEALTH SUMMARY IN SIMPLE LANGUAGE ----------------- */}
              {recordsSubTab === 'plain_summary' && (
                <div className="space-y-6">
                  {/* Hero Overview Digest Card */}
                  <div className="bg-gradient-to-br from-[#F0FDF4] via-white to-[#F8FAFC] rounded-3xl p-6 sm:p-8 border-2 border-softMint-300 shadow-card space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-softMint-100 text-softMint-700 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-softMint-700" />
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-softMint-800 uppercase tracking-wider block font-sans">
                            Everyday Language Digest
                          </span>
                          <h3 className="font-serif text-xl sm:text-2xl font-normal text-slateInk-900">
                            {plainSummaryData?.summary_title || 'Plain-Language Health Intelligence Summary'}
                          </h3>
                        </div>
                      </div>

                      <span className="text-xs bg-white text-softMint-800 border border-softMint-200 px-3 py-1 rounded-full font-medium shadow-2xs">
                        Empathetic AI Translation
                      </span>
                    </div>

                    <p className="text-sm sm:text-base text-slateInk-800 leading-relaxed font-light">
                      {plainSummaryData?.plain_language_overview ||
                        'Overall, your diagnostic records show that your body is managing a mild recovery and inflammatory load. Your liver and kidneys are filtering waste cleanly and your heart muscle is structurally healthy. The primary focus areas are supporting your body\'s recovery from a recent sleep deficit to help calm your resting heart rate, and maintaining your evening cholesterol medication.'}
                    </p>

                    {/* Reassuring Normal Markers Banner */}
                    <div className="p-4 rounded-2xl bg-white border border-[#DCE2EA] flex items-start gap-3 shadow-xs">
                      <ShieldCheck className="w-5 h-5 text-softMint-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slateInk-900 font-sans">
                          Reassuring Clinical Confirmation
                        </h4>
                        <p className="text-xs text-slateInk-600 mt-0.5 leading-relaxed">
                          {plainSummaryData?.reassuring_findings ||
                            'Vital biomarkers including kidney filtration (eGFR: 96 mL/min) and liver enzymes (ALT: 24 U/L) are completely optimal. Serial troponin tests ruled out heart muscle damage.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section: What Abnormal Values Mean */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <div>
                        <h3 className="font-serif text-lg text-slateInk-900">What Your Abnormal Values Mean</h3>
                        <p className="text-xs text-slateInk-500">Plain-language explanations without confusing medical jargon</p>
                      </div>
                      <span className="text-xs text-peach-700 bg-peach-50 border border-peach-200 px-2.5 py-1 rounded-full font-medium">
                        {plainSummaryData?.abnormal_values?.length || 3} Attention Areas
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {(plainSummaryData?.abnormal_values || [
                        {
                          marker_name: "hs-CRP (C-Reactive Protein)",
                          your_value: "3.4 mg/L",
                          normal_range: "< 1.0 mg/L",
                          what_it_means: "Your level is higher than the standard target (< 1.0 mg/L). This suggests your body is dealing with active low-grade inflammation or recovery strain.",
                          why_it_happened: "Triggered by the combination of restricted sleep (5.7 hours average) and physiological fatigue over the last 8 days.",
                          what_to_ask_your_doctor: "Do you agree my 8-day resting heart rate rise and hs-CRP are driven by sleep debt and autonomic recovery load?"
                        },
                        {
                          marker_name: "LDL Cholesterol",
                          your_value: "142 mg/dL",
                          normal_range: "< 100 mg/dL",
                          what_it_means: "Your LDL level is above the desirable target (< 100 mg/dL). Over time, extra LDL particles can form fatty deposits inside blood vessels.",
                          why_it_happened: "Influenced by genetics, dietary saturated fats, and liver cholesterol clearance rates.",
                          what_to_ask_your_doctor: "Given my 142 mg/dL level, is continuing Atorvastatin 20mg daily adequate to lower LDL below 100 mg/dL?"
                        },
                        {
                          marker_name: "Fasting Glucose",
                          your_value: "106 mg/dL",
                          normal_range: "70 - 99 mg/dL",
                          what_it_means: "Your reading is slightly above the optimal 70–99 mg/dL threshold, indicating borderline impaired fasting glucose.",
                          why_it_happened: "Can result from acute stress hormones (cortisol) and poor sleep quality reducing morning insulin sensitivity.",
                          what_to_ask_your_doctor: "Should we check my HbA1c to assess longer-term 90-day glycemic trends?"
                        }
                      ]).map((item: any, idx: number) => (
                        <div key={idx} className="bg-white rounded-3xl p-5 sm:p-6 border border-[#DCE2EA] shadow-card space-y-3.5 card-hover-effect">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-xs font-semibold text-slateInk-900 font-sans block">{item.marker_name}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-lg font-serif font-bold text-peach-700">{item.your_value}</span>
                                <span className="text-xs text-slateInk-400 font-mono">(Normal: {item.normal_range})</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-peach-700 bg-peach-100 border border-peach-200 px-2 py-0.5 rounded-full">
                              Requires Attention
                            </span>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA]">
                              <span className="font-semibold text-slateInk-900 block mb-0.5">What this means:</span>
                              <p className="text-slateInk-700 leading-relaxed">{item.what_it_means}</p>
                            </div>

                            <div className="p-3 rounded-2xl bg-white border border-[#DCE2EA]">
                              <span className="font-semibold text-slateInk-900 block mb-0.5">Why it happened:</span>
                              <p className="text-slateInk-600 leading-relaxed">{item.why_it_happened}</p>
                            </div>

                            <div className="p-3 rounded-2xl bg-[#FEF3C7]/40 border border-[#FDE68A]">
                              <span className="font-semibold text-amber-900 block mb-0.5">What to ask your doctor:</span>
                              <p className="text-amber-800 italic leading-relaxed">"{item.what_to_ask_your_doctor}"</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Everyday Action Plan & Doctor Guide Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Action Plan */}
                    <div className="bg-white rounded-3xl p-6 border border-[#DCE2EA] shadow-card space-y-3">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-softMint-600" />
                        <h4 className="font-serif text-base font-semibold text-slateInk-900">Recommended Patient Action Plan</h4>
                      </div>
                      <ul className="space-y-2 text-xs text-slateInk-700">
                        {(plainSummaryData?.action_items || [
                          "Prioritize 7.5 to 8.5 hours of uninterrupted sleep to allow resting heart rate to stabilize.",
                          "Take Magnesium Glycinate 200mg 30 minutes before bedtime to support parasympathetic recovery.",
                          "Continue Atorvastatin 20mg nightly to optimize lipid profile and vascular protection.",
                          "Stay hydrated and avoid strenuous threshold cardio workouts until resting heart rate trend returns below 72 bpm."
                        ]).map((act: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 bg-[#F8FAFC] p-2.5 rounded-xl border border-[#DCE2EA]">
                            <span className="w-4 h-4 rounded-full bg-softMint-100 text-softMint-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="leading-relaxed">{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Doctor Discussion Guide */}
                    <div className="bg-white rounded-3xl p-6 border border-[#DCE2EA] shadow-card space-y-3">
                      <div className="flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-tranquil-600" />
                        <h4 className="font-serif text-base font-semibold text-slateInk-900">Physician Discussion Guide</h4>
                      </div>
                      <ul className="space-y-2 text-xs text-slateInk-700">
                        {(plainSummaryData?.doctor_discussion_guide || [
                          "My resting heart rate rose from 69 to 78 bpm over 8 days alongside hs-CRP of 3.4 mg/L. Do you agree this is driven by sleep debt and recovery load?",
                          "Should we recheck my hs-CRP and lipid panel in 4–6 weeks to confirm the trend is heading down?",
                          "Are there any additional magnesium or CoQ10 dosage timing tweaks you recommend for my evening routine?"
                        ]).map((guide: string, idx: number) => (
                          <li key={idx} className="bg-tranquil-50/50 p-3 rounded-xl border border-tranquil-200 text-tranquil-900 leading-relaxed italic">
                            "{guide}"
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------- SUB-VIEW 3: UNIFIED HEALTH PROFILE & CHRONOLOGICAL TIMELINE ----------------- */}
              {recordsSubTab === 'timeline' && (
                <div className="space-y-6">
                  {/* Unified Patient Profile Header Snapshot */}
                  <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#DCE2EA] shadow-card space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DCE2EA]">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-tranquil-100 text-tranquil-700 flex items-center justify-center font-bold text-lg">
                          {patient?.name?.[0] || 'E'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-serif text-xl font-semibold text-slateInk-900">
                              {unifiedProfileData?.full_name || patient?.name || 'Eleanor Vance'}
                            </h3>
                            <span className="text-[10px] font-semibold bg-softMint-100 text-softMint-800 border border-softMint-200 px-2 py-0.5 rounded-full">
                              Unified Health Profile
                            </span>
                          </div>
                          <p className="text-xs text-slateInk-500 mt-0.5">
                            Age: {unifiedProfileData?.age || 42} • Blood Type: {unifiedProfileData?.blood_type || 'O+'} • Primary MD: {unifiedProfileData?.primary_physician || 'Dr. Sarah Jenkins, MD, FACC'}
                          </p>
                        </div>
                      </div>

                      <div className="text-xs text-slateInk-500 bg-[#F8FAFC] px-3.5 py-2 rounded-2xl border border-[#DCE2EA]">
                        <span>Emergency Proxy: <strong>{unifiedProfileData?.emergency_contact?.name || 'David Vance'}</strong> ({unifiedProfileData?.emergency_contact?.phone || '+1 (555) 382-9104'})</span>
                      </div>
                    </div>

                    {/* Active Diagnoses & ICD Codes Grid */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slateInk-500 font-sans block">
                        Active Clinical Diagnoses & ICD-10 Classification
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {(diagnosesList.length > 0 ? diagnosesList : [
                          { condition_name: "Sinus Tachycardia Secondary to Sleep Deficit", icd_code: "R00.0", diagnosed_date: "10 Oct 2026", severity: "moderate" },
                          { condition_name: "Borderline Dyslipidemia (Elevated LDL)", icd_code: "E78.5", diagnosed_date: "04 Oct 2026", severity: "mild" },
                          { condition_name: "Subclinical Systemic Inflammation", icd_code: "R65.20", diagnosed_date: "28 Sep 2026", severity: "moderate" }
                        ]).slice(0, 3).map((diag: any, idx: number) => (
                          <div key={idx} className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA]">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slateInk-900">{diag.condition_name}</span>
                              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-peach-100 text-peach-800 border border-peach-200">
                                {diag.icd_code || 'ICD-10'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slateInk-500 mt-1">Diagnosed: {diag.diagnosed_date}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Organ System Matrix */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slateInk-500 font-sans block">
                        Organ System Biomarker Architecture
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-3 rounded-2xl bg-white border border-[#DCE2EA]">
                          <span className="text-[11px] text-slateInk-400 block font-medium">Cardiovascular & Lipid</span>
                          <span className="text-sm font-serif font-bold text-slateInk-900 mt-0.5 block">LDL 142 • RHR 78</span>
                          <span className="text-[10px] text-peach-700">Moderate Drift</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-white border border-[#DCE2EA]">
                          <span className="text-[11px] text-slateInk-400 block font-medium">Metabolic & Glycemic</span>
                          <span className="text-sm font-serif font-bold text-slateInk-900 mt-0.5 block">Glucose 106 • HbA1c 5.8%</span>
                          <span className="text-[10px] text-peach-700">Borderline</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-white border border-[#DCE2EA]">
                          <span className="text-[11px] text-slateInk-400 block font-medium">Immune & Inflammatory</span>
                          <span className="text-sm font-serif font-bold text-slateInk-900 mt-0.5 block">hs-CRP 3.4 • WBC 7.4</span>
                          <span className="text-[10px] text-peach-700">Elevated hs-CRP</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-white border border-[#DCE2EA]">
                          <span className="text-[11px] text-slateInk-400 block font-medium">Renal & Hepatic</span>
                          <span className="text-sm font-serif font-bold text-slateInk-900 mt-0.5 block">eGFR 96 • ALT 24</span>
                          <span className="text-[10px] text-softMint-700">Optimal Integrity</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chronological Multi-Source Timeline */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                      <div>
                        <h3 className="font-serif text-lg text-slateInk-900">Unified Chronological Timeline</h3>
                        <p className="text-xs text-slateInk-500">Cross-referencing hospital stays, prescriptions, labs, and wearable alerts</p>
                      </div>

                      {/* Category Filters */}
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        {['all', 'Hospital Care', 'Medications', 'Lab Diagnostics', 'Cardiovascular & Recovery'].map(cat => (
                          <button
                            key={cat}
                            onClick={() => setTimelineFilter(cat)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                              timelineFilter === cat
                                ? 'bg-tranquil-600 text-white shadow-xs'
                                : 'bg-white text-slateInk-600 border border-[#DCE2EA] hover:border-tranquil-300'
                            }`}
                          >
                            {cat === 'all' ? 'All Sources' : cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Timeline Event Feed */}
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E2E8F0]">
                      {(timelineEvents.length > 0 ? timelineEvents : [
                        {
                          id: 1,
                          date: "11 Oct 2026",
                          category: "Cardiovascular & Recovery",
                          title: "8-Day Consecutive Resting Heart Rate Elevation",
                          facility_or_source: "Apple Watch Continuous Stream",
                          summary: "Resting heart rate climbed steadily from 69 to 78 bpm over 8 consecutive days alongside shortened sleep (5.7h).",
                          plain_language_explanation: "Your smartwatch detected a multi-day upward drift in heart rate, indicating autonomic nervous system strain.",
                          status: "alert"
                        },
                        {
                          id: 2,
                          date: "10 Oct 2026",
                          category: "Hospital Care",
                          title: "Mercy Health Hospital Discharge Summary",
                          facility_or_source: "Mercy Trauma Center & Acute Care",
                          summary: "Inpatient telemetry monitoring confirmed benign sinus tachycardia. Serial troponins negative (< 0.01 ng/mL). Discharged with outpatient care directives.",
                          plain_language_explanation: "Hospital evaluation confirmed your heart is physically healthy, but your nervous system needs recovery and sleep.",
                          status: "completed"
                        },
                        {
                          id: 3,
                          date: "09 Oct 2026",
                          category: "Medications",
                          title: "Prescription Regimen Update (Dr. Sarah Jenkins)",
                          facility_or_source: "Mercy Cardiovascular Associates",
                          summary: "CoQ10 (Ubiquinol 100mg) initiated as statin adjunct. Confirmed ongoing Atorvastatin 20mg and Magnesium Glycinate 200mg.",
                          plain_language_explanation: "Your cardiologist added CoQ10 to protect your muscle energy while on cholesterol medication.",
                          status: "completed"
                        },
                        {
                          id: 4,
                          date: "07 Oct 2026",
                          category: "Diagnostics",
                          title: "24-Hour Ambulatory Holter Rhythm Strip",
                          facility_or_source: "Mercy Cardiology Telemetry",
                          summary: "24h average heart rate 74 bpm. Nocturnal arousal peaks at 91 bpm matching sleep awakenings. No ventricular arrhythmias.",
                          plain_language_explanation: "A 24-hour heart monitor verified that your daytime rhythm is normal and night spikes are caused by brief wakeups.",
                          status: "attention"
                        },
                        {
                          id: 5,
                          date: "04 Oct 2026",
                          category: "Lab Diagnostics",
                          title: "Comprehensive Metabolic Panel & Lipid Profile",
                          facility_or_source: "Quest Diagnostics Central Lab",
                          summary: "Elevated LDL Cholesterol (142 mg/dL) and Fasting Glucose (106 mg/dL). Normal liver (ALT 24 U/L) and renal filtration (eGFR 96 mL/min).",
                          plain_language_explanation: "Blood tests showed slightly high cholesterol and blood sugar, while your liver and kidneys are filtering cleanly.",
                          status: "attention"
                        }
                      ])
                        .filter((ev: any) => timelineFilter === 'all' || ev.category?.toLowerCase().includes(timelineFilter.toLowerCase()))
                        .map((ev: any) => (
                          <div key={ev.id} className="relative bg-white p-5 rounded-3xl border border-[#DCE2EA] shadow-xs card-hover-effect">
                            <span
                              className={`absolute -left-[27px] top-6 w-3 h-3 rounded-full border-2 border-white ring-2 ${
                                ev.status === 'alert'
                                  ? 'bg-peach-500 ring-peach-200'
                                  : ev.status === 'attention'
                                  ? 'bg-amber-500 ring-amber-200'
                                  : 'bg-softMint-500 ring-softMint-200'
                              }`}
                            />

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold font-mono text-slateInk-400">
                                  {ev.date}
                                </span>
                                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slateInk-700 border border-slate-200">
                                  {ev.category}
                                </span>
                              </div>
                              <span className="text-xs text-slateInk-500 font-sans">
                                {ev.facility_or_source}
                              </span>
                            </div>

                            <h4 className="font-serif text-base font-semibold text-slateInk-900 mt-1">
                              {ev.title}
                            </h4>

                            <p className="text-xs text-slateInk-600 mt-1 leading-relaxed">
                              {ev.summary}
                            </p>

                            {ev.plain_language_explanation && (
                              <div className="mt-3 p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-slateInk-700 flex items-start gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-softMint-600 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-semibold text-slateInk-900 block text-[11px]">Plain Language Meaning:</span>
                                  <p className="text-slateInk-700 leading-relaxed">{ev.plain_language_explanation}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Biomarker Explainer Quick Modal */}
              <AnimatePresence>
                {explainingModalBiomarker && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-[#DCE2EA] shadow-2xl space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-9 h-9 rounded-2xl bg-peach-100 text-peach-700 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-peach-700" />
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-peach-700 uppercase tracking-wider block font-sans">
                              Biomarker Translation
                            </span>
                            <h3 className="font-serif text-lg font-semibold text-slateInk-900">
                              {explainingModalBiomarker.name}
                            </h3>
                          </div>
                        </div>

                        <button
                          onClick={() => setExplainingModalBiomarker(null)}
                          className="p-1 rounded-xl text-slateInk-400 hover:text-slateInk-700 hover:bg-slate-100 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#FDF4EF] border border-[#F7C7B2] flex items-center justify-between text-xs">
                        <span className="font-medium text-peach-900">Your Reading:</span>
                        <span className="font-bold text-peach-800 font-serif text-base">
                          {explainingModalBiomarker.value} {explainingModalBiomarker.unit}
                        </span>
                        <span className="text-slateInk-500 font-mono text-[11px]">
                          Ref: {explainingModalBiomarker.reference_range}
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA]">
                          <span className="font-semibold text-slateInk-900 block mb-0.5">What this means for you:</span>
                          <p className="text-slateInk-700 leading-relaxed">
                            {explainingModalBiomarker.interpretation ||
                              `This biomarker is outside the standard reference benchmark. In Eleanor's case, it directly correlates with the 8-day consecutive resting heart rate drift and cumulative sleep deficit.`}
                          </p>
                        </div>

                        <div className="p-3 rounded-2xl bg-[#FEF3C7]/40 border border-[#FDE68A]">
                          <span className="font-semibold text-amber-900 block mb-0.5">Recommended question for Dr. Jenkins:</span>
                          <p className="text-amber-800 italic leading-relaxed">
                            "Given my {explainingModalBiomarker.name} reading of {explainingModalBiomarker.value} {explainingModalBiomarker.unit}, what recovery timeframe should we expect once sleep is restored?"
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => setExplainingModalBiomarker(null)}
                          className="px-4 py-2 rounded-2xl bg-tranquil-600 hover:bg-tranquil-700 text-white text-xs font-semibold shadow-soft transition-all"
                        >
                          Got It, Close
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ==================== TAB 4: ELABORATE FAMILY CIRCLE & ACCIDENT EMERGENCY SUITE ==================== */}
          {activeTab === 'family' && (
            <div className="space-y-7 animate-tab-switch">
              
              {/* Header with Quick Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#18202A]">
                    Family & Care Circle
                  </h2>
                  <p className="text-[#4F5F73] text-sm mt-0.5">
                    Connected caregivers, clinical contacts, and accident emergency credentials
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Stranger / First Responder Emergency Access Button */}
                  <button
                    onClick={() => setIsEmergencyModalOpen(true)}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-[#FDF4EF] hover:bg-[#FAECE4] text-[#B85732] text-xs font-semibold border border-[#F7C7B2] shadow-xs transition-all transform active:scale-95"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-peach-600 animate-pulse-soft" />
                    <span>Emergency Medical ID</span>
                  </button>

                  {/* Send "I'm OK" Check-in Button */}
                  <button
                    onClick={() => {
                      setCheckInSent(true);
                      setTimeout(() => setCheckInSent(false), 5000);
                    }}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-[#DCEDE4] hover:bg-[#CDE3D7] text-[#2B6449] text-xs font-semibold border border-[#BED5C9] shadow-xs transition-all transform active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5 text-softMint-700" />
                    <span>Send "I'm OK" Check-in</span>
                  </button>

                  {/* Invite Caregiver */}
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-tranquil-600 hover:bg-tranquil-700 text-white text-xs font-semibold shadow-soft transition-all transform active:scale-95"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-white" />
                    <span>Add Caregiver</span>
                  </button>
                </div>
              </div>

              {/* Check-In Sent Feedback Toast */}
              {checkInSent && (
                <div className="p-4 rounded-2xl bg-[#DCEDE4] border border-[#BED5C9] text-[#2B6449] text-xs flex items-center justify-between shadow-xs animate-scroll-reveal">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-softMint-600 animate-pulse-soft"></span>
                    <span className="font-semibold">Wellness check-in dispatched:</span>
                    <span>Rohan Kapoor, Sunita Sharma & Dr. Jenkins notified that you are feeling well.</span>
                  </div>
                  <button onClick={() => setCheckInSent(false)} className="text-[#2B6449] hover:text-[#193F2E] font-bold ml-2">
                    ✕
                  </button>
                </div>
              )}

              {/* ==================== ACCIDENT & STRANGER EMERGENCY CARD ==================== */}
              <section className="bg-[#FDF4EF] rounded-3xl p-6 sm:p-7 border border-[#F7C7B2] shadow-card relative overflow-hidden transition-all card-hover-effect">
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-[#F7C7B2]/30 rounded-full blur-2xl pointer-events-none animate-float-slow"></div>

                <div className="relative z-10 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center gap-1.5 bg-peach-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-xs">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        In Case of Accident / Emergency (ICE)
                      </span>
                      <span className="text-xs font-medium text-peach-800 bg-white px-2.5 py-0.5 rounded-full border border-[#F7C7B2]">
                        First Responder & Stranger Access
                      </span>
                    </div>

                    <button
                      onClick={() => setIsEmergencyModalOpen(true)}
                      className="inline-flex items-center space-x-1 text-xs font-semibold text-peach-800 hover:text-peach-900 underline underline-offset-4"
                    >
                      <span>Open Full-Screen Medical ID</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <h3 className="font-serif text-xl sm:text-2xl font-normal text-[#18202A]">
                      Emergency Information for First Responders & Good Samaritans
                    </h3>
                    <p className="text-[#4F5F73] text-xs sm:text-sm mt-1 leading-relaxed max-w-3xl font-light">
                      If the patient (<strong className="text-[#18202A]">Meera Sharma</strong>) is found injured, unconscious, or in an accident, use the clinical directives and one-tap emergency contacts below.
                    </p>
                  </div>

                  {/* Critical Clinical Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    <div className="bg-white p-3.5 rounded-2xl border border-[#DCE2EA] shadow-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E9CAE] block font-sans">
                        Blood Group
                      </span>
                      <span className="text-lg font-serif font-bold text-peach-700 mt-0.5 block">
                        O+ (Rh Positive)
                      </span>
                      <span className="text-[10px] text-[#4F5F73] mt-0.5 block">Universal Red Cell Donor</span>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-[#F7C7B2] shadow-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-peach-700 block font-sans">
                        ⚠️ Severe Allergies
                      </span>
                      <span className="text-xs font-bold text-peach-800 mt-0.5 block">
                        PENICILLIN (Anaphylaxis)
                      </span>
                      <span className="text-[10px] text-[#4F5F73] mt-0.5 block">Also avoid Sulfa antibiotics</span>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-[#DCE2EA] shadow-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E9CAE] block font-sans">
                        Trauma Medication Note
                      </span>
                      <span className="text-xs font-bold text-softMint-700 mt-0.5 block">
                        NO Blood Thinners
                      </span>
                      <span className="text-[10px] text-[#4F5F73] mt-0.5 block">Not on anticoagulants</span>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-[#DCE2EA] shadow-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E9CAE] block font-sans">
                        Medical Implants
                      </span>
                      <span className="text-xs font-bold text-[#18202A] mt-0.5 block">
                        None / No Pacemaker
                      </span>
                      <span className="text-[10px] text-[#4F5F73] mt-0.5 block">Organ Donor: Yes</span>
                    </div>
                  </div>

                  {/* Immediate 1-Tap Emergency Calling Links */}
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <a
                      href="tel:+15552348901"
                      className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-tranquil-600 text-white text-xs sm:text-sm font-semibold hover:bg-tranquil-700 shadow-soft transition-all transform active:scale-95"
                    >
                      <Phone className="w-4 h-4 text-white animate-pulse-soft" />
                      <span>Call Spouse: Rohan Kapoor (+1 555-234-8901)</span>
                    </a>

                    <a
                      href="tel:+15558724412"
                      className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-[#DCEDE4] hover:bg-[#CDE3D7] text-[#2B6449] text-xs sm:text-sm font-semibold border border-[#BED5C9] shadow-xs transition-all"
                    >
                      <Phone className="w-4 h-4 text-softMint-700" />
                      <span>Call Mother: Sunita Sharma (+1 555-872-4412)</span>
                    </a>

                    <span className="text-xs text-[#4F5F73] font-sans">
                      Hospital: <strong className="text-[#18202A]">Mercy Health Trauma Center</strong>
                    </span>
                  </div>
                </div>
              </section>

              {/* ==================== CARE NETWORK MEMBERS (ELABORATE GRID) ==================== */}
              <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h3 className="font-serif text-xl font-normal text-[#18202A]">Care Network Members</h3>
                    <p className="text-[#4F5F73] text-xs">People authorized to receive alerts, trends, and clinical briefs</p>
                  </div>
                  <span className="text-xs text-[#8E9CAE]">4 active links</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Member 1: Rohan Kapoor */}
                  <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#DCE2EA] shadow-card space-y-4 card-hover-effect">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-tranquil-100 text-tranquil-700 font-serif font-bold text-lg flex items-center justify-center border border-tranquil-200">
                          RK
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-serif text-base font-semibold text-[#18202A]">Rohan Kapoor</h4>
                            <span className="text-[10px] font-bold text-peach-800 bg-[#FDF4EF] px-2 py-0.5 rounded-full border border-[#F7C7B2]">
                              Primary Proxy
                            </span>
                          </div>
                          <p className="text-xs text-[#4F5F73]">Spouse • Emergency Contact</p>
                        </div>
                      </div>

                      <span className="text-[11px] font-medium text-softMint-800 bg-[#DCEDE4] border border-[#BED5C9] px-2.5 py-1 rounded-full animate-pulse-soft">
                        Live Sync: 8m ago
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[#4F5F73]">
                        <span>Direct Phone:</span>
                        <a href="tel:+15552348901" className="font-semibold text-[#18202A] hover:underline">
                          +1 (555) 234-8901
                        </a>
                      </div>
                      <div className="flex items-center justify-between text-[#4F5F73]">
                        <span>Shared Sensors:</span>
                        <span className="font-medium text-[#2C3847]">Oura Ring, GPS Beacon, Sleep Log</span>
                      </div>
                    </div>

                    {/* Permission Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] font-medium bg-[#F8FAFC] text-[#2C3847] px-2 py-0.5 rounded-md border border-[#DCE2EA]">
                        ✓ Real-Time Vitals
                      </span>
                      <span className="text-[10px] font-medium bg-[#F8FAFC] text-[#2C3847] px-2 py-0.5 rounded-md border border-[#DCE2EA]">
                        ✓ Emergency Override
                      </span>
                      <span className="text-[10px] font-medium bg-[#F8FAFC] text-[#2C3847] px-2 py-0.5 rounded-md border border-[#DCE2EA]">
                        ✓ Medication Tracking
                      </span>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#DCE2EA]">
                      <a
                        href="tel:+15552348901"
                        className="px-3 py-1.5 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 text-[#2C3847] text-xs font-medium border border-[#DCE2EA] transition-colors"
                      >
                        Call
                      </a>
                      <button
                        onClick={() => alert('Sending direct message to Rohan...')}
                        className="px-3 py-1.5 rounded-xl bg-tranquil-600 hover:bg-tranquil-700 text-white text-xs font-medium transition-colors shadow-soft"
                      >
                        Message
                      </button>
                    </div>
                  </div>

                  {/* Member 2: Sunita Sharma (Mother) */}
                  <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#DCE2EA] shadow-card space-y-4 card-hover-effect">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-[#DCEDE4] text-softMint-800 font-serif font-bold text-lg flex items-center justify-center border border-[#BED5C9]">
                          SS
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-serif text-base font-semibold text-[#18202A]">Sunita Sharma</h4>
                            <span className="text-[10px] font-semibold text-[#4F5F73] bg-[#F8FAFC] border border-[#DCE2EA] px-2 py-0.5 rounded-full">
                              Family
                            </span>
                          </div>
                          <p className="text-xs text-[#4F5F73]">Mother • Caregiver</p>
                        </div>
                      </div>

                      <span className="text-[11px] font-medium text-[#4F5F73] bg-[#F8FAFC] border border-[#DCE2EA] px-2.5 py-1 rounded-full">
                        Morning Digest
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[#4F5F73]">
                        <span>Direct Phone:</span>
                        <a href="tel:+15558724412" className="font-semibold text-[#18202A] hover:underline">
                          +1 (555) 872-4412
                        </a>
                      </div>
                      <div className="flex items-center justify-between text-[#4F5F73]">
                        <span>Notification Channel:</span>
                        <span className="font-medium text-[#2C3847]">SMS Digest at 9:00 am</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] font-medium bg-[#F8FAFC] text-[#2C3847] px-2 py-0.5 rounded-md border border-[#DCE2EA]">
                        ✓ Daily Wellness Check
                      </span>
                      <span className="text-[10px] font-medium bg-[#F8FAFC] text-[#2C3847] px-2 py-0.5 rounded-md border border-[#DCE2EA]">
                        ✓ Out-of-Range Alerts
                      </span>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#DCE2EA]">
                      <a
                        href="tel:+15558724412"
                        className="px-3 py-1.5 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 text-[#2C3847] text-xs font-medium border border-[#DCE2EA] transition-colors"
                      >
                        Call
                      </a>
                      <button
                        onClick={() => alert('Sending note to Sunita: "Hi Mom, my readings are steady today!"')}
                        className="px-3 py-1.5 rounded-xl bg-softMint-600 hover:bg-softMint-700 text-white text-xs font-medium transition-colors shadow-soft"
                      >
                        Send "Thinking of You"
                      </button>
                    </div>
                  </div>

                  {/* Member 3: Dr. Sarah Jenkins (Physician) */}
                  <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#DCE2EA] shadow-card space-y-4 card-hover-effect">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-[#EAE4F6] text-[#69509B] font-serif font-bold text-lg flex items-center justify-center border border-[#D9CDEE]">
                          Dr
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-serif text-base font-semibold text-[#18202A]">Dr. Sarah Jenkins</h4>
                            <span className="text-[10px] font-semibold text-softMint-800 bg-[#DCEDE4] border border-[#BED5C9] px-2 py-0.5 rounded-full">
                              Physician
                            </span>
                          </div>
                          <p className="text-xs text-[#4F5F73]">Internal Medicine • Mercy Health Center</p>
                        </div>
                      </div>

                      <span className="text-[11px] font-medium text-[#4F5F73] bg-[#F8FAFC] border border-[#DCE2EA] px-2.5 py-1 rounded-full">
                        Weekly Brief Sync
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[#4F5F73]">
                        <span>Clinic Phone:</span>
                        <a href="tel:+15554431200" className="font-semibold text-[#18202A] hover:underline">
                          +1 (555) 443-1200
                        </a>
                      </div>
                      <div className="flex items-center justify-between text-[#4F5F73]">
                        <span>Clinical Registry:</span>
                        <span className="font-mono text-[11px] text-[#2C3847]">NPI #18429401 • Mercy Health Chart</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] font-medium bg-[#F8FAFC] text-[#2C3847] px-2 py-0.5 rounded-md border border-[#DCE2EA]">
                        ✓ Diagnostic Labs
                      </span>
                      <span className="text-[10px] font-medium bg-[#F8FAFC] text-[#2C3847] px-2 py-0.5 rounded-md border border-[#DCE2EA]">
                        ✓ 8-Day Trajectory Brief
                      </span>
                      <span className="text-[10px] font-medium bg-[#F8FAFC] text-[#2C3847] px-2 py-0.5 rounded-md border border-[#DCE2EA]">
                        ✓ Medication Adherence
                      </span>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#DCE2EA]">
                      <a
                        href="tel:+15554431200"
                        className="px-3 py-1.5 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 text-[#2C3847] text-xs font-medium border border-[#DCE2EA] transition-colors"
                      >
                        Call Clinic
                      </a>
                      <button
                        onClick={() => setIsDoctorModalOpen(true)}
                        className="px-3 py-1.5 rounded-xl bg-tranquil-600 hover:bg-tranquil-700 text-white text-xs font-medium transition-colors shadow-soft"
                      >
                        View Doctor Brief
                      </button>
                    </div>
                  </div>

                  {/* Member 4: Aarav Sharma (Brother / Backup) */}
                  <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#DCE2EA] shadow-card space-y-4 card-hover-effect">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-[#F8FAFC] text-[#2C3847] font-serif font-bold text-lg flex items-center justify-center border border-[#DCE2EA]">
                          AS
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-serif text-base font-semibold text-[#18202A]">Aarav Sharma</h4>
                            <span className="text-[10px] font-semibold text-[#4F5F73] bg-[#F8FAFC] border border-[#DCE2EA] px-2 py-0.5 rounded-full">
                              Secondary Proxy
                            </span>
                          </div>
                          <p className="text-xs text-[#4F5F73]">Brother • Emergency Standby</p>
                        </div>
                      </div>

                      <span className="text-[11px] font-medium text-[#4F5F73] bg-[#F8FAFC] border border-[#DCE2EA] px-2.5 py-1 rounded-full">
                        Standby
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[#4F5F73]">
                        <span>Direct Phone:</span>
                        <a href="tel:+15553129980" className="font-semibold text-[#18202A] hover:underline">
                          +1 (555) 312-9980
                        </a>
                      </div>
                      <div className="flex items-center justify-between text-[#4F5F73]">
                        <span>Protocol:</span>
                        <span className="font-medium text-[#2C3847]">Alerted only if Rohan is unreachable</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] font-medium bg-[#F8FAFC] text-[#2C3847] px-2 py-0.5 rounded-md border border-[#DCE2EA]">
                        ✓ Backup Emergency Access
                      </span>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#DCE2EA]">
                      <a
                        href="tel:+15553129980"
                        className="px-3 py-1.5 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 text-[#2C3847] text-xs font-medium border border-[#DCE2EA] transition-colors"
                      >
                        Call
                      </a>
                      <button
                        onClick={() => alert('Caregiver settings for Aarav updated.')}
                        className="px-3 py-1.5 rounded-xl bg-white border border-[#DCE2EA] hover:bg-slate-50 text-[#2C3847] text-xs font-medium transition-colors"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* ==================== CARE CIRCLE SHARING PERMISSIONS (INTERACTIVE) ==================== */}
              <section className="bg-white rounded-3xl p-6 sm:p-7 border border-[#DCE2EA] shadow-card space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-lg font-normal text-[#18202A]">Sharing Rules & Notification Thresholds</h3>
                    <p className="text-[#4F5F73] text-xs">Configure how and when your care circle is alerted</p>
                  </div>
                  <span className="text-xs text-softMint-800 font-medium bg-[#DCEDE4] border border-[#BED5C9] px-2.5 py-1 rounded-full">
                    Privacy Shield Active
                  </span>
                </div>

                <div className="space-y-3 pt-2">
                  <div
                    onClick={() => setAutoSmsThreshold(!autoSmsThreshold)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA] cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[#18202A]">Send emergency SMS if resting HR exceeds 85 bpm for 3+ consecutive days</p>
                      <p className="text-[11px] text-[#4F5F73]">Alerts Rohan and Sunita with direct link to doctor's brief</p>
                    </div>
                    <div className={`w-10 h-6 flex items-center rounded-full p-1 duration-300 ${
                      autoSmsThreshold ? 'bg-softMint-600' : 'bg-[#C4CDD7]'
                    }`}>
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${
                        autoSmsThreshold ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </div>
                  </div>

                  <div
                    onClick={() => setShareSleepRecovery(!shareSleepRecovery)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA] cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[#18202A]">Share nightly sleep duration & autonomic recovery load with circle</p>
                      <p className="text-[11px] text-[#4F5F73]">Helps family understand when you require quiet restful evenings</p>
                    </div>
                    <div className={`w-10 h-6 flex items-center rounded-full p-1 duration-300 ${
                      shareSleepRecovery ? 'bg-softMint-600' : 'bg-[#C4CDD7]'
                    }`}>
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${
                        shareSleepRecovery ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </div>
                  </div>

                  <div
                    onClick={() => setShareMedicationStatus(!shareMedicationStatus)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA] cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[#18202A]">Include supportive medication adherence in weekly family digest</p>
                      <p className="text-[11px] text-[#4F5F73]">Shows completed daily supplements and hydration goals</p>
                    </div>
                    <div className={`w-10 h-6 flex items-center rounded-full p-1 duration-300 ${
                      shareMedicationStatus ? 'bg-softMint-600' : 'bg-[#C4CDD7]'
                    }`}>
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${
                        shareMedicationStatus ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </div>
                  </div>

                  <div
                    onClick={() => setAllowEmergencyGps(!allowEmergencyGps)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA] cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[#18202A]">Attach real-time GPS telemetry only if an acute emergency alert fires</p>
                      <p className="text-[11px] text-[#4F5F73]">Provides paramedics and primary responder instant location routing</p>
                    </div>
                    <div className={`w-10 h-6 flex items-center rounded-full p-1 duration-300 ${
                      allowEmergencyGps ? 'bg-softMint-600' : 'bg-[#C4CDD7]'
                    }`}>
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${
                        allowEmergencyGps ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </div>
                  </div>
                </div>
              </section>

              {/* ==================== CARE CIRCLE ACTIVITY STREAM ==================== */}
              <section className="bg-white rounded-3xl p-6 sm:p-7 border border-[#DCE2EA] shadow-card space-y-3">
                <h3 className="font-serif text-lg font-normal text-[#18202A]">Recent Care Circle Log</h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA]">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-2 h-2 rounded-full bg-softMint-600"></span>
                      <span className="font-medium text-[#18202A]">Rohan acknowledged morning resting heart rate observation</span>
                    </div>
                    <span className="text-[#8E9CAE]">Today 08:15 am</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA]">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-2 h-2 rounded-full bg-tranquil-600"></span>
                      <span className="font-medium text-[#18202A]">Weekly physiological brief auto-sent to Dr. Sarah Jenkins' clinic</span>
                    </div>
                    <span className="text-[#8E9CAE]">Friday 16:30 pm</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA]">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-2 h-2 rounded-full bg-peach-500"></span>
                      <span className="font-medium text-[#18202A]">Sunita Sharma received morning wellness check notification</span>
                    </div>
                    <span className="text-[#8E9CAE]">Thursday 09:00 am</span>
                  </div>
                </div>
              </section>

            </div>
          )}

        </main>
      </motion.div>

      {/* ========================================================================= */}
      {/* MODULE 1: Floating Animated Bottom Nav Bar on Mobile (layoutId="activeTab") */}
      {/* ========================================================================= */}
      <nav className="lg:hidden fixed bottom-3 inset-x-3 z-40 bg-white/95 backdrop-blur-md rounded-2xl border border-[#DCE2EA] shadow-float p-1.5 flex items-center justify-around">
        {[
          { id: 'today', label: 'Today', icon: Heart },
          { id: 'intake', label: 'Intake', icon: UploadCloud },
          { id: 'night-help', label: 'Night', icon: Moon },
          { id: 'records', label: 'Records', icon: FileText },
          { id: 'family', label: 'Circle', icon: Users },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative flex flex-col items-center py-1.5 px-3 rounded-xl text-[10px] font-medium transition-colors ${
                isActive ? 'text-slateInk-900 font-semibold' : 'text-slateInk-500 hover:text-slateInk-800'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-[#E8ECEF] rounded-xl -z-0 border border-[#DCE2EA]"
                  transition={cardSpring}
                />
              )}
              <span className="relative z-10 flex flex-col items-center">
                <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-tranquil-600' : 'text-slateInk-400'}`} />
                <span>{tab.label}</span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* ========================================================================= */}
      {/* MODULE 2: Option 1.C — Expanded Morphing Shared Surface Modal             */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedMetric && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              key="morph-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: fluidEase }}
              className="fixed inset-0 bg-[#18202A]/40 backdrop-blur-xs"
              onClick={() => setSelectedMetric(null)}
            />

            <motion.div
              key={`metric-modal-${selectedMetric.id}`}
              layoutId={`metric-card-${selectedMetric.id}`}
              transition={cardSpring}
              className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto bg-white rounded-3xl p-6 sm:p-7 shadow-float z-10 border border-[#DCE2EA]"
            >
              <div className="flex items-start justify-between pb-4 border-b border-[#DCE2EA]">
                <div>
                  <div className="flex items-center space-x-2 text-slateInk-500 mb-1">
                    <selectedMetric.icon className={`w-4 h-4 ${selectedMetric.iconColor}`} />
                    <motion.span
                      layoutId={`metric-title-${selectedMetric.id}`}
                      className="text-xs font-semibold tracking-wider uppercase text-slateInk-500"
                    >
                      {selectedMetric.name}
                    </motion.span>
                  </div>
                  <div className="flex items-baseline space-x-3 mt-1">
                    <motion.span
                      layoutId={`metric-val-${selectedMetric.id}`}
                      className="text-3xl font-serif font-bold text-slateInk-900 tracking-tight"
                    >
                      {selectedMetric.value} {selectedMetric.unit}
                    </motion.span>
                    <motion.div layoutId={`metric-badge-${selectedMetric.id}`}>
                      {selectedMetric.isAlert ? (
                        <LiquidMetricBadge text={selectedMetric.statusText} />
                      ) : (
                        <span className="inline-block text-[11px] font-medium text-softMint-800 bg-softMint-100 px-2.5 py-0.5 rounded-full border border-softMint-200">
                          {selectedMetric.statusText}
                        </span>
                      )}
                    </motion.div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  transition={microSpring}
                  onClick={() => setSelectedMetric(null)}
                  className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slateInk-600 transition-colors cursor-pointer"
                  title="Close details"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.35, ease: fluidEase }}
                className="space-y-5 pt-5"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slateInk-500">
                      8-Day Historical Trajectory
                    </h4>
                    <span className="text-xs text-slateInk-500">Envelope: {selectedMetric.usualRange}</span>
                  </div>
                  <div className="bg-[#F8FAFC] border border-[#DCE2EA] rounded-2xl p-4">
                    <div className="grid grid-cols-8 gap-2 items-end h-28 pt-4">
                      {selectedMetric.history8Day.map((pt, idx) => {
                        const numericVal = typeof pt.value === 'number' ? pt.value : parseFloat(String(pt.value));
                        let heightPct = 60;
                        if (selectedMetric.id === 'rhr') {
                          heightPct = Math.round(((numericVal - 65) / (80 - 65)) * 80 + 20);
                        } else if (selectedMetric.id === 'sleep') {
                          heightPct = Math.round(((numericVal - 5) / (8 - 5)) * 75 + 25);
                        } else if (selectedMetric.id === 'temp') {
                          heightPct = Math.round(((numericVal - 36.4) / (37.4 - 36.4)) * 75 + 25);
                        } else if (selectedMetric.id === 'bp') {
                          heightPct = Math.round(((numericVal - 120) / (132 - 120)) * 75 + 25);
                        }
                        const isToday = idx === 7;

                        return (
                          <div key={idx} className="flex flex-col items-center h-full justify-end group">
                            <span className="text-[10px] font-semibold text-slateInk-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {pt.value}
                            </span>
                            <div
                              className={`w-full rounded-t-lg transition-all ${
                                isToday
                                  ? selectedMetric.isAlert
                                    ? 'bg-peach-600'
                                    : 'bg-softMint-600'
                                  : 'bg-slate-200 group-hover:bg-slate-300'
                              }`}
                              style={{ height: `${Math.max(16, Math.min(100, heightPct))}%` }}
                            />
                            <span className={`text-[9px] mt-1.5 font-medium ${isToday ? 'text-slateInk-900 font-bold' : 'text-slateInk-400'}`}>
                              {pt.day.replace('Oct ', '')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="bg-[#F8FAFC] border border-[#DCE2EA] rounded-2xl p-4">
                  <div className="flex items-center space-x-2 text-slateInk-900 text-xs font-semibold mb-1">
                    <ShieldCheck className="w-4 h-4 text-softMint-600" />
                    <span>Clinical Threshold & Physiological Boundaries</span>
                  </div>
                  <p className="text-xs text-slateInk-600 leading-relaxed font-light">
                    {selectedMetric.clinicalThreshold}
                  </p>
                </div>

                <div className="bg-white border border-[#DCE2EA] rounded-2xl p-4 shadow-xs">
                  <div className="text-xs font-semibold text-slateInk-900 mb-1">
                    Empathetic Clinical Guidance
                  </div>
                  <p className="text-xs text-slateInk-600 leading-relaxed font-light">
                    {selectedMetric.guidance}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setSelectedMetric(null)}
                    className="text-xs font-medium text-slateInk-500 hover:text-slateInk-800 px-3 py-2 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      const query = selectedMetric.copilotPrompt;
                      setSelectedMetric(null);
                      setActiveTab('night-help');
                      handleSendMessage(query);
                    }}
                    className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-tranquil-600 text-white text-xs font-semibold hover:bg-tranquil-700 shadow-soft transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Ask Vigil Copilot about this</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODULE 5: Copilot Drawer Smooth Push with Spring Curve & Dimming           */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isCopilotOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              key="copilot-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 bg-[#18202A]/40 backdrop-blur-xs"
              onClick={() => setIsCopilotOpen(false)}
            />

            <motion.div
              key="copilot-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={drawerSpring}
              className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-5 border-l border-[#DCE2EA] z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#DCE2EA]">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-slateInk-900 text-amber-300">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-slateInk-900 text-base">Vigil Health Copilot</h3>
                </div>
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  transition={microSpring}
                  onClick={() => setIsCopilotOpen(false)}
                  className="p-1.5 rounded-lg text-slateInk-400 hover:text-slateInk-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto space-y-4 py-4 pr-1"
              >
                {chatMessages.map(msg => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: fluidEase }}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`p-3.5 rounded-2xl text-sm leading-relaxed max-w-[90%] ${
                        msg.role === 'user'
                          ? 'bg-slateInk-900 text-white rounded-br-none'
                          : 'bg-[#F8FAFC] border border-[#DCE2EA] text-slateInk-800 rounded-bl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.isStreaming && (
                        <motion.span
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                          className="inline-block w-2 h-3.5 bg-amber-400 rounded-xs ml-1 align-middle shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                        />
                      )}
                      {msg.citations && msg.citations.length > 0 && (
                        <AccordionCitations citations={msg.citations} />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="py-2 flex gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
                <button
                  onClick={() => handleSendMessage("What should I do about my elevated heart rate?")}
                  className="bg-slate-100 hover:bg-slate-200 text-slateInk-800 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer"
                >
                  Heart rate advice
                </button>
                <button
                  onClick={() => handleSendMessage("Are my medications all up to date?")}
                  className="bg-slate-100 hover:bg-slate-200 text-slateInk-800 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer"
                >
                  Medication status
                </button>
              </div>

              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="pt-2 flex items-center space-x-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  placeholder="Ask about labs, vitals, meds..."
                  className="flex-1 bg-[#F8FAFC] border border-[#DCE2EA] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-tranquil-600"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isSending}
                  className="bg-slateInk-900 text-white p-2.5 rounded-xl hover:bg-slateInk-800 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== USER PROFILE MODAL / HEALTH PASSPORT ==================== */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#18202A]/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-modal-enter">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-float border border-[#DCE2EA] my-auto space-y-6 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Top Header with Close */}
            <div className="flex items-start justify-between pb-4 border-b border-[#DCE2EA]">
              <div className="flex items-center space-x-3.5">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-[#DCEDE4] border-2 border-[#BED5C9] flex items-center justify-center font-serif text-2xl font-semibold text-softMint-900 shadow-xs animate-breathe">
                    {patient?.name ? patient.name.charAt(0) : 'M'}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-softMint-600 border-2 border-white flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  </span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-serif text-xl sm:text-2xl font-normal text-[#18202A]">
                      {patient?.name || 'Meera Sharma'}
                    </h3>
                    <span className="text-[11px] font-medium text-softMint-900 bg-[#DCEDE4] border border-[#BED5C9] px-2.5 py-0.5 rounded-full">
                      Active Member
                    </span>
                  </div>
                  <p className="text-xs text-[#4F5F73] font-sans mt-0.5">
                    Age 34 • ID #VG-89412 • Member since Oct 2024
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="p-2 text-[#8E9CAE] hover:text-[#18202A] hover:bg-slate-100 rounded-2xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Biological Stat Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#DCE2EA] text-center">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8E9CAE] block">Blood Type</span>
                <span className="text-sm font-serif font-semibold text-[#18202A] mt-0.5 block">O Positive</span>
              </div>
              <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#DCE2EA] text-center">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8E9CAE] block">Height</span>
                <span className="text-sm font-serif font-semibold text-[#18202A] mt-0.5 block">168 cm (5'6")</span>
              </div>
              <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#DCE2EA] text-center">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8E9CAE] block">Weight</span>
                <span className="text-sm font-serif font-semibold text-[#18202A] mt-0.5 block">58.4 kg</span>
              </div>
              <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#DCE2EA] text-center">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8E9CAE] block">Body Mass Index</span>
                <span className="text-sm font-serif font-semibold text-softMint-800 mt-0.5 block">20.7 (Optimal)</span>
              </div>
            </div>

            {/* Circular Health Arcs / Visual Readiness Meters */}
            <div className="p-4 sm:p-5 rounded-3xl bg-[#F8FAFC] border border-[#DCE2EA] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#4F5F73] font-sans">
                  Current Biological Equilibrium
                </span>
                <span className="text-xs text-[#8E9CAE]">Updated 10m ago</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Meter 1 */}
                <div className="bg-white p-3.5 rounded-2xl border border-[#DCE2EA] flex items-center space-x-3 shadow-xs">
                  <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                    <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-[#DCE2EA]"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-softMint-600 transition-all duration-1000"
                        strokeDasharray="76, 100"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="absolute text-xs font-bold text-[#18202A]">76%</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#18202A]">Autonomic Recovery</p>
                    <p className="text-[10px] text-[#4F5F73]">Moderate strain</p>
                  </div>
                </div>

                {/* Meter 2 */}
                <div className="bg-white p-3.5 rounded-2xl border border-[#DCE2EA] flex items-center space-x-3 shadow-xs">
                  <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                    <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-[#DCE2EA]"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-lavender-500 transition-all duration-1000"
                        strokeDasharray="64, 100"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="absolute text-xs font-bold text-[#18202A]">64%</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#18202A]">Sleep Score</p>
                    <p className="text-[10px] text-lavender-700">Recent deficit</p>
                  </div>
                </div>

                {/* Meter 3 */}
                <div className="bg-white p-3.5 rounded-2xl border border-[#DCE2EA] flex items-center space-x-3 shadow-xs">
                  <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                    <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-[#DCE2EA]"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-tranquil-600 transition-all duration-1000"
                        strokeDasharray="88, 100"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="absolute text-xs font-bold text-[#18202A]">88%</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#18202A]">Circadian Rhythm</p>
                    <p className="text-[10px] text-softMint-800">Optimal alignment</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Connected Ecosystem Card */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8E9CAE] mb-2.5 font-sans">
                Connected Sensor Ecosystem
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA] shadow-xs flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-[#DCEDE4] text-softMint-800 flex items-center justify-center">
                      <Battery className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#18202A]">Oura Ring Gen 3</p>
                      <p className="text-[10px] text-[#4F5F73]">Battery 88% • Streaming active</p>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-softMint-600 animate-pulse-soft"></span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA] shadow-xs flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-tranquil-100 text-tranquil-700 flex items-center justify-center">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#18202A]">Apple HealthKit</p>
                      <p className="text-[10px] text-[#4F5F73]">Auto-sync: Steps & Vitals</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-softMint-800 bg-[#DCEDE4] border border-[#BED5C9] px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Clinical Contacts & Medical Passport */}
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA] text-xs space-y-2.5">
              <div className="flex items-center justify-between font-medium pb-2 border-b border-[#DCE2EA]">
                <span className="text-[#4F5F73]">Primary Physician</span>
                <span className="text-[#18202A] font-semibold">Dr. Sarah Jenkins (Mercy Health)</span>
              </div>
              <div className="flex items-center justify-between font-medium pb-2 border-b border-[#DCE2EA]">
                <span className="text-[#4F5F73]">Emergency Contact</span>
                <span className="text-[#18202A] font-semibold">Rohan Kapoor (Spouse, +1 555-0192)</span>
              </div>
              <div className="flex items-center justify-between font-medium pb-2 border-b border-[#DCE2EA]">
                <span className="text-[#4F5F73]">Allergies & Sensitivities</span>
                <span className="text-peach-800 font-semibold">Penicillin (Severe Anaphylaxis)</span>
              </div>
              <div className="flex items-center justify-between font-medium">
                <span className="text-[#4F5F73]">Calibrated Baseline Window</span>
                <span className="text-softMint-800 font-semibold">90-Day Rolling Window</span>
              </div>
            </div>

            {/* Notification & Care Preferences Interactive Toggles */}
            <div className="space-y-2.5 pt-1">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8E9CAE] font-sans">
                Care Notifications & Permissions
              </h4>

              <div
                onClick={() => setNotifyCareCircle(!notifyCareCircle)}
                className="flex items-center justify-between p-3 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA] shadow-xs cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="text-xs font-semibold text-[#18202A]">Notify Care Circle on out-of-range patterns</p>
                  <p className="text-[10px] text-[#4F5F73]">Alerts Rohan if vitals drift for 3+ consecutive days</p>
                </div>
                <div className={`w-10 h-6 flex items-center rounded-full p-1 duration-300 cursor-pointer ${
                  notifyCareCircle ? 'bg-softMint-600' : 'bg-[#C4CDD7]'
                }`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${
                    notifyCareCircle ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </div>
              </div>

              <div
                onClick={() => setWindDownReminder(!windDownReminder)}
                className="flex items-center justify-between p-3 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA] shadow-xs cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="text-xs font-semibold text-[#18202A]">Evening recovery wind-down alert</p>
                  <p className="text-[10px] text-[#4F5F73]">Soft reminder at 9:45 pm when sleep debt is detected</p>
                </div>
                <div className={`w-10 h-6 flex items-center rounded-full p-1 duration-300 cursor-pointer ${
                  windDownReminder ? 'bg-softMint-600' : 'bg-[#C4CDD7]'
                }`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${
                    windDownReminder ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </div>
              </div>

              <div
                onClick={() => setAutoSyncDoctor(!autoSyncDoctor)}
                className="flex items-center justify-between p-3 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA] shadow-xs cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="text-xs font-semibold text-[#18202A]">Weekly clinical summary to Dr. Jenkins</p>
                  <p className="text-[10px] text-[#4F5F73]">Send Friday 1-page health digest ahead of appointments</p>
                </div>
                <div className={`w-10 h-6 flex items-center rounded-full p-1 duration-300 cursor-pointer ${
                  autoSyncDoctor ? 'bg-softMint-600' : 'bg-[#C4CDD7]'
                }`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${
                    autoSyncDoctor ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </div>
              </div>
            </div>

            {/* Profile Modal Footer Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#DCE2EA]">
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="px-4 py-2.5 rounded-2xl text-xs font-medium text-[#4F5F73] hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert('Complete Health Passport downloaded as PDF.');
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-tranquil-600 text-white text-xs font-semibold hover:bg-tranquil-700 shadow-soft transition-all transform active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Health Passport</span>
              </button>
            </div>

          </div>
        </div>
      )}

{/* ==================== DOCTOR'S NOTE MODAL ==================== */}
      {isDoctorModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#18202A]/40 backdrop-blur-xs flex items-center justify-center p-4 animate-modal-enter">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-float border border-[#DCE2EA] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE2EA]">
              <div>
                <h3 className="font-serif text-xl font-normal text-[#18202A]">Doctor's Visit Note</h3>
                <p className="text-xs text-[#4F5F73]">Summary prepared for your primary care consultation</p>
              </div>
              <button
                onClick={() => setIsDoctorModalOpen(false)}
                className="p-1.5 text-[#8E9CAE] hover:text-[#18202A] rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA] text-xs space-y-2 text-[#18202A] font-sans leading-relaxed">
              <p><strong>Patient:</strong> {patient?.name || 'Meera Sharma'} (34 years old)</p>
              <p><strong>Date:</strong> {patient?.greeting_date || '11 October'}</p>
              <p><strong>Chief Observation:</strong> A continuous 8-day gradual rise in resting heart rate (69 bpm to 78 bpm, +9 bpm over baseline).</p>
              <p><strong>Co-occurring Factors:</strong> Nightly sleep duration averaged 5.7 hours over this period (typical baseline is 7–9 hours). Oral body temperature is slightly elevated at 37.1°C (baseline 36.6°C).</p>
              <p><strong>Context & Questions for Doctor:</strong> Could this reflect autonomic fatigue from work strain, or the early stage of a mild infection? Should any routine blood counts or thyroid panels be considered?</p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setIsDoctorModalOpen(false)}
                className="px-4 py-2 rounded-2xl text-xs font-medium text-[#4F5F73] hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert('Note copied to clipboard & downloaded as a peaceful PDF.');
                  setIsDoctorModalOpen(false);
                }}
                className="px-4 py-2 rounded-2xl bg-tranquil-600 text-white text-xs font-semibold hover:bg-tranquil-700 shadow-soft transition-all transform active:scale-95"
              >
                Download PDF / Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ACCIDENT & STRANGER EMERGENCY MEDICAL ID MODAL ==================== */}
      {isEmergencyModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#18202A]/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-modal-enter">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-float border-2 border-[#F7C7B2] my-auto space-y-6 max-h-[94vh] overflow-y-auto">
            
            {/* Header: First Responder Banner */}
            <div className="flex items-start justify-between pb-4 border-b border-[#DCE2EA]">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 bg-peach-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-xs animate-pulse-soft">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    IN CASE OF ACCIDENT / EMERGENCY (ICE)
                  </span>
                  <span className="text-[11px] font-semibold text-peach-800 bg-[#FDF4EF] px-2.5 py-0.5 rounded-full border border-[#F7C7B2]">
                    National ID #ICE-9941-O+
                  </span>
                </div>
                <h3 className="font-serif text-2xl font-normal text-[#18202A]">
                  First Responder & Bystander Medical ID
                </h3>
                <p className="text-xs text-[#4F5F73] mt-1">
                  For paramedics, emergency doctors, and Good Samaritans assisting <strong className="text-[#18202A]">Meera Sharma</strong>.
                </p>
              </div>

              <button
                onClick={() => setIsEmergencyModalOpen(false)}
                className="p-2 text-[#8E9CAE] hover:text-[#18202A] hover:bg-slate-100 rounded-2xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bystander Guidance Callout */}
            <div className="p-4 rounded-2xl bg-[#FDF4EF] border border-[#F7C7B2] text-xs text-[#18202A] space-y-1.5">
              <p className="font-semibold text-peach-800 flex items-center space-x-1.5">
                <span>⚠️ Immediate Care Protocol</span>
              </p>
              <p className="leading-relaxed text-[#4F5F73]">
                If the patient is unconscious, disoriented, or in shock from an accident, review the critical allergy warnings below before administering emergency medications, and use the 1-tap call buttons to reach her family.
              </p>
            </div>

            {/* Critical Clinical Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              {/* Blood Group */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E9CAE] block font-sans">
                  Blood Group (Rh Factor)
                </span>
                <span className="text-2xl font-serif font-bold text-peach-700 mt-1 block">
                  O+ (Rh Positive)
                </span>
                <p className="text-[11px] text-[#4F5F73] mt-1">
                  Universal Red Cell Donor • Compatible with O+ and O- transfusion
                </p>
              </div>

              {/* Critical Drug Allergies */}
              <div className="p-4 rounded-2xl bg-[#FDF4EF] border border-[#F7C7B2]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-peach-700 block font-sans">
                  ⚠️ Severe Drug Allergy Alert
                </span>
                <span className="text-sm font-bold text-peach-900 mt-1 block">
                  PENICILLIN (Fatal Anaphylaxis)
                </span>
                <p className="text-[11px] text-peach-800 mt-1 leading-relaxed">
                  DO NOT administer penicillin, ampicillin, or related beta-lactams. Secondary allergy: Sulfa drugs.
                </p>
              </div>

              {/* Anticoagulant & Trauma Status */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E9CAE] block font-sans">
                  Trauma & Bleeding Directives
                </span>
                <span className="text-sm font-bold text-softMint-700 mt-1 block">
                  NOT on Anticoagulants
                </span>
                <p className="text-[11px] text-[#4F5F73] mt-1">
                  No active blood thinners (no warfarin or DOACs). Safe for emergent surgery.
                </p>
              </div>

              {/* Implants & Organ Donor */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E9CAE] block font-sans">
                  Implants & Organ Donor
                </span>
                <span className="text-sm font-bold text-[#18202A] mt-1 block">
                  No Pacemaker • Organ Donor: Yes
                </span>
                <p className="text-[11px] text-[#4F5F73] mt-1">
                  Safe for emergency defibrillation (AED) and immediate MRI diagnostics.
                </p>
              </div>

            </div>

            {/* Medical History & Current Supplements */}
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA] shadow-xs space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E9CAE] block font-sans">
                Baseline Medical Background
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#4F5F73]">
                <div>
                  <strong className="text-[#18202A]">Active Conditions:</strong> Mild episodic migraines, seasonal rhinitis. No cardiac or diabetic history.
                </div>
                <div>
                  <strong className="text-[#18202A]">Current Supplements:</strong> Vitamin D3 (1000 IU), Magnesium Glycinate (200mg nightly).
                </div>
                <div>
                  <strong className="text-[#18202A]">Hospital of Record:</strong> Mercy Health Trauma Center, Chicago IL.
                </div>
                <div>
                  <strong className="text-[#18202A]">Primary Care Physician:</strong> Dr. Sarah Jenkins (NPI #18429401).
                </div>
              </div>
            </div>

            {/* 1-Tap Emergency Calling for Bystanders & Responders */}
            <div className="space-y-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#4F5F73] font-sans block">
                Immediate Emergency Contacts (One-Tap Calling)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <a
                  href="tel:+15552348901"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-tranquil-600 text-white text-xs font-medium hover:bg-tranquil-700 shadow-soft transition-all transform active:scale-95"
                >
                  <div className="flex items-center space-x-2.5">
                    <Phone className="w-4 h-4 text-white animate-pulse-soft" />
                    <div>
                      <p className="font-semibold text-white">Call Rohan Kapoor</p>
                      <p className="text-[10px] text-tranquil-100">Spouse & Primary Medical Proxy</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-white font-bold">+1 555-234-8901</span>
                </a>

                <a
                  href="tel:+15558724412"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#DCEDE4] hover:bg-[#CDE3D7] border border-[#BED5C9] text-[#2B6449] text-xs font-medium shadow-xs transition-all"
                >
                  <div className="flex items-center space-x-2.5">
                    <Phone className="w-4 h-4 text-softMint-700" />
                    <div>
                      <p className="font-semibold text-[#18202A]">Call Sunita Sharma</p>
                      <p className="text-[10px] text-[#4F5F73]">Mother & Family Caregiver</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-[#2B6449] font-medium">+1 555-872-4412</span>
                </a>

                <a
                  href="tel:+15554431200"
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#F8FAFC] hover:bg-slate-100 border border-[#DCE2EA] text-[#18202A] text-xs font-medium transition-all"
                >
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-[#4F5F73]" />
                    <div>
                      <p className="font-semibold text-[#18202A]">Mercy Health Trauma ER</p>
                      <p className="text-[10px] text-[#4F5F73]">Clinical Emergency Intake</p>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-[#4F5F73]">+1 555-443-1200</span>
                </a>

                <a
                  href="tel:911"
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#FDF4EF] hover:bg-[#FAECE4] border border-[#F7C7B2] text-peach-900 text-xs font-semibold transition-all"
                >
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-peach-700" />
                    <span>Dial 911 (Emergency Services)</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-peach-800">911</span>
                </a>
              </div>
            </div>

            {/* Bystander Broadcast Accident Alert Trigger */}
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA] space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-[#18202A]">Bystander Emergency Broadcast</h4>
                  <p className="text-[11px] text-[#4F5F73]">
                    Immediately pings Rohan & Sunita with GPS coordinates and opens emergency channel
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEmergencyAlertDispatched(true);
                  }}
                  className="px-3.5 py-2 rounded-2xl bg-peach-600 hover:bg-peach-700 text-white text-xs font-semibold shadow-soft transition-all transform active:scale-95 shrink-0"
                >
                  {emergencyAlertDispatched ? 'Alert Re-broadcasted' : 'Broadcast Accident Alert'}
                </button>
              </div>

              {emergencyAlertDispatched && (
                <div className="p-3 rounded-xl bg-[#DCEDE4] border border-[#BED5C9] text-[#2B6449] text-xs space-y-1 animate-scroll-reveal">
                  <div className="flex items-center space-x-2 font-semibold">
                    <Check className="w-4 h-4 text-softMint-700" />
                    <span>Emergency alert dispatched to Care Circle!</span>
                  </div>
                  <p className="text-[11px] text-[#2B6449] pl-6">
                    Automated SMS sent to Rohan Kapoor (+1 555-234-8901) & Sunita Sharma (+1 555-872-4412) with current location beacon and medical ID link.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#DCE2EA]">
              <button
                onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(window.location.href);
                    setCopiedMedicalId(true);
                    setTimeout(() => setCopiedMedicalId(false), 3000);
                  } else {
                    alert('Emergency Medical ID link copied to clipboard.');
                  }
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-[#F8FAFC] hover:bg-slate-100 text-[#2C3847] text-xs font-medium border border-[#DCE2EA] transition-all"
              >
                <Share2 className="w-3.5 h-3.5 text-[#4F5F73]" />
                <span>{copiedMedicalId ? 'Copied Link!' : 'Share / Copy Emergency ID'}</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsEmergencyModalOpen(false)}
                  className="px-4 py-2 rounded-2xl text-xs font-medium text-[#4F5F73] hover:bg-slate-100 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    alert('Emergency Medical Card downloaded as high-contrast printable pass.');
                  }}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-tranquil-600 text-white text-xs font-semibold hover:bg-tranquil-700 shadow-soft transition-all transform active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download ICE Card</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ==================== CAREGIVER INVITATION MODAL ==================== */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#18202A]/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-modal-enter">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-float border border-[#DCE2EA] my-auto space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE2EA]">
              <div>
                <h3 className="font-serif text-xl font-normal text-[#18202A]">Add to Care Circle</h3>
                <p className="text-xs text-[#4F5F73]">Invite a family member or physician to receive health updates</p>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1.5 text-[#8E9CAE] hover:text-[#18202A] rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="p-4 rounded-2xl bg-[#DCEDE4] border border-[#BED5C9] text-[#2B6449] text-xs space-y-2 text-center animate-scroll-reveal">
                <div className="w-10 h-10 rounded-full bg-[#CDE3D7] text-softMint-900 flex items-center justify-center mx-auto">
                  <Check className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-sm text-[#18202A]">Invitation Dispatched</h4>
                <p className="text-[#2B6449] leading-relaxed">
                  A peaceful invitation link has been sent to <strong>{inviteName || 'your caregiver'}</strong> with permissions for {inviteAccess}.
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setInviteSuccess(true);
                  setTimeout(() => {
                    setInviteSuccess(false);
                    setIsInviteModalOpen(false);
                    setInviteName('');
                    setInviteContact('');
                  }, 2500);
                }}
                className="space-y-4 text-xs font-sans"
              >
                <div>
                  <label className="block text-[11px] font-semibold text-[#2C3847] mb-1">
                    Caregiver Name
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Priya Sharma or Dr. Davis"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA] focus:outline-none focus:border-tranquil-500 focus:bg-white text-[#18202A] text-xs transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#2C3847] mb-1">
                    Relationship
                  </label>
                  <select
                    value={inviteRelationship}
                    onChange={(e) => setInviteRelationship(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA] focus:outline-none focus:border-tranquil-500 focus:bg-white text-[#18202A] text-xs transition-colors"
                  >
                    <option value="Partner / Spouse">Partner / Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Child / Adult Dependent">Child / Adult Dependent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Primary Care Physician">Primary Care Physician</option>
                    <option value="Clinical Specialist">Clinical Specialist</option>
                    <option value="Trusted Friend">Trusted Friend</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#2C3847] mb-1">
                    Phone Number or Email
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteContact}
                    onChange={(e) => setInviteContact(e.target.value)}
                    placeholder="+1 (555) 000-0000 or email@domain.com"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA] focus:outline-none focus:border-tranquil-500 focus:bg-white text-[#18202A] text-xs transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#2C3847] mb-1">
                    Access Level
                  </label>
                  <select
                    value={inviteAccess}
                    onChange={(e) => setInviteAccess(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8FAFC] border border-[#DCE2EA] focus:outline-none focus:border-tranquil-500 focus:bg-white text-[#18202A] text-xs transition-colors"
                  >
                    <option value="Full Emergency Proxy & Vitals">
                      Full Emergency Proxy (Live Vitals + Accident Directives)
                    </option>
                    <option value="Daily Check-in Digest">
                      Daily Check-in Digest (Morning wellness status & rest trends)
                    </option>
                    <option value="Physician Clinical Feed">
                      Physician Clinical Feed (Weekly summaries & diagnostic labs)
                    </option>
                  </select>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#DCE2EA]">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 rounded-2xl text-xs font-medium text-[#4F5F73] hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-tranquil-600 text-white text-xs font-semibold hover:bg-tranquil-700 shadow-soft transition-all transform active:scale-95"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Send Caregiver Invite</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
