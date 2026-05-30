import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ChevronDown, ChevronRight, Ruler, Square, Edit2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const ROOM_PRESETS = ['Living', 'Keuken', 'Badkamer', 'Berging', 'Nachthal', 'Toilet', 'Slaapkamer', 'Dressing', 'Bureau', 'Gang', 'Garage'];

const fmt = (n, unit = '') => {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const v = Math.round(Number(n) * 100) / 100;
  return unit ? `${v} ${unit}` : `${v}`;
};

export default function ProjectMeetstaatTab({ project }) {
  const [meetstaat, setMeetstaat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [newRoomName, setNewRoomName] = useState('Badkamer');
  const [showAddRoom, setShowAddRoom] = useState(false);

  const projectId = project?.id;

  const fetchMeetstaat = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const resp = await axios.get(`${API}/projects/${projectId}/meetstaat`, { headers: getAuthHeaders() });
      setMeetstaat(resp.data);
    } catch (e) {
      toast.error('Kon meetstaat niet laden');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchMeetstaat(); }, [fetchMeetstaat]);

  const toggleRoom = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const addRoom = async () => {
    if (!newRoomName.trim()) {
      toast.error('Geef de ruimte een naam');
      return;
    }
    try {
      const resp = await axios.post(
        `${API}/projects/${projectId}/meetstaat/rooms`,
        { name: newRoomName.trim(), length: 0, width: 0, height: 2.7 },
        { headers: getAuthHeaders() }
      );
      toast.success(`${newRoomName} toegevoegd`);
      setExpanded((prev) => ({ ...prev, [resp.data.id]: true }));
      setEditingRoomId(resp.data.id);
      setNewRoomName('Badkamer');
      setShowAddRoom(false);
      fetchMeetstaat();
    } catch {
      toast.error('Kon ruimte niet toevoegen');
    }
  };

  const updateRoom = async (roomId, patch) => {
    try {
      await axios.put(`${API}/meetstaat/rooms/${roomId}`, patch, { headers: getAuthHeaders() });
      fetchMeetstaat();
    } catch {
      toast.error('Kon niet bijwerken');
    }
  };

  const deleteRoom = async (roomId, name) => {
    if (!window.confirm(`Ruimte "${name}" en alle ramen/deuren verwijderen?`)) return;
    await axios.delete(`${API}/meetstaat/rooms/${roomId}`, { headers: getAuthHeaders() });
    toast.success('Verwijderd');
    fetchMeetstaat();
  };

  const addWindow = async (roomId) => {
    await axios.post(`${API}/meetstaat/rooms/${roomId}/windows`, { label: 'Raam', width: 1, height: 1, dagkant_depth: 0.3 }, { headers: getAuthHeaders() });
    fetchMeetstaat();
  };
  const updateWindow = async (id, patch) => {
    await axios.put(`${API}/meetstaat/windows/${id}`, patch, { headers: getAuthHeaders() });
    fetchMeetstaat();
  };
  const deleteWindow = async (id) => {
    await axios.delete(`${API}/meetstaat/windows/${id}`, { headers: getAuthHeaders() });
    fetchMeetstaat();
  };

  const addDoor = async (roomId) => {
    await axios.post(`${API}/meetstaat/rooms/${roomId}/doors`, { label: 'Deur', width: 0.9, height: 2.1, dagkant_depth: 0.2 }, { headers: getAuthHeaders() });
    fetchMeetstaat();
  };
  const updateDoor = async (id, patch) => {
    await axios.put(`${API}/meetstaat/doors/${id}`, patch, { headers: getAuthHeaders() });
    fetchMeetstaat();
  };
  const deleteDoor = async (id) => {
    await axios.delete(`${API}/meetstaat/doors/${id}`, { headers: getAuthHeaders() });
    fetchMeetstaat();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin" /> <span className="ml-2">Meetstaat laden…</span>
      </div>
    );
  }

  const rooms = meetstaat?.rooms || [];
  const totals = meetstaat?.totals || {};
  const defaultDagkantPrice = meetstaat?.default_dagkant_price_per_lm || 35;

  return (
    <div data-testid="project-meetstaat-tab" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#500000' }}>
            <Ruler size={24} /> Meetstaat
          </h2>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            Centrale bron van waarheid voor afmetingen. Berekeningen lopen automatisch — manuele overrides via potlood-icoon.
          </p>
        </div>
        <Button onClick={() => setShowAddRoom(!showAddRoom)} style={{ backgroundColor: '#500000', color: 'white' }} data-testid="toggle-add-room-btn">
          <Plus size={16} className="mr-1" /> Ruimte toevoegen
        </Button>
      </div>

      {/* Add room form */}
      {showAddRoom && (
        <Card>
          <CardContent className="p-4">
            <Label>Type ruimte</Label>
            <div className="flex flex-wrap gap-2 mt-2 mb-3">
              {ROOM_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setNewRoomName(p)}
                  className="px-3 py-1 rounded-full text-xs border transition-colors"
                  style={{
                    borderColor: newRoomName === p ? '#500000' : '#E5E7EB',
                    backgroundColor: newRoomName === p ? '#F5E6E6' : 'white',
                    color: newRoomName === p ? '#500000' : '#64748B',
                  }}
                  data-testid={`room-preset-${p}`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Of typ een eigen naam"
                data-testid="new-room-name-input"
                onKeyDown={(e) => e.key === 'Enter' && addRoom()}
              />
              <Button onClick={addRoom} style={{ backgroundColor: '#500000', color: 'white' }} data-testid="confirm-add-room-btn">
                <Plus size={16} className="mr-1" /> Toevoegen
              </Button>
              <Button variant="outline" onClick={() => setShowAddRoom(false)}>Annuleer</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project totals */}
      {rooms.length > 0 && (
        <Card style={{ backgroundColor: '#FFF8F0', borderColor: '#F5E6E6' }}>
          <CardContent className="p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: '#500000' }}>
              <Square size={18} /> Projecttotalen
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <TotalsCell label="Totale vloer" value={fmt(totals.floor_area, 'm²')} />
              <TotalsCell label="Totale plafond" value={fmt(totals.ceiling_area, 'm²')} />
              <TotalsCell label="Wand netto" value={fmt(totals.wall_area_net, 'm²')} />
              <TotalsCell label="Volume" value={fmt(totals.volume, 'm³')} />
              <TotalsCell label="Ramen" value={`${totals.window_count || 0}`} />
              <TotalsCell label="Deuren" value={`${totals.door_count || 0}`} />
              <TotalsCell label="Dagkanten" value={fmt(totals.dagkanten_total_lm, 'lm')} />
              <TotalsCell label={`Dagkanten kost (€${defaultDagkantPrice}/lm)`} value={`€${fmt(totals.dagkanten_cost_estimate)}`} highlight />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rooms */}
      {rooms.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-12" style={{ color: '#94A3B8' }}>
            <Ruler size={48} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">Nog geen ruimtes toegevoegd</p>
            <p className="text-sm mt-2">Klik op &quot;Ruimte toevoegen&quot; om te starten.</p>
          </CardContent>
        </Card>
      )}

      {rooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          isExpanded={!!expanded[room.id]}
          isEditing={editingRoomId === room.id}
          defaultDagkantPrice={defaultDagkantPrice}
          onToggle={() => toggleRoom(room.id)}
          onStartEdit={() => setEditingRoomId(room.id)}
          onStopEdit={() => setEditingRoomId(null)}
          onUpdateRoom={(patch) => updateRoom(room.id, patch)}
          onDeleteRoom={() => deleteRoom(room.id, room.name)}
          onAddWindow={() => addWindow(room.id)}
          onUpdateWindow={updateWindow}
          onDeleteWindow={deleteWindow}
          onAddDoor={() => addDoor(room.id)}
          onUpdateDoor={updateDoor}
          onDeleteDoor={deleteDoor}
        />
      ))}
    </div>
  );
}

const TotalsCell = ({ label, value, highlight }) => (
  <div className="p-2 rounded" style={{ backgroundColor: highlight ? '#500000' : 'white', color: highlight ? 'white' : 'inherit' }}>
    <div className="text-xs" style={{ color: highlight ? '#F5E6E6' : '#94A3B8' }}>{label}</div>
    <div className="font-bold mt-0.5">{value}</div>
  </div>
);

function RoomCard({
  room, isExpanded, isEditing, defaultDagkantPrice,
  onToggle, onStartEdit, onStopEdit, onUpdateRoom, onDeleteRoom,
  onAddWindow, onUpdateWindow, onDeleteWindow,
  onAddDoor, onUpdateDoor, onDeleteDoor,
}) {
  const c = room.computed || {};
  const dagkantPrice = room.dagkant_price_per_lm ?? defaultDagkantPrice;
  const dagkantCost = (c.dagkanten_total_lm || 0) * dagkantPrice;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button onClick={onToggle} className="flex items-center gap-2 flex-1 text-left" data-testid={`toggle-room-${room.id}`}>
            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            <span className="font-bold text-lg" style={{ color: '#3a190b' }}>{room.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}>
              {fmt(room.length)} × {fmt(room.width)} × {fmt(room.height)} m
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
              vloer {fmt(c.floor_area, 'm²')}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
              wand netto {fmt(c.wall_area, 'm²')}
            </span>
            {c.dagkanten_total_lm > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                dagkanten {fmt(c.dagkanten_total_lm, 'lm')}
              </span>
            )}
          </button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={isEditing ? onStopEdit : onStartEdit} data-testid={`edit-room-${room.id}`}>
              <Edit2 size={14} />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDeleteRoom} className="text-red-500" data-testid={`delete-room-${room.id}`}>
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-4">
            {/* Dimensions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <Label className="text-xs">Lengte (m)</Label>
                <Input
                  type="number" step="0.01" min="0"
                  defaultValue={room.length || ''}
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    if (v !== room.length) onUpdateRoom({ length: v });
                  }}
                  data-testid={`room-length-${room.id}`}
                />
              </div>
              <div>
                <Label className="text-xs">Breedte (m)</Label>
                <Input
                  type="number" step="0.01" min="0"
                  defaultValue={room.width || ''}
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    if (v !== room.width) onUpdateRoom({ width: v });
                  }}
                  data-testid={`room-width-${room.id}`}
                />
              </div>
              <div>
                <Label className="text-xs">Hoogte (m)</Label>
                <Input
                  type="number" step="0.01" min="0"
                  defaultValue={room.height || ''}
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    if (v !== room.height) onUpdateRoom({ height: v });
                  }}
                  data-testid={`room-height-${room.id}`}
                />
              </div>
              <div>
                <Label className="text-xs">Dagkant prijs €/lm</Label>
                <Input
                  type="number" step="0.5" min="0"
                  defaultValue={room.dagkant_price_per_lm ?? ''}
                  placeholder={`${defaultDagkantPrice}`}
                  onBlur={(e) => {
                    const raw = e.target.value;
                    const v = raw === '' ? null : parseFloat(raw);
                    if (v !== room.dagkant_price_per_lm) onUpdateRoom({ dagkant_price_per_lm: v });
                  }}
                  data-testid={`room-dagkant-price-${room.id}`}
                />
              </div>
            </div>

            {/* Computed metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs p-3 rounded-lg" style={{ backgroundColor: '#F8FAFC' }}>
              <Metric label="Vloer" value={fmt(c.floor_area_raw, 'm²')} override={room.override_floor_area} />
              <Metric label="Plafond" value={fmt(c.ceiling_area_raw, 'm²')} override={room.override_ceiling_area} />
              <Metric label="Wand bruto" value={fmt(c.wall_area_raw_bruto, 'm²')} />
              <Metric label="Volume" value={fmt(c.volume, 'm³')} />
              <Metric label="Raamopp." value={fmt(c.window_area_total, 'm²')} />
              <Metric label="Deuropp." value={fmt(c.door_area_total, 'm²')} />
              <Metric label="Wand NETTO (pleister/gyproc/schilder)" value={fmt(c.wall_area_net, 'm²')} override={room.override_wall_area} highlight />
              <Metric label={`Dagkanten kost (${fmt(c.dagkanten_total_lm, 'lm')})`} value={`€${fmt(dagkantCost)}`} highlight />
            </div>

            {/* Windows */}
            <Section
              title={`Ramen (${(room.windows || []).length})`}
              onAdd={onAddWindow}
              addLabel="+ Raam"
            >
              {(room.windows || []).map((w) => (
                <OpeningRow
                  key={w.id}
                  opening={w}
                  type="raam"
                  onUpdate={(patch) => onUpdateWindow(w.id, patch)}
                  onDelete={() => onDeleteWindow(w.id)}
                />
              ))}
            </Section>

            {/* Doors */}
            <Section
              title={`Deuren (${(room.doors || []).length})`}
              onAdd={onAddDoor}
              addLabel="+ Deur"
            >
              {(room.doors || []).map((d) => (
                <OpeningRow
                  key={d.id}
                  opening={d}
                  type="deur"
                  onUpdate={(patch) => onUpdateDoor(d.id, patch)}
                  onDelete={() => onDeleteDoor(d.id)}
                />
              ))}
            </Section>

            {/* Manual overrides (collapsed by default) */}
            <details className="text-xs">
              <summary className="cursor-pointer" style={{ color: '#64748B' }}>
                Manuele overrides (geavanceerd)
              </summary>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <OverrideInput label="Vloer override (m²)" value={room.override_floor_area}
                  onSave={(v) => onUpdateRoom({ override_floor_area: v })} />
                <OverrideInput label="Plafond override (m²)" value={room.override_ceiling_area}
                  onSave={(v) => onUpdateRoom({ override_ceiling_area: v })} />
                <OverrideInput label="Wand override (m²)" value={room.override_wall_area}
                  onSave={(v) => onUpdateRoom({ override_wall_area: v })} />
              </div>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const Metric = ({ label, value, override, highlight }) => (
  <div>
    <div style={{ color: '#94A3B8' }}>{label}</div>
    <div className={`font-bold ${highlight ? '' : ''}`} style={{ color: highlight ? '#500000' : '#1F2937' }}>
      {value}
      {override !== null && override !== undefined && (
        <span className="ml-1 text-xs px-1 rounded" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }} title="Manuele override actief">↻</span>
      )}
    </div>
  </div>
);

function Section({ title, onAdd, addLabel, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm" style={{ color: '#475569' }}>{title}</h4>
        <Button variant="outline" size="sm" onClick={onAdd}>{addLabel}</Button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function OpeningRow({ opening, type, onUpdate, onDelete }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center p-2 rounded border" style={{ borderColor: '#E5E7EB' }} data-testid={`opening-${opening.id}`}>
      <Input
        className="col-span-3 text-xs"
        defaultValue={opening.label || ''}
        placeholder={`${type} label`}
        onBlur={(e) => { if (e.target.value !== opening.label) onUpdate({ label: e.target.value }); }}
      />
      <Input
        type="number" step="0.01" min="0"
        className="col-span-2 text-xs"
        defaultValue={opening.width || ''}
        placeholder="breedte m"
        onBlur={(e) => { const v = parseFloat(e.target.value) || 0; if (v !== opening.width) onUpdate({ width: v }); }}
      />
      <Input
        type="number" step="0.01" min="0"
        className="col-span-2 text-xs"
        defaultValue={opening.height || ''}
        placeholder="hoogte m"
        onBlur={(e) => { const v = parseFloat(e.target.value) || 0; if (v !== opening.height) onUpdate({ height: v }); }}
      />
      <Input
        type="number" step="0.01" min="0"
        className="col-span-2 text-xs"
        defaultValue={opening.dagkant_depth || ''}
        placeholder="dagkant m"
        onBlur={(e) => { const v = parseFloat(e.target.value) || 0; if (v !== opening.dagkant_depth) onUpdate({ dagkant_depth: v }); }}
      />
      <div className="col-span-2 text-xs text-right" style={{ color: '#64748B' }}>
        {(opening.width * opening.height).toFixed(2)} m²
      </div>
      <Button variant="ghost" size="sm" onClick={onDelete} className="col-span-1 text-red-500">
        <Trash2 size={12} />
      </Button>
    </div>
  );
}

function OverrideInput({ label, value, onSave }) {
  const [v, setV] = useState(value ?? '');
  useEffect(() => { setV(value ?? ''); }, [value]);
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number" step="0.01"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          const parsed = v === '' ? null : parseFloat(v);
          if (parsed !== value) onSave(parsed);
        }}
      />
    </div>
  );
}
