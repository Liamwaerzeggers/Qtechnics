import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Package, AlertTriangle, CheckCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [materialReminders, setMaterialReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchMaterialReminders();
    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      fetchStats();
      fetchMaterialReminders();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`, { 
        headers: getAuthHeaders()
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterialReminders = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/material-reminders`, { 
        headers: getAuthHeaders()
      });
      setMaterialReminders(response.data || []);
    } catch (error) {
      console.error('Error fetching material reminders:', error);
    }
  };

  const handleMarkAsOrdered = async (projectId, periodId, materialId) => {
    try {
      await axios.put(
        `${API}/projects/${projectId}/scheduled-days/${periodId}/materials/${materialId}`,
        { is_ordered: true },
        { headers: getAuthHeaders() }
      );
      toast.success('Materiaal gemarkeerd als besteld ✓');
      fetchMaterialReminders(); // Refresh the list
    } catch (error) {
      console.error('Error marking material as ordered:', error);
      toast.error('Kon status niet bijwerken');
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
          <h1 className="text-4xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>
            Dashboard
          </h1>
          <p className="text-lg mt-2" style={{color: '#64748B'}}>Welkom terug, {user?.name}!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card data-testid="stats-leads-card" className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate('/leads')}>
            <CardHeader>
              <CardTitle style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold" style={{color: '#7a1f1f'}}>{stats?.total_leads || 0}</div>
              <p className="text-sm mt-2" style={{color: '#64748B'}}>Totaal aantal leads</p>
            </CardContent>
          </Card>

          <Card data-testid="stats-quotes-card" className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate('/quotes')}>
            <CardHeader>
              <CardTitle style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>Offertes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold" style={{color: '#7a1f1f'}}>{stats?.total_quotes || 0}</div>
              <p className="text-sm mt-2" style={{color: '#64748B'}}>Totaal aantal offertes</p>
            </CardContent>
          </Card>

          <Card data-testid="stats-projects-card" className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate('/projects')}>
            <CardHeader>
              <CardTitle style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>Projecten</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold" style={{color: '#7a1f1f'}}>{stats?.total_projects || 0}</div>
              <p className="text-sm mt-2" style={{color: '#64748B'}}>Actieve projecten</p>
            </CardContent>
          </Card>

          <Card data-testid="stats-materials-card" className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate('/materials')}>
            <CardHeader>
              <CardTitle style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>Materialen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold" style={{color: '#7a1f1f'}}>{stats?.total_materials || 0}</div>
              <p className="text-sm mt-2" style={{color: '#64748B'}}>In catalogus</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Material Order Reminders - Based on order_reminder_date */}
          {materialReminders.length > 0 && (
            <Card className="lg:col-span-2 border-2" style={{borderColor: '#EF4444', backgroundColor: '#FEF2F2'}}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#991B1B'}}>
                  <AlertTriangle size={24} />
                  Materialen Bestellen!
                  <span className="px-2 py-1 text-xs rounded-full" style={{backgroundColor: '#FECACA', color: '#991B1B'}}>
                    {materialReminders.reduce((sum, r) => sum + r.materials.length, 0)} materiaal(en)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4" style={{color: '#991B1B'}}>
                  De volgende materialen moeten besteld worden (besteldatum bereikt):
                </p>
                <div className="space-y-4">
                  {materialReminders.map((reminder) => (
                    <div
                      key={`${reminder.project_id}-${reminder.period_id}`}
                      className="p-4 rounded-lg bg-white border"
                      style={{borderColor: '#FECACA'}}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div 
                          className="font-semibold text-lg cursor-pointer hover:underline" 
                          style={{color: '#1E293B'}}
                          onClick={() => navigate(`/projects/${reminder.project_id}`)}
                        >
                          {reminder.project_name}
                        </div>
                        <span className="text-sm px-2 py-1 rounded-full" style={{backgroundColor: '#f5e6e6', color: '#500000'}}>
                          {reminder.period_description}
                        </span>
                      </div>
                      
                      {reminder.work_start_date && (
                        <div className="text-sm mb-3" style={{color: '#64748B'}}>
                          Werk start: {new Date(reminder.work_start_date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        {reminder.materials.map((mat) => (
                          <div 
                            key={mat.id} 
                            className="flex items-center justify-between p-3 rounded-lg"
                            style={{backgroundColor: mat.days_overdue > 0 ? '#FEE2E2' : '#FEF3C7'}}
                          >
                            <div className="flex items-center gap-3">
                              <Package size={18} style={{color: mat.days_overdue > 0 ? '#991B1B' : '#92400E'}} />
                              <div>
                                <span className="font-medium">{mat.name}</span>
                                <span className="text-sm ml-2" style={{color: '#64748B'}}>
                                  ({mat.quantity} {mat.unit})
                                </span>
                              </div>
                              {mat.days_overdue > 0 && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{backgroundColor: '#FECACA', color: '#991B1B'}}>
                                  {mat.days_overdue} dag(en) te laat!
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleMarkAsOrdered(reminder.project_id, reminder.period_id, mat.id)}
                              className="flex items-center gap-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                              style={{backgroundColor: '#D1FAE5', color: '#059669'}}
                            >
                              <CheckCircle size={16} />
                              Besteld
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Material Reminders - One month before start */}
          {stats?.material_reminders && stats.material_reminders.length > 0 && (
            <Card className="lg:col-span-2 border-2" style={{borderColor: '#F59E0B', backgroundColor: '#FFFBEB'}}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#92400E'}}>
                  📦 Materiaal Herinneringen
                  <span className="px-2 py-1 text-xs rounded-full" style={{backgroundColor: '#FEF3C7', color: '#92400E'}}>
                    {stats.material_reminders.length} project(en)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4" style={{color: '#92400E'}}>
                  De volgende projecten starten binnen 30 dagen. Controleer of alle materialen beschikbaar zijn!
                </p>
                <div className="space-y-4">
                  {stats.material_reminders.map((reminder) => (
                    <div
                      key={reminder.project_id}
                      className="p-4 rounded-lg cursor-pointer hover:shadow-md transition-all bg-white border"
                      style={{borderColor: '#FCD34D'}}
                      onClick={() => navigate(`/projects/${reminder.project_id}`)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-lg" style={{color: '#1E293B'}}>
                          {reminder.project_name}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{
                            backgroundColor: reminder.days_until_start <= 7 ? '#FEE2E2' : '#FEF3C7',
                            color: reminder.days_until_start <= 7 ? '#991B1B' : '#92400E'
                          }}>
                            {reminder.days_until_start <= 7 ? '⚠️' : '📅'} Start over {reminder.days_until_start} dagen
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-sm mb-3" style={{color: '#64748B'}}>
                        Start: {new Date(reminder.start_date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      
                      {/* Materials from quotes */}
                      {reminder.quote_materials && reminder.quote_materials.length > 0 && (
                        <div className="mb-3">
                          <div className="text-sm font-semibold mb-2" style={{color: '#065F46'}}>
                            📋 Materialen uit offerte:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {reminder.quote_materials.slice(0, 5).map((mat, idx) => (
                              <span key={idx} className="px-2 py-1 text-xs rounded-full" style={{backgroundColor: '#D1FAE5', color: '#065F46'}}>
                                {mat.description} ({mat.quantity} {mat.unit || 'x'})
                              </span>
                            ))}
                            {reminder.quote_materials.length > 5 && (
                              <span className="px-2 py-1 text-xs rounded-full" style={{backgroundColor: '#E5E7EB', color: '#4B5563'}}>
                                +{reminder.quote_materials.length - 5} meer
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Manual materials */}
                      {reminder.required_materials && (
                        <div>
                          <div className="text-sm font-semibold mb-1" style={{color: '#500000'}}>
                            ✏️ Aanvullende materialen:
                          </div>
                          <p className="text-sm" style={{color: '#4B5563'}}>{reminder.required_materials}</p>
                        </div>
                      )}
                      
                      {!reminder.quote_materials?.length && !reminder.required_materials && (
                        <p className="text-sm italic" style={{color: '#94A3B8'}}>
                          Geen specifieke materialen opgegeven
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>Recente Leads</CardTitle>
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
              <CardTitle style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>Recente Offertes</CardTitle>
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