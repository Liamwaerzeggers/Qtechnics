import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import {
  Hammer, Plus, Trash2, Edit2, Copy, History, Save, Loader2, Search,
  X, Package, Clock, ChevronDown, ChevronRight, Percent, Layers
} from 'lucide-react';
import { toast } from 'sonner';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const UNITS = ['m²', 'm', 'lm', 'stuk', 'uur', 'dag', 'forfait', 'kg', 'liter'];
const VAT_RATES = [6, 9, 21, 0];

const emptyForm = () => ({
  name: '',
  description: '',
  category: 'Algemeen',
  unit: 'm²',
  standard_price: '',
  vat_rate: 6,
  discipline_order: 18,
  productivity_enabled: false,
  production_per_man_day: '',
  production_unit: 'm²',
  material_profile: [],
  active: true,
  price_change_note: '',
});

export default function WerkpostenPage() {
  const [items, setItems] = useState([]);
  const [disciplineMap, setDisciplineMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showInactive, setShowInactive] = useState(false);
  const [collapsed, setCollapsed] = useState({});

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const [historyItem, setHistoryItem] = useState(null);
  const [historyData, setHistoryData] = useState(null);

  useEffect(() => { fetchAll(); }, [showInactive]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [itemsRes, catRes] = await Promise.all([
        axios.get(`${API}/werkposten`, { headers: getAuthHeaders(), params: { include_inactive: showInactive } }),
        axios.get(`${API}/werkposten/categories`, { headers: getAuthHeaders() }),
      ]);
      setItems(itemsRes.data || []);
      setDisciplineMap(catRes.data?.discipline_order_map || {});
    } catch (err) {
      toast.error('Kon werkposten niet laden');
    } finally {
      setLoading(false);
    }
  };

  const disciplineOptions = useMemo(() => {
    const entries = Object.entries(disciplineMap).sort((a, b) => a[1] - b[1]);
    return entries;
  }, [disciplineMap]);

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category || 'Algemeen'));
    return ['all', ...Array.from(set).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const matchSearch = !search || (i.name || '').toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === 'all' || (i.category || 'Algemeen') === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [items, search, categoryFilter]);

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach((i) => {
      const cat = i.category || 'Algemeen';
      (g[cat] = g[cat] || []).push(i);
    });
    return Object.entries(g).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  // ---- Form handlers ----
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name || '',
      description: item.description || '',
      category: item.category || 'Algemeen',
      unit: item.unit || 'm²',
      standard_price: item.standard_price ?? '',
      vat_rate: item.vat_rate ?? 6,
      discipline_order: item.discipline_order ?? 18,
      productivity_enabled: !!item.productivity_profile,
      production_per_man_day: item.productivity_profile?.production_per_man_day ?? '',
      production_unit: item.productivity_profile?.production_unit || (item.unit || 'm²'),
      material_profile: (item.material_profile || []).map((m) => ({ ...m })),
      active: item.active !== false,
      price_change_note: '',
    });
    setShowForm(true);
  };

  const addMaterialRow = () => {
    setForm((f) => ({ ...f, material_profile: [...f.material_profile, { material_name: '', quantity_per_unit: '', unit: 'stuk' }] }));
  };
  const updateMaterialRow = (idx, key, val) => {
    setForm((f) => {
      const mp = [...f.material_profile];
      mp[idx] = { ...mp[idx], [key]: val };
      return { ...f, material_profile: mp };
    });
  };
  const removeMaterialRow = (idx) => {
    setForm((f) => ({ ...f, material_profile: f.material_profile.filter((_, i) => i !== idx) }));
  };

  const buildPayload = () => {
    const payload = {
      name: form.name.trim(),
      description: form.description?.trim() || null,
      category: form.category?.trim() || 'Algemeen',
      unit: form.unit,
      standard_price: form.standard_price === '' ? null : parseFloat(form.standard_price),
      vat_rate: parseFloat(form.vat_rate),
      discipline_order: parseInt(form.discipline_order, 10),
      active: form.active,
      material_profile: form.material_profile
        .filter((m) => m.material_name?.trim())
        .map((m) => ({
          material_name: m.material_name.trim(),
          quantity_per_unit: m.quantity_per_unit === '' ? 0 : parseFloat(m.quantity_per_unit),
          unit: m.unit || 'stuk',
          material_id: m.material_id || null,
        })),
      productivity_profile: form.productivity_enabled
        ? {
            production_per_man_day: form.production_per_man_day === '' ? 0 : parseFloat(form.production_per_man_day),
            production_unit: form.production_unit || form.unit,
          }
        : null,
    };
    return payload;
  };

  const saveItem = async () => {
    if (!form.name.trim()) {
      toast.error('Naam is verplicht');
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (editingId) {
        if (form.price_change_note?.trim()) payload.price_change_note = form.price_change_note.trim();
        await axios.put(`${API}/werkposten/${editingId}`, payload, { headers: getAuthHeaders() });
        toast.success('Werkpost bijgewerkt');
      } else {
        await axios.post(`${API}/werkposten`, payload, { headers: getAuthHeaders() });
        toast.success('Werkpost toegevoegd');
      }
      setShowForm(false);
      fetchAll();
    } catch (err) {
      toast.error('Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const duplicateItem = async (item) => {
    try {
      await axios.post(`${API}/werkposten/${item.id}/duplicate`, {}, { headers: getAuthHeaders() });
      toast.success('Werkpost gedupliceerd');
      fetchAll();
    } catch (err) {
      toast.error('Dupliceren mislukt');
    }
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`"${item.name}" deactiveren?`)) return;
    try {
      await axios.delete(`${API}/werkposten/${item.id}`, { headers: getAuthHeaders() });
      toast.success('Werkpost gedeactiveerd');
      fetchAll();
    } catch (err) {
      toast.error('Verwijderen mislukt');
    }
  };

  const reactivateItem = async (item) => {
    try {
      await axios.put(`${API}/werkposten/${item.id}`, { active: true }, { headers: getAuthHeaders() });
      toast.success('Werkpost geactiveerd');
      fetchAll();
    } catch (err) {
      toast.error('Activeren mislukt');
    }
  };

  const openHistory = async (item) => {
    setHistoryItem(item);
    setHistoryData(null);
    try {
      const res = await axios.get(`${API}/werkposten/${item.id}/history`, { headers: getAuthHeaders() });
      setHistoryData(res.data);
    } catch (err) {
      toast.error('Kon prijshistoriek niet laden');
      setHistoryData({ history: [] });
    }
  };

  const fmtPrice = (p) => (p === null || p === undefined ? null : `€ ${Number(p).toFixed(2)}`);
  const toggleCat = (cat) => setCollapsed((c) => ({ ...c, [cat]: !c[cat] }));

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-6" data-testid="werkposten-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
              <Hammer className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Werkpostbibliotheek</h1>
              <p className="text-sm text-slate-500">Centrale bron voor arbeid, prijzen, productiviteit & materiaalverbruik</p>
            </div>
          </div>
          <Button onClick={openCreate} data-testid="add-werkpost-btn" className="bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-2" /> Nieuwe werkpost
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              data-testid="werkpost-search"
              placeholder="Zoek op naam..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="sm:w-56" data-testid="werkpost-category-filter">
              <SelectValue placeholder="Categorie" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c === 'all' ? 'Alle categorieën' : c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 px-1">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} data-testid="toggle-inactive" />
            <span className="text-sm text-slate-600 whitespace-nowrap">Inactieve tonen</span>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Laden...
          </div>
        ) : grouped.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-slate-500">
            <Hammer className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            Geen werkposten gevonden. Voeg je eerste werkpost toe.
          </CardContent></Card>
        ) : (
          <div className="space-y-4">
            {grouped.map(([cat, list]) => (
              <div key={cat} data-testid={`werkpost-group-${cat}`}>
                <button
                  onClick={() => toggleCat(cat)}
                  className="flex items-center gap-2 w-full text-left mb-2 group"
                >
                  {collapsed[cat] ? <ChevronRight className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  <span className="font-semibold text-slate-800">{cat}</span>
                  <Badge variant="secondary" className="ml-1">{list.length}</Badge>
                </button>
                {!collapsed[cat] && (
                  <div className="grid gap-2">
                    {list.map((item) => (
                      <Card key={item.id} className={`border ${item.active === false ? 'opacity-60 bg-slate-50' : ''}`} data-testid={`werkpost-card-${item.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-slate-900 truncate">{item.name}</span>
                                {item.active === false && <Badge variant="outline" className="text-amber-600 border-amber-300">Inactief</Badge>}
                              </div>
                              {item.description && <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>}
                              <div className="flex items-center gap-2 flex-wrap mt-2 text-xs">
                                <Badge variant="secondary" className="font-mono">
                                  {fmtPrice(item.standard_price) ? `${fmtPrice(item.standard_price)} / ${item.unit}` : 'Prijs onbekend'}
                                </Badge>
                                <Badge variant="outline" className="gap-1"><Percent className="h-3 w-3" />{item.vat_rate}% btw</Badge>
                                {item.productivity_profile?.production_per_man_day ? (
                                  <Badge variant="outline" className="gap-1 text-blue-600 border-blue-200">
                                    <Clock className="h-3 w-3" />{item.productivity_profile.production_per_man_day} {item.productivity_profile.production_unit}/mandag
                                  </Badge>
                                ) : null}
                                {item.material_profile?.length ? (
                                  <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200">
                                    <Package className="h-3 w-3" />{item.material_profile.length} materia{item.material_profile.length === 1 ? 'al' : 'len'}
                                  </Badge>
                                ) : null}
                                {item.price_history?.length ? (
                                  <Badge variant="outline" className="gap-1 text-slate-500">
                                    <History className="h-3 w-3" />{item.price_history.length}× prijswijziging
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button size="icon" variant="ghost" className="h-8 w-8" title="Prijshistoriek" onClick={() => openHistory(item)} data-testid={`history-${item.id}`}>
                                <History className="h-4 w-4 text-slate-500" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" title="Dupliceren" onClick={() => duplicateItem(item)} data-testid={`duplicate-${item.id}`}>
                                <Copy className="h-4 w-4 text-slate-500" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" title="Bewerken" onClick={() => openEdit(item)} data-testid={`edit-${item.id}`}>
                                <Edit2 className="h-4 w-4 text-slate-600" />
                              </Button>
                              {item.active === false ? (
                                <Button size="icon" variant="ghost" className="h-8 w-8" title="Activeren" onClick={() => reactivateItem(item)} data-testid={`reactivate-${item.id}`}>
                                  <Save className="h-4 w-4 text-emerald-600" />
                                </Button>
                              ) : (
                                <Button size="icon" variant="ghost" className="h-8 w-8" title="Deactiveren" onClick={() => deleteItem(item)} data-testid={`delete-${item.id}`}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="werkpost-form-dialog">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Werkpost bewerken' : 'Nieuwe werkpost'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Naam *</Label>
              <Input data-testid="form-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="bv. Gyproc plafond" />
            </div>
            <div>
              <Label>Omschrijving</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Extra specificatie / regels van de kunst" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categorie / Discipline</Label>
                <Input
                  list="discipline-list"
                  data-testid="form-category"
                  value={form.category}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((f) => ({ ...f, category: val, discipline_order: disciplineMap[val] ?? f.discipline_order }));
                  }}
                  placeholder="bv. Gyproc"
                />
                <datalist id="discipline-list">
                  {disciplineOptions.map(([name]) => <option key={name} value={name} />)}
                </datalist>
              </div>
              <div>
                <Label>Eenheid</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger data-testid="form-unit"><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Standaardprijs (€)</Label>
                <Input data-testid="form-price" type="number" step="0.01" value={form.standard_price} onChange={(e) => setForm({ ...form, standard_price: e.target.value })} placeholder="leeg = onbekend" />
              </div>
              <div>
                <Label>BTW %</Label>
                <Select value={String(form.vat_rate)} onValueChange={(v) => setForm({ ...form, vat_rate: parseFloat(v) })}>
                  <SelectTrigger data-testid="form-vat"><SelectValue /></SelectTrigger>
                  <SelectContent>{VAT_RATES.map((r) => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Volgorde</Label>
                <Select value={String(form.discipline_order)} onValueChange={(v) => setForm({ ...form, discipline_order: parseInt(v, 10) })}>
                  <SelectTrigger data-testid="form-discipline"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {disciplineOptions.map(([name, order]) => <SelectItem key={order} value={String(order)}>{order}. {name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {editingId && form.standard_price !== '' && (
              <div>
                <Label className="text-xs text-slate-500">Reden prijswijziging (optioneel — gelogd in historiek)</Label>
                <Input value={form.price_change_note} onChange={(e) => setForm({ ...form, price_change_note: e.target.value })} placeholder="bv. materiaalprijs gestegen" />
              </div>
            )}

            {/* Productivity */}
            <div className="rounded-lg border p-3 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Clock className="h-4 w-4 text-blue-500" /> Productiviteitsprofiel
                </div>
                <Switch checked={form.productivity_enabled} onCheckedChange={(v) => setForm({ ...form, productivity_enabled: v })} data-testid="form-productivity-toggle" />
              </div>
              {form.productivity_enabled && (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <Label className="text-xs">Productie per mandag</Label>
                    <Input type="number" step="0.1" value={form.production_per_man_day} onChange={(e) => setForm({ ...form, production_per_man_day: e.target.value })} placeholder="bv. 25" data-testid="form-prod-value" />
                  </div>
                  <div>
                    <Label className="text-xs">Eenheid</Label>
                    <Input value={form.production_unit} onChange={(e) => setForm({ ...form, production_unit: e.target.value })} placeholder="m²" />
                  </div>
                </div>
              )}
            </div>

            {/* Material profile */}
            <div className="rounded-lg border p-3 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Layers className="h-4 w-4 text-emerald-500" /> Materiaalprofiel (verbruik per eenheid)
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addMaterialRow} data-testid="add-material-row">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Materiaal
                </Button>
              </div>
              {form.material_profile.length === 0 ? (
                <p className="text-xs text-slate-400">Nog geen materialen gekoppeld.</p>
              ) : (
                <div className="space-y-2">
                  {form.material_profile.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input className="flex-1" placeholder="Materiaal" value={m.material_name} onChange={(e) => updateMaterialRow(idx, 'material_name', e.target.value)} />
                      <Input className="w-24" type="number" step="0.001" placeholder="Aantal" value={m.quantity_per_unit} onChange={(e) => updateMaterialRow(idx, 'quantity_per_unit', e.target.value)} />
                      <Input className="w-20" placeholder="eenheid" value={m.unit} onChange={(e) => updateMaterialRow(idx, 'unit', e.target.value)} />
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeMaterialRow(idx)}>
                        <X className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} data-testid="form-active" />
              <span className="text-sm text-slate-600">Actief</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuleren</Button>
            <Button onClick={saveItem} disabled={saving} className="bg-slate-900 hover:bg-slate-800" data-testid="save-werkpost-btn">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyItem} onOpenChange={(o) => { if (!o) { setHistoryItem(null); setHistoryData(null); } }}>
        <DialogContent className="max-w-lg" data-testid="history-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Prijshistoriek</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <div className="text-sm text-slate-500 mb-3">
              {historyItem?.name} — huidige prijs: <span className="font-semibold text-slate-800">{fmtPrice(historyData?.current_price ?? historyItem?.standard_price) || 'onbekend'}</span>
            </div>
            {!historyData ? (
              <div className="flex items-center justify-center py-8 text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Laden...</div>
            ) : (historyData.history || []).length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">Nog geen prijswijzigingen geregistreerd.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {[...historyData.history].reverse().map((h, idx) => (
                  <div key={idx} className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm">
                    <div>
                      <span className="text-red-500 line-through">€ {Number(h.old_price).toFixed(2)}</span>
                      <span className="mx-2 text-slate-400">→</span>
                      <span className="text-emerald-600 font-medium">€ {Number(h.new_price).toFixed(2)}</span>
                      {h.note && <span className="block text-xs text-slate-400 mt-0.5">{h.note}</span>}
                    </div>
                    <span className="text-xs text-slate-400">{h.changed_at ? new Date(h.changed_at).toLocaleDateString('nl-BE') : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
