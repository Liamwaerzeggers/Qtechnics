import React, { useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function MaterialsPage() {
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

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const response = await axios.post(`${API}/materials/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`${response.data.count} materialen geüpload!`);
      setFile(null);
      document.getElementById('csv-upload').value = '';
    } catch (error) {
      toast.error('Kon CSV niet uploaden');
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await axios.get(`${API}/materials/search?q=${encodeURIComponent(searchQuery)}`, { withCredentials: true });
      setSearchResults(response.data.results);
      toast.success(`${response.data.count} resultaten gevonden`);
    } catch (error) {
      toast.error('Zoeken mislukt');
    } finally {
      setSearching(false);
    }
  };

  return (
    <DashboardLayout showBackToDashboard={true}>
      <div data-testid="materials-page" className="space-y-6">
        <h1 className="text-4xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E40AF'}}>Materialen Catalogus</h1>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>Upload CSV Catalogus</Label>
              <div className="flex gap-4 mt-2">
                <Input
                  id="csv-upload"
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
              <p className="text-sm mt-2" style={{color: '#64748B'}}>CSV moet kolommen bevatten: sku, name, price (optioneel: description, category, brand)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <Label>Zoek Materialen</Label>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <Input
                  data-testid="search-materials-input"
                  placeholder="Zoek op SKU, naam, categorie, merk..."
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

        {searchResults.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E40AF'}}>Zoekresultaten</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((material) => (
                <Card key={material.id} data-testid={`material-card-${material.id}`}>
                  <CardContent className="p-4">
                    <div className="text-sm font-semibold" style={{color: '#64748B'}}>SKU: {material.sku}</div>
                    <h3 className="text-lg font-bold mt-1" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E293B'}}>{material.name}</h3>
                    {material.description && <p className="text-sm mt-1" style={{color: '#64748B'}}>{material.description}</p>}
                    {material.category && <div className="text-sm mt-2" style={{color: '#64748B'}}>Categorie: {material.category}</div>}
                    {material.brand && <div className="text-sm" style={{color: '#64748B'}}>Merk: {material.brand}</div>}
                    <div className="text-xl font-bold mt-3" style={{color: '#3B82F6'}}>€{material.price.toFixed(2)}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}