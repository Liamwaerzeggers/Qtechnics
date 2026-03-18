import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Package, Plus, Trash2, Edit2, X, Camera, Save, Loader2, Image as ImageIcon, Ruler, FolderOpen, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function MaterialCatalogAdmin() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [itemForm, setItemForm] = useState({ title: '', title_ua: '', description: '', sizes: '', category_id: '' });
  const [newCatName, setNewCatName] = useState('');
  const [newCatNameUa, setNewCatNameUa] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatNameUa, setEditCatNameUa] = useState('');
  const [uploadingId, setUploadingId] = useState(null);
  const [collapsedCats, setCollapsedCats] = useState({});

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [catRes, itemRes] = await Promise.all([
        axios.get(`${API}/material-categories`, { headers: getAuthHeaders() }),
        axios.get(`${API}/material-catalog`, { headers: getAuthHeaders() })
      ]);
      setCategories(catRes.data || []);
      setItems(itemRes.data || []);
    } catch (err) {
      toast.error('Kon gegevens niet laden');
    } finally {
      setLoading(false);
    }
  };

  // Category CRUD
  const addCategory = async () => {
    if (!newCatName.trim()) return;
    setAddingCat(true);
    try {
      await axios.post(`${API}/material-categories`, { name: newCatName.trim(), name_ua: newCatNameUa.trim() || null }, { headers: getAuthHeaders() });
      setNewCatName('');
      setNewCatNameUa('');
      toast.success('Categorie toegevoegd');
      fetchAll();
    } catch (err) {
      toast.error('Kon categorie niet toevoegen');
    } finally {
      setAddingCat(false);
    }
  };

  const saveEditCat = async (catId) => {
    if (!editCatName.trim()) return;
    try {
      await axios.put(`${API}/material-categories/${catId}`, { name: editCatName.trim(), name_ua: editCatNameUa.trim() || null }, { headers: getAuthHeaders() });
      setEditingCat(null);
      toast.success('Categorie bijgewerkt');
      fetchAll();
    } catch (err) {
      toast.error('Kon niet bijwerken');
    }
  };

  const deleteCat = async (catId) => {
    if (!window.confirm('Categorie verwijderen? Items worden niet verwijderd, enkel ontkoppeld.')) return;
    try {
      await axios.delete(`${API}/material-categories/${catId}`, { headers: getAuthHeaders() });
      toast.success('Categorie verwijderd');
      fetchAll();
    } catch (err) {
      toast.error('Kon niet verwijderen');
    }
  };

  // Item CRUD
  const resetItemForm = () => {
    setItemForm({ title: '', title_ua: '', description: '', sizes: '', category_id: '' });
    setEditingItem(null);
    setShowItemForm(false);
  };

  const startEditItem = (item) => {
    setItemForm({
      title: item.title,
      title_ua: item.title_ua || '',
      description: item.description || '',
      sizes: (item.sizes || []).join(', '),
      category_id: item.category_id || ''
    });
    setEditingItem(item);
    setShowItemForm(true);
  };

  const openNewItemForCategory = (catId) => {
    resetItemForm();
    setItemForm(prev => ({ ...prev, category_id: catId }));
    setShowItemForm(true);
  };

  const handleSaveItem = async () => {
    if (!itemForm.title.trim()) { toast.error('Titel is verplicht'); return; }
    setSaving(true);
    const sizes = itemForm.sizes ? itemForm.sizes.split(',').map(s => s.trim()).filter(Boolean) : [];
    const payload = {
      title: itemForm.title,
      title_ua: itemForm.title_ua || null,
      description: itemForm.description || null,
      sizes,
      category_id: itemForm.category_id || null
    };
    try {
      if (editingItem) {
        await axios.put(`${API}/material-catalog/${editingItem.id}`, payload, { headers: getAuthHeaders() });
        toast.success('Item bijgewerkt');
      } else {
        await axios.post(`${API}/material-catalog`, payload, { headers: getAuthHeaders() });
        toast.success('Item toegevoegd');
      }
      resetItemForm();
      fetchAll();
    } catch (err) {
      toast.error('Kon niet opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Item verwijderen?')) return;
    try {
      await axios.delete(`${API}/material-catalog/${id}`, { headers: getAuthHeaders() });
      toast.success('Item verwijderd');
      fetchAll();
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
      fetchAll();
    } catch (err) {
      toast.error('Upload mislukt');
    } finally {
      setUploadingId(null);
    }
  };

  const toggleCollapse = (catId) => {
    setCollapsedCats(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Group items by category
  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });
  const uncategorized = items.filter(i => !i.category_id || !catMap[i.category_id]);
  const itemsByCategory = {};
  categories.forEach(c => { itemsByCategory[c.id] = []; });
  items.forEach(i => {
    if (i.category_id && catMap[i.category_id]) {
      itemsByCategory[i.category_id].push(i);
    }
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin" size={32} style={{ color: '#500000' }} />
        </div>
      </DashboardLayout>
    );
  }

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
                Bestelcatalogus
              </h1>
              <p className="text-sm text-gray-500">Beheer categorieën en materialen waaruit werkmannen kunnen bestellen</p>
            </div>
          </div>
        </div>

        {/* Add Category */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3 flex-wrap">
              <FolderOpen size={20} style={{ color: '#500000' }} />
              <span className="font-semibold text-sm" style={{ color: '#500000' }}>Nieuwe categorie:</span>
              <Input
                data-testid="new-category-input"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Naam (NL) bijv. Gyproc, Schroeven..."
                className="max-w-[200px]"
              />
              <Input
                data-testid="new-category-ua-input"
                value={newCatNameUa}
                onChange={(e) => setNewCatNameUa(e.target.value)}
                placeholder="Naam (UA) bijv. Гіпрок..."
                className="max-w-[200px]"
                onKeyDown={(e) => e.key === 'Enter' && addCategory()}
              />
              <Button
                data-testid="add-category-btn"
                onClick={addCategory}
                disabled={addingCat || !newCatName.trim()}
                size="sm"
                style={{ backgroundColor: '#500000' }}
              >
                {addingCat ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                <span className="ml-1">Toevoegen</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Item Form (floating) */}
        {showItemForm && (
          <Card data-testid="catalog-item-form" className="border-2 border-dashed" style={{ borderColor: '#7a1f1f' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg" style={{ color: '#500000' }}>
                {editingItem ? 'Item Bewerken' : 'Nieuw Item'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Titel (NL) *</Label>
                  <Input
                    data-testid="catalog-title-input"
                    value={itemForm.title}
                    onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                    placeholder="Bijv. Groene gyproc 260x120"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="font-semibold">Titel (UA)</Label>
                  <Input
                    data-testid="catalog-title-ua-input"
                    value={itemForm.title_ua}
                    onChange={(e) => setItemForm({ ...itemForm, title_ua: e.target.value })}
                    placeholder="Bijv. Зелений гіпрок 260x120"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="font-semibold">Categorie</Label>
                  <Select value={itemForm.category_id || 'none'} onValueChange={(v) => setItemForm({ ...itemForm, category_id: v === 'none' ? '' : v })}>
                    <SelectTrigger data-testid="catalog-category-select" className="mt-1">
                      <SelectValue placeholder="Kies categorie..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Geen categorie</SelectItem>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-semibold flex items-center gap-1">
                    <Ruler size={14} /> Afmetingen (optioneel)
                  </Label>
                  <Input
                    data-testid="catalog-sizes-input"
                    value={itemForm.sizes}
                    onChange={(e) => setItemForm({ ...itemForm, sizes: e.target.value })}
                    placeholder="Bijv. 50mm, 75mm, 100mm (komma gescheiden)"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="font-semibold">Beschrijving (optioneel)</Label>
                  <Input
                    data-testid="catalog-description-input"
                    value={itemForm.description}
                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                    placeholder="Extra informatie..."
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button data-testid="catalog-save-btn" onClick={handleSaveItem} disabled={saving} style={{ backgroundColor: '#500000' }}>
                  {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
                  {editingItem ? 'Bijwerken' : 'Toevoegen'}
                </Button>
                <Button variant="outline" onClick={resetItemForm}>
                  <X size={16} className="mr-2" /> Annuleren
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Categories with items */}
        {categories.map(cat => {
          const catItems = itemsByCategory[cat.id] || [];
          const isCollapsed = collapsedCats[cat.id];

          return (
            <Card key={cat.id} data-testid={`category-${cat.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <button
                    data-testid={`toggle-cat-${cat.id}`}
                    onClick={() => toggleCollapse(cat.id)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                  </button>

                  {editingCat === cat.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editCatName}
                        onChange={(e) => setEditCatName(e.target.value)}
                        className="max-w-[180px] h-8 text-sm"
                        placeholder="Naam (NL)"
                        autoFocus
                      />
                      <Input
                        value={editCatNameUa}
                        onChange={(e) => setEditCatNameUa(e.target.value)}
                        className="max-w-[180px] h-8 text-sm"
                        placeholder="Naam (UA)"
                        onKeyDown={(e) => e.key === 'Enter' && saveEditCat(cat.id)}
                      />
                      <Button size="sm" variant="ghost" onClick={() => saveEditCat(cat.id)} className="h-8 px-2 text-green-600">
                        <Save size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingCat(null)} className="h-8 px-2">
                        <X size={14} />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <FolderOpen size={18} style={{ color: '#500000' }} />
                      <CardTitle className="text-base" style={{ color: '#500000' }}>
                        {cat.name}
                        {cat.name_ua && <span className="text-gray-400 font-normal text-sm ml-1.5">/ {cat.name_ua}</span>}
                      </CardTitle>
                      <span className="text-xs text-gray-400 ml-1">({catItems.length})</span>
                      <div className="ml-auto flex items-center gap-1">
                        <Button
                          data-testid={`add-item-to-${cat.id}`}
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => openNewItemForCategory(cat.id)}
                        >
                          <Plus size={12} /> Item
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => { setEditingCat(cat.id); setEditCatName(cat.name); setEditCatNameUa(cat.name_ua || ''); }}
                        >
                          <Edit2 size={12} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-red-400 hover:text-red-600"
                          onClick={() => deleteCat(cat.id)}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </CardHeader>

              {!isCollapsed && (
                <CardContent className="pt-0">
                  {catItems.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed rounded-lg">
                      Nog geen items in deze categorie.
                      <button
                        onClick={() => openNewItemForCategory(cat.id)}
                        className="ml-1 underline hover:text-gray-600"
                      >
                        Item toevoegen
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {catItems.map(item => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          onEdit={startEditItem}
                          onDelete={handleDeleteItem}
                          onUploadImage={handleImageUpload}
                          uploadingId={uploadingId}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}

        {/* Uncategorized items */}
        {uncategorized.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-gray-400" />
                <CardTitle className="text-base text-gray-500">Zonder categorie</CardTitle>
                <span className="text-xs text-gray-400">({uncategorized.length})</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto h-7 text-xs gap-1"
                  onClick={() => { resetItemForm(); setShowItemForm(true); }}
                >
                  <Plus size={12} /> Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {uncategorized.map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onEdit={startEditItem}
                    onDelete={handleDeleteItem}
                    onUploadImage={handleImageUpload}
                    uploadingId={uploadingId}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {categories.length === 0 && items.length === 0 && (
          <Card>
            <CardContent className="text-center py-12 text-gray-500">
              <FolderOpen size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">Begin met het aanmaken van categorieën</p>
              <p className="text-sm mt-1">Maak categorieën aan (bijv. "Gyproc", "Schroeven") en voeg daar materialen aan toe.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function ItemCard({ item, onEdit, onDelete, onUploadImage, uploadingId }) {
  return (
    <Card data-testid={`catalog-item-${item.id}`} className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative aspect-[4/3] bg-gray-100 flex items-center justify-center group">
        {item.image_url ? (
          <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center text-gray-300">
            <ImageIcon size={32} />
          </div>
        )}
        <label className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center cursor-pointer transition-all opacity-0 group-hover:opacity-100">
          {uploadingId === item.id ? (
            <Loader2 size={24} className="text-white animate-spin" />
          ) : (
            <div className="bg-white/90 rounded-full p-1.5">
              <Camera size={16} style={{ color: '#500000' }} />
            </div>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onUploadImage(e, item.id)} />
        </label>
      </div>
      <CardContent className="p-2">
        <h3 className="font-bold text-xs leading-tight" style={{ color: '#500000' }}>{item.title}</h3>
        {item.title_ua && <p className="text-[10px] text-gray-400 leading-tight">{item.title_ua}</p>}
        {item.description && <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>}
        {item.sizes?.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-1">
            {item.sizes.map((s, i) => (
              <span key={i} className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{s}</span>
            ))}
          </div>
        )}
        <div className="flex gap-1 mt-2">
          <Button variant="outline" size="sm" className="flex-1 h-6 text-[10px]" onClick={() => onEdit(item)}>
            <Edit2 size={10} className="mr-0.5" /> Bewerken
          </Button>
          <Button variant="outline" size="sm" className="h-6 px-1.5 text-red-500" onClick={() => onDelete(item.id)}>
            <Trash2 size={10} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
