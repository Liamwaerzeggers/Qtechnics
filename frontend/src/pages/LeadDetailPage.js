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

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: \`Bearer \${token}\` } : {};
};

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
    description: '',
    vat_number: '',
    is_business: false
  });

  useEffect(() => {
    fetchLead();
  }, [leadId]);

  const fetchLead = async () => {
    try {
      const response = await axios.get(`${API}/leads/${leadId}`, { headers: getAuthHeaders() });
      setLead(response.data);
      setFormData({
        name: response.data.name,
        email: response.data.email,
        phone: response.data.phone,
        address: response.data.address,
        project_type: response.data.project_type,
        description: response.data.description,
        vat_number: response.data.vat_number || '',
        is_business: response.data.is_business || false
      });
    } catch (error) {
      toast.error('Kon lead niet ophalen');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await axios.put(`${API}/leads/${leadId}`, formData, { headers: getAuthHeaders() });
      setLead(response.data);
      setEditing(false);
      toast.success('Lead bijgewerkt!');
    } catch (error) {
      toast.error('Kon lead niet bijwerken');
    }
  };

  const handleCreateQuote = async () => {
    try {
      const response = await axios.post(`${API}/quotes`, { lead_id: leadId }, { headers: getAuthHeaders() });
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
            <h1 className="text-4xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>{lead.name}</h1>
          </div>
          <Button data-testid="create-quote-button" onClick={handleCreateQuote} style={{backgroundColor: '#500000'}}>
            <FileText className="mr-2" size={20} /> Maak Offerte
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Lead Informatie</CardTitle>
              {!editing ? (
                <Button data-testid="edit-lead-button" onClick={() => setEditing(true)} variant="outline">
                  <Edit className="mr-2" size={18} /> Bewerken
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={() => { setEditing(false); fetchLead(); }} variant="outline">Annuleren</Button>
                  <Button data-testid="save-lead-button" onClick={handleSave} style={{backgroundColor: '#500000'}}>Opslaan</Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <div>
                  <Label>Naam</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                  <Label>Telefoon</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div>
                  <Label>Adres</Label>
                  <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                </div>
                <div>
                  <Label>Project Type</Label>
                  <Input value={formData.project_type} onChange={(e) => setFormData({...formData, project_type: e.target.value})} />
                </div>
                <div>
                  <Label>Beschrijving</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={4} />
                </div>
                
                {/* BTW Nummer voor bedrijven (Peppol) */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold mb-3" style={{color: '#500000'}}>🏢 Bedrijfsgegevens (voor Peppol facturatie)</h4>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="is_business"
                      checked={formData.is_business}
                      onChange={(e) => setFormData({...formData, is_business: e.target.checked})}
                      className="rounded"
                    />
                    <Label htmlFor="is_business">Dit is een bedrijfsklant</Label>
                  </div>
                  {formData.is_business && (
                    <div>
                      <Label>BTW Nummer</Label>
                      <Input 
                        value={formData.vat_number} 
                        onChange={(e) => setFormData({...formData, vat_number: e.target.value})} 
                        placeholder="BE0123456789"
                      />
                      <p className="text-xs mt-1" style={{color: '#64748B'}}>
                        Nodig voor Peppol e-facturatie naar bedrijven
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
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
                
                {/* BTW Nummer weergave */}
                {(lead.is_business || lead.vat_number) && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-semibold mb-2" style={{color: '#500000'}}>🏢 Bedrijfsgegevens</h4>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded text-xs font-medium" style={{backgroundColor: '#f5e6e6', color: '#500000'}}>
                        {lead.is_business ? 'Bedrijfsklant' : 'Particulier'}
                      </span>
                      {lead.vat_number && (
                        <span className="font-mono" style={{color: '#1E293B'}}>{lead.vat_number}</span>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}