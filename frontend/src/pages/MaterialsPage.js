import React, { useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Search, Package, Wrench } from 'lucide-react';
import { toast } from 'sonner';

export default function MaterialsPage() {
  const [activeTab, setActiveTab] = useState('materials'); // 'materials' or 'work'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

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
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });
      const itemType = activeTab === 'materials' ? 'materialen' : 'werk items';
      toast.success(`${response.data.count} ${itemType} geüpload!`);
      setFile(null);
      const uploadInput = document.getElementById(`csv-upload-${activeTab}`);
      if (uploadInput) uploadInput.value = '';
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
      const response = await axios.get(`${API}${endpoint}?q=${encodeURIComponent(searchQuery)}`, { withCredentials: true });
      setSearchResults(activeTab === 'materials' ? response.data.results || response.data : response.data);
      toast.success(`${response.data.length || response.data.count || 0} resultaten gevonden`);
    } catch (error) {
      toast.error('Zoeken mislukt');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <DashboardLayout showBackToDashboard={true}>
      <div data-testid="materials-page" className="space-y-6">
        <h1 className="text-4xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E40AF'}}>
          Catalogus Beheer
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => { setActiveTab('materials'); setSearchResults([]); setSearchQuery(''); }}
            className={`px-6 py-3 font-semibold transition-colors flex items-center gap-2 ${
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
            className={`px-6 py-3 font-semibold transition-colors flex items-center gap-2 ${
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
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>Upload CSV Catalogus</Label>
              <div className="flex gap-4 mt-2">
                <Input
                  id={`csv-upload-${activeTab}`}
                  data-testid="csv-upload-input"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                <Button data-testid="upload-csv-button" onClick={handleUpload} disabled={uploading} style={{backgroundColor: '#1E40AF'}}>
                  {uploading ? 'Uploaden...' : <><Upload className="mr-2" size={20} /> Upload</>}
                </Button>
              </div>
              {activeTab === 'materials' ? (
                <p className="text-sm mt-2" style={{color: '#64748B'}}>
                  CSV moet kolommen bevatten: <strong>sku, name, price</strong> (optioneel: description, category, brand)
                </p>
              ) : (
                <p className="text-sm mt-2" style={{color: '#64748B'}}>
                  CSV moet kolommen bevatten: <strong>titel, eenheid, verkoopprijs</strong>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Search Section */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <Label>Zoek {activeTab === 'materials' ? 'Materialen' : 'Werk Items'}</Label>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <Input
                  data-testid="search-materials-input"
                  placeholder={activeTab === 'materials' ? 'Zoek op SKU, naam, categorie...' : 'Zoek op titel, eenheid...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button data-testid="search-button" onClick={handleSearch} disabled={searching} style={{backgroundColor: '#1E40AF'}}>
                {searching ? 'Zoeken...' : 'Zoek'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E40AF'}}>
              Zoekresultaten
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTab === 'materials' ? (
                // Materials Results
                searchResults.map((material) => (
                  <Card key={material.id} data-testid={`material-card-${material.id}`}>
                    <CardContent className="p-4">
                      <div className="text-sm font-semibold" style={{color: '#64748B'}}>SKU: {material.sku}</div>
                      <h3 className="text-lg font-bold mt-1" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E293B'}}>
                        {material.name}
                      </h3>
                      {material.description && <p className="text-sm mt-1" style={{color: '#64748B'}}>{material.description}</p>}
                      {material.category && <div className="text-sm mt-2" style={{color: '#64748B'}}>Categorie: {material.category}</div>}
                      {material.brand && <div className="text-sm" style={{color: '#64748B'}}>Merk: {material.brand}</div>}
                      <div className="text-xl font-bold mt-3" style={{color: '#3B82F6'}}>€{material.price.toFixed(2)}</div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                // Work Items Results
                searchResults.map((workItem) => (
                  <Card key={workItem.id} data-testid={`work-item-card-${workItem.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Wrench size={16} className="text-blue-600" />
                        <span className="text-sm font-semibold" style={{color: '#64748B'}}>Eenheid: {workItem.unit}</span>
                      </div>
                      <h3 className="text-lg font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E293B'}}>
                        {workItem.title}
                      </h3>
                      <div className="text-xl font-bold mt-3" style={{color: '#3B82F6'}}>€{workItem.price.toFixed(2)} / {workItem.unit}</div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
