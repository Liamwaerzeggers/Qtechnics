import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Users, Plus, Trash2, Building2, TrendingUp, Wrench,
  Mail, Phone, Loader2, KeyRound
} from 'lucide-react';
import { toast } from 'sonner';

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: \`Bearer \${token}\` } : {};
};

const SUBCONTRACTOR_CATEGORIES = [
  { value: 'dak', label: 'Dakwerken' },
  { value: 'ramen', label: 'Ramen & Deuren' },
  { value: 'metselwerk', label: 'Metselwerk' },
  { value: 'gevel', label: 'Gevelwerken' },
  { value: 'isolatie', label: 'Isolatie' },
  { value: 'elektriciteit', label: 'Elektriciteit' },
  { value: 'sanitair', label: 'Sanitair' },
  { value: 'verwarming', label: 'Verwarming' },
  { value: 'vloeren', label: 'Vloeren' },
  { value: 'schilderwerk', label: 'Schilderwerk' },
  { value: 'overig', label: 'Overig' }
];

export default function TenantsPage() {
  const [activeTab, setActiveTab] = useState('realtors');
  const [realtors, setRealtors] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [realtorDialogOpen, setRealtorDialogOpen] = useState(false);
  const [investorDialogOpen, setInvestorDialogOpen] = useState(false);
  const [subcontractorDialogOpen, setSubcontractorDialogOpen] = useState(false);
  
  // Form data
  const [realtorForm, setRealtorForm] = useState({
    company_name: '', contact_name: '', email: '', phone: '', username: '', password: ''
  });
  const [investorForm, setInvestorForm] = useState({
    name: '', email: '', phone: '', username: '', password: '', target_roi: '10'
  });
  const [subcontractorForm, setSubcontractorForm] = useState({
    company_name: '', contact_name: '', email: '', phone: '', vat_number: '', category: '', password: ''
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [realtorsRes, investorsRes, subcontractorsRes] = await Promise.all([
        axios.get(`${API}/realtors`, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
        axios.get(`${API}/investors`, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
        axios.get(`${API}/subcontractors`, { headers: getAuthHeaders() }).catch(() => ({ data: [] }))
      ]);
      
      setRealtors(realtorsRes.data || []);
      setInvestors(investorsRes.data || []);
      setSubcontractors(subcontractorsRes.data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  // Realtor handlers
  const handleCreateRealtor = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/realtors`, realtorForm, { headers: getAuthHeaders() });
      
      // Prepare welcome email
      const subject = `Welkom bij Max Q - Uw makelaar account`;
      const body = `Hallo ${realtorForm.contact_name},

Uw Max Q makelaar account is aangemaakt!

🔐 INLOGGEGEVENS:
Gebruikersnaam: ${realtorForm.username}
Wachtwoord: ${realtorForm.password}

📱 LOGIN URL:
${window.location.origin}
Klik op "🏠 Makelaar / Investeerder Login"

Met Max Q kunt u:
• Panden toevoegen en beheren
• Automatische renovatieberekeningen genereren
• Kosteninzichten delen met investeerders

BELANGRIJK: Bewaar deze email veilig.

Met vriendelijke groet,
Max Q Team`;

      const mailtoLink = `mailto:${realtorForm.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;
      
      toast.success('Makelaar aangemaakt! Email wordt voorbereid...');
      setRealtorDialogOpen(false);
      setRealtorForm({ company_name: '', contact_name: '', email: '', phone: '', username: '', password: '' });
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kon makelaar niet aanmaken');
    }
  };

  const handleDeleteRealtor = async (realtorId) => {
    if (!window.confirm('Weet je zeker dat je deze makelaar wilt verwijderen?')) return;
    try {
      await axios.delete(`${API}/realtors/${realtorId}`, { headers: getAuthHeaders() });
      toast.success('Makelaar verwijderd');
      fetchAll();
    } catch (error) {
      toast.error('Kon makelaar niet verwijderen');
    }
  };

  // Investor handlers
  const handleCreateInvestor = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/investors`, {
        ...investorForm,
        target_roi: parseFloat(investorForm.target_roi) || 10
      }, { headers: getAuthHeaders() });
      
      // Prepare welcome email
      const subject = `Welkom bij Max Q - Uw investeerder account`;
      const body = `Hallo ${investorForm.name},

Uw Max Q investeerder account is aangemaakt!

🔐 INLOGGEGEVENS:
Gebruikersnaam: ${investorForm.username}
Wachtwoord: ${investorForm.password}

📱 LOGIN URL:
${window.location.origin}
Klik op "🏠 Makelaar / Investeerder Login"

Met Max Q kunt u:
• Panden analyseren op renovatiekost
• ROI en rendement berekenen
• Investeringsbeslissingen onderbouwen

BELANGRIJK: Bewaar deze email veilig.

Met vriendelijke groet,
Max Q Team`;

      const mailtoLink = `mailto:${investorForm.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;
      
      toast.success('Investeerder aangemaakt! Email wordt voorbereid...');
      setInvestorDialogOpen(false);
      setInvestorForm({ name: '', email: '', phone: '', username: '', password: '', target_roi: '10' });
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kon investeerder niet aanmaken');
    }
  };

  // Subcontractor handlers
  const handleCreateSubcontractor = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/subcontractors`, subcontractorForm, { headers: getAuthHeaders() });
      toast.success('Onderaannemer aangemaakt!');
      setSubcontractorDialogOpen(false);
      setSubcontractorForm({ company_name: '', contact_name: '', email: '', phone: '', vat_number: '', category: '', password: '' });
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kon onderaannemer niet aanmaken');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin" size={48} style={{color: '#500000'}} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl" style={{backgroundColor: '#f5e6e6'}}>
            <Users size={28} style={{color: '#500000'}} />
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>
              Tenant Beheer
            </h1>
            <p className="text-sm" style={{color: '#64748B'}}>
              Beheer makelaars, investeerders en onderaannemers
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="realtors" className="flex items-center gap-2">
              <Building2 size={16} />
              Makelaars ({realtors.length})
            </TabsTrigger>
            <TabsTrigger value="investors" className="flex items-center gap-2">
              <TrendingUp size={16} />
              Investeerders ({investors.length})
            </TabsTrigger>
            <TabsTrigger value="subcontractors" className="flex items-center gap-2">
              <Wrench size={16} />
              Onderaannemers ({subcontractors.length})
            </TabsTrigger>
          </TabsList>

          {/* Realtors Tab */}
          <TabsContent value="realtors">
            <div className="flex justify-end mb-4">
              <Dialog open={realtorDialogOpen} onOpenChange={setRealtorDialogOpen}>
                <DialogTrigger asChild>
                  <Button style={{backgroundColor: '#500000'}}>
                    <Plus className="mr-2" size={20} />
                    Nieuwe Makelaar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nieuwe Makelaar Toevoegen</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateRealtor} className="space-y-4">
                    <div>
                      <Label>Bedrijfsnaam *</Label>
                      <Input
                        value={realtorForm.company_name}
                        onChange={(e) => setRealtorForm({...realtorForm, company_name: e.target.value})}
                        placeholder="Immo Gent"
                        required
                      />
                    </div>
                    <div>
                      <Label>Contactpersoon *</Label>
                      <Input
                        value={realtorForm.contact_name}
                        onChange={(e) => setRealtorForm({...realtorForm, contact_name: e.target.value})}
                        placeholder="Jan Janssens"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Email *</Label>
                        <Input
                          type="email"
                          value={realtorForm.email}
                          onChange={(e) => setRealtorForm({...realtorForm, email: e.target.value})}
                          placeholder="jan@immogent.be"
                          required
                        />
                      </div>
                      <div>
                        <Label>Telefoon</Label>
                        <Input
                          value={realtorForm.phone}
                          onChange={(e) => setRealtorForm({...realtorForm, phone: e.target.value})}
                          placeholder="09 123 45 67"
                        />
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-2" style={{color: '#500000'}}>Login Gegevens</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Gebruikersnaam *</Label>
                          <Input
                            value={realtorForm.username}
                            onChange={(e) => setRealtorForm({...realtorForm, username: e.target.value})}
                            placeholder="immogent"
                            required
                          />
                        </div>
                        <div>
                          <Label>Wachtwoord *</Label>
                          <Input
                            type="password"
                            value={realtorForm.password}
                            onChange={(e) => setRealtorForm({...realtorForm, password: e.target.value})}
                            placeholder="••••••••"
                            required
                            minLength={6}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setRealtorDialogOpen(false)}>
                        Annuleren
                      </Button>
                      <Button type="submit" style={{backgroundColor: '#500000'}}>
                        Aanmaken
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {realtors.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Building2 size={48} className="mx-auto mb-4" style={{color: '#94A3B8'}} />
                  <p className="text-lg font-medium mb-2" style={{color: '#64748B'}}>
                    Nog geen makelaars
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {realtors.map((realtor) => (
                  <Card key={realtor.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold" style={{color: '#3a190b'}}>
                            {realtor.company_name}
                          </h3>
                          <p className="text-sm text-gray-500">{realtor.contact_name}</p>
                        </div>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                          {realtor.subscription_tier || 'free'}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p className="flex items-center gap-2">
                          <Mail size={14} />
                          {realtor.email}
                        </p>
                        {realtor.phone && (
                          <p className="flex items-center gap-2">
                            <Phone size={14} />
                            {realtor.phone}
                          </p>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t flex justify-between items-center">
                        <span className="text-xs text-gray-400">
                          {realtor.properties_used || 0}/{realtor.property_limit || 5} panden
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRealtor(realtor.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Investors Tab */}
          <TabsContent value="investors">
            <div className="flex justify-end mb-4">
              <Dialog open={investorDialogOpen} onOpenChange={setInvestorDialogOpen}>
                <DialogTrigger asChild>
                  <Button style={{backgroundColor: '#500000'}}>
                    <Plus className="mr-2" size={20} />
                    Nieuwe Investeerder
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nieuwe Investeerder Toevoegen</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateInvestor} className="space-y-4">
                    <div>
                      <Label>Naam *</Label>
                      <Input
                        value={investorForm.name}
                        onChange={(e) => setInvestorForm({...investorForm, name: e.target.value})}
                        placeholder="Peter De Smet"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Email *</Label>
                        <Input
                          type="email"
                          value={investorForm.email}
                          onChange={(e) => setInvestorForm({...investorForm, email: e.target.value})}
                          placeholder="peter@email.be"
                          required
                        />
                      </div>
                      <div>
                        <Label>Telefoon</Label>
                        <Input
                          value={investorForm.phone}
                          onChange={(e) => setInvestorForm({...investorForm, phone: e.target.value})}
                          placeholder="0475 12 34 56"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Gewenst Rendement (%)</Label>
                      <Input
                        type="number"
                        value={investorForm.target_roi}
                        onChange={(e) => setInvestorForm({...investorForm, target_roi: e.target.value})}
                        placeholder="10"
                      />
                    </div>
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-2" style={{color: '#500000'}}>Login Gegevens</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Gebruikersnaam *</Label>
                          <Input
                            value={investorForm.username}
                            onChange={(e) => setInvestorForm({...investorForm, username: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Label>Wachtwoord *</Label>
                          <Input
                            type="password"
                            value={investorForm.password}
                            onChange={(e) => setInvestorForm({...investorForm, password: e.target.value})}
                            required
                            minLength={6}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setInvestorDialogOpen(false)}>
                        Annuleren
                      </Button>
                      <Button type="submit" style={{backgroundColor: '#500000'}}>
                        Aanmaken
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {investors.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <TrendingUp size={48} className="mx-auto mb-4" style={{color: '#94A3B8'}} />
                  <p className="text-lg font-medium mb-2" style={{color: '#64748B'}}>
                    Nog geen investeerders
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {investors.map((investor) => (
                  <Card key={investor.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold" style={{color: '#3a190b'}}>
                          {investor.name}
                        </h3>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                          ROI: {investor.target_roi}%
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p className="flex items-center gap-2">
                          <Mail size={14} />
                          {investor.email}
                        </p>
                        {investor.phone && (
                          <p className="flex items-center gap-2">
                            <Phone size={14} />
                            {investor.phone}
                          </p>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Subcontractors Tab */}
          <TabsContent value="subcontractors">
            <div className="flex justify-end mb-4">
              <Dialog open={subcontractorDialogOpen} onOpenChange={setSubcontractorDialogOpen}>
                <DialogTrigger asChild>
                  <Button style={{backgroundColor: '#500000'}}>
                    <Plus className="mr-2" size={20} />
                    Nieuwe Onderaannemer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nieuwe Onderaannemer Toevoegen</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateSubcontractor} className="space-y-4">
                    <div>
                      <Label>Bedrijfsnaam *</Label>
                      <Input
                        value={subcontractorForm.company_name}
                        onChange={(e) => setSubcontractorForm({...subcontractorForm, company_name: e.target.value})}
                        placeholder="Dakwerken Peeters"
                        required
                      />
                    </div>
                    <div>
                      <Label>Contactpersoon *</Label>
                      <Input
                        value={subcontractorForm.contact_name}
                        onChange={(e) => setSubcontractorForm({...subcontractorForm, contact_name: e.target.value})}
                        placeholder="Karel Peeters"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Email *</Label>
                        <Input
                          type="email"
                          value={subcontractorForm.email}
                          onChange={(e) => setSubcontractorForm({...subcontractorForm, email: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label>Telefoon</Label>
                        <Input
                          value={subcontractorForm.phone}
                          onChange={(e) => setSubcontractorForm({...subcontractorForm, phone: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>BTW Nummer</Label>
                        <Input
                          value={subcontractorForm.vat_number}
                          onChange={(e) => setSubcontractorForm({...subcontractorForm, vat_number: e.target.value})}
                          placeholder="BE0123456789"
                        />
                      </div>
                      <div>
                        <Label>Categorie *</Label>
                        <Select 
                          value={subcontractorForm.category} 
                          onValueChange={(v) => setSubcontractorForm({...subcontractorForm, category: v})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecteer..." />
                          </SelectTrigger>
                          <SelectContent>
                            {SUBCONTRACTOR_CATEGORIES.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-2" style={{color: '#500000'}}>Login (optioneel)</p>
                      <div>
                        <Label>Wachtwoord (laat leeg voor geen login)</Label>
                        <Input
                          type="password"
                          value={subcontractorForm.password}
                          onChange={(e) => setSubcontractorForm({...subcontractorForm, password: e.target.value})}
                          placeholder="••••••••"
                          minLength={6}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setSubcontractorDialogOpen(false)}>
                        Annuleren
                      </Button>
                      <Button type="submit" style={{backgroundColor: '#500000'}}>
                        Aanmaken
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {subcontractors.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Wrench size={48} className="mx-auto mb-4" style={{color: '#94A3B8'}} />
                  <p className="text-lg font-medium mb-2" style={{color: '#64748B'}}>
                    Nog geen onderaannemers
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subcontractors.map((sub) => (
                  <Card key={sub.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold" style={{color: '#3a190b'}}>
                            {sub.company_name}
                          </h3>
                          <p className="text-sm text-gray-500">{sub.contact_name}</p>
                        </div>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                          {SUBCONTRACTOR_CATEGORIES.find(c => c.value === sub.category)?.label || sub.category}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p className="flex items-center gap-2">
                          <Mail size={14} />
                          {sub.email}
                        </p>
                        {sub.vat_number && (
                          <p className="text-xs text-gray-400">BTW: {sub.vat_number}</p>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t flex justify-between items-center">
                        <span className={`text-xs ${sub.is_active ? 'text-green-600' : 'text-red-600'}`}>
                          {sub.is_active ? '● Actief' : '● Inactief'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
