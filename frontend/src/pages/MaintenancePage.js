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
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Wrench, Plus, Trash2, FileText, Receipt, Calendar, CheckCircle, 
  Clock, AlertCircle, User, Phone, Mail, MapPin, Loader2, 
  Flame, Wind, Droplets, Euro, TrendingUp, ChevronRight, Eye
} from 'lucide-react';
import { toast } from 'sonner';

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: \`Bearer \${token}\` } : {};
};

const MAINTENANCE_TYPES = [
  { value: 'verwarming', label: 'Centrale Verwarming', icon: Flame, color: 'bg-orange-100 text-orange-700' },
  { value: 'ventilatie', label: 'Ventilatie', icon: Wind, color: 'bg-blue-100 text-blue-700' },
  { value: 'waterfilter', label: 'Waterfilter', icon: Droplets, color: 'bg-cyan-100 text-cyan-700' },
];

const STATUS_CONFIG = {
  gepland: { label: 'Gepland', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  uitgevoerd: { label: 'Uitgevoerd', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  gefactureerd: { label: 'Gefactureerd', color: 'bg-green-100 text-green-700', icon: FileText },
  geannuleerd: { label: 'Geannuleerd', color: 'bg-gray-100 text-gray-500', icon: AlertCircle },
};

export default function MaintenancePage() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    client_postal_code: '',
    client_city: '',
    maintenance_type: 'verwarming',
    description: '',
    scheduled_date: '',
    frequency_months: 12,
    service_price: '',
    notes: ''
  });
  
  // Purchase form
  const [purchaseForm, setPurchaseForm] = useState({
    supplier: '',
    invoice_number: '',
    invoice_date: '',
    description: '',
    amount: '',
    vat_amount: ''
  });
  
  // Invoice form
  const [invoiceForm, setInvoiceForm] = useState({
    service_amount: '',
    materials_amount: '0',
    vat_rate: '21'
  });

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const response = await axios.get(`${API}/maintenance`, { headers: getAuthHeaders() });
      setContracts(response.data);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast.error('Kon onderhoudsdossiers niet laden');
    } finally {
      setLoading(false);
    }
  };

  const fetchContractDetails = async (contractId) => {
    try {
      const response = await axios.get(`${API}/maintenance/${contractId}`, { headers: getAuthHeaders() });
      setSelectedContract(response.data);
    } catch (error) {
      console.error('Error fetching contract details:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
        ...formData,
        service_price: parseFloat(formData.service_price) || 0,
        frequency_months: parseInt(formData.frequency_months) || 12
      };
      
      await axios.post(`${API}/maintenance`, payload, { headers: getAuthHeaders() });
      toast.success('Onderhoudsdossier aangemaakt!');
      setIsAddDialogOpen(false);
      resetForm();
      fetchContracts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kon dossier niet aanmaken');
    }
  };

  const resetForm = () => {
    setFormData({
      client_name: '', client_email: '', client_phone: '', client_address: '',
      client_postal_code: '', client_city: '', maintenance_type: 'verwarming',
      description: '', scheduled_date: '', frequency_months: 12, service_price: '', notes: ''
    });
  };

  const handleDelete = async (contractId) => {
    if (!window.confirm('Weet je zeker dat je dit dossier wilt verwijderen? Alle gekoppelde aankopen en facturen worden ook verwijderd.')) return;
    
    try {
      await axios.delete(`${API}/maintenance/${contractId}`, { headers: getAuthHeaders() });
      toast.success('Dossier verwijderd');
      fetchContracts();
      if (selectedContract?.id === contractId) {
        setSelectedContract(null);
      }
    } catch (error) {
      toast.error('Kon dossier niet verwijderen');
    }
  };

  const handleComplete = async () => {
    if (!selectedContract) return;
    
    const notes = prompt('Technische opmerkingen (optioneel):');
    
    try {
      await axios.post(
        `${API}/maintenance/${selectedContract.id}/complete?technician_notes=${encodeURIComponent(notes || '')}`,
        {},
        { headers: getAuthHeaders() }
      );
      toast.success('Onderhoud gemarkeerd als uitgevoerd!');
      fetchContracts();
      fetchContractDetails(selectedContract.id);
    } catch (error) {
      toast.error('Kon status niet wijzigen');
    }
  };

  const handleAddPurchase = async (e) => {
    e.preventDefault();
    if (!selectedContract) return;
    
    try {
      await axios.post(`${API}/maintenance/${selectedContract.id}/purchases`, {
        ...purchaseForm,
        amount: parseFloat(purchaseForm.amount) || 0,
        vat_amount: parseFloat(purchaseForm.vat_amount) || 0
      }, { headers: getAuthHeaders() });
      
      toast.success('Aankoop toegevoegd!');
      setIsPurchaseDialogOpen(false);
      setPurchaseForm({ supplier: '', invoice_number: '', invoice_date: '', description: '', amount: '', vat_amount: '' });
      fetchContractDetails(selectedContract.id);
    } catch (error) {
      toast.error('Kon aankoop niet toevoegen');
    }
  };

  const handleDeletePurchase = async (purchaseId) => {
    if (!selectedContract || !window.confirm('Aankoop verwijderen?')) return;
    
    try {
      await axios.delete(`${API}/maintenance/${selectedContract.id}/purchases/${purchaseId}`, { headers: getAuthHeaders() });
      toast.success('Aankoop verwijderd');
      fetchContractDetails(selectedContract.id);
    } catch (error) {
      toast.error('Kon aankoop niet verwijderen');
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!selectedContract) return;
    
    try {
      const response = await axios.post(`${API}/maintenance/${selectedContract.id}/invoices`, {
        service_amount: parseFloat(invoiceForm.service_amount) || 0,
        materials_amount: parseFloat(invoiceForm.materials_amount) || 0,
        vat_rate: parseFloat(invoiceForm.vat_rate) || 21
      }, { headers: getAuthHeaders() });
      
      toast.success(`Factuur ${response.data.invoice_number} aangemaakt! Totaal: €${response.data.total_amount.toFixed(2)}`);
      setIsInvoiceDialogOpen(false);
      setInvoiceForm({ service_amount: '', materials_amount: '0', vat_rate: '21' });
      fetchContracts();
      fetchContractDetails(selectedContract.id);
    } catch (error) {
      toast.error('Kon factuur niet aanmaken');
    }
  };

  // Filter contracts
  const filteredContracts = contracts.filter(c => {
    if (activeTab === 'all') return true;
    return c.maintenance_type === activeTab;
  });

  // Stats
  const stats = {
    total: contracts.length,
    gepland: contracts.filter(c => c.status === 'gepland').length,
    uitgevoerd: contracts.filter(c => c.status === 'uitgevoerd').length,
    gefactureerd: contracts.filter(c => c.status === 'gefactureerd').length,
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl" style={{backgroundColor: '#f5e6e6'}}>
              <Wrench size={28} style={{color: '#500000'}} />
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>
                Onderhoud
              </h1>
              <p className="text-sm" style={{color: '#64748B'}}>
                Beheer onderhoudscontracten en facturen
              </p>
            </div>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button style={{backgroundColor: '#500000'}}>
                <Plus className="mr-2" size={20} />
                Nieuw Dossier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nieuw Onderhoudsdossier</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type Selection */}
                <div>
                  <Label>Type Onderhoud *</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {MAINTENANCE_TYPES.map(type => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData({...formData, maintenance_type: type.value})}
                          className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                            formData.maintenance_type === type.value 
                              ? 'border-[#500000] bg-red-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Icon size={24} className={formData.maintenance_type === type.value ? 'text-[#500000]' : 'text-gray-500'} />
                          <span className="text-sm font-medium">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Client Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Klantnaam *</Label>
                    <Input
                      value={formData.client_name}
                      onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                      placeholder="Jan Janssens"
                      required
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.client_email}
                      onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                      placeholder="jan@email.be"
                    />
                  </div>
                  <div>
                    <Label>Telefoon</Label>
                    <Input
                      value={formData.client_phone}
                      onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
                      placeholder="0475 12 34 56"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Adres</Label>
                    <Input
                      value={formData.client_address}
                      onChange={(e) => setFormData({...formData, client_address: e.target.value})}
                      placeholder="Straat en huisnummer"
                    />
                  </div>
                  <div>
                    <Label>Postcode</Label>
                    <Input
                      value={formData.client_postal_code}
                      onChange={(e) => setFormData({...formData, client_postal_code: e.target.value})}
                      placeholder="9000"
                    />
                  </div>
                  <div>
                    <Label>Stad</Label>
                    <Input
                      value={formData.client_city}
                      onChange={(e) => setFormData({...formData, client_city: e.target.value})}
                      placeholder="Gent"
                    />
                  </div>
                </div>

                {/* Service Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Geplande datum</Label>
                    <Input
                      type="date"
                      value={formData.scheduled_date}
                      onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Frequentie (maanden)</Label>
                    <Select value={String(formData.frequency_months)} onValueChange={(v) => setFormData({...formData, frequency_months: parseInt(v)})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">Elke 6 maanden</SelectItem>
                        <SelectItem value="12">Jaarlijks</SelectItem>
                        <SelectItem value="24">Elke 2 jaar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Onderhoudsprijs (€ excl BTW)</Label>
                    <Input
                      type="number"
                      value={formData.service_price}
                      onChange={(e) => setFormData({...formData, service_price: e.target.value})}
                      placeholder="150"
                    />
                  </div>
                </div>

                <div>
                  <Label>Omschrijving / Notities</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Bijkomende info over het onderhoud..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Annuleren
                  </Button>
                  <Button type="submit" style={{backgroundColor: '#500000'}}>
                    Dossier Aanmaken
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Wrench size={24} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{color: '#500000'}}>{stats.total}</p>
                <p className="text-sm text-gray-500">Totaal</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <Clock size={24} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.gepland}</p>
                <p className="text-sm text-gray-500">Gepland</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <CheckCircle size={24} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.uitgevoerd}</p>
                <p className="text-sm text-gray-500">Uitgevoerd</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <FileText size={24} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.gefactureerd}</p>
                <p className="text-sm text-gray-500">Gefactureerd</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contract List */}
          <div className="lg:col-span-1 space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">Alle</TabsTrigger>
                <TabsTrigger value="verwarming" className="flex items-center gap-1">
                  <Flame size={14} />
                </TabsTrigger>
                <TabsTrigger value="ventilatie" className="flex items-center gap-1">
                  <Wind size={14} />
                </TabsTrigger>
                <TabsTrigger value="waterfilter" className="flex items-center gap-1">
                  <Droplets size={14} />
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredContracts.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Wrench size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">Geen dossiers gevonden</p>
                  </CardContent>
                </Card>
              ) : (
                filteredContracts.map((contract) => {
                  const typeConfig = MAINTENANCE_TYPES.find(t => t.value === contract.maintenance_type);
                  const statusConfig = STATUS_CONFIG[contract.status] || STATUS_CONFIG.gepland;
                  const TypeIcon = typeConfig?.icon || Wrench;
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <Card 
                      key={contract.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${selectedContract?.id === contract.id ? 'ring-2 ring-[#500000]' : ''}`}
                      onClick={() => fetchContractDetails(contract.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${typeConfig?.color || 'bg-gray-100'}`}>
                              <TypeIcon size={18} />
                            </div>
                            <div>
                              <p className="font-semibold" style={{color: '#3a190b'}}>{contract.client_name}</p>
                              <p className="text-xs text-gray-500">{contract.id}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusConfig.color}`}>
                            <StatusIcon size={12} />
                            {statusConfig.label}
                          </span>
                        </div>
                        
                        {contract.client_city && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin size={12} />
                            {contract.client_postal_code} {contract.client_city}
                          </p>
                        )}
                        
                        {contract.scheduled_date && (
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <Calendar size={12} />
                            {new Date(contract.scheduled_date).toLocaleDateString('nl-BE')}
                          </p>
                        )}
                        
                        {contract.service_price > 0 && (
                          <p className="text-sm font-semibold mt-2" style={{color: '#500000'}}>
                            €{contract.service_price.toFixed(2)}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* Contract Detail */}
          <div className="lg:col-span-2">
            {selectedContract ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2" style={{color: '#500000'}}>
                      {(() => {
                        const typeConfig = MAINTENANCE_TYPES.find(t => t.value === selectedContract.maintenance_type);
                        const Icon = typeConfig?.icon || Wrench;
                        return <Icon size={24} />;
                      })()}
                      {selectedContract.client_name}
                    </CardTitle>
                    <p className="text-sm text-gray-500">{selectedContract.maintenance_type_label} • {selectedContract.id}</p>
                  </div>
                  <div className="flex gap-2">
                    {selectedContract.status === 'gepland' && (
                      <Button size="sm" onClick={handleComplete} className="bg-blue-600 hover:bg-blue-700">
                        <CheckCircle size={16} className="mr-1" />
                        Afronden
                      </Button>
                    )}
                    {selectedContract.status === 'uitgevoerd' && (
                      <Button size="sm" onClick={() => {
                        setInvoiceForm({
                          service_amount: selectedContract.service_price?.toString() || '',
                          materials_amount: selectedContract.materials_cost?.toString() || '0',
                          vat_rate: '21'
                        });
                        setIsInvoiceDialogOpen(true);
                      }} style={{backgroundColor: '#500000'}}>
                        <FileText size={16} className="mr-1" />
                        Factureren
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(selectedContract.id)} className="text-red-600">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Client Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 flex items-center gap-1"><User size={12} /> Klant</p>
                      <p className="font-medium">{selectedContract.client_name}</p>
                    </div>
                    {selectedContract.client_phone && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={12} /> Telefoon</p>
                        <p className="font-medium">{selectedContract.client_phone}</p>
                      </div>
                    )}
                    {selectedContract.client_email && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 flex items-center gap-1"><Mail size={12} /> Email</p>
                        <p className="font-medium">{selectedContract.client_email}</p>
                      </div>
                    )}
                    {selectedContract.client_address && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={12} /> Adres</p>
                        <p className="font-medium">{selectedContract.client_address}</p>
                        <p className="text-sm text-gray-500">{selectedContract.client_postal_code} {selectedContract.client_city}</p>
                      </div>
                    )}
                  </div>

                  {/* Financial Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <p className="text-xs text-green-600">Onderhoudsprijs</p>
                      <p className="text-xl font-bold text-green-700">€{selectedContract.service_price?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg text-center">
                      <p className="text-xs text-red-600">Materiaalkost</p>
                      <p className="text-xl font-bold text-red-700">€{selectedContract.materials_cost?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                      <p className="text-xs text-blue-600">Marge</p>
                      <p className="text-xl font-bold text-blue-700">
                        €{((selectedContract.service_price || 0) - (selectedContract.materials_cost || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Technician Notes */}
                  {selectedContract.technician_notes && (
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800 mb-1">Technische Opmerkingen</p>
                      <p className="text-sm text-yellow-700">{selectedContract.technician_notes}</p>
                    </div>
                  )}

                  {/* Purchases Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold" style={{color: '#3a190b'}}>Aankopen (Klein Materiaal)</h3>
                      <Button size="sm" variant="outline" onClick={() => setIsPurchaseDialogOpen(true)}>
                        <Plus size={14} className="mr-1" />
                        Aankoop
                      </Button>
                    </div>
                    
                    {selectedContract.purchases?.length > 0 ? (
                      <div className="space-y-2">
                        {selectedContract.purchases.map((purchase) => (
                          <div key={purchase.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">{purchase.description}</p>
                              <p className="text-sm text-gray-500">{purchase.supplier} • {purchase.invoice_number}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold">€{purchase.amount?.toFixed(2)}</span>
                              <Button variant="ghost" size="sm" onClick={() => handleDeletePurchase(purchase.id)} className="text-red-600">
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">Nog geen aankopen</p>
                    )}
                  </div>

                  {/* Invoices Section */}
                  <div>
                    <h3 className="font-semibold mb-3" style={{color: '#3a190b'}}>Facturen</h3>
                    
                    {selectedContract.invoices?.length > 0 ? (
                      <div className="space-y-2">
                        {selectedContract.invoices.map((invoice) => (
                          <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">{invoice.invoice_number}</p>
                              <p className="text-sm text-gray-500">{invoice.invoice_date}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                invoice.status === 'betaald' ? 'bg-green-100 text-green-700' :
                                invoice.status === 'verstuurd' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {invoice.status}
                              </span>
                              <span className="font-semibold">€{invoice.total_amount?.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">Nog geen facturen</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Wrench size={64} className="mx-auto mb-4" style={{color: '#E5E7EB'}} />
                  <p className="text-lg" style={{color: '#64748B'}}>
                    Selecteer een dossier om details te bekijken
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Purchase Dialog */}
        <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aankoop Toevoegen</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddPurchase} className="space-y-4">
              <div>
                <Label>Leverancier *</Label>
                <Input
                  value={purchaseForm.supplier}
                  onChange={(e) => setPurchaseForm({...purchaseForm, supplier: e.target.value})}
                  placeholder="Brico, Van Marcke, ..."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Factuurnummer</Label>
                  <Input
                    value={purchaseForm.invoice_number}
                    onChange={(e) => setPurchaseForm({...purchaseForm, invoice_number: e.target.value})}
                    placeholder="INV-2024-001"
                  />
                </div>
                <div>
                  <Label>Factuurdatum</Label>
                  <Input
                    type="date"
                    value={purchaseForm.invoice_date}
                    onChange={(e) => setPurchaseForm({...purchaseForm, invoice_date: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label>Omschrijving *</Label>
                <Input
                  value={purchaseForm.description}
                  onChange={(e) => setPurchaseForm({...purchaseForm, description: e.target.value})}
                  placeholder="Filters, onderdelen, ..."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bedrag excl BTW (€) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={purchaseForm.amount}
                    onChange={(e) => setPurchaseForm({...purchaseForm, amount: e.target.value})}
                    placeholder="25.00"
                    required
                  />
                </div>
                <div>
                  <Label>BTW Bedrag (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={purchaseForm.vat_amount}
                    onChange={(e) => setPurchaseForm({...purchaseForm, vat_amount: e.target.value})}
                    placeholder="5.25"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsPurchaseDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button type="submit" style={{backgroundColor: '#500000'}}>
                  Toevoegen
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Invoice Dialog */}
        <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Factuur Aanmaken</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div>
                <Label>Onderhoudskost (€ excl BTW) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={invoiceForm.service_amount}
                  onChange={(e) => setInvoiceForm({...invoiceForm, service_amount: e.target.value})}
                  placeholder="150.00"
                  required
                />
              </div>
              <div>
                <Label>Materialen (€ excl BTW)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={invoiceForm.materials_amount}
                  onChange={(e) => setInvoiceForm({...invoiceForm, materials_amount: e.target.value})}
                  placeholder="25.00"
                />
              </div>
              <div>
                <Label>BTW Tarief (%)</Label>
                <Select value={invoiceForm.vat_rate} onValueChange={(v) => setInvoiceForm({...invoiceForm, vat_rate: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="21">21%</SelectItem>
                    <SelectItem value="6">6%</SelectItem>
                    <SelectItem value="0">0%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Preview */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-2">Voorvertoning</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotaal:</span>
                    <span>€{((parseFloat(invoiceForm.service_amount) || 0) + (parseFloat(invoiceForm.materials_amount) || 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BTW ({invoiceForm.vat_rate}%):</span>
                    <span>€{(((parseFloat(invoiceForm.service_amount) || 0) + (parseFloat(invoiceForm.materials_amount) || 0)) * (parseFloat(invoiceForm.vat_rate) / 100)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t">
                    <span>Totaal:</span>
                    <span>€{(((parseFloat(invoiceForm.service_amount) || 0) + (parseFloat(invoiceForm.materials_amount) || 0)) * (1 + parseFloat(invoiceForm.vat_rate) / 100)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsInvoiceDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button type="submit" style={{backgroundColor: '#500000'}}>
                  Factuur Aanmaken
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
