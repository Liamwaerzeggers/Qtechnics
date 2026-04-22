import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, useAuth } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Trash2, Trophy, XCircle, RefreshCw, TrendingUp, AlertCircle, MapPin, ChevronDown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Status definitions with colors and labels
const PROJECT_STATUSES = [
  { key: 'nieuwe_lead', label: 'Nieuwe Lead', bg: '#DBEAFE', color: '#1E40AF', dotColor: '#3B82F6' },
  { key: 'eerste_bezoek', label: 'Eerste Bezoek', bg: '#EDE9FE', color: '#5B21B6', dotColor: '#8B5CF6' },
  { key: 'offerte_gemaakt', label: 'Offerte Gemaakt', bg: '#FEF3C7', color: '#92400E', dotColor: '#F59E0B' },
  { key: 'offerte_voorgesteld', label: 'Offerte Voorgesteld', bg: '#FFEDD5', color: '#9A3412', dotColor: '#F97316' },
  { key: 'verkocht', label: 'Verkocht', bg: '#D1FAE5', color: '#065F46', dotColor: '#10B981' },
  { key: 'in_uitvoering', label: 'In Uitvoering', bg: '#f5e6e6', color: '#7a1f1f', dotColor: '#7a1f1f' },
  { key: 'afgerond', label: 'Afgerond', bg: '#ECFDF5', color: '#047857', dotColor: '#059669' },
  { key: 'niet_verkocht', label: 'Niet Verkocht', bg: '#FEE2E2', color: '#991B1B', dotColor: '#DC2626' },
];

const getStatusConfig = (statusKey) => {
  // Handle legacy status values
  const legacyMap = {
    'gepland': 'nieuwe_lead',
    'eerste bezoek': 'eerste_bezoek',
    'offerte in opmaak': 'offerte_gemaakt',
    'in uitvoering': 'in_uitvoering',
    'voltooid': 'afgerond',
    'niet verkocht': 'niet_verkocht',
  };
  const mapped = legacyMap[statusKey] || statusKey;
  return PROJECT_STATUSES.find(s => s.key === mapped) || PROJECT_STATUSES[0];
};

// Milestone definitions
const MILESTONES = [
  { amount: 100000, label: '€100K', icon: '🎯', color: '#7a1f1f', message: 'Goede start!' },
  { amount: 250000, label: '€250K', icon: '🔥', color: '#F59E0B', message: 'Lekker bezig!' },
  { amount: 500000, label: '€500K', icon: '⭐', color: '#500000', message: 'Halve miljoen!' },
  { amount: 750000, label: '€750K', icon: '💪', color: '#3a190b', message: 'Sterk werk!' },
  { amount: 1000000, label: '€1M', icon: '🏆', color: '#FFD700', message: 'MILJOENAIRS!' },
  { amount: 1500000, label: '€1.5M', icon: '🚀', color: '#EF4444', message: 'To the moon!' },
  { amount: 2000000, label: '€2M', icon: '👑', color: '#FFD700', message: 'KONINGEN!' },
];

// Status dropdown component on project tiles
function StatusDropdown({ project, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const currentStatus = getStatusConfig(project.status);

  const handleChange = async (e, newStatus) => {
    e.stopPropagation();
    setOpen(false);
    if (newStatus === project.status) return;
    onStatusChange(project.id, newStatus);
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        data-testid={`status-dropdown-${project.id}`}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:opacity-80"
        style={{ backgroundColor: currentStatus.bg, color: currentStatus.color }}
      >
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentStatus.dotColor }} />
        {currentStatus.label}
        <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute left-0 top-full mt-1 z-50 bg-white rounded-lg shadow-xl border py-1 min-w-[180px]">
            {PROJECT_STATUSES.map((s) => (
              <button
                key={s.key}
                data-testid={`status-option-${s.key}`}
                onClick={(e) => handleChange(e, s.key)}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors"
                style={project.status === s.key || getStatusConfig(project.status).key === s.key ? { backgroundColor: s.bg } : {}}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.dotColor }} />
                <span style={{ color: s.color, fontWeight: project.status === s.key ? 600 : 400 }}>{s.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isWorker = user?.role === 'worker';
  const [projects, setProjects] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('alle');
  const [notSoldDialogOpen, setNotSoldDialogOpen] = useState(false);
  const [selectedProjectForNotSold, setSelectedProjectForNotSold] = useState(null);
  const [notSoldReason, setNotSoldReason] = useState('');
  const [formData, setFormData] = useState({
    quote_id: '',
    name: '',
    start_date: '',
    end_date: '',
    notes: ''
  });

  // Calculate total SOLD sales
  const activeProjects = projects.filter(p => getStatusConfig(p.status).key !== 'niet_verkocht');
  const totalSales = activeProjects.reduce((sum, p) => sum + (p.sales_price || 0), 0);
  const totalPotentialSales = activeProjects.reduce((sum, p) => sum + (p.potential_sales || 0), 0);
  
  const currentMilestone = MILESTONES.filter(m => totalSales >= m.amount).pop();
  const nextMilestone = MILESTONES.find(m => totalSales < m.amount) || MILESTONES[MILESTONES.length - 1];
  const progressToNext = nextMilestone ? Math.min((totalSales / nextMilestone.amount) * 100, 100) : 100;

  // Count projects per status
  const statusCounts = {};
  PROJECT_STATUSES.forEach(s => { statusCounts[s.key] = 0; });
  projects.forEach(p => {
    const key = getStatusConfig(p.status).key;
    statusCounts[key] = (statusCounts[key] || 0) + 1;
  });

  // Filter projects by active tab and search
  const getFilteredProjects = () => {
    let filtered = projects;
    
    // Filter by status tab
    if (activeTab !== 'alle') {
      filtered = filtered.filter(p => getStatusConfig(p.status).key === activeTab);
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(q) ||
        (p.lead_address && p.lead_address.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q))
      );
    }
    
    return filtered;
  };

  const filteredProjects = getFilteredProjects();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, quotesRes] = await Promise.allSettled([
        axios.get(`${API}/projects`, { headers: getAuthHeaders() }),
        axios.get(`${API}/quotes`, { headers: getAuthHeaders() })
      ]);
      if (projectsRes.status === 'fulfilled') setProjects(projectsRes.value.data);
      if (quotesRes.status === 'fulfilled') setQuotes(quotesRes.value.data);
      
      // Only show error if BOTH failed
      if (projectsRes.status === 'rejected' && quotesRes.status === 'rejected') {
        toast.error('Kon gegevens niet ophalen');
      }
    } catch (error) {
      toast.error('Kon gegevens niet ophalen');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData };
      if (!data.quote_id || data.quote_id === '') delete data.quote_id;
      if (data.start_date) data.start_date = new Date(data.start_date).toISOString();
      if (data.end_date) data.end_date = new Date(data.end_date).toISOString();
      
      await axios.post(`${API}/projects`, data, { headers: getAuthHeaders() });
      toast.success('Project aangemaakt!');
      setIsDialogOpen(false);
      setFormData({ quote_id: '', name: '', start_date: '', end_date: '', notes: '' });
      fetchData();
    } catch (error) {
      toast.error('Kon project niet aanmaken');
    }
  };

  const handleDeleteProject = async (e, projectId, projectName) => {
    e.stopPropagation();
    if (!window.confirm(`Weet je zeker dat je project "${projectName}" permanent wilt verwijderen?`)) return;
    try {
      await axios.delete(`${API}/projects/${projectId}`, { headers: getAuthHeaders() });
      toast.success('Project verwijderd');
      fetchData();
    } catch (error) {
      toast.error('Kon project niet verwijderen');
    }
  };

  const handleToggleWorkerVisibility = async (e, projectId) => {
    e.stopPropagation();
    try {
      const response = await axios.put(`${API}/projects/${projectId}/toggle-worker-visibility`, {}, { headers: getAuthHeaders() });
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error('Kon zichtbaarheid niet wijzigen');
    }
  };

  const handleStatusChange = async (projectId, newStatus) => {
    // If changing to niet_verkocht, open the reason dialog
    if (newStatus === 'niet_verkocht') {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setSelectedProjectForNotSold(project);
        setNotSoldDialogOpen(true);
      }
      return;
    }
    
    try {
      await axios.put(`${API}/projects/${projectId}/quick-status`, { status: newStatus }, { headers: getAuthHeaders() });
      const statusLabel = PROJECT_STATUSES.find(s => s.key === newStatus)?.label || newStatus;
      toast.success(`Status bijgewerkt naar "${statusLabel}"`);
      fetchData();
    } catch (error) {
      toast.error('Kon status niet bijwerken');
    }
  };

  const handleMarkNotSold = async () => {
    if (!selectedProjectForNotSold || !notSoldReason.trim()) {
      toast.error('Vul een reden in');
      return;
    }
    try {
      await axios.put(
        `${API}/projects/${selectedProjectForNotSold.id}/mark-not-sold?reason=${encodeURIComponent(notSoldReason)}`,
        {}, { headers: getAuthHeaders() }
      );
      toast.success('Project gemarkeerd als niet verkocht');
      setNotSoldDialogOpen(false);
      setSelectedProjectForNotSold(null);
      setNotSoldReason('');
      fetchData();
    } catch (error) {
      toast.error('Kon project niet updaten');
    }
  };

  const handleReactivateProject = async (e, projectId) => {
    e.stopPropagation();
    try {
      await axios.put(`${API}/projects/${projectId}/reactivate`, {}, { headers: getAuthHeaders() });
      toast.success('Project opnieuw geactiveerd');
      fetchData();
    } catch (error) {
      toast.error('Kon project niet reactiveren');
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
    <DashboardLayout showBackToDashboard={true}>
      <div data-testid="projects-page" className="space-y-6">
        
        {/* Sales Progress Banner */}
        {!isWorker && (
          <div className="relative overflow-hidden rounded-2xl p-6" style={{
            background: 'linear-gradient(135deg, #3a190b 0%, #500000 50%, #7a1f1f 100%)'
          }}>
            <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
              <Trophy size={256} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    {currentMilestone?.icon || '🎯'} Team Sales Leaderboard
                  </h2>
                  <p className="text-red-200 text-sm mt-1">
                    {currentMilestone ? currentMilestone.message : 'Aan de slag!'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-white">
                    €{totalSales.toLocaleString('nl-NL', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                  </div>
                  <div className="text-red-200 text-sm">Totale Verkoop</div>
                </div>
              </div>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-red-200">Volgende mijlpaal: {nextMilestone?.label}</span>
                  <span className="text-sm font-bold text-white">{progressToNext.toFixed(0)}%</span>
                </div>
                <div className="h-4 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{
                    width: `${progressToNext}%`,
                    background: 'linear-gradient(90deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)'
                  }} />
                </div>
                {nextMilestone && (
                  <div className="text-xs text-red-200 mt-1">
                    Nog €{(nextMilestone.amount - totalSales).toLocaleString('nl-NL', {minimumFractionDigits: 0})} te gaan!
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center">
                {MILESTONES.map((milestone) => {
                  const isReached = totalSales >= milestone.amount;
                  const isCurrent = currentMilestone?.amount === milestone.amount;
                  return (
                    <div key={milestone.amount} className={`flex flex-col items-center transition-all ${isReached ? 'opacity-100 scale-110' : 'opacity-40'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isCurrent ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent' : ''}`}
                        style={{ backgroundColor: isReached ? milestone.color : 'rgba(255,255,255,0.2)', boxShadow: isReached ? `0 0 20px ${milestone.color}50` : 'none' }}>
                        {milestone.icon}
                      </div>
                      <span className={`text-xs mt-1 font-semibold ${isReached ? 'text-white' : 'text-red-300'}`}>{milestone.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Potential Sales Banner */}
        {!isWorker && totalPotentialSales > 0 && (
          <div className="p-4 rounded-xl flex items-center justify-between" style={{backgroundColor: '#FEF3C7'}}>
            <div className="flex items-center gap-3">
              <TrendingUp size={24} style={{color: '#D97706'}} />
              <div>
                <p className="font-semibold" style={{color: '#92400E'}}>
                  Potentiële verkoop: €{totalPotentialSales.toLocaleString('nl-NL', {minimumFractionDigits: 2})}
                </p>
                <p className="text-sm" style={{color: '#B45309'}}>Offertes goedgekeurd maar nog niet verkocht</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setActiveTab('offerte_voorgesteld')} style={{borderColor: '#D97706', color: '#D97706'}}>
              Bekijk offertes
            </Button>
          </div>
        )}

        {/* Status Tabs - Horizontal scrollable */}
        {!isWorker && (
          <div data-testid="status-tabs" className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'thin' }}>
            <button
              data-testid="tab-alle"
              onClick={() => setActiveTab('alle')}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'alle' ? 'text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={activeTab === 'alle' ? {backgroundColor: '#500000'} : {}}
            >
              Alle
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'alle' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}`}>
                {projects.length}
              </span>
            </button>
            {PROJECT_STATUSES.map((status) => {
              const count = statusCounts[status.key] || 0;
              const isActive = activeTab === status.key;
              return (
                <button
                  key={status.key}
                  data-testid={`tab-${status.key}`}
                  onClick={() => setActiveTab(status.key)}
                  className={`px-3 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                    isActive ? 'shadow-md' : 'hover:bg-gray-100'
                  }`}
                  style={isActive 
                    ? { backgroundColor: status.dotColor, color: 'white' } 
                    : { color: count > 0 ? status.color : '#9CA3AF' }
                  }
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: isActive ? 'white' : status.dotColor, opacity: count > 0 ? 1 : 0.4 }} />
                  {status.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Header + Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <h1 className="text-3xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>
            {isWorker ? 'Projecten / Проєкти' : 'Projecten'}
          </h1>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <Input
                data-testid="search-projects-input"
                placeholder={isWorker ? "Zoek... / Пошук..." : "Zoek project of adres..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {!isWorker && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="create-project-button" style={{backgroundColor: '#500000'}}>
                    <Plus className="mr-2" size={20} /> Nieuw
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nieuw Project Aanmaken</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4" data-testid="create-project-form">
                    <div>
                      <Label>Selecteer Offerte (Optioneel)</Label>
                      <Select value={formData.quote_id || undefined} onValueChange={(value) => setFormData({...formData, quote_id: value})}>
                        <SelectTrigger data-testid="project-quote-select">
                          <SelectValue placeholder="Geen offerte (optioneel)" />
                        </SelectTrigger>
                        <SelectContent>
                          {quotes.map((quote) => (
                            <SelectItem key={quote.id} value={quote.id}>{quote.quote_number}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Projectnaam</Label>
                      <Input data-testid="project-name-input" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                    </div>
                    <div>
                      <Label>Startdatum</Label>
                      <Input data-testid="project-startdate-input" type="date" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} />
                    </div>
                    <div>
                      <Label>Einddatum</Label>
                      <Input data-testid="project-enddate-input" type="date" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} />
                    </div>
                    <div>
                      <Label>Notities</Label>
                      <Textarea data-testid="project-notes-input" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} />
                    </div>
                    <Button data-testid="submit-project-button" type="submit" className="w-full" style={{backgroundColor: '#500000'}}>Aanmaken</Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {isWorker && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-medium" style={{color: '#500000'}}>
              Klik op een project om direct een werkbon in te vullen / Натисніть на проєкт, щоб заповнити робочий звіт
            </p>
          </div>
        )}

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => {
            const statusConfig = getStatusConfig(project.status);
            return (
              <Card 
                key={project.id} 
                data-testid={`project-card-${project.id}`} 
                className="cursor-pointer hover:shadow-lg transition-all relative group" 
                onClick={() => isWorker ? navigate(`/projects/${project.id}/work-slips`) : navigate(`/projects/${project.id}`)}
                style={{ borderLeft: `4px solid ${statusConfig.dotColor}` }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold truncate" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>{project.name}</h3>
                      {isWorker && project.lead_address && (
                        <p className="text-sm mb-2 flex items-center gap-1 truncate" style={{color: '#64748B'}}>
                          <MapPin size={14} className="flex-shrink-0" />
                          {project.lead_address}
                        </p>
                      )}
                    </div>
                    {!isWorker && (
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <Button variant="ghost" size="sm"
                          onClick={(e) => handleDeleteProject(e, project.id, project.name)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-50 hover:text-orange-600 h-7 w-7 p-0"
                          title="Verwijderen">
                          <Trash2 size={15} />
                        </Button>
                        {statusConfig.key === 'niet_verkocht' && (
                          <Button variant="ghost" size="sm"
                            onClick={(e) => handleReactivateProject(e, project.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-50 hover:text-green-600 h-7 w-7 p-0"
                            title="Reactiveren">
                            <RefreshCw size={15} />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status Badge - clickable dropdown */}
                  <div className="flex items-center justify-between flex-wrap gap-2 mt-2 mb-2">
                    {!isWorker ? (
                      <StatusDropdown project={project} onStatusChange={handleStatusChange} />
                    ) : (
                      <span className="text-xs font-semibold px-3 py-1 rounded-full"
                        style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}>
                        {statusConfig.label}
                      </span>
                    )}
                    
                    {!isWorker && typeof project.profit === 'number' && statusConfig.key !== 'niet_verkocht' && project.sales_price > 0 && (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full"
                        style={{ backgroundColor: project.profit >= 0 ? '#D1FAE5' : '#FEE2E2', color: project.profit >= 0 ? '#065F46' : '#991B1B' }}>
                        {project.profit >= 0 ? '+' : ''}€{project.profit.toLocaleString('nl-NL', {minimumFractionDigits: 0})}
                        {project.sales_price > 0 && ` (${Math.round((project.profit / project.sales_price) * 100)}%)`}
                      </span>
                    )}
                  </div>

                  {/* Not sold reason */}
                  {statusConfig.key === 'niet_verkocht' && project.not_sold_reason && (
                    <div className="text-xs p-2 rounded mb-2" style={{backgroundColor: '#FEE2E2', color: '#991B1B'}}>
                      <AlertCircle size={12} className="inline mr-1" />
                      {project.not_sold_reason}
                    </div>
                  )}

                  {/* Potential sales */}
                  {!isWorker && project.potential_sales > 0 && statusConfig.key !== 'niet_verkocht' && (
                    <div className="text-xs px-2 py-1 rounded mb-2 inline-block" style={{backgroundColor: '#FEF3C7', color: '#92400E'}}>
                      Potentieel: €{project.potential_sales.toLocaleString('nl-NL', {minimumFractionDigits: 2})}
                    </div>
                  )}

                  {project.start_date && (
                    <p className="text-xs mt-1" style={{color: '#64748B'}}>Start: {new Date(project.start_date).toLocaleDateString('nl-NL')}</p>
                  )}

                  {/* Worker visibility toggle */}
                  {!isWorker && (
                    <div className="mt-3 pt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={project.visible_to_workers || false}
                          onCheckedChange={() => handleToggleWorkerVisibility(event, project.id)}
                          className="data-[state=checked]:bg-green-500"
                        />
                        <span className="text-xs" style={{color: project.visible_to_workers ? '#10B981' : '#9CA3AF'}}>
                          {project.visible_to_workers ? 'Zichtbaar voor werkmannen' : 'Niet zichtbaar'}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Not Sold Dialog */}
        <Dialog open={notSoldDialogOpen} onOpenChange={setNotSoldDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Project markeren als niet verkocht</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm" style={{color: '#64748B'}}>
                Project: <strong>{selectedProjectForNotSold?.name}</strong>
              </p>
              <div>
                <Label>Reden waarom niet verkocht *</Label>
                <Textarea value={notSoldReason} onChange={(e) => setNotSoldReason(e.target.value)}
                  placeholder="Bijv: Te duur, andere aannemer gekozen, project uitgesteld..." rows={3} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleMarkNotSold} style={{backgroundColor: '#DC2626'}} className="flex-1">
                  <XCircle className="mr-2" size={16} /> Markeer als niet verkocht
                </Button>
                <Button variant="outline" onClick={() => { setNotSoldDialogOpen(false); setNotSoldReason(''); }}>
                  Annuleren
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <p style={{color: '#94A3B8'}}>
              {searchQuery ? `Geen projecten gevonden voor "${searchQuery}"` : 
               activeTab === 'alle' ? 'Nog geen projecten' : 
               `Geen projecten met status "${PROJECT_STATUSES.find(s => s.key === activeTab)?.label || activeTab}"`}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
