import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Trash2 } from 'lucide-react';
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
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    fetchProjectData();
    fetchInvoices();
  }, [projectId]);
  
  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API}/projects/${projectId}/invoices`, { withCredentials: true });
      setInvoices(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      setInvoices([]);
    }
  };
  
  const createInvoice = async (milestone, percentage) => {
    try {
      await axios.post(
        `${API}/projects/${projectId}/invoices`,
        { project_id: projectId, milestone, milestone_percentage: percentage },
        { withCredentials: true }
      );
      toast.success('Factuur aangemaakt!');
      fetchInvoices();
    } catch (error) {
      console.error('Failed to create invoice:', error);
      toast.error('Kon factuur niet aanmaken: ' + (error.response?.data?.detail || error.message));
    }
  };

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

  const handleDeleteInvoice = (invoiceIndex, filename) => {
    if (!window.confirm(`Factuur "${filename}" verwijderen? Kosten worden teruggedraaid.`)) {
      return;
    }
    
    axios.delete(
      `${API}/projects/${projectId}/invoices/${invoiceIndex}`,
      { withCredentials: true }
    )
    .then(() => {
      toast.success('Factuur verwijderd en kosten aangepast');
      fetchProjectData();
    })
    .catch((error) => {
      console.error('Delete error:', error);
      toast.error('Kon factuur niet verwijderen');
    });
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
            
            {/* Project Color Selector */}
            <div>
              <div className="text-sm font-semibold mb-2" style={{color: '#64748B'}}>Kalender Kleur</div>
              <Select 
                value={project.color || '#1E40AF'}
                onValueChange={async (newColor) => {
                  try {
                    await axios.put(
                      `${API}/projects/${projectId}`, 
                      { color: newColor },
                      { withCredentials: true }
                    );
                    setProject({ ...project, color: newColor });
                    toast.success('Kleur bijgewerkt');
                  } catch (error) {
                    toast.error('Kon kleur niet bijwerken');
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-6 h-6 rounded border-2 border-gray-300"
                      style={{backgroundColor: project.color || '#1E40AF'}}
                    ></div>
                    <span>Projectkleur</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="#1E40AF">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 rounded" style={{backgroundColor: '#1E40AF'}}></div>
                      <span>Blauw</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="#7C3AED">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 rounded" style={{backgroundColor: '#7C3AED'}}></div>
                      <span>Paars</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="#DC2626">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 rounded" style={{backgroundColor: '#DC2626'}}></div>
                      <span>Rood</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="#EA580C">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 rounded" style={{backgroundColor: '#EA580C'}}></div>
                      <span>Oranje</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="#CA8A04">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 rounded" style={{backgroundColor: '#CA8A04'}}></div>
                      <span>Goud</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="#16A34A">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 rounded" style={{backgroundColor: '#16A34A'}}></div>
                      <span>Groen</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="#0891B2">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 rounded" style={{backgroundColor: '#0891B2'}}></div>
                      <span>Cyaan</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="#DB2777">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 rounded" style={{backgroundColor: '#DB2777'}}></div>
                      <span>Roze</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="#9333EA">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 rounded" style={{backgroundColor: '#9333EA'}}></div>
                      <span>Violet</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="#0D9488">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 rounded" style={{backgroundColor: '#0D9488'}}></div>
                      <span>Turquoise</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs mt-1" style={{color: '#94A3B8'}}>
                Deze kleur wordt gebruikt in de kalender
              </p>
            </div>
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
                  <div className="flex space-x-2 mt-2">
                    <Button data-testid="view-quote-button" variant="outline" onClick={() => navigate(`/quotes/${quote.id}`)}>Bekijk Offerte</Button>
                    <Button variant="outline" onClick={() => navigate(`/projects/${project.id}/work-slips`)}>Werkbonnen</Button>
                  </div>
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

        {/* Facturatie Card */}
        <Card>
          <CardHeader>
            <CardTitle>Facturatie (Klant)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Milestone Buttons */}
              <div>
                <h4 className="font-semibold mb-3" style={{color: '#1E3A8A'}}>Deelfacturen Aanmaken</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => createInvoice('10_approval', 10)}
                    disabled={invoices.some(inv => inv.milestone === '10_approval')}
                    className="flex items-center justify-between p-4 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-500 hover:bg-blue-50"
                    style={{borderColor: '#CBD5E1'}}
                  >
                    <div className="text-left">
                      <div className="font-semibold" style={{color: '#1E293B'}}>10% Bij Akkoord</div>
                      <div className="text-sm" style={{color: '#64748B'}}>Akkoord offerte</div>
                    </div>
                    {invoices.some(inv => inv.milestone === '10_approval') && (
                      <span className="text-green-600 font-bold">✓</span>
                    )}
                  </button>
                  
                  <button
                    onClick={() => createInvoice('40_before_start', 40)}
                    disabled={invoices.some(inv => inv.milestone === '40_before_start')}
                    className="flex items-center justify-between p-4 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-500 hover:bg-blue-50"
                    style={{borderColor: '#CBD5E1'}}
                  >
                    <div className="text-left">
                      <div className="font-semibold" style={{color: '#1E293B'}}>40% Voor Start</div>
                      <div className="text-sm" style={{color: '#64748B'}}>Een week voor aanvang</div>
                    </div>
                    {invoices.some(inv => inv.milestone === '40_before_start') && (
                      <span className="text-green-600 font-bold">✓</span>
                    )}
                  </button>
                  
                  <button
                    onClick={() => createInvoice('40_completion', 40)}
                    disabled={invoices.some(inv => inv.milestone === '40_completion')}
                    className="flex items-center justify-between p-4 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-500 hover:bg-blue-50"
                    style={{borderColor: '#CBD5E1'}}
                  >
                    <div className="text-left">
                      <div className="font-semibold" style={{color: '#1E293B'}}>40% Bij Oplevering</div>
                      <div className="text-sm" style={{color: '#64748B'}}>Werken afgerond</div>
                    </div>
                    {invoices.some(inv => inv.milestone === '40_completion') && (
                      <span className="text-green-600 font-bold">✓</span>
                    )}
                  </button>
                  
                  <button
                    onClick={() => createInvoice('10_satisfaction', 10)}
                    disabled={invoices.some(inv => inv.milestone === '10_satisfaction')}
                    className="flex items-center justify-between p-4 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-500 hover:bg-blue-50"
                    style={{borderColor: '#CBD5E1'}}
                  >
                    <div className="text-left">
                      <div className="font-semibold" style={{color: '#1E293B'}}>10% Tevredenheid</div>
                      <div className="text-sm" style={{color: '#64748B'}}>Klant tevreden</div>
                    </div>
                    {invoices.some(inv => inv.milestone === '10_satisfaction') && (
                      <span className="text-green-600 font-bold">✓</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Invoices List */}
              {invoices.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3" style={{color: '#1E3A8A'}}>
                    Uitgegeven Facturen ({invoices.length})
                  </h4>
                  <div className="space-y-2">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-semibold" style={{color: '#1E40AF'}}>
                            {invoice.invoice_number}
                          </div>
                          <div className="text-sm" style={{color: '#64748B'}}>
                            {new Date(invoice.invoice_date).toLocaleDateString('nl-NL')} • {
                              invoice.milestone === '10_approval' ? '10% Akkoord' :
                              invoice.milestone === '40_before_start' ? '40% Voor Start' :
                              invoice.milestone === '40_completion' ? '40% Oplevering' :
                              '10% Tevredenheid'
                            }
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-bold" style={{color: '#1E293B'}}>
                              €{invoice.total_incl_vat.toFixed(2)}
                            </div>
                            <div className="text-xs" style={{color: invoice.payment_status === 'paid' ? '#10B981' : '#F59E0B'}}>
                              {invoice.payment_status === 'paid' ? 'Betaald' : 'Onbetaald'}
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                const response = await axios.get(
                                  `${API}/invoices/${invoice.id}/pdf`,
                                  { withCredentials: true, responseType: 'blob' }
                                );
                                const url = window.URL.createObjectURL(new Blob([response.data]));
                                const link = document.createElement('a');
                                link.href = url;
                                link.setAttribute('download', `factuur_${invoice.invoice_number}.pdf`);
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                                toast.success('PDF gedownload');
                              } catch (error) {
                                toast.error('Kon PDF niet downloaden');
                              }
                            }}
                            className="px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                            style={{color: '#1E40AF'}}
                          >
                            📄 PDF
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invoice Uploads Card */}
        <Card>
          <CardHeader>
            <CardTitle>Inkoop Facturen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Upload Section */}
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".pdf"
                  id="invoice-upload"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    
                    const formData = new FormData();
                    formData.append('file', file);
                    
                    try {
                      toast.loading('Factuur wordt verwerkt...');
                      const response = await axios.post(
                        `${API}/projects/${projectId}/invoices/upload`,
                        formData,
                        { 
                          withCredentials: true,
                          headers: { 'Content-Type': 'multipart/form-data' }
                        }
                      );
                      
                      toast.dismiss();
                      toast.success('Factuur succesvol geüpload en verwerkt!');
                      fetchProjectData();
                      
                      // Show extracted amounts
                      const amounts = response.data.extracted_amounts;
                      toast.info(
                        `Geëxtraheerd: €${amounts.total_incl_vat.toFixed(2)} incl. BTW`
                      );
                    } catch (error) {
                      toast.dismiss();
                      toast.error('Fout bij uploaden factuur');
                      console.error(error);
                    }
                    
                    e.target.value = null;
                  }}
                />
                <label 
                  htmlFor="invoice-upload" 
                  className="cursor-pointer inline-block px-6 py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90"
                  style={{backgroundColor: '#1E40AF'}}
                >
                  📄 Upload Factuur PDF
                </label>
                <p className="text-sm mt-2" style={{color: '#64748B'}}>
                  Upload een inkoop factuur PDF. Bedragen worden automatisch geëxtraheerd.
                </p>
              </div>

              {/* Uploaded Invoices List */}
              {project?.invoice_uploads && project.invoice_uploads.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold" style={{color: '#1E3A8A'}}>
                    Geüploade Facturen ({project.invoice_uploads.length})
                  </h4>
                  {project.invoice_uploads.map((invoice, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium break-words" style={{color: '#1E293B'}}>
                          {invoice.filename}
                        </div>
                        <div className="text-sm" style={{color: '#64748B'}}>
                          {new Date(invoice.upload_date).toLocaleDateString('nl-NL')}
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="text-right">
                          <div className="font-bold" style={{color: '#EF4444'}}>
                            €{invoice.total_incl_vat.toFixed(2)}
                          </div>
                          <div className="text-xs" style={{color: '#64748B'}}>
                            incl. BTW
                          </div>
                        </div>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteInvoice(idx, invoice.filename);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleDeleteInvoice(idx, invoice.filename);
                            }
                          }}
                          className="flex items-center justify-center hover:bg-red-100 text-red-600 hover:text-red-700 min-w-[48px] min-h-[48px] rounded-md cursor-pointer select-none active:scale-95 transition-all"
                          style={{
                            WebkitTapHighlightColor: 'rgba(239, 68, 68, 0.3)',
                            touchAction: 'manipulation',
                            userSelect: 'none',
                            WebkitUserSelect: 'none'
                          }}
                          aria-label={`Verwijder factuur ${invoice.filename}`}
                        >
                          <Trash2 size={22} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}