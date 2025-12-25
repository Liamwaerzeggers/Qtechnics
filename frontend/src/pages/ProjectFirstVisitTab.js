import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { Camera, Upload, Trash2, Save, Loader2, X, Download, ZoomIn } from 'lucide-react';
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
  console.log('Image URL constructed:', fullUrl, 'from path:', photoPath);
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

  // Update state when project prop changes
  useEffect(() => {
    setNotes(project.first_visit_notes || '');
    setPhotos(project.first_visit_photos || []);
    console.log('Project photos updated:', project.first_visit_photos);

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

  // Update measurements when project changes
  useEffect(() => {

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
    setMeasurements(project.measurements || []);
  }, [project.measurements]);
  }, [project.first_visit_notes, project.first_visit_photos]);

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
              {/* Debug: Show the URLs being used */}
              <div className="col-span-full text-xs text-gray-500 mb-2">
                Debug URLs: {photos.map(p => getFullImageUrl(p)).join(', ')}
              </div>
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
                        console.error('Image load error for URL:', getFullImageUrl(photo));
                        e.target.onerror = null; // Prevent infinite loop
                        e.target.style.display = 'none';
                        e.target.nextSibling && (e.target.nextSibling.style.display = 'flex');
                      }}
                      onLoad={() => console.log('Image loaded successfully:', getFullImageUrl(photo))}
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
        </CardContent>
      </Card>
    </div>
  );
}
