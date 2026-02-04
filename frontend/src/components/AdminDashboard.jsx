import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, LogOut, Save, X, Image } from 'lucide-react';
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

const initialProjects = [
  {
    id: 1,
    category: 'totaalproject',
    title: 'Volledige woning renovatie',
    location: 'Hasselt',
    description: 'Complete renovatie van een jaren \'60 woning tot moderne gezinswoning.',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80',
    featured: true,
  },
  {
    id: 2,
    category: 'badkamer',
    title: 'Luxe badkamer met inloopdouche',
    location: 'Genk',
    description: 'Transformatie van een klassieke badkamer naar een moderne wellness-oase.',
    image: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&q=80',
    featured: true,
  },
  {
    id: 3,
    category: 'keuken',
    title: 'Design keuken met kookeiland',
    location: 'Lommel',
    description: 'Strakke keuken met groot kookeiland en hoogwaardige afwerking.',
    image: 'https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=600&q=80',
    featured: true,
  },
  {
    id: 4,
    category: 'maatkasten',
    title: 'Inloopkast op maat',
    location: 'Beringen',
    description: 'Luxe inloopkast met slimme indeling en geïntegreerde verlichting.',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    featured: false,
  },
  {
    id: 5,
    category: 'badkamer',
    title: 'Moderne badkamer renovatie',
    location: 'Ham',
    description: 'Compacte badkamer getransformeerd tot functionele ruimte met stijlvolle afwerking.',
    image: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=600&q=80',
    featured: false,
  },
  {
    id: 6,
    category: 'technieken',
    title: 'Warmtepomp installatie',
    location: 'Tessenderlo',
    description: 'Vervanging oude gasketel door moderne lucht-water warmtepomp.',
    image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80',
    featured: false,
  },
];

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
  const [formData, setFormData] = useState({
    title: '',
    category: 'totaalproject',
    location: '',
    description: '',
    image: '',
    featured: false,
  });

  useEffect(() => {
    // Check if logged in
    if (!localStorage.getItem('maxq_admin')) {
      navigate('/admin');
      return;
    }
    // Load projects from localStorage or use initial
    const savedProjects = localStorage.getItem('maxq_projects');
    if (savedProjects) {
      setProjects(JSON.parse(savedProjects));
    } else {
      setProjects(initialProjects);
      localStorage.setItem('maxq_projects', JSON.stringify(initialProjects));
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('maxq_admin');
    navigate('/admin');
  };

  const saveProjects = (newProjects) => {
    setProjects(newProjects);
    localStorage.setItem('maxq_projects', JSON.stringify(newProjects));
  };

  const openAddDialog = () => {
    setEditingProject(null);
    setFormData({
      title: '',
      category: 'totaalproject',
      location: '',
      description: '',
      image: '',
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
      description: project.description,
      image: project.image,
      featured: project.featured,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingProject) {
      // Update existing
      const updated = projects.map((p) =>
        p.id === editingProject.id ? { ...p, ...formData } : p
      );
      saveProjects(updated);
    } else {
      // Add new
      const newProject = {
        id: Date.now(),
        ...formData,
      };
      saveProjects([...projects, newProject]);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Weet u zeker dat u dit project wilt verwijderen?')) {
      const filtered = projects.filter((p) => p.id !== id);
      saveProjects(filtered);
    }
  };

  const toggleFeatured = (id) => {
    const updated = projects.map((p) =>
      p.id === id ? { ...p, featured: !p.featured } : p
    );
    saveProjects(updated);
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

        {/* Projects Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Afbeelding</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categorie</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Locatie</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uitgelicht</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <img 
                      src={project.image} 
                      alt={project.title} 
                      className="w-16 h-12 object-cover rounded"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-[#202020]">{project.title}</div>
                    <div className="text-sm text-[#202020]/70 truncate max-w-xs">{project.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs uppercase">
                      {project.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#202020]/70">{project.location}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleFeatured(project.id)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        project.featured 
                          ? 'bg-[#3a190b] text-white' 
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {project.featured ? 'Ja' : 'Nee'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? 'Project bewerken' : 'Nieuw project toevoegen'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Project titel"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            <div>
              <Label htmlFor="description">Beschrijving *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Korte beschrijving van het project"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="image">Afbeelding URL *</Label>
              <Input
                id="image"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://..."
              />
              {formData.image && (
                <img 
                  src={formData.image} 
                  alt="Preview" 
                  className="mt-2 w-full h-32 object-cover rounded"
                />
              )}
            </div>

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

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Annuleren
            </Button>
            <Button 
              onClick={handleSave}
              className="bg-[#3a190b] hover:bg-[#500000] text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Opslaan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
