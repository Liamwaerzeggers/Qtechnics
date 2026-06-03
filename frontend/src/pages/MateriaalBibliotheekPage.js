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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Boxes, Plus, Trash2, Edit2, History, Save, Loader2, Search, Truck, ChevronDown, ChevronRight, Percent } from 'lucide-react';
import { toast } from 'sonner';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const UNITS = ['stuk', 'zak', 'm²', 'm', 'lm', 'kg', 'liter', 'rol', 'pak', 'doos', 'palet'];

const emptyForm = () => ({
  name: '', description: '', category: 'Algemeen', unit: 'stuk',
  purchase_price: '', supplier: '', sku: '', package_qty: '', active: true, price_change_note: '',
});

export default function MateriaalBibliotheekPage() {
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
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
        axios.get(`${API}/materiaal`, { headers: getAuthHeaders(), params: { include_inactive: showInactive } }),
        axios.get(`${API}/materiaal/categories`, { headers: getAuthHeaders() }),
      ]);
      setItems(itemsRes.data || []);
      setSuppliers(catRes.data?.suppliers || []);
    } catch (err) {
      toast.error('Kon materialen niet laden');
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category || 'Algemeen'));
    return ['all', ...Array.from(set).sort()];
  }, [items]);

  const filtered = useMemo(() => items.filter((i) => {
    const matchSearch = !search || (i.name || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || (i.category || 'Algemeen') === categoryFilter;
    return matchSearch && matchCat;
  }), [items, search, categoryFilter]);

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach((i) => { const c = i.category || 'Algemeen'; (g[c] = g[c] || []).push(i); });
    return Object.entries(g).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm()); setShowForm(true); };
  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name || '', description: item.description || '', category: item.category || 'Algemeen',
      unit: item.unit || 'stuk', purchase_price: item.purchase_price ?? '', supplier: item.supplier || '',
      sku: item.sku || '', package_qty: item.package_qty ?? '', active: item.active !== false, price_change_note: '',
    });
    setShowForm(true);
  };

  const buildPayload = () => ({
    name: form.name.trim(), description: form.description?.trim() || null,
    category: form.category?.trim() || 'Algemeen', unit: form.unit,
    purchase_price: form.purchase_price === '' ? null : parseFloat(form.purchase_price),
    supplier: form.supplier?.trim() || null, sku: form.sku?.trim() || null,
    package_qty: form.package_qty === '' ? null : parseFloat(form.package_qty), active: form.active,
  });

  const saveItem = async () => {
    if (!form.name.trim()) { toast.error('Naam is verplicht'); return; }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (editingId) {
        if (form.price_change_note?.trim()) payload.price_change_note = form.price_change_note.trim();
        await axios.put(`${API}/materiaal/${editingId}`, payload, { headers: getAuthHeaders() });
        toast.success('Materiaal bijgewerkt');
      } else {
        await axios.post(`${API}/materiaal`, payload, { headers: getAuthHeaders() });
        toast.success('Materiaal toegevoegd');
      }
      setShowForm(false);
      fetchAll();
    } catch (err) { toast.error('Opslaan mislukt'); } finally { setSaving(false); }
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`"${item.name}" deactiveren?`)) return;
    try { await axios.delete(`${API}/materiaal/${item.id}`, { headers: getAuthHeaders() }); toast.success('Gedeactiveerd'); fetchAll(); }
    catch { toast.error('Verwijderen mislukt'); }
  };
  const reactivateItem = async (item) => {
    try { await axios.put(`${API}/materiaal/${item.id}`, { active: true }, { headers: getAuthHeaders() }); toast.success('Geactiveerd'); fetchAll(); }
    catch { toast.error('Activeren mislukt'); }
  };
  const openHistory = async (item) => {
    setHistoryItem(item); setHistoryData(null);
    try { const res = await axios.get(`${API}/materiaal/${item.id}/history`, { headers: getAuthHeaders() }); setHistoryData(res.data); }
    catch { setHistoryData({ history: [] }); }
  };

  const fmtPrice = (p) => (p === null || p === undefined ? null : `€ ${Number(p).toFixed(2)}`);
  const toggleCat = (cat) => setCollapsed((c) => ({ ...c, [cat]: !c[cat] }));

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-6" data-testid="materiaal-bibliotheek-page">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
              <Boxes className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Materiaalbibliotheek</h1>
              <p className="text-sm text-slate-500">Aankoopprijzen, leveranciers & eenheden — basis voor automatische materiaallijsten</p>
            </div>
          </div>
          <Button onClick={openCreate} data-testid="add-materiaal-btn" className="bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-2" /> Nieuw materiaal
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input data-testid="materiaal-search" placeholder="Zoek op naam..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="sm:w-56" data-testid="materiaal-category-filter"><SelectValue placeholder="Categorie" /></SelectTrigger>
            <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c === 'all' ? 'Alle categorieën' : c}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex items-center gap-2 px-1">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} data-testid="toggle-inactive-mat" />
            <span className="text-sm text-slate-600 whitespace-nowrap">Inactieve tonen</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Laden...</div>
        ) : grouped.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-slate-500">
            <Boxes className="h-10 w-10 mx-auto mb-3 text-slate-300" /> Nog geen materialen. Voeg je eerste materiaal toe.
          </CardContent></Card>
        ) : (
          <div className="space-y-4">
            {grouped.map(([cat, list]) => (
              <div key={cat} data-testid={`materiaal-group-${cat}`}>
                <button onClick={() => toggleCat(cat)} className="flex items-center gap-2 w-full text-left mb-2">
                  {collapsed[cat] ? <ChevronRight className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  <span className="font-semibold text-slate-800">{cat}</span>
                  <Badge variant="secondary" className="ml-1">{list.length}</Badge>
                </button>
                {!collapsed[cat] && (
                  <div className="grid gap-2">
                    {list.map((item) => (
                      <Card key={item.id} className={`border ${item.active === false ? 'opacity-60 bg-slate-50' : ''}`} data-testid={`materiaal-card-${item.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-slate-900 truncate">{item.name}</span>
                                {item.sku && <Badge variant="outline" className="text-[10px] font-mono">{item.sku}</Badge>}
                                {item.active === false && <Badge variant="outline" className="text-amber-600 border-amber-300">Inactief</Badge>}
                              </div>
                              {item.description && <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>}
                              <div className="flex items-center gap-2 flex-wrap mt-2 text-xs">
                                <Badge variant="secondary" className="font-mono">
                                  {fmtPrice(item.purchase_price) ? `${fmtPrice(item.purchase_price)} / ${item.unit}` : 'Prijs onbekend'}
                                </Badge>
                                {item.supplier && <Badge variant="outline" className="gap-1 text-emerald-700 border-emerald-200"><Truck className="h-3 w-3" />{item.supplier}</Badge>}
                                {item.package_qty ? <Badge variant="outline">Verpakking: {item.package_qty}</Badge> : null}
                                {item.price_history?.length ? <Badge variant="outline" className="gap-1 text-slate-500"><History className="h-3 w-3" />{item.price_history.length}× prijs</Badge> : null}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button size="icon" variant="ghost" className="h-8 w-8" title="Prijshistoriek" onClick={() => openHistory(item)} data-testid={`mat-history-${item.id}`}>
                                <History className="h-4 w-4 text-slate-500" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" title="Bewerken" onClick={() => openEdit(item)} data-testid={`mat-edit-${item.id}`}>
                                <Edit2 className="h-4 w-4 text-slate-600" />
                              </Button>
                              {item.active === false ? (
                                <Button size="icon" variant="ghost" className="h-8 w-8" title="Activeren" onClick={() => reactivateItem(item)} data-testid={`mat-reactivate-${item.id}`}>
                                  <Save className="h-4 w-4 text-emerald-600" />
                                </Button>
                              ) : (
                                <Button size="icon" variant="ghost" className="h-8 w-8" title="Deactiveren" onClick={() => deleteItem(item)} data-testid={`mat-delete-${item.id}`}>
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="materiaal-form-dialog">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Materiaal bewerken' : 'Nieuw materiaal'}</DialogTitle>
            <DialogDescription>Beheer naam, aankoopprijs, leverancier en eenheid van dit materiaal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Naam *</Label>
                <Input data-testid="mat-form-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="bv. Gyproc plaat 12.5mm" />
              </div>
              <div>
                <Label>Categorie</Label>
                <Input list="mat-cat-list" data-testid="mat-form-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="bv. Gyproc" />
                <datalist id="mat-cat-list">{categories.filter((c) => c !== 'all').map((c) => <option key={c} value={c} />)}</datalist>
              </div>
            </div>
            <div>
              <Label>Omschrijving</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Aankoopprijs (€)</Label>
                <Input data-testid="mat-form-price" type="number" step="0.01" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} placeholder="leeg = onbekend" />
              </div>
              <div>
                <Label>Eenheid</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger data-testid="mat-form-unit"><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Verpakking</Label>
                <Input type="number" step="0.01" value={form.package_qty} onChange={(e) => setForm({ ...form, package_qty: e.target.value })} placeholder="bv. 25" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Leverancier</Label>
                <Input list="mat-sup-list" data-testid="mat-form-supplier" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="bv. Bouwshop BVBA" />
                <datalist id="mat-sup-list">{suppliers.map((s) => <option key={s} value={s} />)}</datalist>
              </div>
              <div>
                <Label>Artikelnummer (SKU)</Label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
            </div>
            {editingId && form.purchase_price !== '' && (
              <div>
                <Label className="text-xs text-slate-500">Reden prijswijziging (gelogd in historiek)</Label>
                <Input value={form.price_change_note} onChange={(e) => setForm({ ...form, price_change_note: e.target.value })} placeholder="bv. leveranciersprijs gestegen" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} data-testid="mat-form-active" />
              <span className="text-sm text-slate-600">Actief</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuleren</Button>
            <Button onClick={saveItem} disabled={saving} className="bg-slate-900 hover:bg-slate-800" data-testid="save-materiaal-btn">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyItem} onOpenChange={(o) => { if (!o) { setHistoryItem(null); setHistoryData(null); } }}>
        <DialogContent className="max-w-lg" data-testid="mat-history-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Prijshistoriek</DialogTitle>
            <DialogDescription>Alle geregistreerde aankoopprijs-wijzigingen voor dit materiaal.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="text-sm text-slate-500 mb-3">
              {historyItem?.name} — huidige prijs: <span className="font-semibold text-slate-800">{fmtPrice(historyData?.current_price ?? historyItem?.purchase_price) || 'onbekend'}</span>
            </div>
            {!historyData ? (
              <div className="flex items-center justify-center py-8 text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Laden...</div>
            ) : (historyData.history || []).length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">Nog geen prijswijzigingen.</p>
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
