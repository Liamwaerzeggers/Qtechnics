import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Tag, Save, Loader2, Search, Filter, CheckCircle2, 
  Square, Layers, Zap, Droplets, Flame, Snowflake, MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer \${token}` } : {};
};

const COMPONENT_LABELS = [
  { value: 'vloer', label: 'Vloer', icon: Square, color: 'bg-amber-100 text-amber-700' },
  { value: 'muur', label: 'Muur', icon: Layers, color: 'bg-blue-100 text-blue-700' },
  { value: 'plafond', label: 'Plafond', icon: Layers, color: 'bg-purple-100 text-purple-700' },
  { value: 'elektriciteit', label: 'Elektriciteit', icon: Zap, color: 'bg-yellow-100 text-yellow-700' },
  { value: 'sanitair', label: 'Sanitair', icon: Droplets, color: 'bg-cyan-100 text-cyan-700' },
  { value: 'verwarming', label: 'Verwarming', icon: Flame, color: 'bg-orange-100 text-orange-700' },
  { value: 'isolatie', label: 'Isolatie', icon: Snowflake, color: 'bg-teal-100 text-teal-700' },
  { value: 'overig', label: 'Overig', icon: MoreHorizontal, color: 'bg-gray-100 text-gray-700' },
];

const ROOM_TYPES = [
  { value: 'all', label: 'Alle kamers' },
  { value: 'living', label: 'Woonkamer' },
  { value: 'bedroom', label: 'Slaapkamer' },
  { value: 'bathroom', label: 'Badkamer' },
  { value: 'kitchen', label: 'Keuken' },
  { value: 'hallway', label: 'Gang/Hal' },
];

export default function WorkItemLabelsPage() {
  const [workItems, setWorkItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLabel, setFilterLabel] = useState('all');
  const [filterUnlabeled, setFilterUnlabeled] = useState(false);

  useEffect(() => {
    fetchWorkItems();
  }, []);

  const fetchWorkItems = async () => {
    try {
      const response = await axios.get(`${API}/work-items`, { headers: getAuthHeaders() });
      setWorkItems(response.data.work_items || []);
    } catch (error) {
      console.error('Error fetching work items:', error);
      toast.error('Kon werkposten niet laden');
    } finally {
      setLoading(false);
    }
  };

  const handleLabelChange = async (workItemId, newLabel) => {
    setSaving(prev => ({ ...prev, [workItemId]: true }));
    try {
      await axios.put(
        `${API}/work-items/${workItemId}/label?component_label=${newLabel}&room_types=all`,
        {},
        { headers: getAuthHeaders() }
      );
      
      // Update local state
      setWorkItems(prev => prev.map(item => 
        item.id === workItemId 
          ? { ...item, component_label: newLabel, room_types: ['all'] }
          : item
      ));
      
      toast.success('Label opgeslagen');
    } catch (error) {
      console.error('Error saving label:', error);
      toast.error('Kon label niet opslaan');
    } finally {
      setSaving(prev => ({ ...prev, [workItemId]: false }));
    }
  };

  const handleRoomTypesChange = async (workItemId, roomTypes) => {
    const item = workItems.find(w => w.id === workItemId);
    if (!item?.component_label) {
      toast.warning('Selecteer eerst een component label');
      return;
    }

    setSaving(prev => ({ ...prev, [workItemId]: true }));
    try {
      await axios.put(
        `${API}/work-items/${workItemId}/label?component_label=${item.component_label}&room_types=${roomTypes}`,
        {},
        { headers: getAuthHeaders() }
      );
      
      setWorkItems(prev => prev.map(w => 
        w.id === workItemId 
          ? { ...w, room_types: roomTypes.split(',') }
          : w
      ));
      
      toast.success('Kamertypes opgeslagen');
    } catch (error) {
      toast.error('Kon kamertypes niet opslaan');
    } finally {
      setSaving(prev => ({ ...prev, [workItemId]: false }));
    }
  };

  // Filter work items
  const filteredItems = workItems.filter(item => {
    const matchesSearch = item.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLabel = filterLabel === 'all' || item.component_label === filterLabel;
    const matchesUnlabeled = !filterUnlabeled || !item.component_label;
    return matchesSearch && matchesLabel && matchesUnlabeled;
  });

  // Stats
  const labeledCount = workItems.filter(w => w.component_label).length;
  const unlabeledCount = workItems.length - labeledCount;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin" size={48} style={{color: '#500000'}} />
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
            <div className="p-3 rounded-xl" style={{backgroundColor: '#f5e6e6'}}>
              <Tag size={28} style={{color: '#500000'}} />
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>
                Werkposten Labels
              </h1>
              <p className="text-sm" style={{color: '#64748B'}}>
                Wijs labels toe voor de renovatiecalculator
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle2 size={24} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{labeledCount}</p>
                <p className="text-sm text-gray-500">Met label</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <Tag size={24} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{unlabeledCount}</p>
                <p className="text-sm text-gray-500">Zonder label</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Layers size={24} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{workItems.length}</p>
                <p className="text-sm text-gray-500">Totaal</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4 items-center flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    placeholder="Zoek werkposten..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={filterLabel} onValueChange={setFilterLabel}>
                <SelectTrigger className="w-[180px]">
                  <Filter size={16} className="mr-2" />
                  <SelectValue placeholder="Filter op label" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle labels</SelectItem>
                  {COMPONENT_LABELS.map(label => (
                    <SelectItem key={label.value} value={label.value}>{label.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant={filterUnlabeled ? "default" : "outline"}
                onClick={() => setFilterUnlabeled(!filterUnlabeled)}
                style={filterUnlabeled ? {backgroundColor: '#500000'} : {}}
              >
                {filterUnlabeled ? 'Alle tonen' : 'Alleen zonder label'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-2">
          {COMPONENT_LABELS.map(label => {
            const Icon = label.icon;
            return (
              <div key={label.value} className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${label.color}`}>
                <Icon size={12} />
                {label.label}
              </div>
            );
          })}
        </div>

        {/* Work Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Werkposten ({filteredItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredItems.length === 0 ? (
                <p className="text-center py-8 text-gray-500">Geen werkposten gevonden</p>
              ) : (
                filteredItems.map((item) => {
                  const currentLabel = COMPONENT_LABELS.find(l => l.value === item.component_label);
                  const Icon = currentLabel?.icon || Tag;
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`flex items-center gap-4 p-3 rounded-lg border ${item.component_label ? 'bg-white' : 'bg-yellow-50 border-yellow-200'}`}
                    >
                      <div className="flex-1">
                        <p className="font-medium" style={{color: '#3a190b'}}>{item.title}</p>
                        <p className="text-sm text-gray-500">
                          €{item.price?.toFixed(2) || '0.00'} / {item.unit || 'stuk'}
                          {item.category && <span className="ml-2">• {item.category}</span>}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Component Label Select */}
                        <Select 
                          value={item.component_label || ''} 
                          onValueChange={(value) => handleLabelChange(item.id, value)}
                        >
                          <SelectTrigger className={`w-[150px] ${currentLabel?.color || ''}`}>
                            <Icon size={14} className="mr-1" />
                            <SelectValue placeholder="Geen label" />
                          </SelectTrigger>
                          <SelectContent>
                            {COMPONENT_LABELS.map(label => {
                              const LabelIcon = label.icon;
                              return (
                                <SelectItem key={label.value} value={label.value}>
                                  <div className="flex items-center gap-2">
                                    <LabelIcon size={14} />
                                    {label.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>

                        {/* Room Types Select */}
                        <Select 
                          value={item.room_types?.join(',') || 'all'}
                          onValueChange={(value) => handleRoomTypesChange(item.id, value)}
                          disabled={!item.component_label}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Kamers" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROOM_TYPES.map(room => (
                              <SelectItem key={room.value} value={room.value}>{room.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Saving indicator */}
                        {saving[item.id] && (
                          <Loader2 size={16} className="animate-spin text-blue-500" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Help text */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h3 className="font-semibold text-blue-800 mb-2">💡 Hoe werkt dit?</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Vloer/Muur/Plafond:</strong> Deze werkposten worden berekend op basis van oppervlakte (m²)</li>
              <li>• <strong>Elektriciteit/Sanitair/Verwarming:</strong> Worden per kamer of per stuk berekend</li>
              <li>• <strong>Kamertypes:</strong> Bepaal of een werkpost alleen voor specifieke kamers geldt (bijv. tegels alleen in badkamer)</li>
              <li>• <strong>Renovatiecalculator:</strong> Gebruikt deze labels om automatisch kosten te berekenen voor makelaars/investeerders</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
