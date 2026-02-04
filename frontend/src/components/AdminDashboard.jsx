import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, LogOut, Save, X, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const categories = [
  { id: 'totaalproject', label: 'Totaalproject' },
  { id: 'badkamer', label: 'Badkamer' },
  { id: 'keuken', label: 'Keuken' },
  { id: 'maatkasten', label: 'Maatkasten' },
  { id: 'technieken', label: 'Technieken' },
];

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url}`;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const mainImageRef = useRef(null);
  const galleryImageRef = useRef(null);
  
  const emptyForm = {
    title: '',
    category: 'totaalproject',
    location: '',
    shortDescription: '',
    fullDescription: '',
    mainImage: '',
    galleryImages: [],
    featured: false,
  };
  
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (!localStorage.getItem('maxq_admin')) {
      navigate('/admin');
      return;
    }
    loadProjects();
  }, [navigate]);

  const loadProjects = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects`);
      if (res.ok) setProjects(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('maxq_admin');
    navigate('/admin');
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
      setFormData(prev => ({ ...prev, mainImage: result.url }));
    } catch (error) {
      alert('Fout bij uploaden');
    }
    setUploading(false);
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const results = await Promise.all(files.map(uploadFile));
      setFormData(prev => ({ 
        ...prev, 
        galleryImages: [...prev.galleryImages, ...results.map(r => r.url)] 
      }));
    } catch (error) {
      alert('Fout bij uploaden');
    }
    setUploading(false);
  };

  const removeGalleryImage = (index) => {
    setFormData(prev => ({
      ...prev,
      galleryImages: prev.galleryImages.filter((_, i) => i !== index)
    }));
  };

  const openAddDialog = () => {
    setEditingProject(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const openEditDialog = (project) => {
    setEditingProject(project);
    setFormData({
      title: project.title || '',
      category: project.category || 'totaalproject',
      location: project.location || '',
      shortDescription: project.shortDescription || '',
      fullDescription: project.fullDescription || '',
      mainImage: project.mainImage || '',
      galleryImages: project.galleryImages || [],
      featured: project.featured || false,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        title: formData.title,
        category: formData.category,
        location: formData.location,
        shortDescription: formData.shortDescription,
        fullDescription: formData.fullDescription,
        featured: formData.featured,
      };
      
      let projectId = editingProject?.id;
      
      if (editingProject) {
        await fetch(`${BACKEND_URL}/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        const res = await fetch(`${BACKEND_URL}/api/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const newProject = await res.json();
          projectId = newProject.id;
        }
      }
      
      // Update images
      const params = new URLSearchParams();
      params.set('mainImage', formData.mainImage);
      params.set('galleryImages', JSON.stringify(formData.galleryImages));
      await fetch(`${BACKEND_URL}/api/projects/${projectId}/images?${params}`, { method: 'PUT' });
      
      await loadProjects();
      setIsDialogOpen(false);
    } catch (error) {
      alert('Fout bij opslaan');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet u zeker dat u dit project wilt verwijderen?')) return;
    try {
      await fetch(`${BACKEND_URL}/api/projects/${id}`, { method: 'DELETE' });
      await loadProjects();
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
      alert('Fout');
    }
  };

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

      <main className="max-w-7xl mx-auto px-4 py-8">
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
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="aspect-video relative bg-gray-200">
                {project.mainImage ? (
                  <img src={getImageUrl(project.mainImage)} alt={project.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-12 w-12 text-gray-400" /></div>
                )}
                {project.featured && <span className="absolute top-2 left-2 bg-[#3a190b] text-white text-xs px-2 py-1 rounded">Uitgelicht</span>}
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
                  <button onClick={() => toggleFeatured(project)} className={`text-xs px-3 py-1 rounded ${project.featured ? 'bg-[#3a190b] text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {project.featured ? 'Uitgelicht' : 'Niet uitgelicht'}
                  </button>
                  <div className="flex gap-2">
                    <Button onClick={() => openEditDialog(project)} size="sm" variant="outline" className="h-8 w-8 p-0"><Edit className="h-4 w-4" /></Button>
                    <Button onClick={() => handleDelete(project.id)} size="sm" variant="outline" className="h-8 w-8 p-0 text-red-600"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {projects.length === 0 && (
          <div className="text-center py-12">
            <ImageIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Nog geen projecten</p>
            <Button onClick={openAddDialog} className="bg-[#3a190b] text-white"><Plus className="h-4 w-4 mr-2" />Voeg project toe</Button>
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProject ? 'Project bewerken' : 'Nieuw project'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Titel *</Label>
                <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Project titel" />
              </div>
              <div>
                <Label>Categorie</Label>
                <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full h-10 rounded-md border px-3 text-sm">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Locatie *</Label>
                <Input value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} placeholder="Stad" />
              </div>
            </div>

            <div>
              <Label>Korte beschrijving *</Label>
              <Textarea value={formData.shortDescription} onChange={(e) => setFormData({...formData, shortDescription: e.target.value})} rows={2} />
            </div>

            <div>
              <Label>Uitgebreide beschrijving</Label>
              <Textarea value={formData.fullDescription} onChange={(e) => setFormData({...formData, fullDescription: e.target.value})} rows={4} />
            </div>

            <div>
              <Label>Hoofdafbeelding</Label>
              <div className="mt-2">
                {formData.mainImage ? (
                  <div className="relative inline-block">
                    <img src={getImageUrl(formData.mainImage)} alt="Main" className="h-40 object-cover rounded-lg" />
                    <button onClick={() => setFormData({...formData, mainImage: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X className="h-4 w-4" /></button>
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
                {formData.galleryImages.map((img, i) => (
                  <div key={i} className="relative aspect-square">
                    <img src={getImageUrl(img)} alt={`Gallery ${i}`} className="w-full h-full object-cover rounded" />
                    <button onClick={() => removeGalleryImage(i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X className="h-3 w-3" /></button>
                  </div>
                ))}
                <div onClick={() => galleryImageRef.current?.click()} className="aspect-square border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-[#3a190b]">
                  <Plus className="h-6 w-6 text-gray-400" />
                </div>
              </div>
              <input ref={galleryImageRef} type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="featured" checked={formData.featured} onChange={(e) => setFormData({...formData, featured: e.target.checked})} />
              <Label htmlFor="featured">Uitgelicht</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}><X className="h-4 w-4 mr-2" />Annuleren</Button>
            <Button onClick={handleSave} disabled={saving || uploading || !formData.title || !formData.location || !formData.shortDescription} className="bg-[#3a190b] text-white">
              <Save className="h-4 w-4 mr-2" />{saving ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </div>
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
