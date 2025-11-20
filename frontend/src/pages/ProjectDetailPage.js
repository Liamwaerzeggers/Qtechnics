import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingCosts, setEditingCosts] = useState(false);
  const [costData, setCostData] = useState({
    labor_cost_per_hour: 0,
    labor_hours: 0,
    material_costs: 0,
    other_costs: 0
  });

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const projectRes = await axios.get(`${API}/projects/${projectId}`, { withCredentials: true });
      setProject(projectRes.data);
      setCostData({
        labor_cost_per_hour: projectRes.data.labor_cost_per_hour || 0,
        labor_hours: projectRes.data.labor_hours || 0,
        material_costs: projectRes.data.material_costs || 0,
        other_costs: projectRes.data.other_costs || 0
      });
      
      if (projectRes.data.quote_id) {
        const quoteRes = await axios.get(`${API}/quotes/${projectRes.data.quote_id}`, { withCredentials: true });
        setQuote(quoteRes.data);
      }
    } catch (error) {
      toast.error('Kon project niet ophalen');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await axios.put(`${API}/projects/${projectId}`, { status: newStatus }, { withCredentials: true });
      setProject({ ...project, status: newStatus });
      toast.success('Status bijgewerkt');
    } catch (error) {
      toast.error('Kon status niet bijwerken');
    }
  };

  const handleSaveCosts = async () => {
    try {
      const response = await axios.put(`${API}/projects/${projectId}`, costData, { withCredentials: true });
      setProject(response.data);
      setEditingCosts(false);
      toast.success('Kosten bijgewerkt!');
      fetchProjectData(); // Refresh to get calculated profit
    } catch (error) {
      toast.error('Kon kosten niet bijwerken');
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

  if (!project) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p style={{color: '#94A3B8'}}>Project niet gevonden</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div data-testid="project-detail-page" className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button data-testid="back-button" variant="ghost" onClick={() => navigate('/projects')}>
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-4xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E40AF'}}>{project.name}</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Project Informatie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-semibold" style={{color: '#64748B'}}>Status</div>
              <Select value={project.status} onValueChange={handleStatusChange}>
                <SelectTrigger data-testid="status-select" className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gepland">Gepland</SelectItem>
                  <SelectItem value="in uitvoering">In Uitvoering</SelectItem>
                  <SelectItem value="voltooid">Voltooid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {project.start_date && (
              <div>
                <div className="text-sm font-semibold" style={{color: '#64748B'}}>Startdatum</div>
                <div style={{color: '#1E293B'}}>{new Date(project.start_date).toLocaleDateString('nl-NL')}</div>
              </div>
            )}
            {project.end_date && (
              <div>
                <div className="text-sm font-semibold" style={{color: '#64748B'}}>Einddatum</div>
                <div style={{color: '#1E293B'}}>{new Date(project.end_date).toLocaleDateString('nl-NL')}</div>
              </div>
            )}
            {project.notes && (
              <div>
                <div className="text-sm font-semibold" style={{color: '#64748B'}}>Notities</div>
                <div style={{color: '#1E293B'}}>{project.notes}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {quote && (
          <Card>
            <CardHeader>
              <CardTitle>Gekoppelde Offerte</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-lg" style={{color: '#1E40AF'}}>{quote.quote_number}</div>
                  <div className="text-sm" style={{color: '#64748B'}}>Status: {quote.status}</div>
                </div>
                <div>
                  <div className="text-sm" style={{color: '#64748B'}}>Verkoopprijs</div>
                  <div className="text-2xl font-bold" style={{color: '#3B82F6'}}>€{quote.total_price.toFixed(2)}</div>
                  <Button data-testid="view-quote-button" variant="outline" className="mt-2" onClick={() => navigate(`/quotes/${quote.id}`)}>Bekijk Offerte</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Kosten & Winstberekening</CardTitle>
              {!editingCosts ? (
                <Button data-testid="edit-costs-button" onClick={() => setEditingCosts(true)} variant="outline">Kosten Bewerken</Button>
              ) : (
                <div className="flex gap-2">
                  <Button data-testid="cancel-costs-button" onClick={() => { setEditingCosts(false); fetchProjectData(); }} variant="outline">Annuleren</Button>
                  <Button data-testid="save-costs-button" onClick={handleSaveCosts} style={{backgroundColor: '#1E40AF'}}>Opslaan</Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingCosts ? (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Uurtarief Arbeid (€)</Label>
                  <Input 
                    data-testid="labor-cost-input"
                    type="number" 
                    step="0.01"
                    value={costData.labor_cost_per_hour} 
                    onChange={(e) => setCostData({...costData, labor_cost_per_hour: parseFloat(e.target.value) || 0})} 
                  />
                </div>
                <div>
                  <Label>Aantal Uren</Label>
                  <Input 
                    data-testid="labor-hours-input"
                    type="number" 
                    step="0.5"
                    value={costData.labor_hours} 
                    onChange={(e) => setCostData({...costData, labor_hours: parseFloat(e.target.value) || 0})} 
                  />
                </div>
                <div>
                  <Label>Aankoopprijs Materialen (€)</Label>
                  <Input 
                    data-testid="material-costs-input"
                    type="number" 
                    step="0.01"
                    value={costData.material_costs} 
                    onChange={(e) => setCostData({...costData, material_costs: parseFloat(e.target.value) || 0})} 
                  />
                </div>
                <div>
                  <Label>Overige Kosten (€)</Label>
                  <Input 
                    data-testid="other-costs-input"
                    type="number" 
                    step="0.01"
                    value={costData.other_costs} 
                    onChange={(e) => setCostData({...costData, other_costs: parseFloat(e.target.value) || 0})} 
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-semibold" style={{color: '#64748B'}}>Uurtarief Arbeid</div>
                    <div style={{color: '#1E293B'}}>€{project.labor_cost_per_hour?.toFixed(2) || '0.00'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{color: '#64748B'}}>Aantal Uren</div>
                    <div style={{color: '#1E293B'}}>{project.labor_hours?.toFixed(1) || '0.0'} uur</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{color: '#64748B'}}>Totale Arbeidskosten</div>
                    <div style={{color: '#1E293B'}}>€{((project.labor_cost_per_hour || 0) * (project.labor_hours || 0)).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{color: '#64748B'}}>Aankoopprijs Materialen</div>
                    <div style={{color: '#1E293B'}}>€{project.material_costs?.toFixed(2) || '0.00'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{color: '#64748B'}}>Overige Kosten</div>
                    <div style={{color: '#1E293B'}}>€{project.other_costs?.toFixed(2) || '0.00'}</div>
                  </div>
                </div>
                
                <div className="border-t pt-4 mt-4 space-y-3">
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold" style={{color: '#64748B'}}>Totale Kosten:</span>
                    <span className="font-bold" style={{color: '#EF4444'}}>€{project.total_costs?.toFixed(2) || '0.00'}</span>
                  </div>
                  
                  {quote && (
                    <>
                      <div className="flex justify-between text-lg">
                        <span className="font-semibold" style={{color: '#64748B'}}>Verkoopprijs:</span>
                        <span className="font-bold" style={{color: '#3B82F6'}}>€{quote.total_price.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between text-2xl border-t pt-3">
                        <span className="font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E40AF'}}>Winst:</span>
                        <span className="font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: project.profit >= 0 ? '#10B981' : '#EF4444'}}>
                          €{project.profit?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="font-semibold" style={{color: '#64748B'}}>Winstmarge:</span>
                        <span className="font-bold text-lg" style={{color: project.profit >= 0 ? '#10B981' : '#EF4444'}}>
                          {project.profit_margin?.toFixed(1) || '0.0'}%
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}