import React, { useEffect, useState } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

// Pages
import Dashboard from './pages/Dashboard';
import LeadsPage from './pages/LeadsPage';
import LeadDetailPage from './pages/LeadDetailPage';
import QuotesPage from './pages/QuotesPage';
import QuoteDetailPage from './pages/QuoteDetailPage';
import MaterialsPage from './pages/MaterialsPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProjectWorkSlipPage from './pages/ProjectWorkSlipPage';
import CalendarPage from './pages/CalendarPage';
import InvoicesPage from './pages/InvoicesPage';
import FinancesPage from './pages/FinancesPage';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const AUTH_URL = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(window.location.origin + '/auth/callback')}`;

// Auth Context
const AuthContext = React.createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      setUser(null);
      toast.success('Uitgelogd');
    } catch (error) {
      console.error('Logout error:', error);
    }
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
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#F8FAFC'}}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#F8FAFC'}}>
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl lg:text-6xl font-bold mb-6" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E40AF'}}>
            Offerte & Project Dashboard
          </h1>
          <p className="text-lg mb-8" style={{color: '#64748B', fontFamily: 'Inter, sans-serif'}}>
            Beheer leads, genereer offertes, zoek materialen en plan projecten - alles op één plek
          </p>
          <button
            data-testid="login-button"
            onClick={() => window.location.href = AUTH_URL}
            className="px-8 py-4 rounded-full text-lg font-semibold text-white transition-all hover:scale-105"
            style={{backgroundColor: '#1E40AF', fontFamily: 'Inter, sans-serif'}}
          >
            Inloggen met Google
          </button>
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="p-6 rounded-2xl" style={{backgroundColor: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}}>
            <div className="text-4xl mb-4" style={{color: '#3B82F6'}}>📋</div>
            <h3 className="text-xl font-bold mb-2" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E293B'}}>Lead Management</h3>
            <p style={{color: '#64748B', fontFamily: 'Inter, sans-serif'}}>Beheer al je leads op één centrale plek</p>
          </div>
          
          <div className="p-6 rounded-2xl" style={{backgroundColor: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}}>
            <div className="text-4xl mb-4" style={{color: '#3B82F6'}}>💰</div>
            <h3 className="text-xl font-bold mb-2" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E293B'}}>Offerte Generator</h3>
            <p style={{color: '#64748B', fontFamily: 'Inter, sans-serif'}}>Genereer professionele offertes in PDF en Excel</p>
          </div>
          
          <div className="p-6 rounded-2xl" style={{backgroundColor: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}}>
            <div className="text-4xl mb-4" style={{color: '#3B82F6'}}>🗓️</div>
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
            <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
            <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectDetailPage /></ProtectedRoute>} />
            <Route path="/projects/:projectId/work-slips" element={<ProtectedRoute><ProjectWorkSlipPage /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute><InvoicesPage /></ProtectedRoute>} />
            <Route path="/finances" element={<ProtectedRoute><FinancesPage /></ProtectedRoute>} />
          </Routes>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
export { useAuth, API };