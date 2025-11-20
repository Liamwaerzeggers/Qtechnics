import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`, { withCredentials: true });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Kon statistieken niet ophalen');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div data-testid="dashboard-page" className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E40AF'}}>
            Dashboard
          </h1>
          <p className="text-lg mt-2" style={{color: '#64748B'}}>Welkom terug, {user?.name}!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card data-testid="stats-leads-card" className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate('/leads')}>
            <CardHeader>
              <CardTitle style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E40AF'}}>Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold" style={{color: '#3B82F6'}}>{stats?.total_leads || 0}</div>
              <p className="text-sm mt-2" style={{color: '#64748B'}}>Totaal aantal leads</p>
            </CardContent>
          </Card>

          <Card data-testid="stats-quotes-card" className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate('/quotes')}>
            <CardHeader>
              <CardTitle style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E40AF'}}>Offertes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold" style={{color: '#3B82F6'}}>{stats?.total_quotes || 0}</div>
              <p className="text-sm mt-2" style={{color: '#64748B'}}>Totaal aantal offertes</p>
            </CardContent>
          </Card>

          <Card data-testid="stats-projects-card" className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate('/projects')}>
            <CardHeader>
              <CardTitle style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E40AF'}}>Projecten</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold" style={{color: '#3B82F6'}}>{stats?.total_projects || 0}</div>
              <p className="text-sm mt-2" style={{color: '#64748B'}}>Actieve projecten</p>
            </CardContent>
          </Card>

          <Card data-testid="stats-materials-card" className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate('/materials')}>
            <CardHeader>
              <CardTitle style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E40AF'}}>Materialen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold" style={{color: '#3B82F6'}}>{stats?.total_materials || 0}</div>
              <p className="text-sm mt-2" style={{color: '#64748B'}}>In catalogus</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E40AF'}}>Recente Leads</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.recent_leads && stats.recent_leads.length > 0 ? (
                <div className="space-y-3">
                  {stats.recent_leads.map((lead) => (
                    <div
                      key={lead.id}
                      data-testid={`recent-lead-${lead.id}`}
                      className="p-3 rounded-lg cursor-pointer hover:shadow-md transition-all"
                      style={{backgroundColor: '#F8FAFC'}}
                      onClick={() => navigate(`/leads/${lead.id}`)}
                    >
                      <div className="font-semibold" style={{color: '#1E293B'}}>{lead.name}</div>
                      <div className="text-sm" style={{color: '#64748B'}}>{lead.email}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{color: '#94A3B8'}}>Nog geen leads</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E40AF'}}>Recente Offertes</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.recent_quotes && stats.recent_quotes.length > 0 ? (
                <div className="space-y-3">
                  {stats.recent_quotes.map((quote) => (
                    <div
                      key={quote.id}
                      data-testid={`recent-quote-${quote.id}`}
                      className="p-3 rounded-lg cursor-pointer hover:shadow-md transition-all"
                      style={{backgroundColor: '#F8FAFC'}}
                      onClick={() => navigate(`/quotes/${quote.id}`)}
                    >
                      <div className="font-semibold" style={{color: '#1E293B'}}>{quote.quote_number}</div>
                      <div className="text-sm" style={{color: '#64748B'}}>Status: {quote.status}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{color: '#94A3B8'}}>Nog geen offertes</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}