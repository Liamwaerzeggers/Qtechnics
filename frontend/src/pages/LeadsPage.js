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
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function LeadsPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    project_type: '',
    description: ''
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      setFilteredLeads(leads.filter(lead => 
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.project_type.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    } else {
      setFilteredLeads(leads);
    }
  }, [searchQuery, leads]);

  const fetchLeads = async () => {
    try {
      const response = await axios.get(`${API}/leads`, { withCredentials: true });
      setLeads(response.data);
      setFilteredLeads(response.data);
    } catch (error) {
      toast.error('Kon leads niet ophalen');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/leads`, formData, { withCredentials: true });
      toast.success('Lead aangemaakt!');
      setIsDialogOpen(false);
      setFormData({ name: '', email: '', phone: '', address: '', project_type: '', description: '' });
      fetchLeads();
    } catch (error) {
      toast.error('Kon lead niet aanmaken');
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
      <div data-testid="leads-page" className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>Leads</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-lead-button" style={{backgroundColor: '#500000'}}>
                <Plus className="mr-2" size={20} /> Nieuwe Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nieuwe Lead Aanmaken</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="create-lead-form">
                <div>
                  <Label>Naam</Label>
                  <Input data-testid="lead-name-input" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input data-testid="lead-email-input" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                </div>
                <div>
                  <Label>Telefoon</Label>
                  <Input data-testid="lead-phone-input" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required />
                </div>
                <div>
                  <Label>Adres</Label>
                  <Input data-testid="lead-address-input" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} required />
                </div>
                <div>
                  <Label>Project Type</Label>
                  <Input data-testid="lead-projecttype-input" value={formData.project_type} onChange={(e) => setFormData({...formData, project_type: e.target.value})} required />
                </div>
                <div>
                  <Label>Beschrijving</Label>
                  <Textarea data-testid="lead-description-input" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={4} required />
                </div>
                <Button data-testid="submit-lead-button" type="submit" className="w-full" style={{backgroundColor: '#500000'}}>Aanmaken</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <Input
            data-testid="search-leads-input"
            placeholder="Zoek leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} data-testid={`lead-card-${lead.id}`} className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate(`/leads/${lead.id}`)}>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-2" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>{lead.name}</h3>
                <p className="text-sm mb-1" style={{color: '#64748B'}}>{lead.email}</p>
                <p className="text-sm mb-1" style={{color: '#64748B'}}>{lead.phone}</p>
                <p className="text-sm font-semibold mt-3" style={{color: '#7a1f1f'}}>{lead.project_type}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredLeads.length === 0 && (
          <div className="text-center py-12">
            <p style={{color: '#94A3B8'}}>Geen leads gevonden</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}