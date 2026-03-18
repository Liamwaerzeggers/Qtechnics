import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Package, Plus, Trash2, Edit2, X, Camera, Save, Loader2, Image as ImageIcon, Ruler } from 'lucide-react';
import { toast } from 'sonner';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function MaterialCatalogAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', sizes: '' });
  const fileInputRef = useRef(null);
  const [uploadingId, setUploadingId] = useState(null);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      const res = await axios.get(`${API}/material-catalog`, { headers: getAuthHeaders() });
      setItems(res.data || []);
    } catch (err) {
      toast.error('Kon catalogus niet laden');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ title: '', description: '', sizes: '' });
    setEditingItem(null);
    setShowForm(false);
  };

  const startEdit = (item) => {
    setForm({
      title: item.title,
      description: item.description || '',
      sizes: (item.sizes || []).join(', ')
    });
    setEditingItem(item);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Titel is verplicht');
      return;
    }
    setSaving(true);
    const sizes = form.sizes ? form.sizes.split(',').map(s => s.trim()).filter(Boolean) : [];
    try {
      if (editingItem) {
        await axios.put(`${API}/material-catalog/${editingItem.id}`, {
          title: form.title, description: form.description || null, sizes
        }, { headers: getAuthHeaders() });
        toast.success('Item bijgewerkt');
      } else {
        await axios.post(`${API}/material-catalog`, {
          title: form.title, description: form.description || null, sizes
        }, { headers: getAuthHeaders() });
        toast.success('Item toegevoegd');
      }
      resetForm();
      fetchItems();
    } catch (err) {
      toast.error('Kon niet opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet je zeker dat je dit item wilt verwijderen?')) return;
    try {
      await axios.delete(`${API}/material-catalog/${id}`, { headers: getAuthHeaders() });
      toast.success('Item verwijderd');
      fetchItems();
    } catch (err) {
      toast.error('Kon niet verwijderen');
    }
  };

  const handleImageUpload = async (e, itemId) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingId(itemId);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await axios.post(`${API}/material-catalog/${itemId}/upload-image`, fd, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Afbeelding geüpload');
      fetchItems();
    } catch (err) {
      toast.error('Upload mislukt');
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#f5e6e6' }}>
              <Package size={28} style={{ color: '#500000' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#500000' }}>
                Materiaal Catalogus
              </h1>
              <p className="text-sm text-gray-500">Beheer de materialenlijst waaruit werkmannen kunnen bestellen</p>
            </div>
          </div>
          <Button
            data-testid="add-catalog-item-btn"
            onClick={() => { resetForm(); setShowForm(true); }}
            style={{ backgroundColor: '#500000' }}
          >
            <Plus size={18} className="mr-2" />
            Item Toevoegen
          </Button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <Card data-testid="catalog-form" className="border-2 border-dashed" style={{ borderColor: '#7a1f1f' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg" style={{ color: '#500000' }}>
                {editingItem ? 'Item Bewerken' : 'Nieuw Item Toevoegen'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Titel *</Label>
                  <Input
                    data-testid="catalog-title-input"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Bijv. Tegels, Cement, PVC Buis..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="font-semibold flex items-center gap-1">
                    <Ruler size={14} /> Afmetingen (optioneel)
                  </Label>
                  <Input
                    data-testid="catalog-sizes-input"
                    value={form.sizes}
                    onChange={(e) => setForm({ ...form, sizes: e.target.value })}
                    placeholder="Bijv. 60x60, 30x60, 80x80 (gescheiden door komma)"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-400 mt-1">Gescheiden door komma's. Werkmannen kiezen hieruit.</p>
                </div>
                <div className="md:col-span-2">
                  <Label className="font-semibold">Beschrijving (optioneel)</Label>
                  <Textarea
                    data-testid="catalog-description-input"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Optionele extra informatie over dit materiaal..."
                    className="mt-1"
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button data-testid="catalog-save-btn" onClick={handleSave} disabled={saving} style={{ backgroundColor: '#500000' }}>
                  {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
                  {editingItem ? 'Bijwerken' : 'Toevoegen'}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  <X size={16} className="mr-2" /> Annuleren
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Catalog Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin" size={32} style={{ color: '#500000' }} />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-gray-500">
              <Package size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">Nog geen items in de catalogus</p>
              <p className="text-sm">Voeg materialen toe zodat werkmannen deze kunnen bestellen.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
              <Card
                key={item.id}
                data-testid={`catalog-item-${item.id}`}
                className="overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Image */}
                <div className="relative aspect-square bg-gray-100 flex items-center justify-center group">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-gray-300">
                      <ImageIcon size={48} />
                      <span className="text-xs mt-1">Geen afbeelding</span>
                    </div>
                  )}
                  {/* Upload overlay */}
                  <label
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center cursor-pointer transition-all opacity-0 group-hover:opacity-100"
                  >
                    {uploadingId === item.id ? (
                      <Loader2 size={28} className="text-white animate-spin" />
                    ) : (
                      <div className="bg-white/90 rounded-full p-2">
                        <Camera size={20} style={{ color: '#500000' }} />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, item.id)}
                    />
                  </label>
                  {!item.active && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">Inactief</span>
                  )}
                </div>
                {/* Details */}
                <CardContent className="p-3">
                  <h3 className="font-bold text-sm" style={{ color: '#500000' }}>{item.title}</h3>
                  {item.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                  )}
                  {item.sizes && item.sizes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.sizes.map((s, i) => (
                        <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">{s}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`edit-catalog-${item.id}`}
                      className="flex-1 text-xs"
                      onClick={() => startEdit(item)}
                    >
                      <Edit2 size={12} className="mr-1" /> Bewerken
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`delete-catalog-${item.id}`}
                      className="text-red-500 hover:text-red-700 text-xs"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
