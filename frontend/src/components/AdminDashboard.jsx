import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, LogOut, Save, X, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const categories = [
  { id: 'totaalproject', label: 'Totaalproject' },
  { id: 'badkamer', label: 'Badkamer' },
  { id: 'keuken', label: 'Keuken' },
  { id: 'maatkasten', label: 'Maatkasten' },
  { id: 'technieken', label: 'Technieken' },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const mainImageRef = useRef(null);
  const galleryImageRef = useRef(null);
  
  const [formData, setFormData] = useState({
    title: '',
    category: 'totaalproject',
    location: '',
    shortDescription: '',
    fullDescription: '',
    mainImage: '',
    galleryImages: [],
    featured: false,
  });

  useEffect(() => {
    if (!localStorage.getItem('maxq_admin')) {
      navigate('/admin');
      return;
    }
    fetchProjects();
  }, [navigate]);

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/projects`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('maxq_admin');
    navigate('/admin');
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${BACKEND_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    
    return await response.json();
  };

  const handleMainImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const result = await uploadFile(file);
      setFormData({ ...formData, mainImage: result.url });
    } catch (error) {
      alert('Fout bij uploaden van afbeelding');
    }
    setUploading(false);
  };

  const handleGalleryImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploading(true);
    try {
      const uploadPromises = files.map(file => uploadFile(file));
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map(r => r.url);
      setFormData({ 
        ...formData, 
        galleryImages: [...formData.galleryImages, ...newUrls] 
      });
    } catch (error) {
      alert('Fout bij uploaden van afbeeldingen');
    }
    setUploading(false);
  };

  const removeGalleryImage = (index) => {
    setFormData({
      ...formData,
      galleryImages: formData.galleryImages.filter((_, i) => i !== index)
    });
  };

  const openAddDialog = () => {
    setEditingProject(null);
    setFormData({
      title: '',
      category: 'totaalproject',
      location: '',
      shortDescription: '',
      fullDescription: '',
      mainImage: '',
      galleryImages: [],
      featured: false,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (project) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      category: project.category,
      location: project.location,
      shortDescription: project.shortDescription,
      fullDescription: project.fullDescription || '',
      mainImage: project.mainImage || '',
      galleryImages: project.galleryImages || [],
      featured: project.featured,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingProject) {
        // Update existing project
        const response = await fetch(`${BACKEND_URL}/api/projects/${editingProject.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title,
            category: formData.category,
            location: formData.location,
            shortDescription: formData.shortDescription,
            fullDescription: formData.fullDescription,
            featured: formData.featured,
          }),
        });
        
        if (response.ok) {
          // Update images separately
          await fetch(`${BACKEND_URL}/api/projects/${editingProject.id}/images?mainImage=${encodeURIComponent(formData.mainImage)}&galleryImages=${encodeURIComponent(JSON.stringify(formData.galleryImages))}`, {
            method: 'PUT',
          });
        }
      } else {
        // Create new project
        const response = await fetch(`${BACKEND_URL}/api/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title,
            category: formData.category,
            location: formData.location,
            shortDescription: formData.shortDescription,
            fullDescription: formData.fullDescription,
            featured: formData.featured,
          }),
        });
        
        if (response.ok) {
          const newProject = await response.json();
          // Update images
          await fetch(`${BACKEND_URL}/api/projects/${newProject.id}/images?mainImage=${encodeURIComponent(formData.mainImage)}&galleryImages=${encodeURIComponent(JSON.stringify(formData.galleryImages))}`, {
            method: 'PUT',
          });
        }
      }
      
      await fetchProjects();
      setIsDialogOpen(false);
    } catch (error) {
      alert('Fout bij opslaan van project');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet u zeker dat u dit project wilt verwijderen?')) return;
    
    try {
      await fetch(`${BACKEND_URL}/api/projects/${id}`, { method: 'DELETE' });
      await fetchProjects();
    } catch (error) {
      alert('Fout bij verwijderen van project');
    }
  };

  const toggleFeatured = async (project) => {
    try {
      await fetch(`${BACKEND_URL}/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !project.featured }),
      });
      await fetchProjects();
    } catch (error) {
      alert('Fout bij bijwerken van project');
    }
  };

  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#3a190b] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img 
                src="https://customer-assets.emergentagent.com/job_maxq-showcase/artifacts/rn05emza_logo%20maxq.png" 
                alt="Max Q" 
                className="h-10"
              />
              <span className="text-lg font-semibold">Admin Dashboard</span>
            </div>
            <Button 
              onClick={handleLogout}
              variant="outline" 
              className="border-white text-white hover:bg-white hover:text-[#3a190b]"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Uitloggen
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#202020]">Projecten Beheer</h1>
            <p className="text-[#202020]/70">{projects.length} projecten</p>
          </div>
          <Button 
            onClick={openAddDialog}
            className="bg-[#3a190b] hover:bg-[#500000] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nieuw project
          </Button>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="aspect-video relative">
                {project.mainImage ? (
                  <img 
                    src={getImageUrl(project.mainImage)} 
                    alt={project.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                {project.featured && (
                  <span className="absolute top-2 left-2 bg-[#3a190b] text-white text-xs px-2 py-1 rounded">
                    Uitgelicht
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs uppercase font-semibold text-[#3a190b]">
                    {project.category}
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">{project.location}</span>
                </div>
                <h3 className="font-bold text-[#202020] mb-2">{project.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">{project.shortDescription}</p>
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => toggleFeatured(project)}
                    className={`text-xs px-3 py-1 rounded transition-colors ${
                      project.featured 
                        ? 'bg-[#3a190b] text-white' 
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {project.featured ? 'Uitgelicht' : 'Niet uitgelicht'}
                  </button>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => openEditDialog(project)}
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(project.id)}
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {projects.length === 0 && (
          <div className="text-center py-12">
            <ImageIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Nog geen projecten toegevoegd</p>
            <Button onClick={openAddDialog} className="bg-[#3a190b] hover:bg-[#500000] text-white">
              <Plus className="h-4 w-4 mr-2" />
              Voeg eerste project toe
            </Button>
          </div>
        )}
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? 'Project bewerken' : 'Nieuw project toevoegen'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Project titel"
                />
              </div>
              <div>
                <Label htmlFor="category">Categorie *</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="location">Locatie *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Stad/gemeente"
                />
              </div>
            </div>

            {/* Descriptions */}
            <div>
              <Label htmlFor="shortDescription">Korte beschrijving *</Label>
              <Textarea
                id="shortDescription"
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                placeholder="Korte beschrijving voor de projectenlijst"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="fullDescription">Uitgebreide beschrijving</Label>
              <Textarea
                id="fullDescription"
                value={formData.fullDescription}
                onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
                placeholder="Gedetailleerde beschrijving voor de detailpagina..."
                rows={5}
              />
            </div>

            {/* Main Image */}
            <div>
              <Label>Hoofdafbeelding</Label>
              <div className="mt-2">
                {formData.mainImage ? (
                  <div className="relative inline-block">
                    <img 
                      src={getImageUrl(formData.mainImage)} 
                      alt="Hoofdafbeelding"
                      className="h-40 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => setFormData({ ...formData, mainImage: '' })}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => mainImageRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#3a190b] transition-colors"
                  >
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      Klik om een afbeelding te uploaden<br />
                      <span className="text-xs">PNG, JPG, JPEG, GIF, WEBP</span>
                    </p>
                  </div>
                )}
                <input
                  ref={mainImageRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  onChange={handleMainImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Gallery Images */}
            <div>
              <Label>Galerij afbeeldingen</Label>
              <div className="mt-2 space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  {formData.galleryImages.map((image, index) => (
                    <div key={index} className="relative aspect-square">
                      <img 
                        src={getImageUrl(image)} 
                        alt={`Galerij ${index + 1}`}
                        className="w-full h-full object-cover rounded"
                      />
                      <button
                        onClick={() => removeGalleryImage(index)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <div 
                    onClick={() => galleryImageRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-[#3a190b] transition-colors"
                  >
                    <Plus className="h-6 w-6 text-gray-400" />
                  </div>
                </div>
                <input
                  ref={galleryImageRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  multiple
                  onChange={handleGalleryImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Featured Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="featured"
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="featured">Uitgelicht project</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
              <X className="h-4 w-4 mr-2" />
              Annuleren
            </Button>
            <Button 
              onClick={handleSave}
              className="bg-[#3a190b] hover:bg-[#500000] text-white"
              disabled={saving || uploading || !formData.title || !formData.location || !formData.shortDescription}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loading Overlay */}
      {uploading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#3a190b] mx-auto mb-4"></div>
            <p>Afbeelding uploaden...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
