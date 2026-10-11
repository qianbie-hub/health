import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Lock, Mail, User, ShieldCheck, ArrowRight, HeartPulse, CheckCircle2, AlertCircle } from 'lucide-react';
import { microSpring, fluidEase } from '../animations';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessLogin: () => void;
  defaultMode?: 'signin' | 'signup';
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccessLogin,
  defaultMode = 'signup'
}: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'patient' | 'caregiver' | 'physician'>('patient');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthError(null);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const bodyPayload: any = mode === 'signup'
        ? { email: trimmedEmail, password, full_name: fullName.trim() || 'Eleanor Vance', role }
        : { email: trimmedEmail, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Authentication verification failed.');
      }

      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('vigil_token', data.access_token);
        localStorage.setItem('vigil_user', JSON.stringify(data.user));
      }
      localStorage.setItem('vigil_authenticated', 'true');

      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
        onSuccessLogin();
      }, 700);
    } catch (err: any) {
      setAuthError(err.message || 'An error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('eleanor.vance@vigilhealth.ai');
    setPassword('••••••••••••');
    setFullName('Eleanor Vance');
    setIsSubmitting(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.access_token) {
          localStorage.setItem('vigil_token', data.access_token);
          localStorage.setItem('vigil_user', JSON.stringify(data.user));
        }
      }
    } catch (err) {
      console.warn('Demo login continuing in local mode:', err);
    } finally {
      localStorage.setItem('vigil_authenticated', 'true');
      setIsSubmitting(false);
      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
        onSuccessLogin();
      }, 500);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slateInk-900/50 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.25, ease: fluidEase }}
          className="relative w-full max-w-md bg-white/95 backdrop-blur-xl border border-[#DCE2EA] rounded-3xl shadow-float p-6 sm:p-8 z-10 overflow-hidden"
        >
          {/* Subtle Ambient Aura */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-tranquil-300/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-softMint-300/30 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slateInk-400 hover:text-slateInk-800 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-tranquil-50 border border-tranquil-200 text-tranquil-600 mb-3 shadow-xs">
              <HeartPulse className="w-6 h-6 animate-breathe" />
            </div>
            <h3 className="font-serif text-2xl text-slateInk-900 font-medium">
              {mode === 'signup' ? 'Begin Your Health Vigil' : 'Welcome Back'}
            </h3>
            <p className="text-xs text-slateInk-500 mt-1 max-w-xs mx-auto">
              {mode === 'signup'
                ? 'Synthesize continuous vitals & diagnostic records into peaceful clarity.'
                : 'Access your calibrated baseline, active protocols, and doctor-ready summaries.'}
            </p>

            {/* Encrypted Vault Notice Pill */}
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-softMint-50 border border-softMint-200 text-softMint-700 text-[11px] font-medium">
              <Sparkles className="w-3.5 h-3.5 text-softMint-600" />
              <span>Synchronized with Vigil Clinical Vault</span>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-[#E8ECEF]/80 p-1 rounded-2xl mb-5 border border-[#DCE2EA]">
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setAuthError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all relative ${
                mode === 'signup' ? 'text-slateInk-900 shadow-xs' : 'text-slateInk-500 hover:text-slateInk-800'
              }`}
            >
              {mode === 'signup' && (
                <motion.div
                  layoutId="authTabPill"
                  transition={microSpring}
                  className="absolute inset-0 bg-white rounded-xl"
                />
              )}
              <span className="relative z-10">Create Account</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setAuthError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all relative ${
                mode === 'signin' ? 'text-slateInk-900 shadow-xs' : 'text-slateInk-500 hover:text-slateInk-800'
              }`}
            >
              {mode === 'signin' && (
                <motion.div
                  layoutId="authTabPill"
                  transition={microSpring}
                  className="absolute inset-0 bg-white rounded-xl"
                />
              )}
              <span className="relative z-10">Sign In</span>
            </button>
          </div>

          {/* Auth Error Banner */}
          {authError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{authError}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-semibold text-slateInk-700 mb-1">
                  Full Legal or Preferred Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slateInk-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Eleanor Vance"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-[#DCE2EA] focus:outline-none focus:border-tranquil-500 text-xs text-slateInk-900 placeholder:text-slateInk-300 transition-colors shadow-xs"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slateInk-700 mb-1">
                Medical Contact Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slateInk-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="eleanor@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-[#DCE2EA] focus:outline-none focus:border-tranquil-500 text-xs text-slateInk-900 placeholder:text-slateInk-300 transition-colors shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slateInk-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slateInk-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-[#DCE2EA] focus:outline-none focus:border-tranquil-500 text-xs text-slateInk-900 placeholder:text-slateInk-300 transition-colors shadow-xs"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-semibold text-slateInk-700 mb-1">
                  Primary Profile Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'patient', label: 'Patient' },
                    { id: 'caregiver', label: 'Caregiver' },
                    { id: 'physician', label: 'Physician' }
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setRole(item.id as any)}
                      className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition-all ${
                        role === item.id
                          ? 'border-tranquil-500 bg-tranquil-50 text-tranquil-800 font-semibold shadow-xs'
                          : 'border-[#DCE2EA] bg-white text-slateInk-600 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-tranquil-600 to-tranquil-700 hover:from-tranquil-700 hover:to-tranquil-800 text-white font-medium text-xs flex items-center justify-center space-x-2 shadow-soft hover:shadow-card transition-all transform active:scale-98 disabled:opacity-75 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'signup' ? 'Create Account & Open Dashboard' : 'Sign In to Dashboard'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Instant Entry */}
          <div className="mt-4 pt-4 border-t border-[#DCE2EA] text-center">
            <p className="text-[11px] text-slateInk-500 mb-2">Want to explore right away?</p>
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-2.5 px-3 rounded-2xl bg-white hover:bg-[#F8FAFC] border border-tranquil-200 text-tranquil-700 hover:text-tranquil-900 text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-tranquil-600" />
              <span>Instant Demo: Launch with Eleanor Vance (8-Day Trend)</span>
            </button>
          </div>

          {/* HIPAA & Security Footer */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slateInk-400">
            <ShieldCheck className="w-3.5 h-3.5 text-softMint-600" />
            <span>256-bit AES • Zero Data Selling • HIPAA-Ready Vault</span>
          </div>

          {/* Toast */}
          <AnimatePresence>
            {showSuccessToast && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute inset-x-6 bottom-6 bg-slateInk-900 text-white p-3 rounded-2xl shadow-float flex items-center space-x-2 text-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-softMint-400 shrink-0" />
                <span>Authentication verified. Connecting to your clinical feed...</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
