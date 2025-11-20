import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, FileText, Edit } from 'lucide-react';
import { toast } from 'sonner';

export default function LeadDetailPage() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    project_type: '',
    description: ''
  });

  useEffect(() => {
    fetchLead();
  }, [leadId]);

  const fetchLead = async () => {
    try {
      const response = await axios.get(`${API}/leads/${leadId}`, { withCredentials: true });
      setLead(response.data);
      setFormData({
        name: response.data.name,
        email: response.data.email,
        phone: response.data.phone,
        address: response.data.address,
        project_type: response.data.project_type,
        description: response.data.description
      });
    } catch (error) {
      toast.error('Kon lead niet ophalen');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await axios.put(`${API}/leads/${leadId}`, formData, { withCredentials: true });
      setLead(response.data);
      setEditing(false);
      toast.success('Lead bijgewerkt!');
    } catch (error) {
      toast.error('Kon lead niet bijwerken');
    }
  };

  const handleCreateQuote = async () => {
    try {
      const response = await axios.post(`${API}/quotes`, { lead_id: leadId }, { withCredentials: true });
      toast.success('Offerte aangemaakt!');
      navigate(`/quotes/${response.data.id}`);
    } catch (error) {
      toast.error('Kon offerte niet aanmaken');
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

  if (!lead) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p style={{color: '#94A3B8'}}>Lead niet gevonden</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div data-testid="lead-detail-page" className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button data-testid="back-button" variant="ghost" onClick={() => navigate('/leads')}>
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-4xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E40AF'}}>{lead.name}</h1>
          </div>
          <Button data-testid="create-quote-button" onClick={handleCreateQuote} style={{backgroundColor: '#1E40AF'}}>
            <FileText className="mr-2" size={20} /> Maak Offerte
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lead Informatie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-semibold" style={{color: '#64748B'}}>Email</div>
              <div style={{color: '#1E293B'}}>{lead.email}</div>
            </div>
            <div>
              <div className="text-sm font-semibold" style={{color: '#64748B'}}>Telefoon</div>
              <div style={{color: '#1E293B'}}>{lead.phone}</div>
            </div>
            <div>
              <div className="text-sm font-semibold" style={{color: '#64748B'}}>Adres</div>
              <div style={{color: '#1E293B'}}>{lead.address}</div>
            </div>
            <div>
              <div className="text-sm font-semibold" style={{color: '#64748B'}}>Project Type</div>
              <div style={{color: '#1E293B'}}>{lead.project_type}</div>
            </div>
            <div>
              <div className="text-sm font-semibold" style={{color: '#64748B'}}>Beschrijving</div>
              <div style={{color: '#1E293B'}}>{lead.description}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}