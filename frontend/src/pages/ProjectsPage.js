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
import { Plus, Search, Trash2, Trophy, Target, Flame, Star, Rocket, XCircle, RefreshCw, TrendingUp, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Milestone definitions - Max Q branding colors
const MILESTONES = [
  { amount: 100000, label: '€100K', icon: '🎯', color: '#7a1f1f', message: 'Goede start!' },
  { amount: 250000, label: '€250K', icon: '🔥', color: '#F59E0B', message: 'Lekker bezig!' },
  { amount: 500000, label: '€500K', icon: '⭐', color: '#500000', message: 'Halve miljoen!' },
  { amount: 750000, label: '€750K', icon: '💪', color: '#3a190b', message: 'Sterk werk!' },
  { amount: 1000000, label: '€1M', icon: '🏆', color: '#FFD700', message: 'MILJOENAIRS!' },
  { amount: 1500000, label: '€1.5M', icon: '🚀', color: '#EF4444', message: 'To the moon!' },
  { amount: 2000000, label: '€2M', icon: '👑', color: '#FFD700', message: 'KONINGEN!' },
];

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isWorker = user?.role === 'worker';
  const [projects, setProjects] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'potential', 'not_sold'
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

  // Filter projects by status
  const activeProjects = projects.filter(p => p.status !== 'niet verkocht');
  const notSoldProjects = projects.filter(p => p.status === 'niet verkocht');
  
  // Calculate total SOLD sales (only is_sold quotes count)
  const totalSales = activeProjects.reduce((sum, p) => sum + (p.sales_price || 0), 0);
  
  // Calculate potential sales (approved but not sold)
  const totalPotentialSales = activeProjects.reduce((sum, p) => sum + (p.potential_sales || 0), 0);
  
  // Find current and next milestone
  const currentMilestone = MILESTONES.filter(m => totalSales >= m.amount).pop();
  const nextMilestone = MILESTONES.find(m => totalSales < m.amount) || MILESTONES[MILESTONES.length - 1];
  const progressToNext = nextMilestone ? Math.min((totalSales / nextMilestone.amount) * 100, 100) : 100;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      setFilteredProjects(projects.filter(project => 
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.status.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    } else {
      setFilteredProjects(projects);
    }
  }, [searchQuery, projects]);

  const fetchData = async () => {
    try {
      const [projectsRes, quotesRes] = await Promise.all([
        axios.get(`${API}/projects`, { withCredentials: true }),
        axios.get(`${API}/quotes`, { withCredentials: true })
      ]);
      setProjects(projectsRes.data);
      setFilteredProjects(projectsRes.data);
      setQuotes(quotesRes.data);
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
      // Don't send empty quote_id
      if (!data.quote_id || data.quote_id === '') {
        delete data.quote_id;
      }
      if (data.start_date) data.start_date = new Date(data.start_date).toISOString();
      if (data.end_date) data.end_date = new Date(data.end_date).toISOString();
      
      await axios.post(`${API}/projects`, data, { withCredentials: true });
      toast.success('Project aangemaakt!');
      setIsDialogOpen(false);
      setFormData({ quote_id: '', name: '', start_date: '', end_date: '', notes: '' });
      fetchData();
    } catch (error) {
      toast.error('Kon project niet aanmaken');
    }
  };

  const handleDeleteProject = async (e, projectId, projectName) => {
    e.stopPropagation(); // Prevent card click
    
    if (!window.confirm(`Weet je zeker dat je project "${projectName}" permanent wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) {
      return;
    }

    try {
      await axios.delete(`${API}/projects/${projectId}`, { withCredentials: true });
      toast.success('Project verwijderd');
      fetchData();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Kon project niet verwijderen');
    }
  };

  const handleToggleWorkerVisibility = async (e, projectId, currentVisibility) => {
    e.stopPropagation(); // Prevent card click
    
    try {
      const response = await axios.put(
        `${API}/projects/${projectId}/toggle-worker-visibility`, 
        {},
        { withCredentials: true }
      );
      
      toast.success(response.data.message);
      fetchData(); // Refresh project list
    } catch (error) {
      console.error('Toggle visibility error:', error);
      toast.error('Kon zichtbaarheid niet wijzigen');
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
        {},
        { withCredentials: true }
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
      await axios.put(
        `${API}/projects/${projectId}/reactivate`,
        {},
        { withCredentials: true }
      );
      toast.success('Project opnieuw geactiveerd');
      fetchData();
    } catch (error) {
      toast.error('Kon project niet reactiveren');
    }
  };

  const openNotSoldDialog = (e, project) => {
    e.stopPropagation();
    setSelectedProjectForNotSold(project);
    setNotSoldDialogOpen(true);
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
        
        {/* Gamification Banner - Sales Progress */}
        {!isWorker && (
          <div className="relative overflow-hidden rounded-2xl p-6" style={{
            background: 'linear-gradient(135deg, #3a190b 0%, #500000 50%, #7a1f1f 100%)'
          }}>
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
              <Trophy size={256} />
            </div>
            
            <div className="relative z-10">
              {/* Header */}
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
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-red-200">
                    Volgende mijlpaal: {nextMilestone?.label}
                  </span>
                  <span className="text-sm font-bold text-white">
                    {progressToNext.toFixed(0)}%
                  </span>
                </div>
                <div className="h-4 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${progressToNext}%`,
                      background: 'linear-gradient(90deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)'
                    }}
                  />
                </div>
                {nextMilestone && (
                  <div className="text-xs text-red-200 mt-1">
                    Nog €{(nextMilestone.amount - totalSales).toLocaleString('nl-NL', {minimumFractionDigits: 0})} te gaan!
                  </div>
                )}
              </div>
              
              {/* Milestones */}
              <div className="flex justify-between items-center">
                {MILESTONES.map((milestone, index) => {
                  const isReached = totalSales >= milestone.amount;
                  const isCurrent = currentMilestone?.amount === milestone.amount;
                  return (
                    <div 
                      key={milestone.amount}
                      className={`flex flex-col items-center transition-all ${isReached ? 'opacity-100 scale-110' : 'opacity-40'}`}
                    >
                      <div 
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isCurrent ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent' : ''}`}
                        style={{
                          backgroundColor: isReached ? milestone.color : 'rgba(255,255,255,0.2)',
                          boxShadow: isReached ? `0 0 20px ${milestone.color}50` : 'none'
                        }}
                      >
                        {milestone.icon}
                      </div>
                      <span className={`text-xs mt-1 font-semibold ${isReached ? 'text-white' : 'text-red-300'}`}>
                        {milestone.label}
                      </span>
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
                <p className="text-sm" style={{color: '#B45309'}}>
                  Offertes goedgekeurd maar nog niet verkocht - push die sales! 💪
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setActiveTab('potential')}
              style={{borderColor: '#D97706', color: '#D97706'}}
            >
              Bekijk offertes
            </Button>
          </div>
        )}

        {/* Tabs */}
        {!isWorker && (
          <div className="flex gap-2 border-b pb-2">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-all ${
                activeTab === 'active' 
                  ? 'text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={activeTab === 'active' ? {backgroundColor: '#500000'} : {}}
            >
              Actief ({activeProjects.length})
            </button>
            <button
              onClick={() => setActiveTab('not_sold')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-all flex items-center gap-2 ${
                activeTab === 'not_sold' 
                  ? 'text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={activeTab === 'not_sold' ? {backgroundColor: '#DC2626'} : {}}
            >
              <XCircle size={16} />
              Niet Verkocht ({notSoldProjects.length})
            </button>
          </div>
        )}

        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>
            {isWorker ? 'Projecten / Проєкти' : 'Projecten'}
          </h1>
          {!isWorker && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-project-button" style={{backgroundColor: '#500000'}}>
                <Plus className="mr-2" size={20} /> Nieuw Project
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
                  <p className="text-xs text-gray-500 mt-1">💡 Tip: Maak een Lead aan om automatisch een project te starten</p>
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

        {isWorker && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-medium" style={{color: '#500000'}}>
              👷 <strong>Klik op een project</strong> om direct een werkbon in te vullen / <strong>Натисніть на проєкт</strong>, щоб заповнити робочий звіт
            </p>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <Input
            data-testid="search-projects-input"
            placeholder={isWorker ? "Zoek projecten... / Пошук проєктів..." : "Zoek projecten..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(activeTab === 'not_sold' ? notSoldProjects : filteredProjects.filter(p => p.status !== 'niet verkocht')).map((project) => (
            <Card 
              key={project.id} 
              data-testid={`project-card-${project.id}`} 
              className="cursor-pointer hover:shadow-lg transition-all relative group" 
              onClick={() => isWorker ? navigate(`/projects/${project.id}/work-slips`) : navigate(`/projects/${project.id}`)}
              style={activeTab === 'not_sold' ? {borderLeft: '4px solid #DC2626'} : {}}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>{project.name}</h3>
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span 
                          className="text-xs font-semibold px-3 py-1 rounded-full"
                          style={{
                            backgroundColor: project.status === 'voltooid' ? '#DCFCE7' : 
                              project.status === 'in uitvoering' ? '#f5e6e6' : 
                              project.status === 'niet verkocht' ? '#FEE2E2' : '#FEF3C7',
                            color: project.status === 'voltooid' ? '#166534' : 
                              project.status === 'in uitvoering' ? '#500000' : 
                              project.status === 'niet verkocht' ? '#991B1B' : '#92400E'
                          }}
                        >
                          {project.status}
                        </span>
                        {project.is_archived && (
                          <span 
                            className="text-xs font-semibold px-3 py-1 rounded-full"
                            style={{backgroundColor: '#F3F4F6', color: '#6B7280'}}
                          >
                            📦 Gearchiveerd
                          </span>
                        )}
                      </div>
                      {!isWorker && typeof project.profit === 'number' && project.status !== 'niet verkocht' && (
                        <span 
                          className="text-xs font-semibold px-3 py-1 rounded-full"
                          style={{
                            backgroundColor: project.profit >= 0 ? '#D1FAE5' : '#FEE2E2', 
                            color: project.profit >= 0 ? '#065F46' : '#991B1B'
                          }}
                        >
                          💰 {project.profit >= 0 ? '+' : ''}{project.profit.toLocaleString('nl-NL', {style: 'currency', currency: 'EUR'})}
                          {project.sales_price > 0 && (
                            <span className="ml-1">
                              ({Math.round((project.profit / project.sales_price) * 100)}%)
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    
                    {/* Show potential sales if exists */}
                    {!isWorker && project.potential_sales > 0 && project.status !== 'niet verkocht' && (
                      <div className="text-xs px-2 py-1 rounded mb-2 inline-block" style={{backgroundColor: '#FEF3C7', color: '#92400E'}}>
                        💡 Potentieel: €{project.potential_sales.toLocaleString('nl-NL', {minimumFractionDigits: 2})}
                      </div>
                    )}
                    
                    {/* Show not sold reason */}
                    {project.status === 'niet verkocht' && project.not_sold_reason && (
                      <div className="text-xs p-2 rounded mb-2" style={{backgroundColor: '#FEE2E2', color: '#991B1B'}}>
                        <AlertCircle size={12} className="inline mr-1" />
                        {project.not_sold_reason}
                      </div>
                    )}
                    
                    {project.start_date && (
                      <p className="text-sm mt-2" style={{color: '#64748B'}}>Start: {new Date(project.start_date).toLocaleDateString('nl-NL')}</p>
                    )}
                    
                    {/* Worker Visibility Toggle - Only for admins */}
                    {!isWorker && (
                      <div 
                        className="mt-3 pt-3 border-t border-gray-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={project.visible_to_workers || false}
                              onCheckedChange={(checked) => handleToggleWorkerVisibility(event, project.id, project.visible_to_workers)}
                              className="data-[state=checked]:bg-green-500"
                            />
                            <span className="text-sm font-medium" style={{color: '#1E293B'}}>
                              Zichtbaar voor werkmannen
                            </span>
                          </div>
                        </div>
                        <p className="text-xs mt-1 ml-9" style={{color: project.visible_to_workers ? '#10B981' : '#6B7280'}}>
                          {project.visible_to_workers ? '✓ Werkmannen zien dit project' : '✕ Niet zichtbaar voor werkmannen'}
                        </p>
                      </div>
                    )}
                  </div>
                  {!isWorker && (
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeleteProject(e, project.id, project.name)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-50 hover:text-orange-600"
                        title="Project verwijderen"
                      >
                        <Trash2 size={18} />
                      </Button>
                    
                      {/* Not Sold / Reactivate buttons */}
                      {project.status === 'niet verkocht' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleReactivateProject(e, project.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-50 hover:text-green-600"
                          title="Project opnieuw activeren"
                        >
                          <RefreshCw size={18} />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => openNotSoldDialog(e, project)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600"
                          title="Markeer als niet verkocht"
                        >
                          <XCircle size={18} />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
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
                <Textarea
                  value={notSoldReason}
                  onChange={(e) => setNotSoldReason(e.target.value)}
                  placeholder="Bijv: Te duur, andere aannemer gekozen, project uitgesteld..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleMarkNotSold}
                  style={{backgroundColor: '#DC2626'}}
                  className="flex-1"
                >
                  <XCircle className="mr-2" size={16} />
                  Markeer als niet verkocht
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setNotSoldDialogOpen(false);
                    setNotSoldReason('');
                  }}
                >
                  Annuleren
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {filteredProjects.length === 0 && activeTab === 'active' && (
          <div className="text-center py-12">
            <p style={{color: '#94A3B8'}}>Nog geen projecten</p>
          </div>
        )}
        
        {notSoldProjects.length === 0 && activeTab === 'not_sold' && (
          <div className="text-center py-12">
            <p style={{color: '#94A3B8'}}>Geen niet-verkochte projecten 🎉</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}