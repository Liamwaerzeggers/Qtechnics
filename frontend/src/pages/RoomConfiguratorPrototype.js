import React, { useState, useRef, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Square, 
  Move, 
  Trash2, 
  Plus, 
  FileText, 
  Palette,
  Layers,
  Image,
  ShoppingCart,
  Calculator,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

// Sample material data (would come from your catalog in real implementation)
const FLOOR_MATERIALS = [
  { id: 'parket-eik', name: 'Parket Eik', price: 45, unit: 'm²', color: '#D4A574' },
  { id: 'parket-walnoot', name: 'Parket Walnoot', price: 55, unit: 'm²', color: '#8B5A2B' },
  { id: 'laminaat-grijs', name: 'Laminaat Grijs', price: 25, unit: 'm²', color: '#9CA3AF' },
  { id: 'tegels-wit', name: 'Tegels Wit', price: 35, unit: 'm²', color: '#F3F4F6' },
  { id: 'tegels-zwart', name: 'Tegels Zwart', price: 38, unit: 'm²', color: '#374151' },
  { id: 'vinyl-houtlook', name: 'Vinyl Houtlook', price: 22, unit: 'm²', color: '#C4A77D' },
];

const WALL_MATERIALS = [
  { id: 'verf-wit', name: 'Verf Wit', price: 12, unit: 'm²', color: '#FFFFFF', border: true },
  { id: 'verf-grijs', name: 'Verf Grijs', price: 12, unit: 'm²', color: '#E5E7EB' },
  { id: 'verf-blauw', name: 'Verf Blauw', price: 14, unit: 'm²', color: '#BFDBFE' },
  { id: 'behang-textuur', name: 'Behang Textuur', price: 28, unit: 'm²', color: '#FEF3C7' },
  { id: 'tegels-metro', name: 'Metro Tegels', price: 42, unit: 'm²', color: '#F9FAFB' },
  { id: 'mortex', name: 'Mortex', price: 85, unit: 'm²', color: '#9CA3AF' },
  { id: 'wandpanelen', name: 'Wandpanelen Hout', price: 55, unit: 'm²', color: '#D4A574' },
];

const CEILING_MATERIALS = [
  { id: 'verf-plafond', name: 'Plafondverf Wit', price: 10, unit: 'm²', color: '#FFFFFF', border: true },
  { id: 'stucwerk', name: 'Stucwerk', price: 35, unit: 'm²', color: '#F3F4F6' },
  { id: 'plafondpanelen', name: 'Plafondpanelen', price: 28, unit: 'm²', color: '#E5E7EB' },
  { id: 'spanplafond', name: 'Spanplafond', price: 65, unit: 'm²', color: '#FAFAFA' },
];

const FURNITURE_CATALOG = [
  { id: 'kast-1', name: 'Wandkast Modern', price: 450, image: '🗄️', category: 'Kasten' },
  { id: 'kast-2', name: 'Boekenkast Eik', price: 380, image: '📚', category: 'Kasten' },
  { id: 'tafel-1', name: 'Eettafel 6p', price: 650, image: '🪑', category: 'Tafels' },
  { id: 'bank-1', name: 'Hoekbank Grijs', price: 1200, image: '🛋️', category: 'Zetels' },
  { id: 'bed-1', name: 'Boxspring 180x200', price: 890, image: '🛏️', category: 'Bedden' },
  { id: 'lamp-1', name: 'Hanglamp Design', price: 175, image: '💡', category: 'Verlichting' },
];

export default function RoomConfiguratorPrototype() {
  const canvasRef = useRef(null);
  const [rooms, setRooms] = useState([
    { 
      id: 1, 
      name: 'Woonkamer', 
      width: 5, 
      length: 4, 
      height: 2.7,
      x: 50, 
      y: 50,
      floor: FLOOR_MATERIALS[0],
      walls: WALL_MATERIALS[0],
      ceiling: CEILING_MATERIALS[0],
      furniture: []
    }
  ]);
  const [selectedRoom, setSelectedRoom] = useState(1);
  const [activeTab, setActiveTab] = useState('rooms'); // rooms, floor, walls, ceiling, furniture
  const [draggedFurniture, setDraggedFurniture] = useState(null);
  const [zoom, setZoom] = useState(1);
  
  const currentRoom = rooms.find(r => r.id === selectedRoom);

  // Calculate prices
  const calculateRoomPrice = (room) => {
    const floorArea = room.width * room.length;
    const wallArea = 2 * (room.width + room.length) * room.height;
    const ceilingArea = room.width * room.length;
    
    const floorPrice = floorArea * (room.floor?.price || 0);
    const wallPrice = wallArea * (room.walls?.price || 0);
    const ceilingPrice = ceilingArea * (room.ceiling?.price || 0);
    const furniturePrice = room.furniture.reduce((sum, f) => sum + f.price, 0);
    
    return {
      floorArea,
      wallArea,
      ceilingArea,
      floorPrice,
      wallPrice,
      ceilingPrice,
      furniturePrice,
      total: floorPrice + wallPrice + ceilingPrice + furniturePrice
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
      floor: FLOOR_MATERIALS[0],
      walls: WALL_MATERIALS[0],
      ceiling: CEILING_MATERIALS[0],
      furniture: []
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

  const addFurnitureToRoom = (furniture) => {
    if (!currentRoom) return;
    updateRoom(currentRoom.id, {
      furniture: [...currentRoom.furniture, { ...furniture, instanceId: Date.now() }]
    });
    toast.success(`${furniture.name} toegevoegd!`);
  };

  const removeFurnitureFromRoom = (instanceId) => {
    if (!currentRoom) return;
    updateRoom(currentRoom.id, {
      furniture: currentRoom.furniture.filter(f => f.instanceId !== instanceId)
    });
  };

  const generateQuote = () => {
    toast.success('Offerte gegenereerd! (Prototype - zou naar offerte pagina navigeren)');
  };

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const scale = 40 * zoom; // pixels per meter
    
    // Clear canvas
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
      
      // Floor fill
      ctx.fillStyle = room.floor?.color || '#F3F4F6';
      ctx.fillRect(x, y, w, h);
      
      // Room outline
      ctx.strokeStyle = room.id === selectedRoom ? '#3B82F6' : '#64748B';
      ctx.lineWidth = room.id === selectedRoom ? 3 : 2;
      ctx.strokeRect(x, y, w, h);
      
      // Room label
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(room.name, x + w/2, y + h/2 - 10);
      ctx.font = '12px Inter, sans-serif';
      ctx.fillStyle = '#64748B';
      ctx.fillText(`${room.width}m × ${room.length}m = ${(room.width * room.length).toFixed(1)}m²`, x + w/2, y + h/2 + 10);
      
      // Furniture icons
      room.furniture.forEach((f, idx) => {
        const fx = x + 20 + (idx % 3) * 40;
        const fy = y + h - 50 + Math.floor(idx / 3) * 30;
        ctx.font = '24px serif';
        ctx.fillText(f.image, fx, fy);
      });
    });
    
    // Scale indicator
    ctx.fillStyle = '#64748B';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Schaal: 1m = ${scale.toFixed(0)}px`, 10, canvas.height - 10);
    
  }, [rooms, selectedRoom, zoom]);

  return (
    <DashboardLayout showBackToDashboard={true}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏠</span>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{color: '#1E40AF'}}>
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
                    { id: 'furniture', icon: Image, label: 'Meubels' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-100 text-blue-700'
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
                          ? 'border-blue-500 bg-blue-50'
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

            {/* Floor Materials */}
            {activeTab === 'floor' && currentRoom && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">🟫 Vloermateriaal</CardTitle>
                  <p className="text-xs text-gray-500">
                    Kamer: {currentRoom.name} ({(currentRoom.width * currentRoom.length).toFixed(1)} m²)
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {FLOOR_MATERIALS.map(material => (
                    <div
                      key={material.id}
                      onClick={() => updateRoom(currentRoom.id, { floor: material })}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        currentRoom.floor?.id === material.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: material.color }}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{material.name}</p>
                        <p className="text-xs text-gray-500">€{material.price.toFixed(2)}/{material.unit}</p>
                      </div>
                      {currentRoom.floor?.id === material.id && (
                        <span className="text-xs font-medium text-blue-600">
                          €{(currentRoom.width * currentRoom.length * material.price).toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Wall Materials */}
            {activeTab === 'walls' && currentRoom && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">🧱 Muurafwerking</CardTitle>
                  <p className="text-xs text-gray-500">
                    Muuroppervlakte: {(2 * (currentRoom.width + currentRoom.length) * currentRoom.height).toFixed(1)} m²
                  </p>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                  {WALL_MATERIALS.map(material => (
                    <div
                      key={material.id}
                      onClick={() => updateRoom(currentRoom.id, { walls: material })}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        currentRoom.walls?.id === material.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded"
                        style={{ 
                          backgroundColor: material.color,
                          border: material.border ? '1px solid #E5E7EB' : 'none'
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{material.name}</p>
                        <p className="text-xs text-gray-500">€{material.price.toFixed(2)}/{material.unit}</p>
                      </div>
                      {currentRoom.walls?.id === material.id && (
                        <span className="text-xs font-medium text-blue-600">
                          €{(2 * (currentRoom.width + currentRoom.length) * currentRoom.height * material.price).toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Ceiling Materials */}
            {activeTab === 'ceiling' && currentRoom && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">⬜ Plafond</CardTitle>
                  <p className="text-xs text-gray-500">
                    Oppervlakte: {(currentRoom.width * currentRoom.length).toFixed(1)} m²
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {CEILING_MATERIALS.map(material => (
                    <div
                      key={material.id}
                      onClick={() => updateRoom(currentRoom.id, { ceiling: material })}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        currentRoom.ceiling?.id === material.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded"
                        style={{ 
                          backgroundColor: material.color,
                          border: material.border ? '1px solid #E5E7EB' : 'none'
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{material.name}</p>
                        <p className="text-xs text-gray-500">€{material.price.toFixed(2)}/{material.unit}</p>
                      </div>
                      {currentRoom.ceiling?.id === material.id && (
                        <span className="text-xs font-medium text-blue-600">
                          €{(currentRoom.width * currentRoom.length * material.price).toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Furniture Catalog */}
            {activeTab === 'furniture' && currentRoom && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">🪑 Meubel Catalogus</CardTitle>
                  <p className="text-xs text-gray-500">
                    Klik om toe te voegen aan {currentRoom.name}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
                  {FURNITURE_CATALOG.map(item => (
                    <div
                      key={item.id}
                      onClick={() => addFurnitureToRoom(item)}
                      className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 cursor-pointer transition-all"
                    >
                      <span className="text-3xl">{item.image}</span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.category}</p>
                      </div>
                      <span className="font-medium text-green-600">€{item.price}</span>
                    </div>
                  ))}
                </CardContent>
                
                {/* Selected Furniture */}
                {currentRoom.furniture.length > 0 && (
                  <div className="border-t pt-3 mt-3 px-4 pb-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">In deze kamer:</p>
                    <div className="space-y-1">
                      {currentRoom.furniture.map(f => (
                        <div key={f.instanceId} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                          <span>{f.image} {f.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-green-600">€{f.price}</span>
                            <button
                              onClick={() => removeFurnitureFromRoom(f.instanceId)}
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
              </Card>
            )}
          </div>

          {/* Center - Canvas */}
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
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    setRooms([{
                      id: 1, name: 'Woonkamer', width: 5, length: 4, height: 2.7,
                      x: 50, y: 50, floor: FLOOR_MATERIALS[0], walls: WALL_MATERIALS[0],
                      ceiling: CEILING_MATERIALS[0], furniture: []
                    }]);
                    setSelectedRoom(1);
                  }}>
                    <RotateCcw size={16} className="mr-1" /> Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Canvas */}
            <Card className="overflow-hidden">
              <canvas
                ref={canvasRef}
                width={800}
                height={500}
                className="w-full cursor-crosshair"
                onClick={(e) => {
                  const rect = e.target.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  const scale = 40 * zoom;
                  
                  // Check if click is inside any room
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
                        className={`p-3 rounded-lg border ${selectedRoom === room.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold">{room.name}</span>
                          <span className="font-bold text-green-600">€{prices.total.toFixed(2)}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-600">
                          <div>
                            <span className="block text-gray-400">Vloer</span>
                            {prices.floorArea.toFixed(1)}m² × €{room.floor?.price || 0} = €{prices.floorPrice.toFixed(0)}
                          </div>
                          <div>
                            <span className="block text-gray-400">Muren</span>
                            {prices.wallArea.toFixed(1)}m² × €{room.walls?.price || 0} = €{prices.wallPrice.toFixed(0)}
                          </div>
                          <div>
                            <span className="block text-gray-400">Plafond</span>
                            {prices.ceilingArea.toFixed(1)}m² × €{room.ceiling?.price || 0} = €{prices.ceilingPrice.toFixed(0)}
                          </div>
                          <div>
                            <span className="block text-gray-400">Meubels</span>
                            {room.furniture.length} items = €{prices.furniturePrice.toFixed(0)}
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
                    <span className="text-2xl font-bold" style={{color: '#1E40AF'}}>
                      €{(totalPrice * 1.21).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Info Banner */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h4 className="font-semibold text-yellow-800">Dit is een Prototype</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Dit demonstreert hoe de kamer configurator zou werken. In de volledige versie:
                </p>
                <ul className="text-sm text-yellow-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Materialen komen uit jullie catalogusbeheer database</li>
                  <li>Meubels kunnen met foto&apos;s worden geüpload</li>
                  <li>Kamers kunnen vrij worden versleept en geschaald</li>
                  <li>Direct koppeling met offerte systeem</li>
                  <li>Klanten kunnen dit zelf invullen via een link</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
