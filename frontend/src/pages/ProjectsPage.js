import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    quote_id: '',
    name: '',
    start_date: '',
    end_date: '',
    notes: ''
  });

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
    
    if (!window.confirm(`Weet je zeker dat je project "${projectName}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) {
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
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E40AF'}}>Projecten</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-project-button" style={{backgroundColor: '#1E40AF'}}>
                <Plus className="mr-2" size={20} /> Nieuw Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuw Project Aanmaken</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="create-project-form">
                <div>
                  <Label>Selecteer Offerte</Label>
                  <Select value={formData.quote_id} onValueChange={(value) => setFormData({...formData, quote_id: value})} required>
                    <SelectTrigger data-testid="project-quote-select">
                      <SelectValue placeholder="Kies een offerte" />
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
                <Button data-testid="submit-project-button" type="submit" className="w-full" style={{backgroundColor: '#1E40AF'}}>Aanmaken</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <Input
            data-testid="search-projects-input"
            placeholder="Zoek projecten..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} data-testid={`project-card-${project.id}`} className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate(`/projects/${project.id}`)}>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-2" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E40AF'}}>{project.name}</h3>
                <span className="text-sm px-3 py-1 rounded-full" style={{backgroundColor: '#DBEAFE', color: '#1E40AF'}}>{project.status}</span>
                {project.start_date && (
                  <p className="text-sm mt-3" style={{color: '#64748B'}}>Start: {new Date(project.start_date).toLocaleDateString('nl-NL')}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <p style={{color: '#94A3B8'}}>Nog geen projecten</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}