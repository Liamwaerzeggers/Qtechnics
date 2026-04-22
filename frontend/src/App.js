import React, { useEffect, useState } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { registerServiceWorker, subscribeToPush, requestNotificationPermission } from './pushHelper';

// Pages
import Dashboard from './pages/Dashboard';
import LeadsPage from './pages/LeadsPage';
import LeadDetailPage from './pages/LeadDetailPage';
import QuotesPage from './pages/QuotesPage';
import QuoteDetailPage from './pages/QuoteDetailPage';
import MaterialsPage from './pages/MaterialsPage';
import MaterialCatalogAdmin from './pages/MaterialCatalogAdmin';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProjectWorkSlipPage from './pages/ProjectWorkSlipPage';
import CalendarPage from './pages/CalendarPage';
import InvoicesPage from './pages/InvoicesPage';
import FinancesPage from './pages/FinancesPage';
import WorkersPage from './pages/WorkersPage';
import AdminsPage from './pages/AdminsPage';
import CustomerPortalPage from './pages/CustomerPortalPage';
import RoomConfiguratorPrototype from './pages/RoomConfiguratorPrototype';
import RealtorDashboard from './pages/RealtorDashboard';
import TenantsPage from './pages/TenantsPage';
import WorkItemLabelsPage from './pages/WorkItemLabelsPage';
import MaintenancePage from './pages/MaintenancePage';
import MaterialRequestPage from './pages/MaterialRequestPage';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;
const API = `${BACKEND_URL}/api`;
const AUTH_URL = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(window.location.origin + '/auth/callback')}`;

// Create axios instance with auth
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Setup axios interceptor for authentication - runs on EVERY request
// Track if we're already handling a 401 to prevent cascading logouts
let isHandling401 = false;
let lastValidToken = null;

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
    lastValidToken = token;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only handle 401 once, and NOT during login/auth requests
    const url = error.config?.url || '';
    const isAuthRequest = url.includes('/auth2/login') || url.includes('/auth2/me') || url.includes('/auth/me') || url.includes('/auth/admin/login');
    
    if (error.response?.status === 401 && !isAuthRequest && !isHandling401) {
      isHandling401 = true;
      console.warn('401 received on:', url);
      
      // Don't immediately nuke everything - just mark as needing re-auth
      // The AuthProvider will handle the actual logout flow gracefully
      setTimeout(() => {
        const currentToken = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
        // Only force logout if token is still the same one that failed
        if (currentToken && currentToken === lastValidToken) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('session_token');
          document.cookie = 'session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
          // Use soft navigation - no page reload
          window.dispatchEvent(new CustomEvent('auth-expired'));
        }
        isHandling401 = false;
      }, 500);
    }
    return Promise.reject(error);
  }
);

// Export for other components
export { API, getAuthHeaders };

// Auth Context
const AuthContext = React.createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    registerServiceWorker();
    
    // Listen for auth expiry events (soft logout without page reload)
    const handleAuthExpired = () => {
      console.warn('Auth expired event received - logging out gracefully');
      setUser(null);
      navigate('/');
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  // Auto-subscribe admin to push notifications
  useEffect(() => {
    if (user && user.role === 'admin') {
      requestNotificationPermission().then((perm) => {
        if (perm === 'granted') {
          subscribeToPush();
        }
      });
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const storedToken = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
      if (!storedToken) {
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Verify session with backend - try auth2 first
      const response = await axios.get(`${API}/auth2/me`);
      if (response.data && response.data.id) {
        setUser(response.data);
      } else {
        setUser(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('session_token');
      }
    } catch (error) {
      // Session is invalid - clean up silently (no redirect, just set user to null)
      setUser(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('session_token');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth2/logout`);
    } catch (error) {
      try {
        await axios.post(`${API}/auth/logout`);
      } catch (e) {}
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('session_token');
    // Clear any lingering session cookies that might interfere with future logins
    document.cookie = 'session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=None; Secure';
    document.cookie = 'session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    setUser(null);
    toast.success('Uitgelogd');
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

const useAuth = () => React.useContext(AuthContext);

// Auth Callback Handler - processes Google OAuth callback
function AuthCallbackHandler() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const processSession = async () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.substring(1));
      const sessionId = params.get('session_id');

      if (sessionId) {
        try {
          const response = await axios.post(`${API}/auth/session`, { session_id: sessionId }, { withCredentials: true });
          setUser(response.data.user);
          window.history.replaceState({}, document.title, '/dashboard');
          toast.success('Welkom terug!');
          navigate('/dashboard', { replace: true });
        } catch (error) {
          console.error('Session error:', error);
          toast.error('Authenticatie mislukt');
          navigate('/', { replace: true });
        }
      } else {
        // No session_id, redirect back to home
        navigate('/', { replace: true });
      }
    };

    processSession();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#F8FAFC'}}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto mb-4"></div>
        <p className="text-lg" style={{color: '#1E293B'}}>Authenticeren...</p>
      </div>
    </div>
  );
}

// Landing Page
function LandingPage() {
  const { user, loading, setUser } = useAuth();
  const navigate = useNavigate();
  const [showWorkerLogin, setShowWorkerLogin] = React.useState(false);
  const [showAdminLogin, setShowAdminLogin] = React.useState(false);
  const [showTenantLogin, setShowTenantLogin] = React.useState(false);
  const [showSetup, setShowSetup] = React.useState(false);
  const [needsSetup, setNeedsSetup] = React.useState(false);
  const [loginUsername, setLoginUsername] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [loggingIn, setLoggingIn] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [installPrompt, setInstallPrompt] = React.useState(null);
  const [isInstalled, setIsInstalled] = React.useState(false);

  // PWA install prompt
  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true);
    }
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  
  // Setup form state
  const [setupData, setSetupData] = React.useState({
    username: '',
    password: '',
    email: '',
    name: ''
  });

  useEffect(() => {
    // Check if setup is needed
    const checkSetup = async () => {
      try {
        const response = await axios.get(`${API}/setup/status`);
        setNeedsSetup(response.data.needs_setup);
        if (response.data.needs_setup) {
          setShowSetup(true);
        }
      } catch (error) {
        console.error('Setup check error:', error);
      }
    };
    checkSetup();
  }, []);

  useEffect(() => {
    if (!loading && user) {
      // Redirect based on role
      if (user.role === 'worker') {
        navigate('/projects');
      } else if (user.role === 'realtor') {
        navigate('/realtor');
      } else if (user.role === 'investor') {
        navigate('/investor');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, loading, navigate]);

  const handleSetup = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    
    try {
      await axios.post(`${API}/setup/first-admin`, setupData);
      toast.success('Admin account aangemaakt! U kunt nu inloggen.');
      setShowSetup(false);
      setNeedsSetup(false);
      setShowAdminLogin(true);
      setLoginUsername(setupData.username);
    } catch (error) {
      console.error('Setup error:', error);
      toast.error(error.response?.data?.detail || 'Kon admin niet aanmaken');
    } finally {
      setLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#F8FAFC'}}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  const handleWorkerLogin = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    
    try {
      const response = await axios.post(
        `${API}/auth/worker/login`,
        { username: loginUsername, password: loginPassword }
      );
      
      if (response.data.session_token) {
        localStorage.setItem('auth_token', response.data.session_token);
      }
      
      setUser(response.data.user);
      toast.success(`Welkom ${response.data.user.name}!`);
      navigate('/projects');
    } catch (error) {
      console.error('Worker login error:', error);
      if (error.response?.status === 403) {
        toast.error('Account is gedeactiveerd');
      } else {
        toast.error('Ongeldige inloggegevens');
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    
    // Clear any old cookies/tokens before login attempt
    document.cookie = 'session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=None; Secure';
    document.cookie = 'session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    localStorage.removeItem('auth_token');
    localStorage.removeItem('session_token');
    
    try {
      const response = await axios.post(`${API}/auth2/login`, {
        username: loginUsername.trim(),
        password: loginPassword.trim()
      });
      
      if (response.data.success && response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('session_token', response.data.token);
        setUser(response.data.user);
        toast.success(`Welkom ${response.data.user.name}!`);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.detail || 'Ongeldige inloggegevens');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleTenantLogin = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    
    try {
      const response = await axios.post(
        `${API}/auth/tenant/login`,
        { username: loginUsername, password: loginPassword }
      );
      
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('session_token', response.data.token);
      }
      
      setUser(response.data.user);
      const role = response.data.user.role;
      toast.success(`Welkom ${response.data.user.name}!`);
      
      if (role === 'realtor') {
        navigate('/realtor');
      } else if (role === 'investor') {
        navigate('/investor');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Tenant login error:', error);
      toast.error('Ongeldige inloggegevens');
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen" style={{backgroundColor: '#F8FAFC'}}>
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl lg:text-6xl font-bold mb-6" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>
            Offerte & Project Dashboard
          </h1>
          <p className="text-lg mb-8" style={{color: '#64748B', fontFamily: 'Inter, sans-serif'}}>
            Beheer leads, genereer offertes, zoek materialen en plan projecten - alles op één plek
          </p>
          
          {/* Setup Screen - First Time */}
          {showSetup && needsSetup ? (
            <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg">
              <div className="text-center mb-6">
                <span className="text-5xl">🚀</span>
                <h2 className="text-2xl font-bold mt-4" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>
                  Welkom bij Max Q
                </h2>
                <p className="text-sm mt-2" style={{color: '#64748B'}}>
                  Maak uw eerste admin account aan om te beginnen
                </p>
              </div>
              
              <form onSubmit={handleSetup} className="space-y-4 text-left">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: '#1E293B'}}>Naam</label>
                  <input
                    type="text"
                    value={setupData.name}
                    onChange={(e) => setSetupData({...setupData, name: e.target.value})}
                    className="w-full px-4 py-3 border rounded-lg"
                    style={{borderColor: '#E5E7EB'}}
                    placeholder="Uw volledige naam"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: '#1E293B'}}>Email</label>
                  <input
                    type="email"
                    value={setupData.email}
                    onChange={(e) => setSetupData({...setupData, email: e.target.value})}
                    className="w-full px-4 py-3 border rounded-lg"
                    style={{borderColor: '#E5E7EB'}}
                    placeholder="uw@email.be"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: '#1E293B'}}>Gebruikersnaam</label>
                  <input
                    type="text"
                    value={setupData.username}
                    onChange={(e) => setSetupData({...setupData, username: e.target.value})}
                    className="w-full px-4 py-3 border rounded-lg"
                    style={{borderColor: '#E5E7EB'}}
                    placeholder="Kies een gebruikersnaam"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: '#1E293B'}}>Wachtwoord</label>
                  <input
                    type="password"
                    value={setupData.password}
                    onChange={(e) => setSetupData({...setupData, password: e.target.value})}
                    className="w-full px-4 py-3 border rounded-lg"
                    style={{borderColor: '#E5E7EB'}}
                    placeholder="Kies een sterk wachtwoord"
                    required
                    minLength={6}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loggingIn}
                  className="w-full py-3 rounded-lg text-white font-semibold transition-colors"
                  style={{backgroundColor: '#500000'}}
                >
                  {loggingIn ? 'Bezig...' : '🚀 Account Aanmaken'}
                </button>
              </form>
            </div>
          ) : !showWorkerLogin && !showAdminLogin && !showTenantLogin ? (
            <div className="space-y-4">
              {/* PWA Install Button */}
              {!isInstalled && (
                <div className="max-w-md mx-auto mb-2">
                  {installPrompt ? (
                    <button
                      data-testid="install-app-btn"
                      onClick={async () => {
                        installPrompt.prompt();
                        const result = await installPrompt.userChoice;
                        if (result.outcome === 'accepted') setIsInstalled(true);
                        setInstallPrompt(null);
                      }}
                      className="w-full px-6 py-3 rounded-full text-sm font-semibold text-white transition-all hover:scale-105 flex items-center justify-center gap-2"
                      style={{ backgroundColor: '#0ea5e9' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Installeer MaxQ App op je telefoon
                    </button>
                  ) : (
                    <div data-testid="install-app-hint" className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 text-xs text-sky-700">
                      <p className="font-semibold mb-0.5 text-sm flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Installeer als app
                      </p>
                      <p>
                        <strong>iPhone/iPad:</strong> Tik op <span className="inline-flex items-center bg-white border rounded px-1 mx-0.5">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                        </span> Deel → <strong>"Zet op beginscherm"</strong>
                      </p>
                      <p className="mt-0.5"><strong>Android:</strong> Menu (⋮) → <strong>"App installeren"</strong></p>
                    </div>
                  )}
                </div>
              )}

              <button
                data-testid="login-button"
                onClick={() => window.location.href = AUTH_URL}
                className="px-8 py-4 rounded-full text-lg font-semibold text-white transition-all hover:scale-105 block w-full max-w-md mx-auto"
                style={{backgroundColor: '#500000', fontFamily: 'Inter, sans-serif'}}
              >
                🔐 Beheerder - Inloggen met Google
              </button>
              
              <button
                onClick={() => { setShowAdminLogin(true); setShowWorkerLogin(false); }}
                className="px-8 py-4 rounded-full text-lg font-semibold transition-all hover:scale-105 block w-full max-w-md mx-auto border-2"
                style={{
                  backgroundColor: 'white',
                  color: '#500000',
                  borderColor: '#500000',
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                👨‍💼 Beheerder Login (gebruikersnaam)
              </button>
              
              <button
                onClick={() => { setShowWorkerLogin(true); setShowAdminLogin(false); setShowTenantLogin(false); }}
                className="px-8 py-4 rounded-full text-lg font-semibold transition-all hover:scale-105 block w-full max-w-md mx-auto border-2"
                style={{
                  backgroundColor: 'white',
                  color: '#10B981',
                  borderColor: '#10B981',
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                👷 Werkman Login / Вхід працівника
              </button>
              
              <button
                onClick={() => { setShowTenantLogin(true); setShowWorkerLogin(false); setShowAdminLogin(false); }}
                className="px-8 py-4 rounded-full text-lg font-semibold transition-all hover:scale-105 block w-full max-w-md mx-auto border-2"
                style={{
                  backgroundColor: 'white',
                  color: '#3B82F6',
                  borderColor: '#3B82F6',
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                🏠 Makelaar / Investeerder Login
              </button>
            </div>
          ) : showTenantLogin ? (
            <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg">
              <h2 className="text-2xl font-bold mb-2 text-center" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#3B82F6'}}>
                🏠 Makelaar / Investeerder
              </h2>
              <p className="text-center mb-6" style={{color: '#64748B', fontSize: '14px'}}>
                Toegang tot uw panden dashboard
              </p>
              
              <form onSubmit={handleTenantLogin} className="space-y-4">
                <div className="text-left">
                  <label className="block text-sm font-medium mb-2" style={{color: '#1E293B'}}>
                    Gebruikersnaam
                  </label>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="mijnaccount"
                    required
                    autoComplete="username"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{fontFamily: 'Inter, sans-serif'}}
                  />
                </div>
                
                <div className="text-left">
                  <label className="block text-sm font-medium mb-2" style={{color: '#1E293B'}}>
                    Wachtwoord
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                      style={{fontFamily: 'Inter, sans-serif'}}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={loggingIn}
                  className="w-full px-8 py-4 rounded-full text-lg font-semibold text-white transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{backgroundColor: '#3B82F6', fontFamily: 'Inter, sans-serif'}}
                >
                  {loggingIn ? 'Inloggen...' : 'Inloggen'}
                </button>
                
                <button
                  type="button"
                  onClick={() => { setShowTenantLogin(false); setLoginUsername(''); setLoginPassword(''); }}
                  className="text-sm underline transition-all hover:opacity-80 w-full"
                  style={{color: '#64748B', fontFamily: 'Inter, sans-serif'}}
                >
                  ← Terug naar inlogopties
                </button>
              </form>
            </div>
          ) : showAdminLogin ? (
            <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg">
              <h2 className="text-2xl font-bold mb-2 text-center" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>
                👨‍💼 Beheerder Login
              </h2>
              <p className="text-center mb-6" style={{color: '#64748B', fontSize: '14px'}}>
                Inloggen met gebruikersnaam
              </p>
              
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="text-left">
                  <label className="block text-sm font-medium mb-2" style={{color: '#1E293B'}}>
                    Gebruikersnaam
                  </label>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="admin123"
                    required
                    autoComplete="username"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{fontFamily: 'Inter, sans-serif'}}
                  />
                </div>
                
                <div className="text-left">
                  <label className="block text-sm font-medium mb-2" style={{color: '#1E293B'}}>
                    Wachtwoord
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                      style={{fontFamily: 'Inter, sans-serif'}}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={loggingIn}
                  className="w-full py-3 rounded-lg text-white font-semibold transition-all disabled:opacity-50"
                  style={{backgroundColor: '#500000', fontFamily: 'Inter, sans-serif'}}
                >
                  {loggingIn ? 'Bezig met inloggen...' : 'Inloggen'}
                </button>
              </form>
              
              <button
                onClick={() => { setShowAdminLogin(false); setLoginUsername(''); setLoginPassword(''); }}
                className="w-full mt-4 text-sm"
                style={{color: '#64748B'}}
              >
                ← Terug naar inlogopties
              </button>
            </div>
          ) : (
            <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg">
              <h2 className="text-2xl font-bold mb-2 text-center" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>
                👷 Werkman Login
              </h2>
              <p className="text-center mb-6" style={{color: '#64748B', fontSize: '14px'}}>
                Вхід працівника
              </p>
              
              <form onSubmit={handleWorkerLogin} className="space-y-4">
                <div className="text-left">
                  <label className="block text-sm font-medium mb-2" style={{color: '#1E293B'}}>
                    Gebruikersnaam / Ім'я користувача
                  </label>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="werkman123"
                    required
                    autoComplete="username"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    style={{fontFamily: 'Inter, sans-serif'}}
                  />
                </div>
                
                <div className="text-left">
                  <label className="block text-sm font-medium mb-2" style={{color: '#1E293B'}}>
                    Wachtwoord / Пароль
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 pr-12"
                      style={{fontFamily: 'Inter, sans-serif'}}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={loggingIn}
                  className="w-full px-8 py-4 rounded-full text-lg font-semibold text-white transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{backgroundColor: '#500000', fontFamily: 'Inter, sans-serif'}}
                >
                  {loggingIn ? 'Inloggen... / Вхід...' : 'Inloggen / Увійти'}
                </button>
                
                <button
                  type="button"
                  onClick={() => { setShowWorkerLogin(false); setLoginUsername(''); setLoginPassword(''); }}
                  className="text-sm underline transition-all hover:opacity-80 w-full"
                  style={{color: '#64748B', fontFamily: 'Inter, sans-serif'}}
                >
                  ← Terug naar inlogopties / Назад до опцій входу
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="p-6 rounded-2xl" style={{backgroundColor: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}}>
            <div className="text-4xl mb-4" style={{color: '#7a1f1f'}}>📋</div>
            <h3 className="text-xl font-bold mb-2" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E293B'}}>Lead Management</h3>
            <p style={{color: '#64748B', fontFamily: 'Inter, sans-serif'}}>Beheer al je leads op één centrale plek</p>
          </div>
          
          <div className="p-6 rounded-2xl" style={{backgroundColor: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}}>
            <div className="text-4xl mb-4" style={{color: '#7a1f1f'}}>💰</div>
            <h3 className="text-xl font-bold mb-2" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E293B'}}>Offerte Generator</h3>
            <p style={{color: '#64748B', fontFamily: 'Inter, sans-serif'}}>Genereer professionele offertes in PDF en Excel</p>
          </div>
          
          <div className="p-6 rounded-2xl" style={{backgroundColor: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}}>
            <div className="text-4xl mb-4" style={{color: '#7a1f1f'}}>🗓️</div>
            <h3 className="text-xl font-bold mb-2" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E293B'}}>Project Planner</h3>
            <p style={{color: '#64748B', fontFamily: 'Inter, sans-serif'}}>Plan en beheer goedgekeurde projecten</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Protected Route
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#F8FAFC'}}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth/callback" element={<AuthCallbackHandler />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute><LeadsPage /></ProtectedRoute>} />
            <Route path="/leads/:leadId" element={<ProtectedRoute><LeadDetailPage /></ProtectedRoute>} />
            <Route path="/quotes" element={<ProtectedRoute><QuotesPage /></ProtectedRoute>} />
            <Route path="/quotes/:quoteId" element={<ProtectedRoute><QuoteDetailPage /></ProtectedRoute>} />
            <Route path="/materials" element={<ProtectedRoute><MaterialsPage /></ProtectedRoute>} />
            <Route path="/material-catalog" element={<ProtectedRoute><MaterialCatalogAdmin /></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
            <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectDetailPage /></ProtectedRoute>} />
            <Route path="/projects/:projectId/work-slips" element={<ProtectedRoute><ProjectWorkSlipPage /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute><InvoicesPage /></ProtectedRoute>} />
            <Route path="/finances" element={<ProtectedRoute><FinancesPage /></ProtectedRoute>} />
            <Route path="/workers" element={<ProtectedRoute><WorkersPage /></ProtectedRoute>} />
            <Route path="/admins" element={<ProtectedRoute><AdminsPage /></ProtectedRoute>} />
            <Route path="/tenants" element={<ProtectedRoute><TenantsPage /></ProtectedRoute>} />
            <Route path="/work-labels" element={<ProtectedRoute><WorkItemLabelsPage /></ProtectedRoute>} />
            <Route path="/maintenance" element={<ProtectedRoute><MaintenancePage /></ProtectedRoute>} />
            <Route path="/configurator" element={<ProtectedRoute><RoomConfiguratorPrototype /></ProtectedRoute>} />
            <Route path="/realtor" element={<ProtectedRoute><RealtorDashboard /></ProtectedRoute>} />
            <Route path="/investor" element={<ProtectedRoute><RealtorDashboard /></ProtectedRoute>} />
            <Route path="/material-request" element={<ProtectedRoute><MaterialRequestPage /></ProtectedRoute>} />
            {/* Customer Portal - No authentication, uses access token */}
            <Route path="/klant/:accessToken" element={<CustomerPortalPage />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
export { useAuth };