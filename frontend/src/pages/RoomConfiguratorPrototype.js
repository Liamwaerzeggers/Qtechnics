import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Square, 
  Trash2, 
  Plus, 
  FileText, 
  Palette,
  Layers,
  Image,
  Calculator,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  Package,
  Check,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: \`Bearer \${token}\` } : {};
};

// Default colors for materials (visual only, no price impact)
const DEFAULT_COLORS = [
  { name: 'Wit', hex: '#FFFFFF' },
  { name: 'Crème', hex: '#FFFDD0' },
  { name: 'Grijs', hex: '#9CA3AF' },
  { name: 'Antraciet', hex: '#374151' },
  { name: 'Zwart', hex: '#1F2937' },
  { name: 'Beige', hex: '#D4A574' },
  { name: 'Bruin', hex: '#8B5A2B' },
  { name: 'Eik', hex: '#C4A77D' },
  { name: 'Walnoot', hex: '#5D4037' },
];

export default function RoomConfiguratorPrototype() {
  const canvasRef = useRef(null);
  
  // Data from backend
  const [workItems, setWorkItems] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Rooms state
  const [rooms, setRooms] = useState([
    { 
      id: 1, 
      name: 'Woonkamer', 
      width: 5, 
      length: 4, 
      height: 2.7,
      x: 50, 
      y: 50,
      floor: { workItem: null, color: DEFAULT_COLORS[5] },
      walls: { workItem: null, color: DEFAULT_COLORS[0] },
      ceiling: { workItem: null, color: DEFAULT_COLORS[0] },
      products: []  // Meubels/producten
    }
  ]);
  const [selectedRoom, setSelectedRoom] = useState(1);
  const [activeTab, setActiveTab] = useState('rooms');
  const [zoom, setZoom] = useState(1);
  
  // Selection state for two-step process
  const [selectedWorkItem, setSelectedWorkItem] = useState(null);
  
  const currentRoom = rooms.find(r => r.id === selectedRoom);

  // Fetch data from backend
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [workItemsRes, materialsRes] = await Promise.all([
        axios.get(`${API}/work-items/all`, { headers: getAuthHeaders() }),
        axios.get(`${API}/configurator/materials`, { headers: getAuthHeaders() })
      ]);
      
      setWorkItems(workItemsRes.data.work_items || []);
      setMaterials(materialsRes.data.materials || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Kon data niet laden');
    } finally {
      setLoading(false);
    }
  };

  // Group work items by category
  const groupedWorkItems = {
    vloer: workItems.filter(w => 
      w.category?.toLowerCase().includes('vloer') || 
      w.title?.toLowerCase().includes('vloer') ||
      w.title?.toLowerCase().includes('tegels') ||
      w.title?.toLowerCase().includes('parket') ||
      w.title?.toLowerCase().includes('laminaat')
    ),
    muur: workItems.filter(w => 
      w.category?.toLowerCase().includes('muur') || 
      w.title?.toLowerCase().includes('muur') ||
      w.title?.toLowerCase().includes('verf') ||
      w.title?.toLowerCase().includes('schilder') ||
      w.title?.toLowerCase().includes('behang') ||
      w.title?.toLowerCase().includes('stuc')
    ),
    plafond: workItems.filter(w => 
      w.category?.toLowerCase().includes('plafond') || 
      w.title?.toLowerCase().includes('plafond')
    ),
  };

  // Products/furniture from materials
  const products = materials.filter(m => 
    m.category?.toLowerCase().includes('meubel') ||
    m.category?.toLowerCase().includes('product') ||
    m.category?.toLowerCase().includes('furniture')
  );

  // Calculate prices
  const calculateRoomPrice = (room) => {
    const floorArea = room.width * room.length;
    const wallArea = 2 * (room.width + room.length) * room.height;
    const ceilingArea = room.width * room.length;
    
    const floorPrice = floorArea * (room.floor?.workItem?.price || 0);
    const wallPrice = wallArea * (room.walls?.workItem?.price || 0);
    const ceilingPrice = ceilingArea * (room.ceiling?.workItem?.price || 0);
    const productsPrice = room.products.reduce((sum, p) => sum + (p.price || 0), 0);
    
    return {
      floorArea,
      wallArea,
      ceilingArea,
      floorPrice,
      wallPrice,
      ceilingPrice,
      productsPrice,
      total: floorPrice + wallPrice + ceilingPrice + productsPrice
    };
  };

  const totalPrice = rooms.reduce((sum, room) => sum + calculateRoomPrice(room).total, 0);

  // Room management
  const addRoom = () => {
    const newId = Math.max(...rooms.map(r => r.id), 0) + 1;
    setRooms([...rooms, {
      id: newId,
      name: `Kamer ${newId}`,
      width: 4,
      length: 3,
      height: 2.7,
      x: 50 + (newId - 1) * 20,
      y: 50 + (newId - 1) * 20,
      floor: { workItem: null, color: DEFAULT_COLORS[5] },
      walls: { workItem: null, color: DEFAULT_COLORS[0] },
      ceiling: { workItem: null, color: DEFAULT_COLORS[0] },
      products: []
    }]);
    setSelectedRoom(newId);
  };

  const updateRoom = (id, updates) => {
    setRooms(rooms.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const deleteRoom = (id) => {
    if (rooms.length <= 1) {
      toast.error('Je hebt minimaal één kamer nodig');
      return;
    }
    setRooms(rooms.filter(r => r.id !== id));
    if (selectedRoom === id) {
      setSelectedRoom(rooms.find(r => r.id !== id)?.id || 1);
    }
  };

  // Select work item for surface
  const selectWorkItemForSurface = (surfaceType, workItem) => {
    if (!currentRoom) return;
    updateRoom(currentRoom.id, {
      [surfaceType]: { 
        ...currentRoom[surfaceType], 
        workItem: workItem 
      }
    });
    setSelectedWorkItem(null);
    toast.success(`${workItem.title} geselecteerd voor ${surfaceType}`);
  };

  // Select color for surface
  const selectColorForSurface = (surfaceType, color) => {
    if (!currentRoom) return;
    updateRoom(currentRoom.id, {
      [surfaceType]: { 
        ...currentRoom[surfaceType], 
        color: color 
      }
    });
  };

  // Add product to room
  const addProductToRoom = (product) => {
    if (!currentRoom) return;
    updateRoom(currentRoom.id, {
      products: [...currentRoom.products, { ...product, instanceId: Date.now() }]
    });
    toast.success(`${product.name} toegevoegd!`);
  };

  const removeProductFromRoom = (instanceId) => {
    if (!currentRoom) return;
    updateRoom(currentRoom.id, {
      products: currentRoom.products.filter(p => p.instanceId !== instanceId)
    });
  };

  const generateQuote = () => {
    toast.success('Offerte gegenereerd! (Functionaliteit wordt gekoppeld aan offerte systeem)');
  };

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const scale = 40 * zoom;
    
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += scale) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += scale) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    // Draw rooms
    rooms.forEach(room => {
      const x = room.x;
      const y = room.y;
      const w = room.width * scale;
      const h = room.length * scale;
      
      // Floor fill with selected color
      ctx.fillStyle = room.floor?.color?.hex || '#F3F4F6';
      ctx.fillRect(x, y, w, h);
      
      // Room outline
      ctx.strokeStyle = room.id === selectedRoom ? '#7a1f1f' : '#64748B';
      ctx.lineWidth = room.id === selectedRoom ? 3 : 2;
      ctx.strokeRect(x, y, w, h);
      
      // Room label
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(room.name, x + w/2, y + h/2 - 20);
      
      // Dimensions
      ctx.font = '12px Inter, sans-serif';
      ctx.fillStyle = '#64748B';
      ctx.fillText(`${room.width}m × ${room.length}m = ${(room.width * room.length).toFixed(1)}m²`, x + w/2, y + h/2);
      
      // Selected materials
      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = '#7a1f1f';
      if (room.floor?.workItem) {
        ctx.fillText(`Vloer: ${room.floor.workItem.title}`, x + w/2, y + h/2 + 15);
      }
    });
    
    ctx.fillStyle = '#64748B';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Schaal: 1m = ${scale.toFixed(0)}px`, 10, canvas.height - 10);
    
  }, [rooms, selectedRoom, zoom]);

  // Render work item selection with two-step process
  const renderWorkItemSelection = (surfaceType, surfaceLabel, icon) => {
    const surfaceWorkItems = groupedWorkItems[surfaceType] || [];
    const currentSelection = currentRoom?.[surfaceType];
    
    // Calculate area for price preview
    let area = 0;
    if (surfaceType === 'vloer' || surfaceType === 'plafond') {
      area = currentRoom ? currentRoom.width * currentRoom.length : 0;
    } else if (surfaceType === 'muur') {
      area = currentRoom ? 2 * (currentRoom.width + currentRoom.length) * currentRoom.height : 0;
    }
    
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {icon} {surfaceLabel}
          </CardTitle>
          <p className="text-xs text-gray-500">
            Kamer: {currentRoom?.name} ({area.toFixed(1)} m²)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Select Work Type (determines price) */}
          <div>
            <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">1</span>
              Kies Type (bepaalt prijs)
            </Label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {surfaceWorkItems.length > 0 ? (
                surfaceWorkItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => selectWorkItemForSurface(surfaceType, item)}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      currentSelection?.workItem?.id === item.id
                        ? 'border-blue-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-gray-500">€{item.price?.toFixed(2)}/{item.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        €{(area * (item.price || 0)).toFixed(2)}
                      </p>
                      {currentSelection?.workItem?.id === item.id && (
                        <Check size={16} className="text-blue-600 ml-auto" />
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  <p>Geen werk items gevonden voor {surfaceLabel.toLowerCase()}</p>
                  <p className="text-xs mt-1">Voeg werk items toe in Catalogusbeheer met categorie "{surfaceType}"</p>
                </div>
              )}
              
              {/* Show all work items if category-specific ones are empty */}
              {surfaceWorkItems.length === 0 && workItems.length > 0 && (
                <div className="border-t pt-2 mt-2">
                  <p className="text-xs text-gray-500 mb-2">Of kies uit alle werk items:</p>
                  {workItems.slice(0, 10).map(item => (
                    <div
                      key={item.id}
                      onClick={() => selectWorkItemForSurface(surfaceType, item)}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all text-sm ${
                        currentSelection?.workItem?.id === item.id
                          ? 'border-blue-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span>{item.title}</span>
                      <span className="text-green-600">€{(area * (item.price || 0)).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Select Color (no price impact) */}
          {currentSelection?.workItem && (
            <div className="border-t pt-4">
              <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">2</span>
                Kies Kleur (geen prijsimpact)
              </Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_COLORS.map(color => (
                  <button
                    key={color.name}
                    onClick={() => selectColorForSurface(surfaceType, color)}
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${
                      currentSelection?.color?.name === color.name
                        ? 'border-blue-500 ring-2 ring-blue-300'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Geselecteerd: {currentSelection?.color?.name || 'Geen'}
              </p>
            </div>
          )}

          {/* Summary */}
          {currentSelection?.workItem && (
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-800">
                ✓ {currentSelection.workItem.title}
                {currentSelection.color && ` - ${currentSelection.color.name}`}
              </p>
              <p className="text-lg font-bold text-green-700">
                €{(area * (currentSelection.workItem.price || 0)).toFixed(2)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <DashboardLayout showBackToDashboard={true}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2">Data laden...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout showBackToDashboard={true}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏠</span>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{color: '#500000'}}>
                Kamer Configurator
              </h1>
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                PROTOTYPE
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Teken kamers, kies materialen en ontvang direct een offerte
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right mr-4">
              <p className="text-xs text-gray-500">Totaal geschat</p>
              <p className="text-2xl font-bold" style={{color: '#10B981'}}>
                €{totalPrice.toFixed(2)}
              </p>
            </div>
            <Button onClick={generateQuote} style={{backgroundColor: '#10B981'}}>
              <FileText className="mr-2" size={18} />
              Genereer Offerte
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Panel - Tools */}
          <div className="lg:col-span-1 space-y-4">
            {/* Tool Tabs */}
            <Card>
              <CardContent className="p-2">
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'rooms', icon: Square, label: 'Kamers' },
                    { id: 'floor', icon: Layers, label: 'Vloer' },
                    { id: 'walls', icon: Palette, label: 'Muren' },
                    { id: 'ceiling', icon: Layers, label: 'Plafond' },
                    { id: 'products', icon: Package, label: 'Producten' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-red-100 text-red-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <tab.icon size={16} />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Rooms Panel */}
            {activeTab === 'rooms' && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>📐 Kamers</span>
                    <Button size="sm" onClick={addRoom} variant="outline">
                      <Plus size={14} className="mr-1" /> Nieuwe Kamer
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rooms.map(room => (
                    <div
                      key={room.id}
                      onClick={() => setSelectedRoom(room.id)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedRoom === room.id
                          ? 'border-blue-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <input
                          type="text"
                          value={room.name}
                          onChange={(e) => updateRoom(room.id, { name: e.target.value })}
                          className="font-medium bg-transparent border-none outline-none w-full"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteRoom(room.id); }}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <Label className="text-xs text-gray-500">Breedte</Label>
                          <div className="flex items-center">
                            <Input
                              type="number"
                              step="0.1"
                              value={room.width}
                              onChange={(e) => updateRoom(room.id, { width: parseFloat(e.target.value) || 0 })}
                              className="h-8 text-sm"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="ml-1 text-xs text-gray-500">m</span>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Lengte</Label>
                          <div className="flex items-center">
                            <Input
                              type="number"
                              step="0.1"
                              value={room.length}
                              onChange={(e) => updateRoom(room.id, { length: parseFloat(e.target.value) || 0 })}
                              className="h-8 text-sm"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="ml-1 text-xs text-gray-500">m</span>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Hoogte</Label>
                          <div className="flex items-center">
                            <Input
                              type="number"
                              step="0.1"
                              value={room.height}
                              onChange={(e) => updateRoom(room.id, { height: parseFloat(e.target.value) || 0 })}
                              className="h-8 text-sm"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="ml-1 text-xs text-gray-500">m</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Oppervlakte: <strong>{(room.width * room.length).toFixed(1)} m²</strong>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Floor Selection */}
            {activeTab === 'floor' && currentRoom && renderWorkItemSelection('vloer', '🟫 Vloer', <Layers size={18} />)}

            {/* Walls Selection */}
            {activeTab === 'walls' && currentRoom && renderWorkItemSelection('muur', '🧱 Muren', <Palette size={18} />)}

            {/* Ceiling Selection */}
            {activeTab === 'ceiling' && currentRoom && renderWorkItemSelection('plafond', '⬜ Plafond', <Layers size={18} />)}

            {/* Products/Furniture */}
            {activeTab === 'products' && currentRoom && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">🪑 Producten & Meubels</CardTitle>
                  <p className="text-xs text-gray-500">
                    Uit je materialen catalogus (categorie: "Meubel" of "Product")
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {products.length > 0 ? (
                    <div className="space-y-2 max-h-[250px] overflow-y-auto">
                      {products.map(product => (
                        <div
                          key={product.id}
                          onClick={() => addProductToRoom(product)}
                          className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 cursor-pointer transition-all"
                        >
                          {product.image_url ? (
                            <img 
                              src={product.image_url.startsWith('http') ? product.image_url : `${API.replace('/api', '')}${product.image_url}`}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-2xl">
                              📦
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            <p className="text-xs text-gray-500">{product.category}</p>
                          </div>
                          <span className="font-bold text-green-600">€{product.price?.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <Package size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Geen producten gevonden</p>
                      <p className="text-xs mt-1">
                        Voeg materialen toe in Catalogusbeheer met categorie "Meubel" of "Product"
                      </p>
                    </div>
                  )}
                  
                  {/* Selected Products */}
                  {currentRoom.products.length > 0 && (
                    <div className="border-t pt-3 mt-3">
                      <p className="text-xs font-medium text-gray-500 mb-2">In {currentRoom.name}:</p>
                      <div className="space-y-1">
                        {currentRoom.products.map(p => (
                          <div key={p.instanceId} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                            <span className="truncate flex-1">{p.name}</span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-green-600">€{p.price?.toFixed(2)}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); removeProductFromRoom(p.instanceId); }}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Center - Canvas & Summary */}
          <div className="lg:col-span-2 space-y-4">
            {/* Canvas Controls */}
            <Card>
              <CardContent className="p-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>
                    <ZoomOut size={16} />
                  </Button>
                  <span className="text-sm text-gray-500">{Math.round(zoom * 100)}%</span>
                  <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(2, zoom + 0.25))}>
                    <ZoomIn size={16} />
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  setRooms([{
                    id: 1, name: 'Woonkamer', width: 5, length: 4, height: 2.7,
                    x: 50, y: 50,
                    floor: { workItem: null, color: DEFAULT_COLORS[5] },
                    walls: { workItem: null, color: DEFAULT_COLORS[0] },
                    ceiling: { workItem: null, color: DEFAULT_COLORS[0] },
                    products: []
                  }]);
                  setSelectedRoom(1);
                }}>
                  <RotateCcw size={16} className="mr-1" /> Reset
                </Button>
              </CardContent>
            </Card>

            {/* Canvas */}
            <Card className="overflow-hidden">
              <canvas
                ref={canvasRef}
                width={800}
                height={400}
                className="w-full cursor-crosshair"
                onClick={(e) => {
                  const rect = e.target.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  const scale = 40 * zoom;
                  
                  const clickedRoom = rooms.find(room => {
                    const rx = room.x;
                    const ry = room.y;
                    const rw = room.width * scale;
                    const rh = room.length * scale;
                    return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
                  });
                  
                  if (clickedRoom) {
                    setSelectedRoom(clickedRoom.id);
                  }
                }}
              />
            </Card>

            {/* Price Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator size={18} />
                  Prijsoverzicht
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rooms.map(room => {
                    const prices = calculateRoomPrice(room);
                    return (
                      <div 
                        key={room.id} 
                        className={`p-3 rounded-lg border ${selectedRoom === room.id ? 'border-blue-300 bg-red-50' : 'border-gray-200'}`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold">{room.name}</span>
                          <span className="font-bold text-green-600">€{prices.total.toFixed(2)}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-600">
                          <div>
                            <span className="block text-gray-400">Vloer</span>
                            {room.floor?.workItem ? (
                              <span>{room.floor.workItem.title}: €{prices.floorPrice.toFixed(0)}</span>
                            ) : (
                              <span className="text-gray-400">Niet gekozen</span>
                            )}
                          </div>
                          <div>
                            <span className="block text-gray-400">Muren</span>
                            {room.walls?.workItem ? (
                              <span>{room.walls.workItem.title}: €{prices.wallPrice.toFixed(0)}</span>
                            ) : (
                              <span className="text-gray-400">Niet gekozen</span>
                            )}
                          </div>
                          <div>
                            <span className="block text-gray-400">Plafond</span>
                            {room.ceiling?.workItem ? (
                              <span>{room.ceiling.workItem.title}: €{prices.ceilingPrice.toFixed(0)}</span>
                            ) : (
                              <span className="text-gray-400">Niet gekozen</span>
                            )}
                          </div>
                          <div>
                            <span className="block text-gray-400">Producten</span>
                            <span>{room.products.length} items: €{prices.productsPrice.toFixed(0)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Grand Total */}
                  <div className="pt-3 border-t-2 flex justify-between items-center">
                    <span className="text-lg font-bold">Totaal excl. BTW</span>
                    <span className="text-2xl font-bold" style={{color: '#10B981'}}>
                      €{totalPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>BTW 21%</span>
                    <span>€{(totalPrice * 0.21).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">Totaal incl. BTW</span>
                    <span className="text-2xl font-bold" style={{color: '#500000'}}>
                      €{(totalPrice * 1.21).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Info Banner */}
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h4 className="font-semibold text-blue-800">Data uit je Catalogus</h4>
                <p className="text-sm text-red-700 mt-1">
                  De configurator haalt nu prijzen uit je echte database:
                </p>
                <ul className="text-sm text-red-700 mt-2 space-y-1 list-disc list-inside">
                  <li><strong>Werk items</strong> ({workItems.length} geladen) → voor vloer, muur, plafond werk</li>
                  <li><strong>Materialen</strong> ({materials.length} geladen) → voor producten/meubels</li>
                  <li>Voeg <strong>categorie</strong> toe aan werk items (vloer, muur, plafond) voor betere filtering</li>
                  <li>Voeg materialen toe met categorie <strong>&quot;Meubel&quot;</strong> of <strong>&quot;Product&quot;</strong> voor de producten tab</li>
                  <li>Upload <strong>afbeeldingen</strong> bij materialen via Catalogusbeheer</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
