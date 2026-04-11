import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, LogOut, Save, X, Upload, Image as ImageIcon, Users, FolderOpen, Mail, Phone, MapPin, Calendar, Euro, Clock, Eye, ExternalLink, ArrowRight, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import BlogAdmin from './BlogAdmin';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Helper functions for labels
const getBudgetLabel = (budget) => {
  const map = {
    'under25k': '< €25.000',
    '25k-50k': '€25.000 - €50.000',
    '50k-100k': '€50.000 - €100.000',
    '100k-200k': '€100.000 - €200.000',
    'over200k': '> €200.000',
    'unknown': 'Nog niet bepaald',
  };
  return map[budget] || budget;
};

const getTimelineLabel = (timeline) => {
  const map = {
    'asap': 'Zo snel mogelijk',
    '1-3months': 'Binnen 1-3 maanden',
    '3-6months': 'Binnen 3-6 maanden',
    '6-12months': 'Binnen 6-12 maanden',
    'exploring': 'Oriënterende fase',
  };
  return map[timeline] || timeline;
};

const getProjectTypeLabel = (type) => {
  const map = {
    'totaalrenovatie': 'Totaalrenovatie',
    'badkamer': 'Badkamer',
    'keuken': 'Keuken',
    'technieken': 'Technieken',
    'interieur': 'Interieur',
  };
  return map[type] || type;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Project Card Component
const ProjectCard = ({ project, getImageUrl, onToggleFeatured, onEdit, onDelete }) => (
  <div className="bg-white rounded-lg shadow overflow-hidden">
    <div className="aspect-video relative bg-gray-200">
      {project.mainImage ? (
        <img src={getImageUrl(project.mainImage)} alt={project.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="h-12 w-12 text-gray-400" />
        </div>
      )}
      {project.featured && (
        <span className="absolute top-2 left-2 bg-[#3a190b] text-white text-xs px-2 py-1 rounded">Uitgelicht</span>
      )}
    </div>
    <div className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs uppercase font-semibold text-[#3a190b]">{project.category}</span>
        <span className="text-xs text-gray-400">•</span>
        <span className="text-xs text-gray-500">{project.location}</span>
      </div>
      <h3 className="font-bold text-[#202020] mb-2">{project.title}</h3>
      <p className="text-sm text-gray-600 line-clamp-2 mb-4">{project.shortDescription}</p>
      <div className="flex justify-between items-center">
        <button 
          onClick={() => onToggleFeatured(project)}
          className={project.featured ? 'text-xs px-3 py-1 rounded bg-[#3a190b] text-white' : 'text-xs px-3 py-1 rounded bg-gray-200 text-gray-600'}
        >
          {project.featured ? 'Uitgelicht' : 'Niet uitgelicht'}
        </button>
        <div className="flex gap-2">
          <Button onClick={() => onEdit(project)} size="sm" variant="outline" className="h-8 w-8 p-0">
            <Edit className="h-4 w-4" />
          </Button>
          <Button onClick={() => onDelete(project.id)} size="sm" variant="outline" className="h-8 w-8 p-0 text-red-600">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>
);

// Lead Card Component
const LeadCard = ({ lead, onView, onDelete }) => (
  <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-3">
      <div>
        <h3 className="font-bold text-[#202020]">{lead.firstName} {lead.lastName}</h3>
        <p className="text-sm text-gray-500">{lead.city}</p>
      </div>
      <span className="text-xs text-gray-400">{formatDate(lead.created_at)}</span>
    </div>
    
    <div className="space-y-2 mb-4">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Mail className="h-4 w-4 text-[#3a190b]" />
        <a href={`mailto:${lead.email}`} className="hover:text-[#3a190b]">{lead.email}</a>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Phone className="h-4 w-4 text-[#3a190b]" />
        <a href={`tel:${lead.phone}`} className="hover:text-[#3a190b]">{lead.phone}</a>
      </div>
    </div>

    <div className="flex flex-wrap gap-1 mb-3">
      {lead.projectTypes?.map((type, i) => (
        <span key={i} className="text-xs bg-[#3a190b]/10 text-[#3a190b] px-2 py-1 rounded">
          {getProjectTypeLabel(type)}
        </span>
      ))}
    </div>

    <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
      <span className="flex items-center gap-1">
        <Euro className="h-3 w-3" />
        {getBudgetLabel(lead.budget)}
      </span>
      <span className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {getTimelineLabel(lead.timeline)}
      </span>
    </div>

    <div className="flex justify-between items-center pt-3 border-t">
      <Button onClick={() => onView(lead)} size="sm" variant="outline" className="text-xs">
        <Eye className="h-3 w-3 mr-1" />Details
      </Button>
      <Button onClick={() => onDelete(lead.id)} size="sm" variant="outline" className="text-xs text-red-600">
        <Trash2 className="h-3 w-3 mr-1" />Verwijderen
      </Button>
    </div>
  </div>
);

// Gallery Image Component
const GalleryImage = ({ img, index, getImageUrl, onRemove }) => (
  <div className="relative aspect-square">
    <img src={getImageUrl(img)} alt={`Gallery ${index}`} className="w-full h-full object-cover rounded" />
    <button onClick={() => onRemove(index)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5">
      <X className="h-3 w-3" />
    </button>
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const mainImageRef = useRef(null);
  const galleryImageRef = useRef(null);
  const beforeImageRef = useRef(null);
  const afterImageRef = useRef(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('projects');
  
  // Projects state
  const [projects, setProjects] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Leads state
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  
  // Project form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('totaalproject');
  const [location, setLocation] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [fullDesc, setFullDesc] = useState('');
  const [mainImage, setMainImage] = useState('');
  const [galleryImages, setGalleryImages] = useState([]);
  const [beforeAfterImages, setBeforeAfterImages] = useState([]);
  const [baUploadIndex, setBaUploadIndex] = useState(null);
  const [featured, setFeatured] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadLeads = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/leads`);
      if (res.ok) {
        const data = await res.json();
        // Sort by date, newest first
        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setLeads(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('maxq_admin')) {
      navigate('/admin');
      return;
    }
    loadProjects();
    loadLeads();
  }, [navigate, loadProjects, loadLeads]);

  const handleLogout = () => {
    localStorage.removeItem('maxq_admin');
    navigate('/admin');
  };

  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    // Support all upload paths
    if (url.startsWith('/uploads/') || url.startsWith('/api/uploads/') || url.startsWith('/api/images/')) {
      const cleanUrl = url.startsWith('/uploads/') ? `/api${url}` : url;
      return `${BACKEND_URL}${cleanUrl}`;
    }
    return `${BACKEND_URL}${url}`;
  };

  const uploadFile = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${BACKEND_URL}/api/upload`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Upload failed');
    return await res.json();
  };

  const handleMainImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile(file);
      setMainImage(result.url);
    } catch (error) {
      alert('Fout bij uploaden');
    }
    setUploading(false);
  };

  const handleGalleryUpload = async (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    setUploading(true);
    try {
      const results = await Promise.all(files.map(uploadFile));
      const newUrls = results.map(r => r.url);
      setGalleryImages(prev => [...prev, ...newUrls]);
    } catch (error) {
      alert('Fout bij uploaden');
    }
    setUploading(false);
  };

  const removeGalleryImage = (index) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
  };

  const addBeforeAfterPair = () => {
    setBeforeAfterImages(prev => [...prev, { before: '', after: '' }]);
  };

  const handleBeforeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || baUploadIndex === null) return;
    setUploading(true);
    try {
      const result = await uploadFile(file);
      setBeforeAfterImages(prev => prev.map((pair, i) => i === baUploadIndex ? { ...pair, before: result.url } : pair));
    } catch (error) {
      alert('Fout bij uploaden');
    }
    setUploading(false);
    setBaUploadIndex(null);
  };

  const handleAfterUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || baUploadIndex === null) return;
    setUploading(true);
    try {
      const result = await uploadFile(file);
      setBeforeAfterImages(prev => prev.map((pair, i) => i === baUploadIndex ? { ...pair, after: result.url } : pair));
    } catch (error) {
      alert('Fout bij uploaden');
    }
    setUploading(false);
    setBaUploadIndex(null);
  };

  const removeBeforeAfterPair = (index) => {
    setBeforeAfterImages(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setTitle('');
    setCategory('totaalproject');
    setLocation('');
    setShortDesc('');
    setFullDesc('');
    setMainImage('');
    setGalleryImages([]);
    setBeforeAfterImages([]);
    setBaUploadIndex(null);
    setFeatured(false);
  };

  const openAddDialog = () => {
    setEditingProject(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (project) => {
    setEditingProject(project);
    setTitle(project.title || '');
    setCategory(project.category || 'totaalproject');
    setLocation(project.location || '');
    setShortDesc(project.shortDescription || '');
    setFullDesc(project.fullDescription || '');
    setMainImage(project.mainImage || '');
    setGalleryImages(project.galleryImages || []);
    setBeforeAfterImages(project.beforeAfterImages || []);
    setFeatured(project.featured || false);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = JSON.stringify({
        title,
        category,
        location,
        shortDescription: shortDesc,
        fullDescription: fullDesc,
        featured,
      });
      
      let projectId = editingProject?.id || null;
      
      if (editingProject) {
        await fetch(`${BACKEND_URL}/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
      } else {
        const res = await fetch(`${BACKEND_URL}/api/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
        if (res.ok) {
          const newProject = await res.json();
          projectId = newProject.id;
        }
      }
      
      if (projectId) {
        const params = new URLSearchParams({
          mainImage,
          galleryImages: JSON.stringify(galleryImages),
          beforeAfterImages: JSON.stringify(beforeAfterImages)
        });
        await fetch(`${BACKEND_URL}/api/projects/${projectId}/images?${params}`, { method: 'PUT' });
      }
      
      await loadProjects();
      setIsDialogOpen(false);
    } catch (error) {
      alert('Fout bij opslaan');
    }
    setSaving(false);
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm('Weet u zeker dat u dit project wilt verwijderen?')) return;
    try {
      await fetch(`${BACKEND_URL}/api/projects/${id}`, { method: 'DELETE' });
      await loadProjects();
    } catch (error) {
      alert('Fout bij verwijderen');
    }
  };

  const handleDeleteLead = async (id) => {
    if (!window.confirm('Weet u zeker dat u deze aanvraag wilt verwijderen?')) return;
    try {
      await fetch(`${BACKEND_URL}/api/leads/${id}`, { method: 'DELETE' });
      await loadLeads();
    } catch (error) {
      alert('Fout bij verwijderen');
    }
  };

  const toggleFeatured = async (project) => {
    try {
      await fetch(`${BACKEND_URL}/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !project.featured }),
      });
      await loadProjects();
    } catch (error) {
      console.error(error);
    }
  };

  const viewLead = (lead) => {
    setSelectedLead(lead);
    setIsLeadDialogOpen(true);
  };

  const canSave = title && location && shortDesc && !saving && !uploading;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#3a190b] text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src="https://customer-assets.emergentagent.com/job_maxq-showcase/artifacts/rn05emza_logo%20maxq.png" alt="Max Q" className="h-10" />
            <span className="text-lg font-semibold">Admin Dashboard</span>
          </div>
          <Button onClick={handleLogout} variant="outline" className="border-white text-white hover:bg-white hover:text-[#3a190b]">
            <LogOut className="h-4 w-4 mr-2" />Uitloggen
          </Button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('projects')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                activeTab === 'projects' 
                  ? 'text-[#3a190b] border-[#3a190b]' 
                  : 'text-gray-500 border-transparent hover:text-[#3a190b]'
              }`}
            >
              <FolderOpen className="h-5 w-5" />
              Projecten
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{projects.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                activeTab === 'leads' 
                  ? 'text-[#3a190b] border-[#3a190b]' 
                  : 'text-gray-500 border-transparent hover:text-[#3a190b]'
              }`}
            >
              <Users className="h-5 w-5" />
              Aanvragen
              {leads.length > 0 && (
                <span className="bg-[#3a190b] text-white text-xs px-2 py-0.5 rounded-full">{leads.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('blog')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                activeTab === 'blog' 
                  ? 'text-[#3a190b] border-[#3a190b]' 
                  : 'text-gray-500 border-transparent hover:text-[#3a190b]'
              }`}
              data-testid="blog-tab"
            >
              <FileText className="h-5 w-5" />
              Blog
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-2xl font-bold text-[#202020]">Projecten Beheer</h1>
                <p className="text-[#202020]/70">{projects.length} projecten</p>
              </div>
              <Button onClick={openAddDialog} className="bg-[#3a190b] hover:bg-[#500000] text-white">
                <Plus className="h-4 w-4 mr-2" />Nieuw project
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  getImageUrl={getImageUrl}
                  onToggleFeatured={toggleFeatured}
                  onEdit={openEditDialog}
                  onDelete={handleDeleteProject}
                />
              ))}
            </div>

            {projects.length === 0 && (
              <div className="text-center py-12">
                <ImageIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Nog geen projecten</p>
                <Button onClick={openAddDialog} className="bg-[#3a190b] text-white">
                  <Plus className="h-4 w-4 mr-2" />Voeg project toe
                </Button>
              </div>
            )}
          </>
        )}

        {/* Leads Tab */}
        {activeTab === 'leads' && (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-2xl font-bold text-[#202020]">Aanvragen</h1>
                <p className="text-[#202020]/70">{leads.length} aanvragen ontvangen</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {leads.map(lead => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onView={viewLead}
                  onDelete={handleDeleteLead}
                />
              ))}
            </div>

            {leads.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nog geen aanvragen ontvangen</p>
              </div>
            )}
          </>
        )}

        {/* Blog Tab */}
        {activeTab === 'blog' && <BlogAdmin />}
      </main>

      {/* Project Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProject ? 'Project bewerken' : 'Nieuw project'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Titel *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Project titel" />
              </div>
              <div>
                <Label>Categorie</Label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full h-10 rounded-md border px-3 text-sm">
                  <option value="totaalproject">Totaalproject</option>
                  <option value="badkamer">Badkamer</option>
                  <option value="keuken">Keuken</option>
                  <option value="maatkasten">Maatkasten</option>
                  <option value="technieken">Technieken</option>
                </select>
              </div>
              <div>
                <Label>Locatie *</Label>
                <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Stad" />
              </div>
            </div>

            <div>
              <Label>Korte beschrijving *</Label>
              <Textarea value={shortDesc} onChange={e => setShortDesc(e.target.value)} rows={2} />
            </div>

            <div>
              <Label>Uitgebreide beschrijving</Label>
              <Textarea value={fullDesc} onChange={e => setFullDesc(e.target.value)} rows={4} />
            </div>

            <div>
              <Label>Hoofdafbeelding</Label>
              <div className="mt-2">
                {mainImage ? (
                  <div className="relative inline-block">
                    <img src={getImageUrl(mainImage)} alt="Main" className="h-40 object-cover rounded-lg" />
                    <button onClick={() => setMainImage('')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div onClick={() => mainImageRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#3a190b]">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Klik om te uploaden (PNG, JPG, etc.)</p>
                  </div>
                )}
                <input ref={mainImageRef} type="file" accept="image/*" onChange={handleMainImageUpload} className="hidden" />
              </div>
            </div>

            <div>
              <Label>Galerij afbeeldingen</Label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {galleryImages.map((img, i) => (
                  <GalleryImage key={i} img={img} index={i} getImageUrl={getImageUrl} onRemove={removeGalleryImage} />
                ))}
                <div onClick={() => galleryImageRef.current?.click()} className="aspect-square border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-[#3a190b]">
                  <Plus className="h-6 w-6 text-gray-400" />
                </div>
              </div>
              <input ref={galleryImageRef} type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
            </div>

            <div>
              <Label>Voor & Na foto's (optioneel)</Label>
              <p className="text-xs text-gray-500 mb-2">Upload foto paren om de transformatie te tonen</p>
              <div className="space-y-3 mt-2">
                {beforeAfterImages.map((pair, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-500 mb-1">VOOR</p>
                      {pair.before ? (
                        <img src={getImageUrl(pair.before)} alt="Voor" className="h-20 w-full object-cover rounded" />
                      ) : (
                        <div
                          onClick={() => { setBaUploadIndex(i); beforeImageRef.current?.click(); }}
                          className="h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-[#3a190b]"
                        >
                          <Upload className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <ArrowRight className="h-5 w-5 text-[#3a190b] flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-500 mb-1">NA</p>
                      {pair.after ? (
                        <img src={getImageUrl(pair.after)} alt="Na" className="h-20 w-full object-cover rounded" />
                      ) : (
                        <div
                          onClick={() => { setBaUploadIndex(i); afterImageRef.current?.click(); }}
                          className="h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-[#3a190b]"
                        >
                          <Upload className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <button onClick={() => removeBeforeAfterPair(i)} className="text-red-500 hover:text-red-700 flex-shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addBeforeAfterPair}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#3a190b] hover:text-[#3a190b] flex items-center justify-center gap-1"
                >
                  <Plus className="h-4 w-4" /> Voor & Na paar toevoegen
                </button>
              </div>
              <input ref={beforeImageRef} type="file" accept="image/*" onChange={handleBeforeUpload} className="hidden" />
              <input ref={afterImageRef} type="file" accept="image/*" onChange={handleAfterUpload} className="hidden" />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="featured" checked={featured} onChange={e => setFeatured(e.target.checked)} />
              <Label htmlFor="featured">Uitgelicht</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              <X className="h-4 w-4 mr-2" />Annuleren
            </Button>
            <Button onClick={handleSave} disabled={!canSave} className="bg-[#3a190b] text-white">
              <Save className="h-4 w-4 mr-2" />{saving ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lead Detail Dialog */}
      <Dialog open={isLeadDialogOpen} onOpenChange={setIsLeadDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aanvraag details</DialogTitle>
          </DialogHeader>
          
          {selectedLead && (
            <div className="space-y-6 py-4">
              {/* Contact Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-[#202020] mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#3a190b]" />
                  Contactgegevens
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Naam</p>
                    <p className="font-medium">{selectedLead.firstName} {selectedLead.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <a href={`mailto:${selectedLead.email}`} className="font-medium text-[#3a190b] hover:underline">
                      {selectedLead.email}
                    </a>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Telefoon</p>
                    <a href={`tel:${selectedLead.phone}`} className="font-medium text-[#3a190b] hover:underline">
                      {selectedLead.phone}
                    </a>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Adres</p>
                    <p className="font-medium">
                      {selectedLead.street && `${selectedLead.street}, `}
                      {selectedLead.postalCode} {selectedLead.city}
                    </p>
                  </div>
                </div>
              </div>

              {/* Project Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-[#202020] mb-3 flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-[#3a190b]" />
                  Projectdetails
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Type project</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedLead.projectTypes?.map((type, i) => (
                        <span key={i} className="text-sm bg-[#3a190b]/10 text-[#3a190b] px-2 py-1 rounded">
                          {getProjectTypeLabel(type)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Budget</p>
                    <p className="font-medium">{getBudgetLabel(selectedLead.budget)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Planning</p>
                    <p className="font-medium">{getTimelineLabel(selectedLead.timeline)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Aanvraag datum</p>
                    <p className="font-medium">{formatDate(selectedLead.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-[#202020] mb-3">Omschrijving van het project</h3>
                <p className="text-gray-700 whitespace-pre-line">{selectedLead.description || 'Geen omschrijving gegeven'}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <a href={`mailto:${selectedLead.email}`} className="flex-1">
                  <Button className="w-full bg-[#3a190b] text-white">
                    <Mail className="h-4 w-4 mr-2" />Email versturen
                  </Button>
                </a>
                <a href={`tel:${selectedLead.phone}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    <Phone className="h-4 w-4 mr-2" />Bellen
                  </Button>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {uploading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#3a190b] mx-auto mb-4"></div>
            <p>Uploaden...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
