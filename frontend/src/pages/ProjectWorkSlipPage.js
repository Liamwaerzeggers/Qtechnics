import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import { FileText, Plus, Loader2, Calendar as CalendarIcon, Camera, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';

export default function ProjectWorkSlipPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [workSlips, setWorkSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSlip, setEditingSlip] = useState(null);
  
  const [newSlip, setNewSlip] = useState({
    date: new Date().toISOString().split('T')[0],
    notes_nl: '',
    notes_uk: '',
  });

  useEffect(() => {
    fetchProject();
    fetchWorkSlips();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/projects/${projectId}`,
        { withCredentials: true }
      );
      setProject(response.data);
    } catch (error) {
      console.error('Failed to fetch project:', error);
      toast.error('Kon project niet laden');
    }
  };

  const fetchWorkSlips = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/projects/${projectId}/work-slips`,
        { withCredentials: true }
      );
      setWorkSlips(response.data);
    } catch (error) {
      console.error('Failed to fetch work slips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlip = async () => {
    try {
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/projects/${projectId}/work-slips`,
        { ...newSlip, project_id: projectId, date: new Date(newSlip.date).toISOString() },
        { withCredentials: true }
      );
      toast.success('Werkbon aangemaakt');
      setIsCreateDialogOpen(false);
      setNewSlip({ date: new Date().toISOString().split('T')[0], notes_nl: '', notes_uk: '' });
      fetchWorkSlips();
    } catch (error) {
      console.error('Failed to create work slip:', error);
      toast.error('Kon werkbon niet aanmaken');
    }
  };

  const handleUpdateSlip = async (slipId, updates) => {
    try {
      await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/projects/${projectId}/work-slips/${slipId}`,
        updates,
        { withCredentials: true }
      );
      toast.success('Werkbon bijgewerkt');
      setEditingSlip(null);
      fetchWorkSlips();
    } catch (error) {
      console.error('Failed to update work slip:', error);
      toast.error('Kon werkbon niet bijwerken');
    }
  };

  const handleDeleteSlip = async (slipId) => {
    if (!window.confirm('Weet je zeker dat je deze werkbon wilt verwijderen?')) return;
    
    try {
      await axios.delete(
        `${process.env.REACT_APP_BACKEND_URL}/api/projects/${projectId}/work-slips/${slipId}`,
        { withCredentials: true }
      );
      toast.success('Werkbon verwijderd');
      fetchWorkSlips();
    } catch (error) {
      console.error('Failed to delete work slip:', error);
      toast.error('Kon werkbon niet verwijderen');
    }
  };

  const handlePhotoUpload = async (slipId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/projects/${projectId}/work-slips/${slipId}/photos`,
        formData,
        { 
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );
      toast.success('Foto toegevoegd');
      fetchWorkSlips();
    } catch (error) {
      console.error('Failed to upload photo:', error);
      toast.error('Kon foto niet uploaden');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 sm:p-3 rounded-xl" style={{ backgroundColor: '#DBEAFE' }}>
              <FileText size={24} className="sm:w-7 sm:h-7" style={{ color: '#1E40AF' }} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1E3A8A' }}>
                Werkbonnen
              </h1>
              <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
                {project ? project.name : 'Laden...'}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:space-x-3">
            <Button 
              variant="outline" 
              onClick={() => navigate(`/projects/${projectId}`)}
            >
              Terug naar Project
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button style={{ backgroundColor: '#1E40AF' }}>
                  <Plus size={20} className="mr-2" />
                  Nieuwe Werkbon
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nieuwe Werkbon</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Datum</label>
                    <input
                      type="date"
                      value={newSlip.date}
                      onChange={(e) => setNewSlip({...newSlip, date: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium">Notities (Nederlands) 🇳🇱</label>
                      <button
                        type="button"
                        onClick={() => {
                          if (newSlip.notes_nl && !newSlip.notes_uk) {
                            setNewSlip({...newSlip, notes_uk: `[Vertaling: ${newSlip.notes_nl}]`});
                            toast.info('Typ hier de Oekraïense vertaling');
                          }
                        }}
                        className="text-xs px-2 py-1 rounded hover:bg-gray-100"
                        style={{ color: '#1E40AF' }}
                      >
                        → Vertaal naar 🇺🇦
                      </button>
                    </div>
                    <Textarea
                      value={newSlip.notes_nl}
                      onChange={(e) => setNewSlip({...newSlip, notes_nl: e.target.value})}
                      rows={4}
                      placeholder="Werkzaamheden van vandaag..."
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium">Notities (Українська) 🇺🇦</label>
                      <button
                        type="button"
                        onClick={() => {
                          if (newSlip.notes_uk && !newSlip.notes_nl) {
                            setNewSlip({...newSlip, notes_nl: `[Vertaling: ${newSlip.notes_uk}]`});
                            toast.info('Typ hier de Nederlandse vertaling');
                          }
                        }}
                        className="text-xs px-2 py-1 rounded hover:bg-gray-100"
                        style={{ color: '#1E40AF' }}
                      >
                        → Vertaal naar 🇳🇱
                      </button>
                    </div>
                    <Textarea
                      value={newSlip.notes_uk}
                      onChange={(e) => setNewSlip({...newSlip, notes_uk: e.target.value})}
                      rows={4}
                      placeholder="Роботи сьогодні..."
                    />
                    <p className="text-xs mt-1" style={{ color: '#64748B' }}>
                      💡 Tip: Gebruik Google Translate of typ handmatig in beide talen
                    </p>
                  </div>
                  <Button onClick={handleCreateSlip} className="w-full" style={{ backgroundColor: '#1E40AF' }}>
                    Werkbon Aanmaken
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Work Slips List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin" size={32} style={{ color: '#1E40AF' }} />
          </div>
        ) : workSlips.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FileText size={48} className="mx-auto mb-4" style={{ color: '#94A3B8' }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#64748B' }}>Geen werkbonnen</h3>
            <p style={{ color: '#94A3B8' }}>Maak je eerste werkbon aan om te beginnen</p>
          </div>
        ) : (
          <div className="space-y-4">
            {workSlips.map((slip) => (
              <div key={slip.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <CalendarIcon size={20} style={{ color: '#1E40AF' }} />
                    <h3 className="text-lg font-semibold" style={{ color: '#1E3A8A' }}>
                      {formatDate(slip.date)}
                    </h3>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingSlip(slip.id === editingSlip ? null : slip.id)}
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSlip(slip.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>

                {editingSlip === slip.id ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Notities (NL)</label>
                      <Textarea
                        defaultValue={slip.notes_nl}
                        id={`notes_nl_${slip.id}`}
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Notities (UK)</label>
                      <Textarea
                        defaultValue={slip.notes_uk}
                        id={`notes_uk_${slip.id}`}
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Kantoor Feedback (NL)</label>
                      <Textarea
                        defaultValue={slip.office_feedback_nl}
                        id={`feedback_nl_${slip.id}`}
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Kantoor Feedback (UK)</label>
                      <Textarea
                        defaultValue={slip.office_feedback_uk}
                        id={`feedback_uk_${slip.id}`}
                        rows={2}
                      />
                    </div>
                    <Button
                      onClick={() => {
                        const updates = {
                          notes_nl: document.getElementById(`notes_nl_${slip.id}`).value,
                          notes_uk: document.getElementById(`notes_uk_${slip.id}`).value,
                          office_feedback_nl: document.getElementById(`feedback_nl_${slip.id}`).value,
                          office_feedback_uk: document.getElementById(`feedback_uk_${slip.id}`).value,
                        };
                        handleUpdateSlip(slip.id, updates);
                      }}
                      style={{ backgroundColor: '#1E40AF' }}
                    >
                      Opslaan
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-sm mb-1" style={{ color: '#64748B' }}>Notities (NL) 🇳🇱</h4>
                        <p className="text-sm" style={{ color: '#334155' }}>{slip.notes_nl || '-'}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-1" style={{ color: '#64748B' }}>Notities (UK) 🇺🇦</h4>
                        <p className="text-sm" style={{ color: '#334155' }}>{slip.notes_uk || '-'}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-1" style={{ color: '#64748B' }}>Kantoor Feedback (NL) 🇳🇱</h4>
                        <p className="text-sm" style={{ color: '#334155' }}>{slip.office_feedback_nl || '-'}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-1" style={{ color: '#64748B' }}>Kantoor Feedback (UK) 🇺🇦</h4>
                        <p className="text-sm" style={{ color: '#334155' }}>{slip.office_feedback_uk || '-'}</p>
                      </div>
                    </div>

                    {/* Photos */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm" style={{ color: '#64748B' }}>Foto's</h4>
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files[0]) {
                                handlePhotoUpload(slip.id, e.target.files[0]);
                              }
                            }}
                          />
                          <Button variant="outline" size="sm" asChild>
                            <span>
                              <Camera size={16} className="mr-1" />
                              Foto Toevoegen
                            </span>
                          </Button>
                        </label>
                      </div>
                      {slip.photos && slip.photos.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {slip.photos.map((photo, idx) => (
                            <img
                              key={idx}
                              src={`${process.env.REACT_APP_BACKEND_URL}${photo}`}
                              alt={`Foto ${idx + 1}`}
                              className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90"
                              onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}${photo}`, '_blank')}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm" style={{ color: '#94A3B8' }}>Geen foto's</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
