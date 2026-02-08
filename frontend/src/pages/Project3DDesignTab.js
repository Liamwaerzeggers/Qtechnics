import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Upload, Download, Trash2, Loader2, Folder, FolderOpen, ChevronDown, ChevronRight, Plus, X, Image as ImageIcon, Eye } from 'lucide-react';
import { toast } from 'sonner';

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer \${token}` } : {};
};

const ROOM_OPTIONS = [
  'Badkamer', 'Keuken', 'Woonkamer', 'Slaapkamer', 'Toilet', 
  'Gang', 'Garage', 'Tuin', 'Zolder', 'Kelder', 'Algemeen'
];

export default function Project3DDesignTab({ project, onUpdate }) {
  const [designs, setDesigns] = useState(project.design_3d_files || []);
  const [uploading, setUploading] = useState(false);
  const [expandedRooms, setExpandedRooms] = useState({ 'Algemeen': true });
  const [selectedRoom, setSelectedRoom] = useState('Algemeen');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);

  // Sync designs state when project changes
  useEffect(() => {
    console.log('Project design_3d_files:', project.design_3d_files);
    setDesigns(project.design_3d_files || []);
  }, [project.design_3d_files]);

  // Get base URL for images
  const getImageUrl = (design) => {
    if (!design.url) return null;
    const baseUrl = process.env.REACT_APP_BACKEND_URL || '';
    return `${baseUrl}${design.url}`;
  };

  // Check if file is an image
  const isImage = (filename) => {
    const ext = filename?.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  };

  // Group designs by room
  const getDesignsByRoom = () => {
    const grouped = {};
    
    // Initialize all rooms
    ROOM_OPTIONS.forEach(room => {
      grouped[room] = [];
    });
    
    // Group designs
    designs.forEach(design => {
      const room = design.room || 'Algemeen';
      if (!grouped[room]) grouped[room] = [];
      grouped[room].push(design);
    });
    
    // Return only rooms with designs, plus always show Algemeen
    return Object.entries(grouped).filter(([room, items]) => 
      items.length > 0 || room === 'Algemeen'
    );
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploading(true);
    setShowUploadModal(false);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(
          `${API}/projects/${project.id}/designs?room=${encodeURIComponent(selectedRoom)}`,
          formData,
          { 
            headers: getAuthHeaders(), headers: { 'Content-Type': 'multipart/form-data' }
          }
        );

        setDesigns(prev => [...prev, response.data]);
      }
      
      // Expand the room we just uploaded to
      setExpandedRooms(prev => ({ ...prev, [selectedRoom]: true }));
      
      toast.success(`${files.length} bestand(en) geüpload naar ${selectedRoom}! 🏗️`);
      onUpdate();
    } catch (error) {
      console.error('File upload error:', error);
      toast.error(error.response?.data?.detail || 'Kon bestand niet uploaden');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (design) => {
    const filename = design.filename || design.original_filename;
    if (!window.confirm(`Weet je zeker dat je "${design.original_filename || filename}" wilt verwijderen?`)) {
      return;
    }

    try {
      await axios.delete(
        `${API}/projects/${project.id}/designs?filename=${encodeURIComponent(filename)}`,
        { headers: getAuthHeaders() }
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
    const url = getImageUrl(design);
    if (url) {
      window.open(url, '_blank');
    }
  };

  const toggleRoom = (room) => {
    setExpandedRooms(prev => ({ ...prev, [room]: !prev[room] }));
  };

  const groupedDesigns = getDesignsByRoom();
  const totalDesigns = designs.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold" style={{color: '#3a190b'}}>
                🏗️ 3D Ontwerpen & Tekeningen
              </h3>
              <p className="text-sm" style={{color: '#64748B'}}>
                {totalDesigns} bestand{totalDesigns !== 1 ? 'en' : ''} in {groupedDesigns.filter(([,items]) => items.length > 0).length} map{groupedDesigns.filter(([,items]) => items.length > 0).length !== 1 ? 'pen' : ''}
              </p>
            </div>
            <Button 
              onClick={() => setShowUploadModal(true)} 
              disabled={uploading}
              style={{backgroundColor: '#500000', color: 'white'}}
            >
              {uploading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Uploaden...
                </>
              ) : (
                <>
                  <Upload className="mr-2" size={20} />
                  Uploaden
                </>
              )}
            </Button>
          </div>

          <div className="mb-4 p-3 bg-red-50 rounded-lg">
            <p className="text-sm" style={{color: '#500000'}}>
              <strong>Ondersteunde bestanden:</strong> Afbeeldingen (JPG, PNG, GIF, WEBP), PDF, SketchUp, OBJ, FBX, 3DS
            </p>
          </div>

          {/* Room folders */}
          <div className="space-y-3">
            {groupedDesigns.map(([room, roomDesigns]) => (
              <div key={room} className="border rounded-lg overflow-hidden" style={{borderColor: '#E5E7EB'}}>
                {/* Room header */}
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleRoom(room)}
                  style={{backgroundColor: roomDesigns.length > 0 ? '#F8FAFC' : 'white'}}
                >
                  <div className="flex items-center gap-3">
                    {expandedRooms[room] ? (
                      <FolderOpen size={20} style={{color: '#500000'}} />
                    ) : (
                      <Folder size={20} style={{color: '#500000'}} />
                    )}
                    <span className="font-medium" style={{color: '#1E293B'}}>
                      {room}
                    </span>
                    <span className="text-sm px-2 py-0.5 rounded-full" style={{
                      backgroundColor: roomDesigns.length > 0 ? '#f5e6e6' : '#F3F4F6',
                      color: roomDesigns.length > 0 ? '#500000' : '#6B7280'
                    }}>
                      {roomDesigns.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRoom(room);
                        setShowUploadModal(true);
                      }}
                    >
                      <Plus size={16} />
                    </Button>
                    {expandedRooms[room] ? (
                      <ChevronDown size={20} style={{color: '#64748B'}} />
                    ) : (
                      <ChevronRight size={20} style={{color: '#64748B'}} />
                    )}
                  </div>
                </div>

                {/* Room content */}
                {expandedRooms[room] && (
                  <div className="p-3 bg-white">
                    {roomDesigns.length === 0 ? (
                      <div className="text-center py-6 border-2 border-dashed rounded-lg" style={{borderColor: '#E5E7EB'}}>
                        <ImageIcon size={32} className="mx-auto mb-2" style={{color: '#94A3B8'}} />
                        <p className="text-sm" style={{color: '#64748B'}}>
                          Geen ontwerpen in deze map
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            setSelectedRoom(room);
                            setShowUploadModal(true);
                          }}
                        >
                          <Upload size={14} className="mr-1" />
                          Uploaden naar {room}
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {roomDesigns.map((design, idx) => (
                          <div
                            key={idx}
                            className="group relative border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                            style={{borderColor: '#E5E7EB'}}
                          >
                            {/* Thumbnail */}
                            <div 
                              className="aspect-square bg-gray-100 flex items-center justify-center cursor-pointer"
                              onClick={() => isImage(design.filename) && setPreviewImage(design)}
                            >
                              {isImage(design.filename) ? (
                                <img
                                  src={getImageUrl(design)}
                                  alt={design.original_filename}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div className={`flex-col items-center justify-center ${isImage(design.filename) ? 'hidden' : 'flex'}`}>
                                <span className="text-4xl">
                                  {design.filename?.endsWith('.pdf') ? '📄' : 
                                   design.filename?.endsWith('.skp') ? '🏗️' : '📁'}
                                </span>
                              </div>
                              
                              {/* Hover overlay for images */}
                              {isImage(design.filename) && (
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all">
                                  <Eye size={24} className="text-white opacity-0 group-hover:opacity-100" />
                                </div>
                              )}
                            </div>
                            
                            {/* File info */}
                            <div className="p-2">
                              <p className="text-xs font-medium truncate" style={{color: '#1E293B'}} title={design.original_filename}>
                                {design.original_filename || design.filename}
                              </p>
                              <p className="text-xs" style={{color: '#94A3B8'}}>
                                {new Date(design.uploaded_at || design.upload_date).toLocaleDateString('nl-NL')}
                              </p>
                            </div>
                            
                            {/* Action buttons */}
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleDownload(design)}
                                className="p-1.5 bg-white rounded-full shadow hover:bg-gray-100"
                                title="Download"
                              >
                                <Download size={14} style={{color: '#500000'}} />
                              </button>
                              <button
                                onClick={() => handleDeleteFile(design)}
                                className="p-1.5 bg-white rounded-full shadow hover:bg-red-50"
                                title="Verwijderen"
                              >
                                <Trash2 size={14} style={{color: '#EF4444'}} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{color: '#3a190b'}}>
                📁 Ontwerp Uploaden
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{color: '#374151'}}>
                  Kamer / Map
                </label>
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  style={{borderColor: '#E5E7EB'}}
                >
                  {ROOM_OPTIONS.map(room => (
                    <option key={room} value={room}>{room}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{color: '#374151'}}>
                  Bestanden
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.skp,.obj,.fbx,.3ds"
                  onChange={handleFileUpload}
                  className="w-full px-3 py-2 border rounded-lg"
                  style={{borderColor: '#E5E7EB'}}
                />
                <p className="text-xs mt-1" style={{color: '#94A3B8'}}>
                  Max 50MB per bestand. Meerdere bestanden tegelijk mogelijk.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowUploadModal(false)}
                className="flex-1"
              >
                Annuleren
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
          >
            <X size={24} />
          </button>
          <img
            src={getImageUrl(previewImage)}
            alt={previewImage.original_filename}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg">
            <p className="font-medium" style={{color: '#1E293B'}}>
              {previewImage.original_filename}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
