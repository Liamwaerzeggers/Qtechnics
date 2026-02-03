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
  ExternalLink, ChevronDown, ChevronRight, Edit, X, Link, Search
} from 'lucide-react';
import { toast } from 'sonner';

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
    height: '2.7'
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await axios.get(`${API}/properties`, { withCredentials: true });
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
          { withCredentials: true }
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
      height: parseFloat(newRoom.height) || 2.7,
      id: `room-${Date.now()}`
    };
    
    setRooms([...rooms, room]);
    setNewRoom({
      name: '',
      room_type: 'other',
      length: '',
      width: '',
      height: '2.7'
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
      
      await axios.post(`${API}/properties`, payload, { withCredentials: true });
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
      await axios.delete(`${API}/properties/${propertyId}`, { withCredentials: true });
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
      const response = await axios.post(`${API}/properties/${propertyId}/calculate`, {}, { withCredentials: true });
      toast.success(`Berekening klaar! Geschatte kost: €${response.data.total_realistic.toLocaleString('nl-BE')}`);
      fetchProperties();
      
      // Fetch updated property with calculation
      const propResponse = await axios.get(`${API}/properties/${propertyId}`, { withCredentials: true });
      setSelectedProperty(propResponse.data);
      
      // Fetch calculation details
      const calcResponse = await axios.get(`${API}/properties/${propertyId}/calculation`, { withCredentials: true });
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
    
    // Fetch calculation if exists
    if (property.renovation_calculation_id) {
      try {
        const calcResponse = await axios.get(`${API}/properties/${property.id}/calculation`, { withCredentials: true });
        setSelectedProperty(prev => ({ ...prev, calculation: calcResponse.data }));
      } catch (error) {
        console.log('No calculation found');
      }
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
                  {selectedProperty.rooms && selectedProperty.rooms.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2" style={{color: '#3a190b'}}>Kamers</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedProperty.rooms.map((room, idx) => (
                          <div key={idx} className="p-2 border rounded text-sm">
                            <span className="font-medium">{room.name}</span>
                            <span className="text-gray-500 ml-2">
                              ({room.floor_area?.toFixed(1) || (room.length * room.width).toFixed(1)} m²)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
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
                  
                  {/* No rooms */}
                  {(!selectedProperty.rooms || selectedProperty.rooms.length === 0) && (
                    <div className="text-center py-8 border rounded-lg bg-yellow-50">
                      <Home size={48} className="mx-auto mb-4 text-yellow-500" />
                      <p className="text-yellow-700 mb-2">Geen kamers toegevoegd</p>
                      <p className="text-sm text-yellow-600">
                        Voeg eerst kamers toe om een renovatieberekening te kunnen maken
                      </p>
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

// Room Calculation Card Component
function RoomCalculationCard({ roomCalc, propertyId, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  
  const allItems = [
    ...roomCalc.floor_items.map(i => ({...i, category: 'Vloer'})),
    ...roomCalc.wall_items.map(i => ({...i, category: 'Muur'})),
    ...roomCalc.ceiling_items.map(i => ({...i, category: 'Plafond'})),
    ...roomCalc.other_items.map(i => ({...i, category: 'Overig'}))
  ];
  
  const includedTotal = allItems
    .filter(i => i.included)
    .reduce((sum, i) => sum + i.total, 0);

  const handleToggleItem = async (itemId, currentIncluded) => {
    try {
      await axios.put(
        `${API}/properties/${propertyId}/calculation/items/${itemId}?included=${!currentIncluded}`,
        {},
        { withCredentials: true }
      );
      onUpdate();
    } catch (error) {
      toast.error('Kon item niet bijwerken');
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full p-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <span className="font-medium">{roomCalc.room_name}</span>
          <span className="text-sm text-gray-500">({allItems.length} items)</span>
        </div>
        <span className="font-semibold" style={{color: '#500000'}}>
          €{includedTotal.toLocaleString('nl-BE', {minimumFractionDigits: 2})}
        </span>
      </button>
      
      {expanded && (
        <div className="p-3 space-y-2">
          {allItems.map((item, idx) => (
            <div 
              key={idx}
              className={`flex items-center justify-between p-2 rounded ${item.included ? 'bg-white' : 'bg-gray-100 opacity-60'}`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={item.included}
                  onChange={() => handleToggleItem(item.id, item.included)}
                  className="w-4 h-4"
                />
                <div>
                  <p className={`text-sm ${!item.included && 'line-through'}`}>{item.title}</p>
                  <p className="text-xs text-gray-500">
                    {item.category} • {item.quantity} {item.unit} × €{item.unit_price}
                  </p>
                </div>
              </div>
              <span className={`font-medium ${!item.included && 'line-through'}`}>
                €{item.total.toLocaleString('nl-BE', {minimumFractionDigits: 2})}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
