import React, { useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Upload, Download, Trash2, FileText, Loader2, Folder } from 'lucide-react';
import { toast } from 'sonner';

export default function Project3DDesignTab({ project, onUpdate }) {
  const [designs, setDesigns] = useState(project.design_3d_files || []);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(
          `${API}/projects/${project.id}/designs`,
          formData,
          { 
            withCredentials: true,
            headers: { 'Content-Type': 'multipart/form-data' }
          }
        );

        setDesigns(prev => [...prev, response.data]);
      }
      
      toast.success(`${files.length} bestand(en) geüpload! 🏗️`);
      onUpdate();
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Kon bestand niet uploaden');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (filename) => {
    if (!window.confirm(`Weet je zeker dat je "${filename}" wilt verwijderen?`)) {
      return;
    }

    try {
      await axios.delete(
        `${API}/projects/${project.id}/designs?filename=${encodeURIComponent(filename)}`,
        { withCredentials: true }
      );
      
      setDesigns(prev => prev.filter(d => d.filename !== filename));
      toast.success('Bestand verwijderd');
      onUpdate();
    } catch (error) {
      console.error('Delete file error:', error);
      toast.error('Kon bestand niet verwijderen');
    }
  };

  const handleDownload = (design) => {
    const link = document.createElement('a');
    link.href = `${process.env.REACT_APP_BACKEND_URL}${design.url}`;
    link.download = design.filename;
    link.click();
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️';
    if (['pdf'].includes(ext)) return '📄';
    if (['dwg', 'dxf'].includes(ext)) return '📐';
    if (['skp', 'obj', 'fbx', '3ds'].includes(ext)) return '🏗️';
    return '📁';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold" style={{color: '#1E3A8A'}}>
              🏗️ 3D Ontwerpen & Tekeningen
            </h3>
            <label>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <Button disabled={uploading} asChild>
                <span>
                  {uploading ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={20} />
                      Uploaden...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2" size={20} />
                      Bestanden Uploaden
                    </>
                  )}
                </span>
              </Button>
            </label>
          </div>

          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm" style={{color: '#1E40AF'}}>
              <strong>Ondersteunde bestanden:</strong> PDF, DWG, DXF, SketchUp, OBJ, FBX, 3DS, afbeeldingen
            </p>
          </div>

          {designs.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg" style={{borderColor: '#E5E7EB'}}>
              <Folder size={48} className="mx-auto mb-4" style={{color: '#94A3B8'}} />
              <p className="text-sm" style={{color: '#64748B'}}>
                Nog geen 3D ontwerpen of tekeningen geüpload
              </p>
              <p className="text-xs mt-1" style={{color: '#94A3B8'}}>
                Upload je 3D ontwerpen, plattegronden en technische tekeningen
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {designs.map((design, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  style={{borderColor: '#E5E7EB'}}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <span className="text-3xl">{getFileIcon(design.filename)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" style={{color: '#1E3A8A'}}>
                        {design.filename}
                      </p>
                      <p className="text-xs" style={{color: '#94A3B8'}}>
                        Geüpload: {new Date(design.upload_date).toLocaleDateString('nl-NL')}
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(design)}
                      title="Download"
                    >
                      <Download size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFile(design.filename)}
                      className="hover:bg-red-50 hover:text-red-600"
                      title="Verwijderen"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm font-medium" style={{color: '#92400E'}}>
          💡 <strong>Workflow tip:</strong>
        </p>
        <p className="text-sm mt-1" style={{color: '#78350F'}}>
          1. Maak foto's bij eerste bezoek<br/>
          2. Werk 3D ontwerpen uit op basis van foto's en notities<br/>
          3. Upload de ontwerpen hier<br/>
          4. Gebruik deze ontwerpen bij het maken van de offerte
        </p>
      </div>
    </div>
  );
}
