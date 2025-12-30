import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { Camera, Upload, Trash2, Save, Loader2, X, Download, ZoomIn, Plus, Edit2, Check } from 'lucide-react';
import { toast } from 'sonner';

// Helper function to construct full image URL with cache busting
const getFullImageUrl = (photoPath) => {
  if (!photoPath) return '';
  // If already a full URL, return as-is
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
    return photoPath;
  }
  const baseUrl = process.env.REACT_APP_BACKEND_URL || '';
  // Add cache busting parameter to force reload
  const cacheBuster = `?v=${Date.now()}`;
  const fullUrl = `${baseUrl}${photoPath}${cacheBuster}`;
  return fullUrl;
};

export default function ProjectFirstVisitTab({ project, onUpdate }) {
  const [notes, setNotes] = useState(project.first_visit_notes || '');
  const [photos, setPhotos] = useState(project.first_visit_photos || []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  // Measurements state
  const [workItems, setWorkItems] = useState([]);
  const [measurements, setMeasurements] = useState(project.measurements || []);
  const [selectedWorkItem, setSelectedWorkItem] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [vatRate, setVatRate] = useState('6');
  const [generatingQuote, setGeneratingQuote] = useState(false);
  const [showWorkItemDropdown, setShowWorkItemDropdown] = useState(false);
  const [workItemSearch, setWorkItemSearch] = useState('');
  const [filteredWorkItems, setFilteredWorkItems] = useState([]);
  
  // NEW: Room-based measurement system
  const [roomMeasurements, setRoomMeasurements] = useState(project.room_measurements || []);
  const [newRoom, setNewRoom] = useState({
    room_name: '',
    surface_type: 'vloer', // vloer, muur, plafond
    length: '',
    width: '',
    height: '', // for walls
    work_items: [] // selected work items for this surface
  });
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [roomWorkSearch, setRoomWorkSearch] = useState('');
  const [showRoomWorkDropdown, setShowRoomWorkDropdown] = useState(false);

  // Update state when project prop changes
  // useEffect(() => {
  //   setNotes(project.first_visit_notes || '');
  //   setPhotos(project.first_visit_photos || []);
  //   console.log('Project photos updated:', project.first_visit_photos);
  
  useEffect(() => {
  setNotes(project.first_visit_notes || '');
  setPhotos(project.first_visit_photos || []);
  console.log('Project photos updated:', project.first_visit_photos);
}, [project.first_visit_notes, project.first_visit_photos]);

  // Fetch work items on mount
  useEffect(() => {
    const fetchWorkItems = async () => {
      try {
        const response = await axios.get(`${API}/work-items?limit=1000`, { withCredentials: true });
        setWorkItems(response.data.work_items || []);
      } catch (error) {
        console.error('Failed to fetch work items:', error);
      }
    };
    fetchWorkItems();
  }, []);

  // Filter work items based on search
  useEffect(() => {
    if (workItemSearch && workItemSearch.trim().length > 0) {
      const searchTerm = workItemSearch.toLowerCase().trim();
      const filtered = workItems.filter(w =>
        (w.title && w.title.toLowerCase().includes(searchTerm)) ||
        (w.unit && w.unit.toLowerCase().includes(searchTerm))
      );
      setFilteredWorkItems(filtered.slice(0, 50));
    } else {
      setFilteredWorkItems(workItems.slice(0, 50));
    }
  }, [workItemSearch, workItems]);

  // Calculate area based on surface type
  const calculateArea = (room) => {
    const length = parseFloat(room.length) || 0;
    const width = parseFloat(room.width) || 0;
    const height = parseFloat(room.height) || 0;
    
    if (room.surface_type === 'vloer' || room.surface_type === 'plafond') {
      return length * width;
    } else if (room.surface_type === 'muur') {
      // For walls: perimeter * height = 2*(length + width) * height
      return 2 * (length + width) * height;
    }
    return 0;
  };

  // Calculate total for a room measurement
  const calculateRoomTotal = (room) => {
    const area = calculateArea(room);
    return room.work_items.reduce((sum, wi) => sum + (area * wi.price), 0);
  };

  // Add work item to new room
  const addWorkItemToRoom = (workItem) => {
    if (newRoom.work_items.find(wi => wi.id === workItem.id)) {
      toast.error('Dit werk item is al toegevoegd');
      return;
    }
    setNewRoom({
      ...newRoom,
      work_items: [...newRoom.work_items, { ...workItem, vat_rate: 6 }]
    });
    setRoomWorkSearch('');
    setShowRoomWorkDropdown(false);
  };

  // Remove work item from new room
  const removeWorkItemFromRoom = (workItemId) => {
    setNewRoom({
      ...newRoom,
      work_items: newRoom.work_items.filter(wi => wi.id !== workItemId)
    });
  };

  // Save room measurement
  const handleSaveRoomMeasurement = async () => {
    if (!newRoom.room_name.trim()) {
      toast.error('Vul een ruimte naam in');
      return;
    }
    if (!newRoom.length || !newRoom.width) {
      toast.error('Vul lengte en breedte in');
      return;
    }
    if (newRoom.surface_type === 'muur' && !newRoom.height) {
      toast.error('Vul de hoogte in voor muren');
      return;
    }
    if (newRoom.work_items.length === 0) {
      toast.error('Voeg minstens één werk item toe');
      return;
    }

    try {
      const roomData = {
        id: editingRoomId || `room_${Date.now()}`,
        room_name: newRoom.room_name,
        surface_type: newRoom.surface_type,
        length: parseFloat(newRoom.length),
        width: parseFloat(newRoom.width),
        height: newRoom.surface_type === 'muur' ? parseFloat(newRoom.height) : null,
        area: calculateArea(newRoom),
        work_items: newRoom.work_items.map(wi => ({
          id: wi.id,
          title: wi.title,
          unit: wi.unit,
          price: wi.price,
          vat_rate: wi.vat_rate || 6
        }))
      };

      // Save to backend
      await axios.put(
        `${API}/projects/${project.id}`,
        { 
          room_measurements: editingRoomId 
            ? roomMeasurements.map(rm => rm.id === editingRoomId ? roomData : rm)
            : [...roomMeasurements, roomData]
        },
        { withCredentials: true }
      );

      toast.success(editingRoomId ? 'Meting bijgewerkt!' : 'Ruimte meting toegevoegd!');
      
      // Reset form
      setNewRoom({
        room_name: '',
        surface_type: 'vloer',
        length: '',
        width: '',
        height: '',
        work_items: []
      });
      setShowRoomForm(false);
      setEditingRoomId(null);
      onUpdate();
    } catch (error) {
      toast.error('Kon meting niet opslaan');
    }
  };

  // Edit room measurement
  const handleEditRoom = (room) => {
    setNewRoom({
      room_name: room.room_name,
      surface_type: room.surface_type,
      length: room.length.toString(),
      width: room.width.toString(),
      height: room.height ? room.height.toString() : '',
      work_items: room.work_items || []
    });
    setEditingRoomId(room.id);
    setShowRoomForm(true);
  };

  // Delete room measurement
  const handleDeleteRoom = async (roomId) => {
    try {
      await axios.put(
        `${API}/projects/${project.id}`,
        { room_measurements: roomMeasurements.filter(rm => rm.id !== roomId) },
        { withCredentials: true }
      );
      toast.success('Meting verwijderd');
      onUpdate();
    } catch (error) {
      toast.error('Kon meting niet verwijderen');
    }
  };

  // Generate quote from room measurements
  const handleGenerateQuoteFromRooms = async () => {
    if (roomMeasurements.length === 0) {
      toast.error('Voeg eerst ruimte metingen toe');
      return;
    }

    setGeneratingQuote(true);
    try {
      // Convert room measurements to regular measurements format
      const measurementsToAdd = [];
      for (const room of roomMeasurements) {
        for (const workItem of room.work_items) {
          measurementsToAdd.push({
            work_item_id: workItem.id,
            title: `${room.room_name} - ${room.surface_type} - ${workItem.title}`,
            quantity: room.area,
            unit: workItem.unit,
            price: workItem.price,
            vat_rate: workItem.vat_rate || 6,
            item_type: 'arbeid'
          });
        }
      }

      // Add all measurements
      for (const m of measurementsToAdd) {
        await axios.post(
          `${API}/projects/${project.id}/measurements`,
          m,
          { withCredentials: true }
        );
      }

      // Generate quote
      const response = await axios.post(
        `${API}/projects/${project.id}/generate-quote`,
        {},
        { withCredentials: true }
      );
      
      // Clear room measurements
      await axios.put(
        `${API}/projects/${project.id}`,
        { room_measurements: [] },
        { withCredentials: true }
      );

      toast.success(`Offerte ${response.data.quote_id} gegenereerd!`);
      onUpdate();
      
      setTimeout(() => {
        window.location.href = `/quotes/${response.data.quote_id}`;
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kon offerte niet genereren');
    } finally {
      setGeneratingQuote(false);
    }
  };

  const handleAddMeasurement = async () => {
    if (!selectedWorkItem || !quantity || parseFloat(quantity) <= 0) {
      toast.error('Selecteer een werk item en voer een hoeveelheid in');
      return;
    }

    try {
      const measurement = {
        work_item_id: selectedWorkItem.id,
        title: selectedWorkItem.title,
        quantity: parseFloat(quantity),
        unit: selectedWorkItem.unit,
        price: selectedWorkItem.price,
        vat_rate: parseInt(vatRate),
        item_type: 'arbeid'
      };

      await axios.post(
        `${API}/projects/${project.id}/measurements`,
        measurement,
        { withCredentials: true }
      );

      toast.success(`${selectedWorkItem.title} toegevoegd!`);
      
      // Reset form
      setSelectedWorkItem(null);
      setQuantity('');
      setWorkItemSearch('');
      setShowWorkItemDropdown(false);
      
      // Reload project
      onUpdate();
    } catch (error) {
      toast.error('Kon meting niet toevoegen');
    }
  };

  const handleDeleteMeasurement = async (measurementId) => {
    try {
      await axios.delete(
        `${API}/projects/${project.id}/measurements/${measurementId}`,
        { withCredentials: true }
      );
      toast.success('Meting verwijderd');
      onUpdate();
    } catch (error) {
      toast.error('Kon meting niet verwijderen');
    }
  };

  const handleGenerateQuote = async () => {
    if (measurements.length === 0) {
      toast.error('Voeg eerst metingen toe');
      return;
    }

    setGeneratingQuote(true);
    try {
      const response = await axios.post(
        `${API}/projects/${project.id}/generate-quote`,
        {},
        { withCredentials: true }
      );
      
      toast.success(`Offerte ${response.data.quote_id} gegenereerd! ${response.data.line_items_count} werk items toegevoegd. Nu kunt u materialen toevoegen.`);
      
      // Clear measurements in local state (backend also clears them)
      setMeasurements([]);
      
      onUpdate();
      
      // Optionally navigate to quote
      setTimeout(() => {
        window.location.href = `/quotes/${response.data.quote_id}`;
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kon offerte niet genereren');
    } finally {
      setGeneratingQuote(false);
    }
  };

  // Update state when project prop changes
  useEffect(() => {
    setNotes(project.first_visit_notes || '');
    setPhotos(project.first_visit_photos || []);
    setMeasurements(project.measurements || []);
    setRoomMeasurements(project.room_measurements || []);
  }, [project.first_visit_notes, project.first_visit_photos, project.measurements, project.room_measurements]);

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(
          `${API}/projects/${project.id}/first-visit/photos`,
          formData,
          { 
            withCredentials: true,
            headers: { 'Content-Type': 'multipart/form-data' }
          }
        );

        setPhotos(prev => [...prev, response.data.url]);
      }
      
      toast.success(`${files.length} foto('s) geüpload! 📸`);
      onUpdate();
    } catch (error) {
      console.error('Photo upload error:', error);
      toast.error('Kon foto niet uploaden');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoUrl) => {
    const photoName = photoUrl.split('/').pop();
    
    try {
      await axios.delete(
        `${API}/projects/${project.id}/first-visit/photos/${photoName}`,
        { withCredentials: true }
      );
      
      setPhotos(prev => prev.filter(p => p !== photoUrl));
      toast.success('Foto verwijderd');
      onUpdate();
    } catch (error) {
      console.error('Delete photo error:', error);
      toast.error('Kon foto niet verwijderen');
    }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    
    try {
      await axios.put(
        `${API}/projects/${project.id}/first-visit/notes?notes=${encodeURIComponent(notes)}`,
        {},
        { withCredentials: true }
      );
      
      toast.success('Notities opgeslagen! 📝');
      onUpdate();
    } catch (error) {
      console.error('Save notes error:', error);
      toast.error('Kon notities niet opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPhoto = async (photoUrl) => {
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = photoUrl.split('/').pop();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Foto gedownload! 📥');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Kon foto niet downloaden');
    }
  };

  return (
    <div className="space-y-6">
      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div className="relative max-w-7xl max-h-screen">
            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxPhoto(null);
              }}
              className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors z-10"
              title="Sluiten"
            >
              <X size={24} style={{color: '#1E293B'}} />
            </button>
            
            {/* Download Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadPhoto(lightboxPhoto);
              }}
              className="absolute top-4 right-20 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors z-10"
              title="Download"
            >
              <Download size={24} style={{color: '#1E293B'}} />
            </button>
            
            {/* Image */}
            <img
              src={lightboxPhoto}
              alt="Vergrote foto"
              className="max-w-full max-h-screen object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Foto's Sectie */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold" style={{color: '#1E3A8A'}}>
              📸 Foto's Eerste Bezoek
            </h3>
            <label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={uploading}
              />
              <Button disabled={uploading} asChild>
                <span>
                  {uploading ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={20} />
                      Uploaden...
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2" size={20} />
                      Foto's Uploaden
                    </>
                  )}
                </span>
              </Button>
            </label>
          </div>

          {photos.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg" style={{borderColor: '#E5E7EB'}}>
              <Camera size={48} className="mx-auto mb-4" style={{color: '#94A3B8'}} />
              <p className="text-sm" style={{color: '#64748B'}}>
                Nog geen foto's geüpload
              </p>
              <p className="text-xs mt-1" style={{color: '#94A3B8'}}>
                Upload foto's van het eerste bezoek voor de offerte
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo, idx) => (
                <div key={idx} className="relative group">
                  {/* Square thumbnail with rounded corners */}
                  <div 
                    className="relative aspect-square overflow-hidden rounded-xl cursor-pointer bg-gray-100"
                    onClick={() => setLightboxPhoto(getFullImageUrl(photo))}
                  >
                    <img
                      src={getFullImageUrl(photo)}
                      alt={`Eerste bezoek ${idx + 1}`}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        e.target.onerror = null; // Prevent infinite loop
                        e.target.style.display = 'none';
                        e.target.nextSibling && (e.target.nextSibling.style.display = 'flex');
                      }}
                      loading="lazy"
                    />
                    <div className="hidden items-center justify-center h-full text-gray-400 absolute inset-0">
                      <span>⚠️ Kon niet laden</span>
                    </div>
                    
                    {/* Zoom overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                      <ZoomIn 
                        size={32} 
                        className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  </div>
                  
                  {/* Delete button */}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePhoto(photo);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notities Sectie */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold" style={{color: '#1E3A8A'}}>
              📝 Notities & Metingen
            </h3>
            <Button onClick={handleSaveNotes} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Opslaan...
                </>
              ) : (
                <>
                  <Save className="mr-2" size={20} />
                  Opslaan
                </>
              )}
            </Button>
          </div>

          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={12}
            placeholder="Voer hier je notities in van het eerste bezoek:&#10;- Afmetingen&#10;- Materialen gewenst door klant&#10;- Bijzonderheden&#10;- Budget indicatie&#10;- Gewenste planning"
            className="w-full text-base"
          />
          
          <p className="text-xs mt-2" style={{color: '#94A3B8'}}>
            💡 Tip: Deze notities helpen bij het opstellen van de offerte en zijn intern zichtbaar
          </p>

          {/* NIEUWE SECTIE: Ruimte-gebaseerde Metingen */}
          <div className="mt-8 pt-8 border-t">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-bold" style={{color: '#1E3A8A'}}>
                  📐 Ruimte Metingen (Nieuw)
                </h4>
                <p className="text-sm" style={{color: '#64748B'}}>
                  Voer afmetingen in per oppervlak (vloer, muur, plafond) en selecteer het gewenste werk.
                </p>
              </div>
              {!showRoomForm && (
                <Button
                  onClick={() => setShowRoomForm(true)}
                  style={{backgroundColor: '#3B82F6'}}
                >
                  <Plus className="mr-2" size={20} />
                  Nieuwe Meting
                </Button>
              )}
            </div>

            {/* Room Measurement Form */}
            {showRoomForm && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200 mb-4">
                <h5 className="font-bold mb-4" style={{color: '#1E3A8A'}}>
                  {editingRoomId ? '✏️ Meting Bewerken' : '➕ Nieuwe Ruimte Meting'}
                </h5>
                
                {/* Row 1: Room name and Surface type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{color: '#1E3A8A'}}>
                      Ruimte / Omschrijving
                    </label>
                    <input
                      type="text"
                      value={newRoom.room_name}
                      onChange={(e) => setNewRoom({...newRoom, room_name: e.target.value})}
                      placeholder="Bijv: Keuken, Badkamer, Woonkamer..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{color: '#1E3A8A'}}>
                      Type Oppervlak
                    </label>
                    <select
                      value={newRoom.surface_type}
                      onChange={(e) => setNewRoom({...newRoom, surface_type: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="vloer">🟫 Vloer</option>
                      <option value="muur">🧱 Muur (alle wanden)</option>
                      <option value="plafond">⬜ Plafond</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Dimensions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{color: '#1E3A8A'}}>
                      Lengte (m)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newRoom.length}
                      onChange={(e) => setNewRoom({...newRoom, length: e.target.value})}
                      placeholder="5.00"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{color: '#1E3A8A'}}>
                      Breedte (m)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newRoom.width}
                      onChange={(e) => setNewRoom({...newRoom, width: e.target.value})}
                      placeholder="4.00"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  {newRoom.surface_type === 'muur' && (
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{color: '#1E3A8A'}}>
                        Hoogte (m)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={newRoom.height}
                        onChange={(e) => setNewRoom({...newRoom, height: e.target.value})}
                        placeholder="2.80"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  )}
                </div>

                {/* Calculated Area */}
                {(newRoom.length && newRoom.width) && (
                  <div className="bg-white p-3 rounded-lg border mb-4">
                    <span className="text-sm" style={{color: '#64748B'}}>Berekend oppervlak: </span>
                    <span className="font-bold text-lg" style={{color: '#1E3A8A'}}>
                      {calculateArea(newRoom).toFixed(2)} m²
                    </span>
                    {newRoom.surface_type === 'muur' && (
                      <span className="text-xs ml-2" style={{color: '#94A3B8'}}>
                        (omtrek × hoogte)
                      </span>
                    )}
                  </div>
                )}

                {/* Work Items Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{color: '#1E3A8A'}}>
                    Selecteer Werk (meerdere mogelijk)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Zoek werk (tegels, schilderwerk, stucwerk...)..."
                      value={roomWorkSearch}
                      onChange={(e) => {
                        setRoomWorkSearch(e.target.value);
                        setShowRoomWorkDropdown(true);
                      }}
                      onFocus={() => setShowRoomWorkDropdown(true)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    {showRoomWorkDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {workItems
                          .filter(w => 
                            !roomWorkSearch || 
                            w.title.toLowerCase().includes(roomWorkSearch.toLowerCase())
                          )
                          .slice(0, 20)
                          .map((item) => (
                            <div
                              key={item.id}
                              className="p-3 hover:bg-blue-50 cursor-pointer border-b"
                              onClick={() => addWorkItemToRoom(item)}
                            >
                              <div className="font-semibold" style={{color: '#1E293B'}}>{item.title}</div>
                              <div className="text-sm" style={{color: '#64748B'}}>
                                €{item.price.toFixed(2)}/{item.unit}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Work Items */}
                {newRoom.work_items.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2" style={{color: '#1E3A8A'}}>
                      Geselecteerde Werken ({newRoom.work_items.length})
                    </label>
                    <div className="space-y-2">
                      {newRoom.work_items.map((wi) => {
                        const area = calculateArea(newRoom);
                        const subtotal = area * wi.price;
                        return (
                          <div key={wi.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                            <div className="flex-1">
                              <div className="font-semibold" style={{color: '#1E293B'}}>{wi.title}</div>
                              <div className="text-sm" style={{color: '#64748B'}}>
                                {area.toFixed(2)} {wi.unit} × €{wi.price.toFixed(2)} = <strong>€{subtotal.toFixed(2)}</strong>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={wi.vat_rate}
                                onChange={(e) => {
                                  setNewRoom({
                                    ...newRoom,
                                    work_items: newRoom.work_items.map(w => 
                                      w.id === wi.id ? {...w, vat_rate: parseInt(e.target.value)} : w
                                    )
                                  });
                                }}
                                className="px-2 py-1 border rounded text-sm"
                              >
                                <option value="6">6%</option>
                                <option value="21">21%</option>
                              </select>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => removeWorkItemFromRoom(wi.id)}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Subtotal for this room */}
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <span className="text-sm" style={{color: '#166534'}}>Subtotaal deze meting: </span>
                      <span className="font-bold" style={{color: '#166534'}}>
                        €{calculateRoomTotal(newRoom).toFixed(2)}
                      </span>
                      <span className="text-xs ml-1" style={{color: '#64748B'}}>(excl BTW)</span>
                    </div>
                  </div>
                )}

                {/* Form Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleSaveRoomMeasurement}
                    disabled={!newRoom.room_name || !newRoom.length || !newRoom.width || newRoom.work_items.length === 0}
                    style={{backgroundColor: '#10B981'}}
                    className="flex-1"
                  >
                    <Check className="mr-2" size={18} />
                    {editingRoomId ? 'Opslaan' : 'Meting Toevoegen'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRoomForm(false);
                      setEditingRoomId(null);
                      setNewRoom({
                        room_name: '',
                        surface_type: 'vloer',
                        length: '',
                        width: '',
                        height: '',
                        work_items: []
                      });
                    }}
                  >
                    <X className="mr-2" size={18} />
                    Annuleren
                  </Button>
                </div>
              </div>
            )}

            {/* Room Measurements List */}
            {roomMeasurements.length > 0 && (
              <div className="space-y-3 mb-4">
                <h5 className="font-semibold text-sm" style={{color: '#1E3A8A'}}>
                  📋 Toegevoegde Ruimte Metingen ({roomMeasurements.length})
                </h5>
                {roomMeasurements.map((room) => (
                  <div key={room.id} className="p-4 bg-gray-50 rounded-xl border">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg" style={{color: '#1E293B'}}>{room.room_name}</span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {room.surface_type === 'vloer' ? '🟫 Vloer' : room.surface_type === 'muur' ? '🧱 Muur' : '⬜ Plafond'}
                          </span>
                        </div>
                        <div className="text-sm" style={{color: '#64748B'}}>
                          {room.length}m × {room.width}m {room.height ? `× ${room.height}m hoogte` : ''} = <strong>{room.area?.toFixed(2) || calculateArea(room).toFixed(2)} m²</strong>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEditRoom(room)}>
                          <Edit2 size={14} className="mr-1" /> Bewerk
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteRoom(room.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Work items for this room */}
                    <div className="space-y-1">
                      {room.work_items?.map((wi, idx) => {
                        const subtotal = (room.area || calculateArea(room)) * wi.price;
                        return (
                          <div key={idx} className="flex justify-between text-sm py-1 px-2 bg-white rounded">
                            <span>{wi.title}</span>
                            <span className="font-medium">€{subtotal.toFixed(2)} ({wi.vat_rate}% BTW)</span>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="mt-2 pt-2 border-t text-right">
                      <span className="font-bold" style={{color: '#166534'}}>
                        Subtotaal: €{(room.work_items?.reduce((sum, wi) => sum + ((room.area || calculateArea(room)) * wi.price), 0) || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Grand Total */}
                <div className="p-4 bg-green-100 rounded-xl border border-green-300">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg" style={{color: '#166534'}}>💰 Totaal Alle Metingen:</span>
                    <span className="font-bold text-2xl" style={{color: '#166534'}}>
                      €{roomMeasurements.reduce((total, room) => {
                        return total + (room.work_items?.reduce((sum, wi) => sum + ((room.area || calculateArea(room)) * wi.price), 0) || 0);
                      }, 0).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{color: '#166534'}}>(excl BTW)</p>
                </div>

                {/* Generate Quote Button */}
                <Button
                  onClick={handleGenerateQuoteFromRooms}
                  disabled={generatingQuote}
                  className="w-full"
                  style={{backgroundColor: '#10B981', fontSize: '1.1rem', padding: '1.5rem'}}
                >
                  {generatingQuote ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={24} />
                      Offerte Genereren...
                    </>
                  ) : (
                    <>
                      📋 Genereer Offerte uit Ruimte Metingen
                    </>
                  )}
                </Button>
              </div>
            )}

            {roomMeasurements.length === 0 && !showRoomForm && (
              <div className="text-center py-8 border-2 border-dashed rounded-xl" style={{borderColor: '#E5E7EB'}}>
                <span className="text-4xl mb-2 block">📐</span>
                <p style={{color: '#64748B'}}>Nog geen ruimte metingen. Klik op "Nieuwe Meting" om te beginnen.</p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="my-8 border-t-2 border-dashed" style={{borderColor: '#CBD5E1'}}></div>
          
          {/* BESTAANDE SECTIE: Metingen & Werk Items (Handmatig) */}
          <div className="mt-8">
            <h4 className="text-lg font-bold mb-4" style={{color: '#1E3A8A'}}>
              📏 Handmatige Metingen (Speciale Gevallen)
            </h4>
            <p className="text-sm mb-4" style={{color: '#64748B'}}>
              Voor speciale situaties: selecteer werk items uit de prijslijst en voer hoeveelheden handmatig in.
            </p>

            {/* Voeg Werk Item Toe */}
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Werk Item Selectie */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2" style={{color: '#1E3A8A'}}>
                    Selecteer Werk
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Zoek werk (stucwerk, schilderwerk...)..."
                      value={selectedWorkItem ? selectedWorkItem.title : workItemSearch}
                      onChange={(e) => {
                        setWorkItemSearch(e.target.value);
                        setSelectedWorkItem(null);
                        setShowWorkItemDropdown(true);
                      }}
                      onFocus={() => setShowWorkItemDropdown(true)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    {showWorkItemDropdown && !selectedWorkItem && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredWorkItems.length > 0 ? (
                          filteredWorkItems.map((item) => (
                            <div
                              key={item.id}
                              className="p-3 hover:bg-blue-50 cursor-pointer border-b"
                              onClick={() => {
                                setSelectedWorkItem(item);
                                setWorkItemSearch('');
                                setShowWorkItemDropdown(false);
                              }}
                            >
                              <div className="font-semibold" style={{color: '#1E293B'}}>{item.title}</div>
                              <div className="text-sm" style={{color: '#64748B'}}>
                                Eenheid: {item.unit} • €{item.price.toFixed(2)}/{item.unit}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center" style={{color: '#94A3B8'}}>
                            Geen werk items gevonden
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Hoeveelheid */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: '#1E3A8A'}}>
                    Hoeveelheid {selectedWorkItem && `(${selectedWorkItem.unit})`}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="15"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {/* BTW Tarief */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: '#1E3A8A'}}>
                    BTW Tarief
                  </label>
                  <select
                    value={vatRate}
                    onChange={(e) => setVatRate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="6">6% (renovatie)</option>
                    <option value="21">21% (standaard)</option>
                  </select>
                </div>

                {/* Toevoegen Knop */}
                <div className="md:col-span-2 flex items-end">
                  <Button
                    onClick={handleAddMeasurement}
                    disabled={!selectedWorkItem || !quantity}
                    className="w-full"
                    style={{backgroundColor: '#3B82F6'}}
                  >
                    ➕ Voeg Toe
                  </Button>
                </div>
              </div>

              {selectedWorkItem && quantity && (
                <div className="mt-3 p-2 bg-white rounded text-sm">
                  <strong>Preview:</strong> {selectedWorkItem.title} - {quantity} {selectedWorkItem.unit} × €{selectedWorkItem.price.toFixed(2)} = <strong>€{(parseFloat(quantity) * selectedWorkItem.price).toFixed(2)}</strong> (excl BTW)
                </div>
              )}
            </div>

            {/* Metingen Lijst */}
            {measurements.length > 0 ? (
              <div className="space-y-2 mb-4">
                <h5 className="font-semibold text-sm" style={{color: '#1E3A8A'}}>
                  Toegevoegde Metingen ({measurements.length})
                </h5>
                {measurements.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div className="flex-1">
                      <div className="font-semibold" style={{color: '#1E293B'}}>{m.title}</div>
                      <div className="text-sm" style={{color: '#64748B'}}>
                        {m.quantity} {m.unit} × €{m.price.toFixed(2)} = €{(m.quantity * m.price).toFixed(2)} (excl BTW, {m.vat_rate}% BTW)
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteMeasurement(m.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}

                {/* Totaal */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-sm font-medium" style={{color: '#166534'}}>
                    💰 Totaal (excl BTW): €{measurements.reduce((sum, m) => sum + (m.quantity * m.price), 0).toFixed(2)}
                  </div>
                </div>

                {/* Genereer Offerte Knop */}
                <Button
                  onClick={handleGenerateQuote}
                  disabled={generatingQuote}
                  className="w-full mt-4"
                  style={{backgroundColor: '#10B981', fontSize: '1.1rem', padding: '1.5rem'}}
                >
                  {generatingQuote ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={24} />
                      Offerte Genereren...
                    </>
                  ) : (
                    <>
                      📋 Genereer Offerte uit Metingen
                    </>
                  )}
                </Button>
                <p className="text-xs text-center mt-2" style={{color: '#64748B'}}>
                  💡 De offerte wordt automatisch aangemaakt met deze werk items. Daarna kunt u materialen toevoegen.
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                📏 Nog geen metingen toegevoegd. Voeg werk items toe om een offerte te genereren.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
