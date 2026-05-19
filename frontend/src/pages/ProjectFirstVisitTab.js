import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { Camera, Upload, Trash2, Save, Loader2, X, Download, ZoomIn, Plus, Edit2, Check, FileImage, Sparkles, FileText, Folder, FolderOpen, ChevronDown, ChevronRight, Eye, Calculator, Home, Ruler } from 'lucide-react';
import { Input } from '../components/ui/input';
import ProjectRoomCalcCard from '../components/ProjectRoomCalcCard';
import { toast } from 'sonner';

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Room options for organizing photos
const ROOM_OPTIONS = [
  'Badkamer', 'Keuken', 'Woonkamer', 'Slaapkamer', 'Toilet', 
  'Gang', 'Garage', 'Tuin', 'Zolder', 'Kelder', 'Algemeen'
];

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
  
  // Sync photos state when project changes
  useEffect(() => {
    // Debug: log what photos are in the project
    console.log('=== ProjectFirstVisitTab Debug ===');
    console.log('Project ID:', project?.id);
    console.log('first_visit_photos type:', typeof project?.first_visit_photos);
    console.log('first_visit_photos value:', JSON.stringify(project?.first_visit_photos));
    console.log('first_visit_photos length:', project?.first_visit_photos?.length || 0);
    console.log('=================================');
    
    setPhotos(project.first_visit_photos || []);
  }, [project, project.first_visit_photos]);
  
  // Photo room folder state
  const [expandedRooms, setExpandedRooms] = useState({ 'Algemeen': true });
  const [selectedRoom, setSelectedRoom] = useState('Algemeen');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const fileInputRef = useRef(null);

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
  
  // Room types for dropdown
  const ROOM_TYPES = [
    { value: 'living', label: 'Woonkamer' }, { value: 'bedroom', label: 'Slaapkamer' },
    { value: 'bathroom', label: 'Badkamer' }, { value: 'kitchen', label: 'Keuken' },
    { value: 'hallway', label: 'Gang' }, { value: 'other', label: 'Overig' }
  ];

  // NEW: Room-based calculator system (replacing old measurement sections)
  const [projectRooms, setProjectRooms] = useState(project.rooms || []);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [addRoomData, setAddRoomData] = useState({ name: '', room_type: 'other', length: '', width: '', height: '' });
  const [addingRoom, setAddingRoom] = useState(false);
  const [uploadingPlan, setUploadingPlan] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [savingSuggestions, setSavingSuggestions] = useState(false);
  const [projectCalc, setProjectCalc] = useState(null);
  const [calculationLoading, setCalculationLoading] = useState(false);
  const [generatingQuoteFromCalc, setGeneratingQuoteFromCalc] = useState(false);

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
        const response = await axios.get(`${API}/work-items?limit=1000`, { headers: getAuthHeaders() });
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

  // Sync rooms and calculation when project changes
  useEffect(() => {
    setProjectRooms(project.rooms || []);
    setNotes(project.first_visit_notes || '');
    setPhotos(project.first_visit_photos || []);
    setMeasurements(project.measurements || []);
    
    // Load calculation if exists
    if (project.renovation_calculation_id) {
      loadCalculation();
    }
  }, [project]);

  const loadCalculation = async () => {
    try {
      const res = await axios.get(`${API}/projects/${project.id}/renovation-calculation`, { headers: getAuthHeaders() });
      setProjectCalc(res.data);
    } catch { setProjectCalc(null); }
  };

  // Room Management
  const handleAddRoomToProject = async () => {
    if (!addRoomData.name || !addRoomData.length || !addRoomData.width) {
      toast.error('Vul naam, lengte en breedte in');
      return;
    }
    setAddingRoom(true);
    try {
      await axios.post(
        `${API}/projects/${project.id}/project-rooms`,
        { name: addRoomData.name, room_type: addRoomData.room_type, length: parseFloat(addRoomData.length), width: parseFloat(addRoomData.width), height: addRoomData.height ? parseFloat(addRoomData.height) : 2.7 },
        { headers: getAuthHeaders() }
      );
      toast.success('Kamer toegevoegd');
      setAddRoomData({ name: '', room_type: 'other', length: '', width: '', height: '' });
      onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kon kamer niet toevoegen');
    } finally { setAddingRoom(false); }
  };

  const handleDeleteProjectRoom = async (roomId) => {
    try {
      await axios.delete(`${API}/projects/${project.id}/project-rooms/${roomId}`, { headers: getAuthHeaders() });
      toast.success('Kamer verwijderd');
      onUpdate();
    } catch { toast.error('Kon kamer niet verwijderen'); }
  };

  // Floor plan upload with AI
  const handleFloorPlanUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPlan(true);
    setAiSuggestions(null);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      const response = await axios.post(
        `${API}/projects/${project.id}/analyze-floor-plan`,
        formDataUpload,
        { headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' } }
      );
      if (response.data.rooms && response.data.rooms.length > 0) {
        setAiSuggestions({
          rooms: response.data.rooms.map((r, i) => ({ ...r, id: `ai-${i}`, selected: true })),
          notes: response.data.analysis_notes,
          floor_plan_url: response.data.floor_plan_url
        });
        toast.success(response.data.message);
      } else {
        toast.warning(response.data.message || 'Kon geen kamers detecteren');
        onUpdate();
      }
    } catch (error) {
      toast.error('Upload mislukt: ' + (error.response?.data?.detail || error.message));
    } finally { setUploadingPlan(false); e.target.value = ''; }
  };

  const handleSaveAiRooms = async () => {
    const selectedRooms = aiSuggestions.rooms.filter(r => r.selected);
    if (selectedRooms.length === 0) { toast.error('Selecteer minstens 1 kamer'); return; }
    setSavingSuggestions(true);
    try {
      await axios.post(
        `${API}/projects/${project.id}/project-rooms/bulk`,
        selectedRooms.map(r => ({ name: r.name, room_type: r.room_type || 'other', length: parseFloat(r.length) || 0, width: parseFloat(r.width) || 0, height: parseFloat(r.height) || 2.7 })),
        { headers: getAuthHeaders() }
      );
      toast.success(`${selectedRooms.length} kamers toegevoegd`);
      setAiSuggestions(null);
      onUpdate();
    } catch { toast.error('Kon kamers niet opslaan'); }
    finally { setSavingSuggestions(false); }
  };

  // Calculate renovation
  const handleCalculateRenovation = async () => {
    setCalculationLoading(true);
    try {
      const res = await axios.post(`${API}/projects/${project.id}/calculate-renovation`, {}, { headers: getAuthHeaders() });
      toast.success(`Berekening klaar! ${res.data.rooms_calculated} kamers, totaal €${res.data.total_min?.toLocaleString('nl-BE')}`);
      onUpdate();
      loadCalculation();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Berekening mislukt');
    } finally { setCalculationLoading(false); }
  };

  // Toggle calc item
  const handleToggleCalcItem = async (itemId, currentIncluded) => {
    try {
      await axios.put(`${API}/projects/${project.id}/renovation-calculation/items/${itemId}?included=${!currentIncluded}`, {}, { headers: getAuthHeaders() });
      loadCalculation();
    } catch { toast.error('Kon item niet bijwerken'); }
  };

  // Switch floor option
  const handleSwitchFloorOption = async (roomId, itemId) => {
    try {
      await axios.put(`${API}/projects/${project.id}/renovation-calculation/switch-option?room_id=${roomId}&option_group=vloer_afwerking_keuze&selected_item_id=${itemId}`, {}, { headers: getAuthHeaders() });
      loadCalculation();
    } catch { toast.error('Kon vloeroptie niet wisselen'); }
  };

  // Switch wall scenario
  const handleSwitchWallScenario = async (roomId, scenario) => {
    try {
      await axios.put(`${API}/projects/${project.id}/renovation-calculation/switch-scenario?room_id=${roomId}&scenario=${scenario}`, {}, { headers: getAuthHeaders() });
      loadCalculation();
    } catch { toast.error('Kon muur scenario niet wisselen'); }
  };

  // Generate quote from calculation
  const handleGenerateQuoteFromCalc = async () => {
    setGeneratingQuoteFromCalc(true);
    try {
      const res = await axios.post(`${API}/projects/${project.id}/generate-quote-from-calculation`, {}, { headers: getAuthHeaders() });
      toast.success(res.data.message);
      onUpdate();
      setTimeout(() => { window.location.href = `/quotes/${res.data.quote_id}`; }, 1500);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kon offerte niet genereren');
    } finally { setGeneratingQuoteFromCalc(false); }
  };

  // Helper functions for photo handling
  const getPhotoUrl = (photo) => {
    if (!photo) return null;
    const baseUrl = process.env.REACT_APP_BACKEND_URL || '';
    // Handle both old format (string URL) and new format (object with url)
    const photoPath = typeof photo === 'string' ? photo : photo.url;
    if (!photoPath) return null;
    if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
      return photoPath;
    }
    return `${baseUrl}${photoPath}`;
  };

  const getPhotoRoom = (photo) => {
    // Handle both old format (string URL) and new format (object with room)
    if (typeof photo === 'string') return 'Algemeen';
    return photo.room || 'Algemeen';
  };

  const getPhotoFilename = (photo) => {
    if (typeof photo === 'string') {
      return photo.split('/').pop();
    }
    return photo.filename || photo.url?.split('/').pop();
  };

  const getPhotoOriginalFilename = (photo) => {
    if (typeof photo === 'string') {
      return photo.split('/').pop();
    }
    return photo.original_filename || photo.filename || 'Foto';
  };

  const getPhotoUploadDate = (photo) => {
    if (typeof photo === 'string') return null;
    return photo.uploaded_at;
  };

  // Group photos by room
  const getPhotosByRoom = () => {
    const grouped = {};
    
    // Initialize all rooms
    ROOM_OPTIONS.forEach(room => {
      grouped[room] = [];
    });
    
    // Group photos
    photos.forEach(photo => {
      const room = getPhotoRoom(photo);
      if (!grouped[room]) grouped[room] = [];
      grouped[room].push(photo);
    });
    
    // Return only rooms with photos, plus always show Algemeen
    return Object.entries(grouped).filter(([room, items]) => 
      items.length > 0 || room === 'Algemeen'
    );
  };

  const toggleRoom = (room) => {
    setExpandedRooms(prev => ({ ...prev, [room]: !prev[room] }));
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setShowUploadModal(false);

    // Helper: upload één bestand (met retry voor mobiele netwerken)
    const uploadOne = async (file, attempt = 1) => {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const response = await axios.post(
          `${API}/projects/${project.id}/first-visit/photos?room=${encodeURIComponent(selectedRoom)}`,
          formData,
          {
            // BELANGRIJK: GEEN handmatige Content-Type — axios voegt de juiste boundary toe voor FormData.
            headers: { ...getAuthHeaders() },
            timeout: 120000  // 2 minuten — mobiele uploads kunnen traag zijn
          }
        );
        return { ok: true, file, data: response.data };
      } catch (error) {
        // Eén retry bij netwerkfout (typisch op gsm 4G/wifi-wisseling)
        const isNetworkError = !error.response;
        if (isNetworkError && attempt < 2) {
          await new Promise(r => setTimeout(r, 1500));
          return uploadOne(file, attempt + 1);
        }
        return { ok: false, file, error: error.response?.data?.detail || error.message };
      }
    };

    try {
      // Parallel uploaden — één faler blokkeert de rest niet
      const results = await Promise.all(files.map(f => uploadOne(f)));
      const succeeded = results.filter(r => r.ok);
      const failed = results.filter(r => !r.ok);

      if (succeeded.length > 0) {
        setPhotos(prev => [...prev, ...succeeded.map(r => r.data)]);
        setExpandedRooms(prev => ({ ...prev, [selectedRoom]: true }));
        toast.success(`${succeeded.length} foto('s) geüpload naar ${selectedRoom} 📸`);
      }
      if (failed.length > 0) {
        const names = failed.map(r => r.file.name).join(', ');
        toast.error(`${failed.length} foto('s) niet geüpload: ${names}. Probeer opnieuw.`);
        console.error('Upload failures:', failed);
      }
      onUpdate();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = async (photo) => {
    const photoFilename = getPhotoFilename(photo);
    const displayName = getPhotoOriginalFilename(photo);
    
    if (!window.confirm(`Weet je zeker dat je "${displayName}" wilt verwijderen?`)) {
      return;
    }
    
    try {
      await axios.delete(
        `${API}/projects/${project.id}/first-visit/photos/${photoFilename}`,
        { headers: getAuthHeaders() }
      );
      
      // Filter out the deleted photo (works for both formats)
      setPhotos(prev => prev.filter(p => {
        const filename = getPhotoFilename(p);
        return filename !== photoFilename;
      }));
      toast.success('Foto verwijderd');
      onUpdate();
    } catch (error) {
      console.error('Delete photo error:', error);
      toast.error('Kon foto niet verwijderen');
    }
  };

  const handleDownloadPhoto = (photo) => {
    const url = getPhotoUrl(photo);
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    
    try {
      await axios.put(
        `${API}/projects/${project.id}/first-visit/notes?notes=${encodeURIComponent(notes)}`,
        {},
        { headers: getAuthHeaders() }
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

  return (
    <div className="space-y-6">
      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={() => setPreviewPhoto(null)}
        >
          <button
            onClick={() => setPreviewPhoto(null)}
            className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
          >
            <X size={24} />
          </button>
          <img
            src={getPhotoUrl(previewPhoto)}
            alt={getPhotoOriginalFilename(previewPhoto)}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg">
            <p className="font-medium" style={{color: '#1E293B'}}>
              {getPhotoOriginalFilename(previewPhoto)}
            </p>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{color: '#3a190b'}}>
                📸 Foto&apos;s Uploaden
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{color: '#374151'}}>
                  Kamer / Map
                </label>
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  style={{borderColor: '#E5E7EB'}}
                >
                  {ROOM_OPTIONS.map(room => (
                    <option key={room} value={room}>{room}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{color: '#374151'}}>
                  Bestanden
                </label>
                <div 
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{borderColor: '#500000'}}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.backgroundColor = '#f5e6e6'; }}
                  onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.backgroundColor = ''; }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.backgroundColor = '';
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                      const event = { target: { files } };
                      handlePhotoUpload(event);
                    }
                  }}
                >
                  <Upload size={48} className="mx-auto mb-3" style={{color: '#500000'}} />
                  <p className="font-semibold" style={{color: '#500000'}}>
                    Sleep foto's hierheen
                  </p>
                  <p className="text-sm mt-1" style={{color: '#64748B'}}>
                    of klik om bestanden te selecteren
                  </p>
                  <p className="text-xs mt-2" style={{color: '#94A3B8'}}>
                    Meerdere foto's tegelijk mogelijk
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowUploadModal(false)}
                className="flex-1"
              >
                Annuleren
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Foto's Sectie met Room Folders */}
      <Card>
        <CardContent className="p-6">
          {/* Warning banner for photos that need re-uploading */}
          {photos.some(p => typeof p === 'object' && !p.base64_data && p.url && !p.url.includes('/api/photos/')) && (
            <div className="mb-4 p-4 rounded-lg border-2" style={{backgroundColor: '#FEF3C7', borderColor: '#F59E0B'}}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-semibold" style={{color: '#92400E'}}>
                    Sommige foto's moeten opnieuw worden geüpload
                  </p>
                  <p className="text-sm mt-1" style={{color: '#A16207'}}>
                    Door een systeemupdate zijn oude foto's niet meer zichtbaar. 
                    Upload de foto's opnieuw om ze permanent op te slaan.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold" style={{color: '#3a190b'}}>
                📸 Foto&apos;s Eerste Bezoek
              </h3>
              <p className="text-sm" style={{color: '#64748B'}}>
                {photos.length} foto{photos.length !== 1 ? "'s" : ''} in {getPhotosByRoom().filter(([,items]) => items.length > 0).length} map{getPhotosByRoom().filter(([,items]) => items.length > 0).length !== 1 ? 'pen' : ''}
              </p>
            </div>
            <Button 
              onClick={() => setShowUploadModal(true)} 
              disabled={uploading}
              style={{backgroundColor: '#500000', color: 'white'}}
            >
              {uploading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Uploaden...
                </>
              ) : (
                <>
                  <Upload className="mr-2" size={20} />
                  Uploaden
                </>
              )}
            </Button>
          </div>

          {/* Room folders */}
          <div className="space-y-3">
            {getPhotosByRoom().map(([room, roomPhotos]) => (
              <div key={room} className="border rounded-lg overflow-hidden" style={{borderColor: '#E5E7EB'}}>
                {/* Room header */}
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleRoom(room)}
                  style={{backgroundColor: roomPhotos.length > 0 ? '#F8FAFC' : 'white'}}
                >
                  <div className="flex items-center gap-3">
                    {expandedRooms[room] ? (
                      <FolderOpen size={20} style={{color: '#500000'}} />
                    ) : (
                      <Folder size={20} style={{color: '#500000'}} />
                    )}
                    <span className="font-medium" style={{color: '#1E293B'}}>
                      {room}
                    </span>
                    <span className="text-sm px-2 py-0.5 rounded-full" style={{
                      backgroundColor: roomPhotos.length > 0 ? '#f5e6e6' : '#F3F4F6',
                      color: roomPhotos.length > 0 ? '#500000' : '#6B7280'
                    }}>
                      {roomPhotos.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRoom(room);
                        setShowUploadModal(true);
                      }}
                    >
                      <Plus size={16} />
                    </Button>
                    {expandedRooms[room] ? (
                      <ChevronDown size={20} style={{color: '#64748B'}} />
                    ) : (
                      <ChevronRight size={20} style={{color: '#64748B'}} />
                    )}
                  </div>
                </div>

                {/* Room content */}
                {expandedRooms[room] && (
                  <div className="p-3 bg-white">
                    {roomPhotos.length === 0 ? (
                      <div className="text-center py-6 border-2 border-dashed rounded-lg" style={{borderColor: '#E5E7EB'}}>
                        <Camera size={32} className="mx-auto mb-2" style={{color: '#94A3B8'}} />
                        <p className="text-sm" style={{color: '#64748B'}}>
                          Geen foto&apos;s in deze map
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            setSelectedRoom(room);
                            setShowUploadModal(true);
                          }}
                        >
                          <Upload size={14} className="mr-1" />
                          Uploaden naar {room}
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {roomPhotos.map((photo, idx) => (
                          <div
                            key={idx}
                            className="group relative border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                            style={{borderColor: '#E5E7EB'}}
                          >
                            {/* Thumbnail */}
                            <div 
                              className="aspect-square bg-gray-100 flex items-center justify-center cursor-pointer"
                              onClick={() => setPreviewPhoto(photo)}
                            >
                              <img
                                src={getPhotoUrl(photo)}
                                alt={getPhotoOriginalFilename(photo)}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="hidden flex-col items-center justify-center p-2 text-center" style={{backgroundColor: '#FEF2F2'}}>
                                <span className="text-3xl mb-1">⚠️</span>
                                <span className="text-xs font-medium" style={{color: '#991B1B'}}>
                                  Foto niet gevonden
                                </span>
                                <span className="text-xs mt-1" style={{color: '#B91C1C'}}>
                                  Upload opnieuw
                                </span>
                              </div>
                              
                              {/* Hover overlay */}
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all">
                                <Eye size={24} className="text-white opacity-0 group-hover:opacity-100" />
                              </div>
                            </div>
                            
                            {/* File info */}
                            <div className="p-2">
                              <p className="text-xs font-medium truncate" style={{color: '#1E293B'}} title={getPhotoOriginalFilename(photo)}>
                                {getPhotoOriginalFilename(photo)}
                              </p>
                              {getPhotoUploadDate(photo) && (
                                <p className="text-xs" style={{color: '#94A3B8'}}>
                                  {new Date(getPhotoUploadDate(photo)).toLocaleDateString('nl-NL')}
                                </p>
                              )}
                            </div>
                            
                            {/* Action buttons */}
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleDownloadPhoto(photo)}
                                className="p-1.5 bg-white rounded-full shadow hover:bg-gray-100"
                                title="Download"
                              >
                                <Download size={14} style={{color: '#500000'}} />
                              </button>
                              <button
                                onClick={() => handleDeletePhoto(photo)}
                                className="p-1.5 bg-white rounded-full shadow hover:bg-red-50"
                                title="Verwijderen"
                              >
                                <Trash2 size={14} style={{color: '#EF4444'}} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notities Sectie */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold" style={{color: '#3a190b'}}>
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

          {/* ============ KAMERS & RENOVATIECALCULATOR ============ */}
          <div className="mt-8 pt-8 border-t">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold" style={{color: '#1e293b'}}>Kamers & Renovatieberekening</h3>
                <p className="text-sm text-gray-500">Upload een grondplan of voeg kamers handmatig toe. Bereken dan de renovatiekosten.</p>
              </div>
              <div className="flex gap-2">
                <label className="cursor-pointer" data-testid="project-upload-floor-plan-btn">
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFloorPlanUpload} disabled={uploadingPlan} />
                  <span className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border transition-colors ${uploadingPlan ? 'opacity-50' : 'hover:bg-blue-50 border-blue-300 text-blue-700'}`}>
                    {uploadingPlan ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={14} />}
                    {uploadingPlan ? 'Analyseren...' : 'Grondplan uploaden'}
                  </span>
                </label>
                <Button variant="outline" size="sm" onClick={() => setShowAddRoom(!showAddRoom)} data-testid="project-add-room-btn">
                  <Plus size={14} className="mr-1" /> Kamer
                </Button>
              </div>
            </div>

            {/* Floor plan image */}
            {project.floor_plan_url && (
              <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-xs text-blue-600 mb-1"><FileImage size={12} /> Grondplan opgeslagen</div>
                <img src={`${API.replace('/api', '')}${project.floor_plan_url}`} alt="Grondplan" className="max-h-40 rounded object-contain" data-testid="project-floor-plan-image" />
              </div>
            )}

            {/* AI Suggestions */}
            {aiSuggestions && (
              <div className="mb-4 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border-2 border-indigo-200" data-testid="project-ai-suggestions">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1 bg-indigo-100 rounded"><FileImage size={16} className="text-indigo-600" /></div>
                  <div>
                    <h5 className="font-semibold text-indigo-800 text-sm">AI Kamer Detectie</h5>
                    <p className="text-xs text-indigo-600">{aiSuggestions.rooms.length} kamers gedetecteerd</p>
                  </div>
                </div>
                {aiSuggestions.notes && <p className="text-xs text-indigo-600 mb-3 bg-indigo-100 p-2 rounded">{aiSuggestions.notes}</p>}
                <div className="space-y-2 mb-3">
                  {aiSuggestions.rooms.map((room, idx) => (
                    <div key={room.id} className={`flex items-center gap-2 p-2 rounded border ${room.selected ? 'bg-white border-indigo-300' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                      <input type="checkbox" checked={room.selected} onChange={(e) => {
                        const updated = [...aiSuggestions.rooms]; updated[idx] = { ...updated[idx], selected: e.target.checked };
                        setAiSuggestions({ ...aiSuggestions, rooms: updated });
                      }} className="w-4 h-4 accent-indigo-500" />
                      <input className="text-sm font-medium bg-transparent border-b border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:outline-none w-28 px-1" value={room.name}
                        onChange={(e) => { const updated = [...aiSuggestions.rooms]; updated[idx] = { ...updated[idx], name: e.target.value }; setAiSuggestions({ ...aiSuggestions, rooms: updated }); }}
                      />
                      <select className="text-xs border rounded px-1 py-0.5 bg-white" value={room.room_type}
                        onChange={(e) => { const updated = [...aiSuggestions.rooms]; updated[idx] = { ...updated[idx], room_type: e.target.value }; setAiSuggestions({ ...aiSuggestions, rooms: updated }); }}>
                        {ROOM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <input type="number" className="w-14 border rounded px-1 py-0.5 text-center" value={room.length} step="0.1"
                          onChange={(e) => { const updated = [...aiSuggestions.rooms]; updated[idx] = { ...updated[idx], length: e.target.value }; setAiSuggestions({ ...aiSuggestions, rooms: updated }); }} />
                        <span>x</span>
                        <input type="number" className="w-14 border rounded px-1 py-0.5 text-center" value={room.width} step="0.1"
                          onChange={(e) => { const updated = [...aiSuggestions.rooms]; updated[idx] = { ...updated[idx], width: e.target.value }; setAiSuggestions({ ...aiSuggestions, rooms: updated }); }} />
                        <span>m</span>
                      </div>
                      <span className="text-xs text-gray-400 ml-auto">{(parseFloat(room.length || 0) * parseFloat(room.width || 0)).toFixed(1)}m²</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveAiRooms} disabled={savingSuggestions} className="bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="project-save-ai-rooms-btn">
                    {savingSuggestions ? <Loader2 size={14} className="animate-spin mr-1" /> : <Check size={14} className="mr-1" />}
                    {aiSuggestions.rooms.filter(r => r.selected).length} kamers toevoegen
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setAiSuggestions(null)}>Annuleren</Button>
                </div>
              </div>
            )}

            {/* Rooms list */}
            {projectRooms.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {projectRooms.map((room, idx) => (
                  <div key={room.id || idx} className="p-2 border rounded text-sm flex items-center justify-between group" data-testid={`project-room-${room.id || idx}`}>
                    <div>
                      <span className="font-medium">{room.name}</span>
                      <span className="text-gray-500 ml-2">({room.floor_area?.toFixed(1) || (room.length * room.width).toFixed(1)} m²)</span>
                    </div>
                    <button onClick={() => handleDeleteProjectRoom(room.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-1">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Room Form */}
            {showAddRoom && (
              <div className="p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300 mb-3" data-testid="project-add-room-form">
                <div className="grid grid-cols-6 gap-2 items-end">
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500">Naam</label>
                    <Input value={addRoomData.name} onChange={(e) => setAddRoomData({...addRoomData, name: e.target.value})} placeholder="Woonkamer" className="h-8 text-sm" data-testid="project-room-name" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Type</label>
                    <select className="w-full h-8 text-sm border rounded px-2" value={addRoomData.room_type} onChange={(e) => setAddRoomData({...addRoomData, room_type: e.target.value})}>
                      {ROOM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">L (m)</label>
                    <Input type="number" step="0.1" value={addRoomData.length} onChange={(e) => setAddRoomData({...addRoomData, length: e.target.value})} placeholder="5.0" className="h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">B (m)</label>
                    <Input type="number" step="0.1" value={addRoomData.width} onChange={(e) => setAddRoomData({...addRoomData, width: e.target.value})} placeholder="4.0" className="h-8 text-sm" />
                  </div>
                  <div className="flex gap-1">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">H (m)</label>
                      <Input type="number" step="0.1" value={addRoomData.height} onChange={(e) => setAddRoomData({...addRoomData, height: e.target.value})} placeholder="2.7" className="h-8 text-sm" />
                    </div>
                    <Button size="sm" className="h-8 mt-auto" onClick={handleAddRoomToProject} disabled={addingRoom} style={{backgroundColor: '#500000'}} data-testid="project-submit-room-btn">
                      {addingRoom ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state */}
            {projectRooms.length === 0 && !showAddRoom && !aiSuggestions && (
              <div className="text-center py-8 border rounded-lg bg-yellow-50">
                <Home size={36} className="mx-auto mb-3 text-yellow-500" />
                <p className="text-yellow-700 mb-1 text-sm">Geen kamers toegevoegd</p>
                <p className="text-xs text-yellow-600 mb-3">Upload een grondplan of voeg kamers handmatig toe</p>
                <div className="flex gap-2 justify-center">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFloorPlanUpload} />
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                      <FileImage size={14} /> Upload grondplan
                    </span>
                  </label>
                  <Button variant="outline" size="sm" onClick={() => setShowAddRoom(true)}><Plus size={14} className="mr-1" /> Handmatig</Button>
                </div>
              </div>
            )}

            {/* Calculate button */}
            {projectRooms.length > 0 && (
              <div className="mt-4">
                <Button onClick={handleCalculateRenovation} disabled={calculationLoading} style={{backgroundColor: '#500000'}} className="text-white w-full" data-testid="project-calculate-btn">
                  {calculationLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Calculator size={16} className="mr-2" />}
                  {calculationLoading ? 'Berekenen...' : projectCalc ? 'Herbereken Renovatie' : 'Bereken Renovatie'}
                </Button>
              </div>
            )}

            {/* Calculation Results - Inline RoomCalculationCards */}
            {projectCalc && projectCalc.room_calculations && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-lg" style={{color: '#1e293b'}}>Renovatieberekening</h4>
                  <span className="text-xl font-bold" style={{color: '#500000'}}>
                    Totaal: €{projectCalc.total_min?.toLocaleString('nl-BE', {minimumFractionDigits: 2})}
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  {projectCalc.room_calculations.map((rc) => (
                    <ProjectRoomCalcCard
                      key={rc.room_id}
                      roomCalc={rc}
                      projectId={project.id}
                      onToggle={handleToggleCalcItem}
                      onSwitchFloor={handleSwitchFloorOption}
                      onSwitchWall={handleSwitchWallScenario}
                    />
                  ))}
                </div>

                {/* Generate Quote Button */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                  <Button onClick={handleGenerateQuoteFromCalc} disabled={generatingQuoteFromCalc} className="bg-green-600 hover:bg-green-700 text-white w-full" data-testid="generate-quote-btn">
                    {generatingQuoteFromCalc ? <Loader2 size={16} className="animate-spin mr-2" /> : <FileText size={16} className="mr-2" />}
                    {generatingQuoteFromCalc ? 'Offerte wordt aangemaakt...' : 'Genereer Offerte uit Berekening'}
                  </Button>
                  <p className="text-xs text-green-600 text-center mt-2">
                    De offerte wordt aangemaakt met alle geselecteerde items. Daarna kunt u handmatig posten toevoegen en materialen koppelen.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
