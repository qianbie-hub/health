import { useState, useEffect } from 'react';
import HomePage from './pages/HomePage';
import Dashboard from './Dashboard';
import AuthModal from './components/AuthModal';

export default function App() {
  // Authentication gate: No dashboard and readings until signup / login
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vigil_authenticated') === 'true';
    }
    return false;
  });

  const [currentUser, setCurrentUser] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('vigil_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const [currentPage, setCurrentPage] = useState<'home' | 'dashboard'>(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('dashboard')) {
      const storedAuth = localStorage.getItem('vigil_authenticated') === 'true';
      return storedAuth ? 'dashboard' : 'home';
    }
    return 'home';
  });

  const [dashboardTab, setDashboardTab] = useState<'today' | 'intake' | 'night-help' | 'records' | 'family'>('today');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');

  // Verify stored session with backend on initial load
  useEffect(() => {
    const token = localStorage.getItem('vigil_token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
          throw new Error('Session invalid');
        })
        .then((user) => {
          setCurrentUser(user);
          localStorage.setItem('vigil_user', JSON.stringify(user));
          setIsAuthenticated(true);
        })
        .catch(() => {
          // If token expired, fall back to local mode
          console.warn('Backend session unverified, continuing in local mode');
        });
    }
  }, []);

  // Sync hash routing with browser back/forward buttons
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.includes('dashboard')) {
        if (!isAuthenticated) {
          // Protected: unauthenticated users cannot access dashboard
          setCurrentPage('home');
          setIsAuthModalOpen(true);
          setAuthMode('signin');
          window.location.hash = '#home';
        } else {
          setCurrentPage('dashboard');
          if (hash.includes('intake')) setDashboardTab('intake');
          else if (hash.includes('night-help')) setDashboardTab('night-help');
          else if (hash.includes('records')) setDashboardTab('records');
          else if (hash.includes('family')) setDashboardTab('family');
          else setDashboardTab('today');
        }
      } else {
        setCurrentPage('home');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAuthenticated]);

  const handleOpenAuth = (mode: 'signin' | 'signup' = 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleSuccessfulAuth = () => {
    setIsAuthenticated(true);
    localStorage.setItem('vigil_authenticated', 'true');
    const storedUser = localStorage.getItem('vigil_user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch {}
    }
    setIsAuthModalOpen(false);
    setCurrentPage('dashboard');
    window.location.hash = '#dashboard';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('vigil_authenticated');
    localStorage.removeItem('vigil_token');
    localStorage.removeItem('vigil_user');
    setCurrentUser(null);
    setCurrentPage('home');
    window.location.hash = '#home';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToHome = () => {
    setCurrentPage('home');
    window.location.hash = '#home';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {currentPage === 'home' || !isAuthenticated ? (
        <div className="relative">
          {/* Floating banner if already authenticated */}
          {isAuthenticated && (
            <div className="fixed bottom-5 right-5 z-50 bg-slateInk-900 text-white py-2.5 px-4 rounded-2xl shadow-float flex items-center space-x-3 text-xs border border-white/20 animate-modal-enter">
              <span className="w-2 h-2 rounded-full bg-softMint-400 animate-ping" />
              <span>Signed In {currentUser?.full_name ? `(${currentUser.full_name})` : ''}</span>
              <button
                onClick={() => {
                  setCurrentPage('dashboard');
                  window.location.hash = '#dashboard';
                }}
                className="px-3 py-1 rounded-xl bg-tranquil-600 hover:bg-tranquil-700 text-white font-semibold transition-colors cursor-pointer"
              >
                Go to Dashboard ➔
              </button>
            </div>
          )}

          <HomePage
            onOpenAuth={handleOpenAuth}
          />
        </div>
      ) : (
        <Dashboard
          onNavigateToHome={handleNavigateToHome}
          onSignOut={handleSignOut}
          initialTab={dashboardTab}
        />
      )}

      {/* Teammate-Ready Auth & Signup Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultMode={authMode}
        onSuccessLogin={handleSuccessfulAuth}
      />
    </>
  );
}
