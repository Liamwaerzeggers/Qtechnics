import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, useAuth } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Package, Camera, Send, Check, Clock, Truck, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Bilingual translations (Dutch / Ukrainian)
const T = {
  pageTitle: {
    nl: "Materiaal Aanvragen",
    ua: "Запит на матеріали"
  },
  pageSubtitle: {
    nl: "Vraag hier materialen aan die je nodig hebt op de werf",
    ua: "Запросіть тут матеріали, які вам потрібні на будівництві"
  },
  newRequest: {
    nl: "Nieuwe Aanvraag",
    ua: "Новий Запит"
  },
  materialName: {
    nl: "Naam materiaal",
    ua: "Назва матеріалу"
  },
  materialNamePlaceholder: {
    nl: "Bijv. Cement, Tegels, Verf...",
    ua: "Наприклад: Цемент, Плитка, Фарба..."
  },
  quantity: {
    nl: "Hoeveelheid",
    ua: "Кількість"
  },
  quantityPlaceholder: {
    nl: "Bijv. 5 zakken, 10m², 2 emmers...",
    ua: "Наприклад: 5 мішків, 10м², 2 відра..."
  },
  neededBy: {
    nl: "Nodig tegen",
    ua: "Потрібно до"
  },
  neededByPlaceholder: {
    nl: "Bijv. Maandag, 15 maart, Zo snel mogelijk...",
    ua: "Наприклад: Понеділок, 15 березня, Якнайшвидше..."
  },
  photo: {
    nl: "Foto (optioneel)",
    ua: "Фото (необов'язково)"
  },
  addPhoto: {
    nl: "Foto toevoegen",
    ua: "Додати фото"
  },
  notes: {
    nl: "Extra notities",
    ua: "Додаткові примітки"
  },
  notesPlaceholder: {
    nl: "Optioneel: extra informatie...",
    ua: "Необов'язково: додаткова інформація..."
  },
  project: {
    nl: "Project (optioneel)",
    ua: "Проект (необов'язково)"
  },
  selectProject: {
    nl: "Selecteer project...",
    ua: "Виберіть проект..."
  },
  noProject: {
    nl: "Geen project",
    ua: "Без проекту"
  },
  send: {
    nl: "Versturen",
    ua: "Надіслати"
  },
  sending: {
    nl: "Versturen...",
    ua: "Надсилання..."
  },
  myRequests: {
    nl: "Mijn Aanvragen",
    ua: "Мої Запити"
  },
  status: {
    pending: { nl: "Wacht op bestelling", ua: "Очікує замовлення" },
    ordered: { nl: "Besteld", ua: "Замовлено" },
    delivered: { nl: "Geleverd", ua: "Доставлено" }
  },
  noRequests: {
    nl: "Je hebt nog geen materialen aangevraagd",
    ua: "Ви ще не запитували матеріали"
  },
  successMessage: {
    nl: "Materiaal aanvraag verstuurd!",
    ua: "Запит на матеріал надіслано!"
  },
  errorMessage: {
    nl: "Kon aanvraag niet versturen",
    ua: "Не вдалося надіслати запит"
  },
  fillAllFields: {
    nl: "Vul alle verplichte velden in",
    ua: "Заповніть усі обов'язкові поля"
  }
};

// Bilingual label component
function BiLabel({ field }) {
  return (
    <Label className="flex flex-col">
      <span className="font-semibold">{T[field].nl}</span>
      <span className="text-gray-500 text-xs font-normal">{T[field].ua}</span>
    </Label>
  );
}

export default function MaterialRequestPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState([]);
  const [projects, setProjects] = useState([]);
  const [photoPreview, setPhotoPreview] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    quantity: '',
    needed_by: '',
    photo_url: '',
    notes: '',
    project_id: '',
    project_name: ''
  });

  useEffect(() => {
    fetchRequests();
    fetchProjects();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API}/material-requests`, {
        headers: getAuthHeaders()
      });
      setRequests(response.data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects`, {
        headers: getAuthHeaders()
      });
      setProjects(response.data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload photo
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      
      const response = await axios.post(`${API}/upload-photo`, formDataUpload, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setFormData(prev => ({ ...prev, photo_url: response.data.url }));
    } catch (error) {
      console.error('Error uploading photo:', error);
      // Keep preview even if upload fails, user can still submit without photo
    }
  };

  const handleProjectChange = (projectId) => {
    if (projectId === 'none') {
      setFormData(prev => ({ ...prev, project_id: '', project_name: '' }));
    } else {
      const project = projects.find(p => p.id === projectId);
      setFormData(prev => ({ 
        ...prev, 
        project_id: projectId, 
        project_name: project?.client_name || project?.address || ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.quantity || !formData.needed_by) {
      toast.error(`${T.fillAllFields.nl} / ${T.fillAllFields.ua}`);
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/material-requests`, {
        title: formData.title,
        quantity: formData.quantity,
        needed_by: formData.needed_by,
        photo_url: formData.photo_url || null,
        notes: formData.notes || null,
        project_id: formData.project_id || null,
        project_name: formData.project_name || null
      }, {
        headers: getAuthHeaders()
      });
      
      toast.success(`✅ ${T.successMessage.nl} / ${T.successMessage.ua}`);
      
      // Reset form
      setFormData({
        title: '',
        quantity: '',
        needed_by: '',
        photo_url: '',
        notes: '',
        project_id: '',
        project_name: ''
      });
      setPhotoPreview(null);
      
      // Refresh requests
      fetchRequests();
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error(`${T.errorMessage.nl} / ${T.errorMessage.ua}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (request) => {
    if (request.is_delivered) {
      return (
        <span className="flex items-center gap-1 text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs font-medium">
          <Truck size={14} />
          {T.status.delivered.nl} / {T.status.delivered.ua}
        </span>
      );
    }
    if (request.is_ordered) {
      return (
        <span className="flex items-center gap-1 text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full text-xs font-medium">
          <Check size={14} />
          {T.status.ordered.nl} / {T.status.ordered.ua}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-orange-600 bg-orange-100 px-2 py-1 rounded-full text-xs font-medium">
        <Clock size={14} />
        {T.status.pending.nl} / {T.status.pending.ua}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl" style={{backgroundColor: '#f5e6e6'}}>
            <Package size={28} style={{color: '#500000'}} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>
              {T.pageTitle.nl}
            </h1>
            <p className="text-sm text-gray-500">{T.pageTitle.ua}</p>
            <p className="text-sm text-gray-600 mt-1">
              {T.pageSubtitle.nl}
              <br />
              <span className="text-gray-500">{T.pageSubtitle.ua}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* New Request Form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-col">
                <span>{T.newRequest.nl}</span>
                <span className="text-gray-500 text-sm font-normal">{T.newRequest.ua}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Material Name */}
                <div>
                  <BiLabel field="materialName" />
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder={`${T.materialNamePlaceholder.nl} / ${T.materialNamePlaceholder.ua}`}
                    className="mt-1"
                    required
                  />
                </div>

                {/* Quantity */}
                <div>
                  <BiLabel field="quantity" />
                  <Input
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    placeholder={`${T.quantityPlaceholder.nl} / ${T.quantityPlaceholder.ua}`}
                    className="mt-1"
                    required
                  />
                </div>

                {/* Needed By */}
                <div>
                  <BiLabel field="neededBy" />
                  <Input
                    value={formData.needed_by}
                    onChange={(e) => setFormData({...formData, needed_by: e.target.value})}
                    placeholder={`${T.neededByPlaceholder.nl} / ${T.neededByPlaceholder.ua}`}
                    className="mt-1"
                    required
                  />
                </div>

                {/* Photo Upload */}
                <div>
                  <BiLabel field="photo" />
                  <div className="mt-1 flex items-center gap-3">
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors">
                      <Camera size={20} className="text-gray-600" />
                      <span className="text-sm">
                        {T.addPhoto.nl} / {T.addPhoto.ua}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </label>
                    {photoPreview && (
                      <div className="relative">
                        <img 
                          src={photoPreview} 
                          alt="Preview" 
                          className="w-16 h-16 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoPreview(null);
                            setFormData(prev => ({ ...prev, photo_url: '' }));
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Project Selection */}
                <div>
                  <BiLabel field="project" />
                  <Select value={formData.project_id || 'none'} onValueChange={handleProjectChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={`${T.selectProject.nl} / ${T.selectProject.ua}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        {T.noProject.nl} / {T.noProject.ua}
                      </SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.client_name || project.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div>
                  <BiLabel field="notes" />
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder={`${T.notesPlaceholder.nl} / ${T.notesPlaceholder.ua}`}
                    className="mt-1"
                    rows={2}
                  />
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full text-lg py-6"
                  style={{backgroundColor: '#500000'}}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 animate-spin" size={20} />
                      {T.sending.nl} / {T.sending.ua}
                    </>
                  ) : (
                    <>
                      <Send className="mr-2" size={20} />
                      {T.send.nl} / {T.send.ua}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* My Requests */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-col">
                <span>{T.myRequests.nl}</span>
                <span className="text-gray-500 text-sm font-normal">{T.myRequests.ua}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package size={48} className="mx-auto mb-3 opacity-50" />
                  <p>{T.noRequests.nl}</p>
                  <p className="text-sm">{T.noRequests.ua}</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {requests.map((request) => (
                    <div 
                      key={request.id}
                      className={`p-3 rounded-lg border-2 ${
                        request.is_delivered ? 'bg-green-50 border-green-200' :
                        request.is_ordered ? 'bg-yellow-50 border-yellow-200' :
                        'bg-orange-50 border-orange-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {request.photo_url ? (
                          <img 
                            src={request.photo_url}
                            alt={request.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                            <Package size={20} className="text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold">{request.title}</h4>
                          <p className="text-sm text-gray-600">
                            {request.quantity} • {request.needed_by}
                          </p>
                          {request.project_name && (
                            <p className="text-xs text-gray-500">
                              📍 {request.project_name}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(request)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
