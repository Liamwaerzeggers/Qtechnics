import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, useAuth } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Building2, Plus, Trash2, Calculator, Eye, Share2, 
  MapPin, BedDouble, Bath, Ruler, Loader2, Home, 
  ExternalLink, ChevronDown, ChevronRight, Edit, X, Link, Search,
  Upload, FileImage, Check, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const ROOM_TYPES = [
  { value: 'living', label: 'Woonkamer' },
  { value: 'bedroom', label: 'Slaapkamer' },
  { value: 'bathroom', label: 'Badkamer' },
  { value: 'kitchen', label: 'Keuken' },
  { value: 'hallway', label: 'Gang/Hal' },
  { value: 'other', label: 'Overig' }
];

const EPC_SCORES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

export default function RealtorDashboard() {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [calculationLoading, setCalculationLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  
  // Add room to existing property
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [addRoomData, setAddRoomData] = useState({ name: '', room_type: 'other', length: '', width: '', height: '' });
  const [addingRoom, setAddingRoom] = useState(false);
  
  // Floor plan upload
  const [uploadingPlan, setUploadingPlan] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [savingSuggestions, setSavingSuggestions] = useState(false);
  
  // New property form
  const [formData, setFormData] = useState({
    address: '',
    postal_code: '',
    city: '',
    living_area: '',
    plot_area: '',
    bedrooms: '',
    bathrooms: '',
    construction_year: '',
    epc_score: '',
    epc_value: '',
    asking_price: '',
    source_url: ''
  });
  
  // Room form
  const [rooms, setRooms] = useState([]);
  const [newRoom, setNewRoom] = useState({
    name: '',
    room_type: 'other',
    length: '',
    width: '',
    height: ''  // Leeg = standaard 2.55m
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await axios.get(`${API}/properties`, { headers: getAuthHeaders() });
      setProperties(response.data);
    } catch (error) {
      console.error('Error fetching properties:', error);
      if (error.response?.status !== 403) {
        toast.error('Kon panden niet laden');
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-scrape when URL changes
  const handleUrlChange = async (url) => {
    setFormData(prev => ({...prev, source_url: url}));
    
    // Check if it looks like a valid URL
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      setScraping(true);
      try {
        const response = await axios.post(
          `${API}/properties/scrape?url=${encodeURIComponent(url)}`,
          {},
          { headers: getAuthHeaders() }
        );
        
        if (response.data.success && response.data.data) {
          const scraped = response.data.data;
          setFormData(prev => ({
            ...prev,
            address: scraped.address || prev.address,
            postal_code: scraped.postal_code || prev.postal_code,
            city: scraped.city || prev.city,
            living_area: scraped.living_area || prev.living_area,
            plot_area: scraped.plot_area || prev.plot_area,
            bedrooms: scraped.bedrooms || prev.bedrooms,
            bathrooms: scraped.bathrooms || prev.bathrooms,
            construction_year: scraped.construction_year || prev.construction_year,
            epc_score: scraped.epc_score || prev.epc_score,
            epc_value: scraped.epc_value || prev.epc_value,
            asking_price: scraped.asking_price || prev.asking_price
          }));
          toast.success(response.data.message);
        } else {
          // Show warning but keep URL saved
          toast.warning(
            <div>
              <p><strong>{response.data.message}</strong></p>
              {response.data.hint && <p className="text-sm mt-1">{response.data.hint}</p>}
            </div>,
            { duration: 6000 }
          );
        }
      } catch (error) {
        console.error('Scrape error:', error);
        toast.warning('Kon gegevens niet automatisch ophalen. Vul de gegevens handmatig in.');
      } finally {
        setScraping(false);
      }
    }
  };

  const handleAddRoom = () => {
    if (!newRoom.name || !newRoom.length || !newRoom.width) {
      toast.error('Vul alle verplichte velden in voor de kamer');
      return;
    }
    
    const room = {
      ...newRoom,
      length: parseFloat(newRoom.length),
      width: parseFloat(newRoom.width),
      height: newRoom.height ? parseFloat(newRoom.height) : 0,  // 0 = backend gebruikt standaard 2.55m
      id: `room-${Date.now()}`
    };
    
    setRooms([...rooms, room]);
    setNewRoom({
      name: '',
      room_type: 'other',
      length: '',
      width: '',
      height: ''  // Leeg = standaard 2.55m
    });
  };

  const handleRemoveRoom = (roomId) => {
    setRooms(rooms.filter(r => r.id !== roomId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.address || !formData.city) {
      toast.error('Vul adres en stad in');
      return;
    }
    
    try {
      const payload = {
        ...formData,
        living_area: parseFloat(formData.living_area) || 0,
        plot_area: parseFloat(formData.plot_area) || 0,
        bedrooms: parseInt(formData.bedrooms) || 0,
        bathrooms: parseInt(formData.bathrooms) || 0,
        construction_year: formData.construction_year ? parseInt(formData.construction_year) : null,
        epc_value: formData.epc_value ? parseFloat(formData.epc_value) : null,
        asking_price: parseFloat(formData.asking_price) || 0,
        rooms: rooms.map(r => ({
          name: r.name,
          room_type: r.room_type,
          length: r.length,
          width: r.width,
          height: r.height
        }))
      };
      
      await axios.post(`${API}/properties`, payload, { headers: getAuthHeaders() });
      toast.success('Pand toegevoegd!');
      setIsAddDialogOpen(false);
      setFormData({
        address: '', postal_code: '', city: '', living_area: '', plot_area: '',
        bedrooms: '', bathrooms: '', construction_year: '', epc_score: '',
        epc_value: '', asking_price: '', source_url: ''
      });
      setRooms([]);
      fetchProperties();
    } catch (error) {
      console.error('Error creating property:', error);
      toast.error(error.response?.data?.detail || 'Kon pand niet toevoegen');
    }
  };

  const handleDelete = async (propertyId) => {
    if (!window.confirm('Weet je zeker dat je dit pand wilt verwijderen?')) return;
    
    try {
      await axios.delete(`${API}/properties/${propertyId}`, { headers: getAuthHeaders() });
      toast.success('Pand verwijderd');
      fetchProperties();
      if (selectedProperty?.id === propertyId) {
        setSelectedProperty(null);
      }
    } catch (error) {
      toast.error('Kon pand niet verwijderen');
    }
  };

  const handleCalculate = async (propertyId) => {
    setCalculationLoading(true);
    try {
      const response = await axios.post(`${API}/properties/${propertyId}/calculate`, {}, { headers: getAuthHeaders() });
      toast.success(`Berekening klaar! Geschatte kost: €${response.data.total_realistic.toLocaleString('nl-BE')}`);
      fetchProperties();
      
      // Fetch updated property with calculation
      const propResponse = await axios.get(`${API}/properties/${propertyId}`, { headers: getAuthHeaders() });
      setSelectedProperty(propResponse.data);
      
      // Fetch calculation details
      const calcResponse = await axios.get(`${API}/properties/${propertyId}/calculation`, { headers: getAuthHeaders() });
      setSelectedProperty(prev => ({ ...prev, calculation: calcResponse.data }));
    } catch (error) {
      console.error('Calculation error:', error);
      toast.error(error.response?.data?.detail || 'Kon berekening niet uitvoeren');
    } finally {
      setCalculationLoading(false);
    }
  };

  const handleViewProperty = async (property) => {
    setSelectedProperty(property);
    setShowAddRoom(false);
    setAiSuggestions(null);
    
    // Fetch calculation if exists
    if (property.renovation_calculation_id) {
      try {
        const calcResponse = await axios.get(`${API}/properties/${property.id}/calculation`, { headers: getAuthHeaders() });
        setSelectedProperty(prev => ({ ...prev, calculation: calcResponse.data }));
      } catch (error) {
        console.log('No calculation found');
      }
    }
  };

  // Add room to existing property
  const handleAddRoomToProperty = async () => {
    if (!addRoomData.name || !addRoomData.length || !addRoomData.width) {
      toast.error('Vul naam, lengte en breedte in');
      return;
    }
    
    setAddingRoom(true);
    try {
      await axios.post(
        `${API}/properties/${selectedProperty.id}/rooms`,
        {
          name: addRoomData.name,
          room_type: addRoomData.room_type,
          length: parseFloat(addRoomData.length),
          width: parseFloat(addRoomData.width),
          height: addRoomData.height ? parseFloat(addRoomData.height) : 2.7
        },
        { headers: getAuthHeaders() }
      );
      toast.success('Kamer toegevoegd');
      setAddRoomData({ name: '', room_type: 'other', length: '', width: '', height: '' });
      
      // Refresh property
      const propResponse = await axios.get(`${API}/properties/${selectedProperty.id}`, { headers: getAuthHeaders() });
      setSelectedProperty(propResponse.data);
      fetchProperties();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kon kamer niet toevoegen');
    } finally {
      setAddingRoom(false);
    }
  };

  // Delete room from property
  const handleDeleteRoom = async (roomId) => {
    try {
      await axios.delete(`${API}/properties/${selectedProperty.id}/rooms/${roomId}`, { headers: getAuthHeaders() });
      toast.success('Kamer verwijderd');
      const propResponse = await axios.get(`${API}/properties/${selectedProperty.id}`, { headers: getAuthHeaders() });
      setSelectedProperty(propResponse.data);
      fetchProperties();
    } catch (error) {
      toast.error('Kon kamer niet verwijderen');
    }
  };

  // Upload and analyze floor plan
  const handleFloorPlanUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingPlan(true);
    setAiSuggestions(null);
    
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      
      const response = await axios.post(
        `${API}/properties/${selectedProperty.id}/analyze-floor-plan`,
        formDataUpload,
        { headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' } }
      );
      
      if (response.data.rooms && response.data.rooms.length > 0) {
        // Show AI suggestions for review
        setAiSuggestions({
          rooms: response.data.rooms.map((r, i) => ({ ...r, id: `ai-${i}`, selected: true })),
          notes: response.data.analysis_notes,
          floor_plan_url: response.data.floor_plan_url
        });
        toast.success(response.data.message);
      } else {
        toast.warning(response.data.message || 'Kon geen kamers detecteren');
        // Still update the property to show the floor plan
        const propResponse = await axios.get(`${API}/properties/${selectedProperty.id}`, { headers: getAuthHeaders() });
        setSelectedProperty(propResponse.data);
      }
    } catch (error) {
      toast.error('Upload mislukt: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploadingPlan(false);
      e.target.value = '';
    }
  };

  // Save AI-suggested rooms
  const handleSaveAiRooms = async () => {
    const selectedRooms = aiSuggestions.rooms.filter(r => r.selected);
    if (selectedRooms.length === 0) {
      toast.error('Selecteer minstens 1 kamer');
      return;
    }
    
    setSavingSuggestions(true);
    try {
      await axios.post(
        `${API}/properties/${selectedProperty.id}/rooms/bulk`,
        selectedRooms.map(r => ({
          name: r.name,
          room_type: r.room_type || 'other',
          length: parseFloat(r.length) || 0,
          width: parseFloat(r.width) || 0,
          height: parseFloat(r.height) || 2.7
        })),
        { headers: getAuthHeaders() }
      );
      toast.success(`${selectedRooms.length} kamers toegevoegd`);
      setAiSuggestions(null);
      
      // Refresh
      const propResponse = await axios.get(`${API}/properties/${selectedProperty.id}`, { headers: getAuthHeaders() });
      setSelectedProperty(propResponse.data);
      fetchProperties();
    } catch (error) {
      toast.error('Kon kamers niet opslaan');
    } finally {
      setSavingSuggestions(false);
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl" style={{backgroundColor: '#f5e6e6'}}>
              <Building2 size={28} style={{color: '#500000'}} />
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>
                Mijn Panden
              </h1>
              <p className="text-sm" style={{color: '#64748B'}}>
                {properties.length} pand{properties.length !== 1 ? 'en' : ''} in portfolio
              </p>
            </div>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button style={{backgroundColor: '#500000'}}>
                <Plus className="mr-2" size={20} />
                Nieuw Pand
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nieuw Pand Toevoegen</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* URL Import Section - NOW AT TOP */}
                <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Link size={18} className="text-blue-600" />
                    <Label className="text-blue-800 font-semibold">Importeer van website</Label>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={formData.source_url}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      placeholder="Plak hier de URL van het pand (Immoweb, Zimmo, of makelaar website)"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={scraping || !formData.source_url}
                      onClick={() => handleUrlChange(formData.source_url)}
                      className="whitespace-nowrap"
                    >
                      {scraping ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          <Search size={16} className="mr-1" />
                          Ophalen
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    💡 Werkt met Immoweb, Zimmo, Immoscoop én makelaar websites. Gegevens worden automatisch ingevuld.
                  </p>
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Adres *</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      placeholder="Straat en huisnummer"
                      required
                    />
                  </div>
                  <div>
                    <Label>Postcode</Label>
                    <Input
                      value={formData.postal_code}
                      onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                      placeholder="9000"
                    />
                  </div>
                  <div>
                    <Label>Stad *</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      placeholder="Gent"
                      required
                    />
                  </div>
                </div>
                
                {/* Property Details */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Bewoonbare opp. (m²)</Label>
                    <Input
                      type="number"
                      value={formData.living_area}
                      onChange={(e) => setFormData({...formData, living_area: e.target.value})}
                      placeholder="120"
                    />
                  </div>
                  <div>
                    <Label>Grondoppervlakte (m²)</Label>
                    <Input
                      type="number"
                      value={formData.plot_area}
                      onChange={(e) => setFormData({...formData, plot_area: e.target.value})}
                      placeholder="250"
                    />
                  </div>
                  <div>
                    <Label>Vraagprijs (€)</Label>
                    <Input
                      type="number"
                      value={formData.asking_price}
                      onChange={(e) => setFormData({...formData, asking_price: e.target.value})}
                      placeholder="350000"
                    />
                  </div>
                  <div>
                    <Label>Slaapkamers</Label>
                    <Input
                      type="number"
                      value={formData.bedrooms}
                      onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <Label>Badkamers</Label>
                    <Input
                      type="number"
                      value={formData.bathrooms}
                      onChange={(e) => setFormData({...formData, bathrooms: e.target.value})}
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <Label>Bouwjaar</Label>
                    <Input
                      type="number"
                      value={formData.construction_year}
                      onChange={(e) => setFormData({...formData, construction_year: e.target.value})}
                      placeholder="1970"
                    />
                  </div>
                  <div>
                    <Label>EPC Score</Label>
                    <Select value={formData.epc_score} onValueChange={(v) => setFormData({...formData, epc_score: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer" />
                      </SelectTrigger>
                      <SelectContent>
                        {EPC_SCORES.map(score => (
                          <SelectItem key={score} value={score}>{score}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>EPC Waarde (kWh/m²)</Label>
                    <Input
                      type="number"
                      value={formData.epc_value}
                      onChange={(e) => setFormData({...formData, epc_value: e.target.value})}
                      placeholder="450"
                    />
                  </div>
                </div>
                
                {/* Rooms Section */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3" style={{color: '#3a190b'}}>
                    Kamers (voor berekening)
                  </h3>
                  
                  {/* Room List */}
                  {rooms.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {rooms.map((room, idx) => (
                        <div key={room.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium">{room.name}</span>
                            <span className="text-sm text-gray-500 ml-2">
                              ({room.length}m x {room.width}m = {(room.length * room.width).toFixed(1)}m²)
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRoom(room.id)}
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Add Room Form */}
                  <div className="grid grid-cols-5 gap-2 items-end">
                    <div>
                      <Label className="text-xs">Naam</Label>
                      <Input
                        value={newRoom.name}
                        onChange={(e) => setNewRoom({...newRoom, name: e.target.value})}
                        placeholder="Woonkamer"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Type</Label>
                      <Select value={newRoom.room_type} onValueChange={(v) => setNewRoom({...newRoom, room_type: v})}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROOM_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Lengte (m)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={newRoom.length}
                        onChange={(e) => setNewRoom({...newRoom, length: e.target.value})}
                        placeholder="5.0"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Breedte (m)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={newRoom.width}
                        onChange={(e) => setNewRoom({...newRoom, width: e.target.value})}
                        placeholder="4.0"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Hoogte (m)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={newRoom.height}
                        onChange={(e) => setNewRoom({...newRoom, height: e.target.value})}
                        placeholder="2.55"
                        className="h-9"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddRoom}
                      className="h-9"
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Annuleren
                  </Button>
                  <Button type="submit" style={{backgroundColor: '#500000'}}>
                    Pand Toevoegen
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Property List */}
          <div className="lg:col-span-1 space-y-4">
            {properties.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Home size={48} className="mx-auto mb-4" style={{color: '#94A3B8'}} />
                  <p className="text-lg font-medium mb-2" style={{color: '#64748B'}}>
                    Nog geen panden
                  </p>
                  <p className="text-sm mb-4" style={{color: '#94A3B8'}}>
                    Voeg je eerste pand toe om te beginnen
                  </p>
                </CardContent>
              </Card>
            ) : (
              properties.map((property) => (
                <Card 
                  key={property.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedProperty?.id === property.id ? 'ring-2' : ''}`}
                  style={{borderColor: selectedProperty?.id === property.id ? '#500000' : undefined}}
                  onClick={() => handleViewProperty(property)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold" style={{color: '#3a190b'}}>
                          {property.address || 'Geen adres'}
                        </h3>
                        <p className="text-sm" style={{color: '#64748B'}}>
                          {property.postal_code} {property.city}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        property.status === 'calculated' ? 'bg-green-100 text-green-700' :
                        property.status === 'shared' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {property.status === 'calculated' ? 'Berekend' :
                         property.status === 'shared' ? 'Gedeeld' : 'Nieuw'}
                      </span>
                    </div>
                    
                    <div className="flex gap-4 text-sm" style={{color: '#64748B'}}>
                      {property.living_area > 0 && (
                        <span className="flex items-center gap-1">
                          <Ruler size={14} />
                          {property.living_area}m²
                        </span>
                      )}
                      {property.bedrooms > 0 && (
                        <span className="flex items-center gap-1">
                          <BedDouble size={14} />
                          {property.bedrooms}
                        </span>
                      )}
                      {property.bathrooms > 0 && (
                        <span className="flex items-center gap-1">
                          <Bath size={14} />
                          {property.bathrooms}
                        </span>
                      )}
                    </div>
                    
                    {property.asking_price > 0 && (
                      <p className="mt-2 font-bold" style={{color: '#500000'}}>
                        €{property.asking_price.toLocaleString('nl-BE')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Property Detail */}
          <div className="lg:col-span-2">
            {selectedProperty ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle style={{color: '#500000'}}>
                    {selectedProperty.address}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCalculate(selectedProperty.id)}
                      disabled={calculationLoading}
                    >
                      {calculationLoading ? (
                        <Loader2 size={16} className="animate-spin mr-2" />
                      ) : (
                        <Calculator size={16} className="mr-2" />
                      )}
                      {selectedProperty.calculation ? 'Herbereken' : 'Bereken'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(selectedProperty.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Property Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Bewoonbaar</p>
                      <p className="font-semibold">{selectedProperty.living_area || 0} m²</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Grond</p>
                      <p className="font-semibold">{selectedProperty.plot_area || 0} m²</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Kamers</p>
                      <p className="font-semibold">{selectedProperty.bedrooms || 0} slpk / {selectedProperty.bathrooms || 0} badk</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">EPC</p>
                      <p className="font-semibold">{selectedProperty.epc_score || '-'}</p>
                    </div>
                  </div>
                  
                  {/* Rooms */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold" style={{color: '#3a190b'}}>
                        Kamers ({selectedProperty.rooms?.length || 0})
                      </h4>
                      <div className="flex gap-2">
                        <label className="cursor-pointer" data-testid="upload-floor-plan-btn">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={handleFloorPlanUpload}
                            disabled={uploadingPlan}
                          />
                          <span className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border transition-colors ${
                            uploadingPlan ? 'opacity-50' : 'hover:bg-blue-50 border-blue-300 text-blue-700'
                          }`}>
                            {uploadingPlan ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <FileImage size={14} />
                            )}
                            {uploadingPlan ? 'Analyseren...' : 'Grondplan uploaden'}
                          </span>
                        </label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAddRoom(!showAddRoom)}
                          data-testid="add-room-btn"
                        >
                          <Plus size={14} className="mr-1" />
                          Kamer
                        </Button>
                      </div>
                    </div>

                    {/* Floor plan image */}
                    {selectedProperty.floor_plan_url && (
                      <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 text-xs text-blue-600 mb-1">
                          <FileImage size={12} />
                          Grondplan opgeslagen
                        </div>
                        <img
                          src={`${API.replace('/api', '')}${selectedProperty.floor_plan_url}`}
                          alt="Grondplan"
                          className="max-h-40 rounded object-contain"
                          data-testid="floor-plan-image"
                        />
                      </div>
                    )}

                    {/* AI Suggestions from floor plan */}
                    {aiSuggestions && (
                      <div className="mb-4 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border-2 border-indigo-200" data-testid="ai-suggestions">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1 bg-indigo-100 rounded">
                            <FileImage size={16} className="text-indigo-600" />
                          </div>
                          <div>
                            <h5 className="font-semibold text-indigo-800 text-sm">AI Kamer Detectie</h5>
                            <p className="text-xs text-indigo-600">{aiSuggestions.rooms.length} kamers gedetecteerd - bewerk en bevestig</p>
                          </div>
                        </div>
                        
                        {aiSuggestions.notes && (
                          <p className="text-xs text-indigo-600 mb-3 bg-indigo-100 p-2 rounded">
                            {aiSuggestions.notes}
                          </p>
                        )}
                        
                        <div className="space-y-2 mb-3">
                          {aiSuggestions.rooms.map((room, idx) => (
                            <div key={room.id} className={`flex items-center gap-2 p-2 rounded border ${
                              room.selected ? 'bg-white border-indigo-300' : 'bg-gray-50 border-gray-200 opacity-60'
                            }`} data-testid={`ai-room-${idx}`}>
                              <input
                                type="checkbox"
                                checked={room.selected}
                                onChange={(e) => {
                                  const updated = [...aiSuggestions.rooms];
                                  updated[idx] = { ...updated[idx], selected: e.target.checked };
                                  setAiSuggestions({ ...aiSuggestions, rooms: updated });
                                }}
                                className="w-4 h-4 accent-indigo-500"
                              />
                              <input
                                className="text-sm font-medium bg-transparent border-b border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:outline-none w-28 px-1"
                                value={room.name}
                                onChange={(e) => {
                                  const updated = [...aiSuggestions.rooms];
                                  updated[idx] = { ...updated[idx], name: e.target.value };
                                  setAiSuggestions({ ...aiSuggestions, rooms: updated });
                                }}
                              />
                              <select
                                className="text-xs border rounded px-1 py-0.5 bg-white"
                                value={room.room_type}
                                onChange={(e) => {
                                  const updated = [...aiSuggestions.rooms];
                                  updated[idx] = { ...updated[idx], room_type: e.target.value };
                                  setAiSuggestions({ ...aiSuggestions, rooms: updated });
                                }}
                              >
                                {ROOM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <input
                                  type="number"
                                  className="w-14 border rounded px-1 py-0.5 text-center"
                                  value={room.length}
                                  step="0.1"
                                  onChange={(e) => {
                                    const updated = [...aiSuggestions.rooms];
                                    updated[idx] = { ...updated[idx], length: e.target.value };
                                    setAiSuggestions({ ...aiSuggestions, rooms: updated });
                                  }}
                                />
                                <span>x</span>
                                <input
                                  type="number"
                                  className="w-14 border rounded px-1 py-0.5 text-center"
                                  value={room.width}
                                  step="0.1"
                                  onChange={(e) => {
                                    const updated = [...aiSuggestions.rooms];
                                    updated[idx] = { ...updated[idx], width: e.target.value };
                                    setAiSuggestions({ ...aiSuggestions, rooms: updated });
                                  }}
                                />
                                <span>m</span>
                              </div>
                              <span className="text-xs text-gray-400 ml-auto">
                                {(parseFloat(room.length || 0) * parseFloat(room.width || 0)).toFixed(1)}m²
                              </span>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleSaveAiRooms}
                            disabled={savingSuggestions}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            data-testid="save-ai-rooms-btn"
                          >
                            {savingSuggestions ? <Loader2 size={14} className="animate-spin mr-1" /> : <Check size={14} className="mr-1" />}
                            {aiSuggestions.rooms.filter(r => r.selected).length} kamers toevoegen
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAiSuggestions(null)}
                          >
                            Annuleren
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Existing rooms list */}
                    {selectedProperty.rooms && selectedProperty.rooms.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {selectedProperty.rooms.map((room, idx) => (
                          <div key={room.id || idx} className="p-2 border rounded text-sm flex items-center justify-between group" data-testid={`room-${room.id || idx}`}>
                            <div>
                              <span className="font-medium">{room.name}</span>
                              <span className="text-gray-500 ml-2">
                                ({room.floor_area?.toFixed(1) || (room.length * room.width).toFixed(1)} m²)
                              </span>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room.id); }}
                              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-1"
                              data-testid={`delete-room-${room.id || idx}`}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Room Form (inline) */}
                    {showAddRoom && (
                      <div className="p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300 mb-3" data-testid="add-room-form">
                        <div className="grid grid-cols-6 gap-2 items-end">
                          <div className="col-span-2">
                            <label className="text-xs text-gray-500">Naam</label>
                            <Input
                              value={addRoomData.name}
                              onChange={(e) => setAddRoomData({...addRoomData, name: e.target.value})}
                              placeholder="Woonkamer"
                              className="h-8 text-sm"
                              data-testid="add-room-name"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Type</label>
                            <select
                              className="w-full h-8 text-sm border rounded px-2"
                              value={addRoomData.room_type}
                              onChange={(e) => setAddRoomData({...addRoomData, room_type: e.target.value})}
                              data-testid="add-room-type"
                            >
                              {ROOM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">L (m)</label>
                            <Input
                              type="number"
                              step="0.1"
                              value={addRoomData.length}
                              onChange={(e) => setAddRoomData({...addRoomData, length: e.target.value})}
                              placeholder="5.0"
                              className="h-8 text-sm"
                              data-testid="add-room-length"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">B (m)</label>
                            <Input
                              type="number"
                              step="0.1"
                              value={addRoomData.width}
                              onChange={(e) => setAddRoomData({...addRoomData, width: e.target.value})}
                              placeholder="4.0"
                              className="h-8 text-sm"
                              data-testid="add-room-width"
                            />
                          </div>
                          <div className="flex gap-1">
                            <div className="flex-1">
                              <label className="text-xs text-gray-500">H (m)</label>
                              <Input
                                type="number"
                                step="0.1"
                                value={addRoomData.height}
                                onChange={(e) => setAddRoomData({...addRoomData, height: e.target.value})}
                                placeholder="2.7"
                                className="h-8 text-sm"
                                data-testid="add-room-height"
                              />
                            </div>
                            <Button
                              size="sm"
                              className="h-8 mt-auto"
                              onClick={handleAddRoomToProperty}
                              disabled={addingRoom}
                              style={{backgroundColor: '#500000'}}
                              data-testid="submit-room-btn"
                            >
                              {addingRoom ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* No rooms message */}
                    {(!selectedProperty.rooms || selectedProperty.rooms.length === 0) && !showAddRoom && !aiSuggestions && (
                      <div className="text-center py-6 border rounded-lg bg-yellow-50">
                        <Home size={36} className="mx-auto mb-3 text-yellow-500" />
                        <p className="text-yellow-700 mb-1 text-sm">Geen kamers toegevoegd</p>
                        <p className="text-xs text-yellow-600 mb-3">
                          Upload een grondplan of voeg kamers handmatig toe
                        </p>
                        <div className="flex gap-2 justify-center">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={handleFloorPlanUpload}
                            />
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                              <FileImage size={14} />
                              Upload grondplan
                            </span>
                          </label>
                          <Button variant="outline" size="sm" onClick={() => setShowAddRoom(true)}>
                            <Plus size={14} className="mr-1" />
                            Handmatig
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Calculation Results */}
                  {selectedProperty.calculation && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-4" style={{color: '#500000'}}>
                        Renovatieberekening
                      </h4>
                      
                      {/* Summary */}
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="p-4 bg-green-50 rounded-lg text-center">
                          <p className="text-xs text-green-600">Minimum</p>
                          <p className="text-xl font-bold text-green-700">
                            €{selectedProperty.calculation.total_min?.toLocaleString('nl-BE')}
                          </p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg text-center border-2 border-blue-200">
                          <p className="text-xs text-blue-600">Realistisch</p>
                          <p className="text-2xl font-bold text-blue-700">
                            €{selectedProperty.calculation.total_realistic?.toLocaleString('nl-BE')}
                          </p>
                        </div>
                        <div className="p-4 bg-orange-50 rounded-lg text-center">
                          <p className="text-xs text-orange-600">Maximum</p>
                          <p className="text-xl font-bold text-orange-700">
                            €{selectedProperty.calculation.total_max?.toLocaleString('nl-BE')}
                          </p>
                        </div>
                      </div>
                      
                      {/* Room Breakdowns */}
                      <div className="space-y-4">
                        {selectedProperty.calculation.room_calculations?.map((roomCalc, idx) => (
                          <RoomCalculationCard key={idx} roomCalc={roomCalc} propertyId={selectedProperty.id} onUpdate={fetchProperties} />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* No calculation yet */}
                  {!selectedProperty.calculation && selectedProperty.rooms?.length > 0 && (
                    <div className="text-center py-8 border rounded-lg bg-gray-50">
                      <Calculator size={48} className="mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-600 mb-4">Nog geen berekening uitgevoerd</p>
                      <Button onClick={() => handleCalculate(selectedProperty.id)} style={{backgroundColor: '#500000'}}>
                        <Calculator size={16} className="mr-2" />
                        Start Berekening
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Building2 size={64} className="mx-auto mb-4" style={{color: '#E5E7EB'}} />
                  <p className="text-lg" style={{color: '#64748B'}}>
                    Selecteer een pand om details te bekijken
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Collapsible extras section
function ExtrasSection({ items, label, accentColor, onToggle }) {
  const [open, setOpen] = useState(false);
  if (!items || items.length === 0) return null;
  const selectedCount = items.filter(i => i.included).length;
  
  return (
    <div className="mt-2" data-testid={`extras-${label}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs font-medium px-2 py-1.5 rounded-md w-full hover:bg-gray-50 transition-colors"
        style={{ color: accentColor }}
        data-testid={`extras-toggle-${label}`}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Extra opties ({items.length})
        {selectedCount > 0 && (
          <span className="ml-auto text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
            {selectedCount} geselecteerd
          </span>
        )}
      </button>
      {open && (
        <div className="ml-2 mt-1 space-y-1 border-l-2 border-dashed pl-3" style={{ borderColor: accentColor + '40' }}>
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-1" data-testid={`extra-item-${item.id}`}>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.included}
                  onChange={() => onToggle(item.id, item.included)}
                  className="w-4 h-4"
                  style={{ accentColor }}
                  data-testid={`extra-checkbox-${item.id}`}
                />
                <span className={`text-sm ${!item.included ? 'text-gray-500' : ''}`}>
                  {item.title.replace(/^Extra:\s*/, '')}
                </span>
                <span className="text-xs text-gray-400">
                  ({item.quantity} {item.unit} x €{item.unit_price})
                </span>
              </div>
              <span className={`text-sm font-medium ${!item.included ? 'text-gray-400' : ''}`}>
                €{item.total.toLocaleString('nl-BE', {minimumFractionDigits: 2})}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Calculation item row
function CalcItemRow({ item, onToggle, accentColor, extraLabel }) {
  return (
    <div className={`flex items-center justify-between py-1 ${
      item.category?.includes('afwerking') ? 'bg-yellow-50 p-2 rounded border border-yellow-300 my-1' : ''
    }`} data-testid={`calc-item-${item.id}`}>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={item.included}
          onChange={() => onToggle(item.id, item.included)}
          className="w-4 h-4"
          style={{ accentColor }}
          data-testid={`calc-checkbox-${item.id}`}
        />
        <span className={`text-sm ${!item.included ? 'line-through text-gray-400' : ''}`}>
          {item.title}
          {extraLabel && <span className="text-xs text-yellow-600 ml-2">{extraLabel}</span>}
        </span>
      </div>
      <span className={`text-sm font-medium ${!item.included ? 'line-through text-gray-400' : ''}`}>
        €{item.total.toLocaleString('nl-BE', {minimumFractionDigits: 2})}
      </span>
    </div>
  );
}

// Room Calculation Card Component - Smart Scenario-Based
function RoomCalculationCard({ roomCalc, propertyId, onUpdate }) {
  const [expanded, setExpanded] = useState(false);

  const allItems = [
    ...roomCalc.floor_items,
    ...roomCalc.wall_items,
    ...roomCalc.ceiling_items,
    ...roomCalc.other_items
  ];
  const includedTotal = allItems.filter(i => i.included).reduce((sum, i) => sum + i.total, 0);

  const handleToggleItem = async (itemId, currentIncluded) => {
    try {
      await axios.put(
        `${API}/properties/${propertyId}/calculation/items/${itemId}?included=${!currentIncluded}`,
        {},
        { headers: getAuthHeaders() }
      );
      onUpdate();
    } catch (error) {
      toast.error('Kon item niet bijwerken');
    }
  };

  const handleSwitchFloorOption = async (itemId) => {
    try {
      await axios.put(
        `${API}/properties/${propertyId}/calculation/switch-option?room_id=${roomCalc.room_id}&option_group=vloer_afwerking_keuze&selected_item_id=${itemId}`,
        {},
        { headers: getAuthHeaders() }
      );
      onUpdate();
    } catch (error) {
      toast.error('Kon vloeroptie niet wisselen');
    }
  };

  const handleSwitchWallScenario = async (scenario) => {
    try {
      await axios.put(
        `${API}/properties/${propertyId}/calculation/switch-scenario?room_id=${roomCalc.room_id}&scenario=${scenario}`,
        {},
        { headers: getAuthHeaders() }
      );
      onUpdate();
    } catch (error) {
      toast.error('Kon muur scenario niet wisselen');
    }
  };

  // Group items
  const floorBaseItems = roomCalc.floor_items.filter(i => i.option_group === 'vloer_basis');
  const floorOptions = roomCalc.floor_items.filter(i => i.option_group === 'vloer_afwerking_keuze');
  const floorExtras = roomCalc.floor_items.filter(i => i.category === 'vloer_extra');

  const wallScenarioA = roomCalc.wall_items.filter(i => i.category === 'muur_scenario_a');
  const wallScenarioB = roomCalc.wall_items.filter(i => i.category === 'muur_scenario_b');
  const wallScenarioC = roomCalc.wall_items.filter(i => i.category === 'muur_scenario_c');
  const wallPainting = roomCalc.wall_items.filter(i => i.category === 'muur_afwerking');
  const wallExtras = roomCalc.wall_items.filter(i => i.category === 'muur_extra');

  const ceilingBase = roomCalc.ceiling_items.filter(i => !i.category?.includes('extra'));
  const ceilingExtras = roomCalc.ceiling_items.filter(i => i.category === 'plafond_extra');

  const elektriciteit = roomCalc.other_items.filter(i => i.category === 'elektriciteit');
  const elektriciteitExtras = roomCalc.other_items.filter(i => i.category === 'elektriciteit_extra');
  const sanitairExtras = roomCalc.other_items.filter(i => i.category === 'sanitair_extra');
  const overigExtras = roomCalc.other_items.filter(i => i.category === 'overig_extra');

  const currentWallScenario = wallScenarioA.some(i => i.included) ? 'nieuw_pleisterwerk' :
                             wallScenarioB.some(i => i.included) ? 'egaliseren' :
                             wallScenarioC.some(i => i.included) ? 'gyproc' : 'nieuw_pleisterwerk';

  return (
    <div className="border rounded-lg overflow-hidden" data-testid={`room-calc-${roomCalc.room_id}`}>
      <button
        className="w-full p-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
        data-testid={`room-toggle-${roomCalc.room_id}`}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <span className="font-medium">{roomCalc.room_name}</span>
          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
            {roomCalc.floor_area}m² vloer
          </span>
        </div>
        <span className="font-semibold text-lg" style={{color: '#500000'}}>
          €{includedTotal.toLocaleString('nl-BE', {minimumFractionDigits: 2})}
        </span>
      </button>

      {expanded && (
        <div className="p-4 space-y-6">
          {/* ===== VLOER ===== */}
          <div className="border-l-4 border-blue-500 pl-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-blue-700" data-testid="section-vloer">Vloerwerken</h4>
              <span className="text-sm font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded">
                {roomCalc.floor_area} m²
              </span>
            </div>

            <div className="mb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Voorbereiding</p>
              {floorBaseItems.map(item => (
                <CalcItemRow key={item.id} item={item} onToggle={handleToggleItem} accentColor="#3b82f6" />
              ))}
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-600 uppercase tracking-wide mb-2">
                Kies vloer afwerking
              </p>
              <div className="space-y-2">
                {floorOptions.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer transition-all ${
                      item.included ? 'bg-blue-100 border-2 border-blue-500' : 'bg-white border border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => !item.included && handleSwitchFloorOption(item.id)}
                    data-testid={`floor-option-${item.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`floor-${roomCalc.room_id}`}
                        checked={item.included}
                        onChange={() => handleSwitchFloorOption(item.id)}
                        className="w-4 h-4 accent-blue-500"
                      />
                      <span className={`text-sm ${item.included ? 'font-medium' : ''}`}>{item.title}</span>
                      <span className="text-xs text-gray-500">
                        ({item.quantity}m² x €{item.unit_price})
                      </span>
                    </div>
                    <span className={`font-medium ${item.included ? 'text-blue-700' : 'text-gray-500'}`}>
                      €{item.total.toLocaleString('nl-BE', {minimumFractionDigits: 2})}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <ExtrasSection items={floorExtras} label="vloer" accentColor="#3b82f6" onToggle={handleToggleItem} />
          </div>

          {/* ===== MUREN ===== */}
          <div className="border-l-4 border-green-500 pl-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-green-700" data-testid="section-muur">Muurwerken</h4>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium bg-green-100 text-green-700 px-2 py-1 rounded">
                  {roomCalc.wall_area} m²
                </span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  hoogte: {roomCalc.room_height}m
                  {roomCalc.height_source === 'standaard' && ' (standaard)'}
                </span>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-3 mb-3">
              <p className="text-xs text-green-600 uppercase tracking-wide mb-2">Kies muur scenario</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'nieuw_pleisterwerk', label: 'Nieuw pleisterwerk' },
                  { key: 'egaliseren', label: 'Egaliseren' },
                  { key: 'gyproc', label: 'Gyproc afwerking' }
                ].map(s => (
                  <button
                    key={s.key}
                    onClick={() => handleSwitchWallScenario(s.key)}
                    className={`px-3 py-2 rounded text-sm transition-all ${
                      currentWallScenario === s.key
                        ? 'bg-green-500 text-white'
                        : 'bg-white border border-green-300 text-green-700 hover:bg-green-100'
                    }`}
                    data-testid={`wall-scenario-${s.key}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1 mb-3">
              {[...wallScenarioA, ...wallScenarioB, ...wallScenarioC].filter(i => i.included).map(item => (
                <div key={item.id} className="flex items-center justify-between py-1">
                  <span className="text-sm">{item.title}</span>
                  <span className="text-sm font-medium">
                    €{item.total.toLocaleString('nl-BE', {minimumFractionDigits: 2})}
                  </span>
                </div>
              ))}
            </div>

            {wallPainting.map(item => (
              <div key={item.id} className={`flex items-center justify-between p-2 rounded ${
                item.included ? 'bg-yellow-50 border border-yellow-300' : 'bg-gray-100'
              }`}>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.included}
                    onChange={() => handleToggleItem(item.id, item.included)}
                    className="w-5 h-5 accent-yellow-500"
                    data-testid={`wall-painting-${item.id}`}
                  />
                  <div>
                    <span className={`text-sm ${!item.included && 'line-through text-gray-400'}`}>
                      Schilderwerk muren
                    </span>
                    <span className="text-xs text-yellow-600 ml-2">(vaak zelf te doen)</span>
                  </div>
                </div>
                <span className={`font-medium ${!item.included && 'text-gray-400'}`}>
                  €{item.total.toLocaleString('nl-BE', {minimumFractionDigits: 2})}
                </span>
              </div>
            ))}

            <ExtrasSection items={wallExtras} label="muur" accentColor="#22c55e" onToggle={handleToggleItem} />
          </div>

          {/* ===== PLAFOND ===== */}
          <div className="border-l-4 border-purple-500 pl-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-purple-700" data-testid="section-plafond">Plafondwerken</h4>
              <span className="text-sm font-medium bg-purple-100 text-purple-700 px-2 py-1 rounded">
                {roomCalc.ceiling_area} m²
              </span>
            </div>

            {ceilingBase.map(item => (
              <CalcItemRow
                key={item.id}
                item={item}
                onToggle={handleToggleItem}
                accentColor="#a855f7"
                extraLabel={item.category === 'plafond_afwerking' ? '(vaak zelf te doen)' : undefined}
              />
            ))}

            <ExtrasSection items={ceilingExtras} label="plafond" accentColor="#a855f7" onToggle={handleToggleItem} />
          </div>

          {/* ===== ELEKTRICITEIT ===== */}
          {(elektriciteit.length > 0 || elektriciteitExtras.length > 0) && (
            <div className="border-l-4 border-orange-500 pl-3">
              <h4 className="font-semibold text-orange-700 mb-3" data-testid="section-elektriciteit">Elektriciteit</h4>
              {elektriciteit.map(item => (
                <div key={item.id} className="flex items-center justify-between py-1" data-testid={`elec-item-${item.id}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.included}
                      onChange={() => handleToggleItem(item.id, item.included)}
                      className="w-4 h-4 accent-orange-500"
                    />
                    <span className={`text-sm ${!item.included ? 'line-through text-gray-400' : ''}`}>
                      {item.title}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({item.quantity} {item.unit} x €{item.unit_price})
                    </span>
                  </div>
                  <span className={`text-sm font-medium ${!item.included ? 'line-through text-gray-400' : ''}`}>
                    €{item.total.toLocaleString('nl-BE', {minimumFractionDigits: 2})}
                  </span>
                </div>
              ))}
              <ExtrasSection items={elektriciteitExtras} label="elektriciteit" accentColor="#f97316" onToggle={handleToggleItem} />
            </div>
          )}

          {/* ===== SANITAIR ===== */}
          {sanitairExtras.length > 0 && (
            <div className="border-l-4 border-cyan-500 pl-3">
              <h4 className="font-semibold text-cyan-700 mb-3" data-testid="section-sanitair">Sanitair</h4>
              {sanitairExtras.map(item => (
                <div key={item.id} className="flex items-center justify-between py-1" data-testid={`sanitair-item-${item.id}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.included}
                      onChange={() => handleToggleItem(item.id, item.included)}
                      className="w-4 h-4 accent-cyan-500"
                    />
                    <span className={`text-sm ${!item.included ? 'text-gray-500' : ''}`}>
                      {item.title.replace(/^Extra:\s*/, '')}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({item.quantity} {item.unit} x €{item.unit_price})
                    </span>
                  </div>
                  <span className={`text-sm font-medium ${!item.included ? 'text-gray-400' : ''}`}>
                    €{item.total.toLocaleString('nl-BE', {minimumFractionDigits: 2})}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ===== OVERIG ===== */}
          {overigExtras.length > 0 && (
            <div className="border-l-4 border-gray-400 pl-3">
              <h4 className="font-semibold text-gray-600 mb-3" data-testid="section-overig">Overig</h4>
              {overigExtras.map(item => (
                <div key={item.id} className="flex items-center justify-between py-1" data-testid={`overig-item-${item.id}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.included}
                      onChange={() => handleToggleItem(item.id, item.included)}
                      className="w-4 h-4 accent-gray-500"
                    />
                    <span className={`text-sm ${!item.included ? 'text-gray-500' : ''}`}>
                      {item.title.replace(/^Extra:\s*/, '')}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({item.quantity} {item.unit} x €{item.unit_price})
                    </span>
                  </div>
                  <span className={`text-sm font-medium ${!item.included ? 'text-gray-400' : ''}`}>
                    €{item.total.toLocaleString('nl-BE', {minimumFractionDigits: 2})}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
