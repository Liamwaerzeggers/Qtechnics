import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Search, Package, Wrench, Plus, Save, Trash2, Edit2, X, Check } from 'lucide-react';
import { toast } from 'sonner';

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: \`Bearer \${token}\` } : {};
};

export default function MaterialsPage() {
  const [activeTab, setActiveTab] = useState('materials'); // 'materials' or 'work'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  
  // Work items state
  const [workItems, setWorkItems] = useState([]);
  const [loadingWorkItems, setLoadingWorkItems] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  
  // New work item form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newWorkItem, setNewWorkItem] = useState({ title: '', unit: 'm²', price: '' });
  const [saving, setSaving] = useState(false);

  // Load all work items when tab changes to 'work'
  useEffect(() => {
    if (activeTab === 'work') {
      loadAllWorkItems();
    }
  }, [activeTab]);

  const loadAllWorkItems = async () => {
    setLoadingWorkItems(true);
    try {
      const response = await axios.get(`${API}/work-items/all`, { headers: getAuthHeaders() });
      setWorkItems(response.data.work_items || []);
    } catch (error) {
      console.error('Error loading work items:', error);
      toast.error('Kon werk items niet laden');
    } finally {
      setLoadingWorkItems(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Selecteer een CSV bestand');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Bestand te groot (max 10MB)');
      return;
    }

    if (!file.name.endsWith('.csv')) {
      toast.error('Alleen CSV bestanden zijn toegestaan');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const endpoint = activeTab === 'materials' ? '/materials/upload' : '/work-items/upload';

    setUploading(true);
    try {
      const response = await axios.post(`${API}${endpoint}`, formData, {
        headers: getAuthHeaders(), headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });
      const itemType = activeTab === 'materials' ? 'materialen' : 'werk items';
      toast.success(`${response.data.count} ${itemType} geüpload!`);
      setFile(null);
      const uploadInput = document.getElementById(`csv-upload-${activeTab}`);
      if (uploadInput) uploadInput.value = '';
      
      // Reload work items if on work tab
      if (activeTab === 'work') {
        loadAllWorkItems();
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Kon CSV niet uploaden';
      toast.error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }

    const endpoint = activeTab === 'materials' ? '/materials/search' : '/work-items/search';

    setSearching(true);
    try {
      const response = await axios.get(`${API}${endpoint}?q=${encodeURIComponent(searchQuery)}`, { headers: getAuthHeaders() });
      setSearchResults(activeTab === 'materials' ? response.data.results || response.data : response.data);
      toast.success(`${response.data.length || response.data.count || 0} resultaten gevonden`);
    } catch (error) {
      toast.error('Zoeken mislukt');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Create new work item
  const handleCreateWorkItem = async () => {
    if (!newWorkItem.title.trim()) {
      toast.error('Titel is verplicht');
      return;
    }
    if (!newWorkItem.price || parseFloat(newWorkItem.price) < 0) {
      toast.error('Geldige prijs is verplicht');
      return;
    }

    setSaving(true);
    try {
      const params = new URLSearchParams({
        title: newWorkItem.title.trim(),
        unit: newWorkItem.unit,
        price: parseFloat(newWorkItem.price)
      });
      if (newWorkItem.category) {
        params.append('category', newWorkItem.category);
      }
      
      await axios.post(`${API}/work-items?${params.toString()}`, {}, { headers: getAuthHeaders() });
      toast.success('Werk item toegevoegd!');
      setNewWorkItem({ title: '', unit: 'm²', price: '', category: '' });
      setShowNewForm(false);
      loadAllWorkItems();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Kon werk item niet toevoegen';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // Start editing a work item
  const startEditing = (item) => {
    setEditingId(item.id);
    setEditValues({
      title: item.title,
      unit: item.unit,
      price: item.price
    });
  };

  // Save edited work item
  const saveEdit = async (itemId) => {
    setSaving(true);
    try {
      const params = new URLSearchParams({
        title: editValues.title,
        unit: editValues.unit,
        price: parseFloat(editValues.price)
      });
      
      await axios.put(`${API}/work-items/${itemId}?${params.toString()}`, {}, { headers: getAuthHeaders() });
      toast.success('Werk item bijgewerkt!');
      setEditingId(null);
      loadAllWorkItems();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Kon werk item niet bijwerken';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // Delete work item
  const deleteWorkItem = async (itemId) => {
    if (!window.confirm('Weet je zeker dat je dit werk item wilt verwijderen?')) {
      return;
    }

    try {
      await axios.delete(`${API}/work-items/${itemId}`, { headers: getAuthHeaders() });
      toast.success('Werk item verwijderd!');
      loadAllWorkItems();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Kon werk item niet verwijderen';
      toast.error(errorMsg);
    }
  };

  // Filter work items based on search
  const filteredWorkItems = workItems.filter(item => 
    !searchQuery || 
    item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.unit?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout showBackToDashboard={true}>
      <div data-testid="materials-page" className="space-y-6">
        <h1 className="text-2xl sm:text-4xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>
          Catalogus Beheer
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 border-b overflow-x-auto">
          <button
            onClick={() => { setActiveTab('materials'); setSearchResults([]); setSearchQuery(''); }}
            className={`px-4 sm:px-6 py-3 font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'materials' 
                ? 'border-b-2 border-blue-600 text-blue-600' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Package size={20} />
            Materialen
          </button>
          <button
            onClick={() => { setActiveTab('work'); setSearchResults([]); setSearchQuery(''); }}
            className={`px-4 sm:px-6 py-3 font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'work' 
                ? 'border-b-2 border-blue-600 text-blue-600' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Wrench size={20} />
            Werk Items
          </button>
        </div>

        {/* Upload Section */}
        <Card>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div>
              <Label>Upload CSV Catalogus</Label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2">
                <Input
                  id={`csv-upload-${activeTab}`}
                  data-testid="csv-upload-input"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                <Button data-testid="upload-csv-button" onClick={handleUpload} disabled={uploading} style={{backgroundColor: '#500000'}}>
                  {uploading ? 'Uploaden...' : <><Upload className="mr-2" size={20} /> Upload</>}
                </Button>
              </div>
              {activeTab === 'materials' ? (
                <p className="text-xs sm:text-sm mt-2" style={{color: '#64748B'}}>
                  CSV moet kolommen bevatten: <strong>sku, name, price</strong> (optioneel: description, category, brand)
                </p>
              ) : (
                <p className="text-xs sm:text-sm mt-2" style={{color: '#64748B'}}>
                  CSV moet kolommen bevatten: <strong>titel, eenheid, verkoopprijs</strong>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Work Items Tab - Full List with Manual Add */}
        {activeTab === 'work' && (
          <>
            {/* Add New Work Item Button */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <Input
                  placeholder="Filter werk items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                onClick={() => setShowNewForm(true)} 
                className="w-full sm:w-auto"
                style={{backgroundColor: '#10B981'}}
              >
                <Plus size={20} className="mr-2" />
                Nieuw Werk Item
              </Button>
            </div>

            {/* New Work Item Form */}
            {showNewForm && (
              <Card className="border-2 border-green-300 bg-green-50">
                <CardContent className="p-4 sm:p-6">
                  <h3 className="font-bold text-lg mb-4" style={{color: '#059669'}}>
                    Nieuw Werk Item Toevoegen
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-2">
                      <Label>Titel *</Label>
                      <Input
                        placeholder="Bijv. Schilderwerk wanden"
                        value={newWorkItem.title}
                        onChange={(e) => setNewWorkItem({...newWorkItem, title: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Eenheid</Label>
                      <select
                        value={newWorkItem.unit}
                        onChange={(e) => setNewWorkItem({...newWorkItem, unit: e.target.value})}
                        className="w-full h-10 px-3 border rounded-md"
                      >
                        <option value="m²">m²</option>
                        <option value="m">m (lopende meter)</option>
                        <option value="stuk">stuk</option>
                        <option value="uur">uur</option>
                        <option value="dag">dag</option>
                        <option value="forfait">forfait</option>
                      </select>
                    </div>
                    <div>
                      <Label>Categorie</Label>
                      <select
                        value={newWorkItem.category || ''}
                        onChange={(e) => setNewWorkItem({...newWorkItem, category: e.target.value})}
                        className="w-full h-10 px-3 border rounded-md"
                      >
                        <option value="">Geen categorie</option>
                        <option value="Vloer">Vloer</option>
                        <option value="Muur">Muur</option>
                        <option value="Plafond">Plafond</option>
                        <option value="Algemeen">Algemeen</option>
                      </select>
                    </div>
                    <div>
                      <Label>Prijs (€) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={newWorkItem.price}
                        onChange={(e) => setNewWorkItem({...newWorkItem, price: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 justify-end">
                    <Button variant="outline" onClick={() => setShowNewForm(false)}>
                      <X size={16} className="mr-1" /> Annuleren
                    </Button>
                    <Button 
                      onClick={handleCreateWorkItem} 
                      disabled={saving}
                      style={{backgroundColor: '#10B981'}}
                    >
                      {saving ? 'Opslaan...' : <><Save size={16} className="mr-1" /> Opslaan</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Work Items List */}
            <Card>
              <CardContent className="p-0">
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="font-bold text-lg" style={{color: '#500000'}}>
                    Alle Werk Items ({filteredWorkItems.length})
                  </h3>
                  <p className="text-sm text-gray-500">
                    Klik op een item om de prijs aan te passen
                  </p>
                </div>
                
                {loadingWorkItems ? (
                  <div className="p-8 text-center text-gray-500">
                    Laden...
                  </div>
                ) : filteredWorkItems.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    {searchQuery ? 'Geen werk items gevonden' : 'Nog geen werk items. Upload een CSV of voeg handmatig toe.'}
                  </div>
                ) : (
                  <div className="divide-y max-h-[600px] overflow-y-auto">
                    {filteredWorkItems.map((item) => (
                      <div 
                        key={item.id} 
                        className={`p-3 sm:p-4 hover:bg-gray-50 transition-colors ${editingId === item.id ? 'bg-red-50' : ''}`}
                      >
                        {editingId === item.id ? (
                          // Edit Mode
                          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                            <div className="flex-1 w-full">
                              <Input
                                value={editValues.title}
                                onChange={(e) => setEditValues({...editValues, title: e.target.value})}
                                className="font-medium"
                              />
                            </div>
                            <div className="w-full sm:w-28">
                              <select
                                value={editValues.unit}
                                onChange={(e) => setEditValues({...editValues, unit: e.target.value})}
                                className="w-full h-10 px-2 border rounded-md text-sm"
                              >
                                <option value="m²">m²</option>
                                <option value="m">m</option>
                                <option value="stuk">stuk</option>
                                <option value="uur">uur</option>
                                <option value="dag">dag</option>
                                <option value="forfait">forfait</option>
                              </select>
                            </div>
                            <div className="w-full sm:w-28">
                              <Input
                                type="number"
                                step="0.01"
                                value={editValues.price}
                                onChange={(e) => setEditValues({...editValues, price: e.target.value})}
                                className="text-right"
                              />
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto justify-end">
                              <Button 
                                size="sm" 
                                onClick={() => saveEdit(item.id)}
                                disabled={saving}
                                style={{backgroundColor: '#10B981'}}
                              >
                                <Check size={16} />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setEditingId(null)}
                              >
                                <X size={16} />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          // View Mode
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate" style={{color: '#1E293B'}}>
                                {item.title}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                                  {item.unit}
                                </span>
                                {item.auto_added && (
                                  <span className="text-xs px-2 py-0.5 bg-purple-100 rounded text-purple-600">
                                    Auto toegevoegd
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                              <span className="text-lg font-bold" style={{color: '#7a1f1f'}}>
                                €{(item.price || 0).toFixed(2)}
                              </span>
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => startEditing(item)}
                                  className="text-blue-600 hover:text-blue-800 hover:bg-red-50"
                                >
                                  <Edit2 size={16} />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => deleteWorkItem(item.id)}
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Materials Tab - Search Only (as before) */}
        {activeTab === 'materials' && (
          <>
            {/* Search Section */}
            <Card>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <Label>Zoek Materialen</Label>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                    <Input
                      data-testid="search-materials-input"
                      placeholder="Zoek op SKU, naam, categorie..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10"
                    />
                  </div>
                  <Button data-testid="search-button" onClick={handleSearch} disabled={searching} style={{backgroundColor: '#500000'}}>
                    {searching ? 'Zoeken...' : 'Zoek'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xl sm:text-2xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>
                  Zoekresultaten
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.map((material) => (
                    <Card key={material.id} data-testid={`material-card-${material.id}`}>
                      <CardContent className="p-4">
                        <div className="text-sm font-semibold" style={{color: '#64748B'}}>SKU: {material.sku}</div>
                        <h3 className="text-lg font-bold mt-1" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E293B'}}>
                          {material.name}
                        </h3>
                        {material.description && <p className="text-sm mt-1" style={{color: '#64748B'}}>{material.description}</p>}
                        {material.category && <div className="text-sm mt-2" style={{color: '#64748B'}}>Categorie: {material.category}</div>}
                        {material.brand && <div className="text-sm" style={{color: '#64748B'}}>Merk: {material.brand}</div>}
                        <div className="text-xl font-bold mt-3" style={{color: '#7a1f1f'}}>€{material.price.toFixed(2)}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
