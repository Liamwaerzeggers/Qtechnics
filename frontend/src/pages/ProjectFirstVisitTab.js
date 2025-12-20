import React, { useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { Camera, Upload, Trash2, Save, Loader2, X, Download, ZoomIn } from 'lucide-react';
import { toast } from 'sonner';

export default function ProjectFirstVisitTab({ project, onUpdate }) {
  const [notes, setNotes] = useState(project.first_visit_notes || '');
  const [photos, setPhotos] = useState(project.first_visit_photos || []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

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

  return (
    <div className="space-y-6">
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
                  <img
                    src={`${process.env.REACT_APP_BACKEND_URL}${photo}`}
                    alt={`Eerste bezoek ${idx + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeletePhoto(photo)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
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
