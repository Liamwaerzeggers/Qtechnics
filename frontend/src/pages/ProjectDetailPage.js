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

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const projectRes = await axios.get(`${API}/projects/${projectId}`, { withCredentials: true });
      setProject(projectRes.data);
      
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
                  <div className="text-2xl font-bold" style={{color: '#3B82F6'}}>€{quote.total_price.toFixed(2)}</div>
                  <Button data-testid="view-quote-button" variant="outline" className="mt-2" onClick={() => navigate(`/quotes/${quote.id}`)}>Bekijk Offerte</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}