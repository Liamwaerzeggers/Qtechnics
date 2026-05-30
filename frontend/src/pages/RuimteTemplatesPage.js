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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { LayoutTemplate, Plus, Trash2, Edit2, Save, Loader2, X, GripVertical, Home } from 'lucide-react';
import { toast } from 'sonner';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const ITEM_TYPES = ['arbeid', 'materiaal', 'overig'];
const ROOM_TYPE_PRESETS = ['Badkamer', 'Keuken', 'Slaapkamer', 'Living', 'WC', 'Hal', 'Berging', 'Bureau', 'Wasplaats', 'Garage'];

const emptyLine = () => ({ label: '', category: 'Algemeen', source: 'manual', item_type: 'arbeid', vat_rate: '' });
const emptyForm = () => ({ room_type: '', description: '', lines: [emptyLine()] });

export default function RuimteTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [sources, setSources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [tplRes, srcRes, catRes] = await Promise.all([
        axios.get(`${API}/room-templates`, { headers: getAuthHeaders() }),
        axios.get(`${API}/offerte-generator/sources`, { headers: getAuthHeaders() }),
        axios.get(`${API}/werkposten/categories`, { headers: getAuthHeaders() }),
      ]);
      setTemplates(tplRes.data || []);
      setSources(srcRes.data || []);
      setCategories(Object.keys(catRes.data?.discipline_order_map || {}));
    } catch (e) {
      toast.error('Kon ruimte-templates niet laden');
    } finally {
      setLoading(false);
    }
  };

  const sourceLabel = useMemo(() => {
    const m = {};
    sources.forEach((s) => { m[s.key] = `${s.label} (${s.unit})`; });
    return m;
  }, [sources]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (tpl) => {
    setEditingId(tpl.id);
    setForm({
      room_type: tpl.room_type || '',
      description: tpl.description || '',
      lines: (tpl.lines || []).map((l) => ({
        label: l.label || '',
        category: l.category || 'Algemeen',
        source: l.source || 'manual',
        item_type: l.item_type || 'arbeid',
        vat_rate: l.vat_rate ?? '',
        work_item_id: l.work_item_id || null,
      })),
    });
    if (!(tpl.lines || []).length) setForm((f) => ({ ...f, lines: [emptyLine()] }));
    setShowForm(true);
  };

  const addLine = () => setForm((f) => ({ ...f, lines: [...f.lines, emptyLine()] }));
  const updateLine = (idx, key, val) => setForm((f) => {
    const lines = [...f.lines];
    lines[idx] = { ...lines[idx], [key]: val };
    return { ...f, lines };
  });
  const removeLine = (idx) => setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));

  const save = async () => {
    if (!form.room_type.trim()) { toast.error('Ruimte-type is verplicht'); return; }
    const cleanLines = form.lines
      .filter((l) => l.label.trim())
      .map((l) => ({
        label: l.label.trim(),
        category: l.category || 'Algemeen',
        source: l.source || 'manual',
        item_type: l.item_type || 'arbeid',
        vat_rate: l.vat_rate === '' ? null : Number(l.vat_rate),
        work_item_id: l.work_item_id || null,
      }));
    if (cleanLines.length === 0) { toast.error('Voeg minstens één regel met label toe'); return; }
    setSaving(true);
    try {
      const payload = { room_type: form.room_type.trim(), description: form.description?.trim() || null, lines: cleanLines };
      if (editingId) {
        await axios.put(`${API}/room-templates/${editingId}`, payload, { headers: getAuthHeaders() });
        toast.success('Template bijgewerkt');
      } else {
        await axios.post(`${API}/room-templates`, payload, { headers: getAuthHeaders() });
        toast.success('Template aangemaakt');
      }
      setShowForm(false);
      fetchAll();
    } catch (e) {
      toast.error('Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (tpl) => {
    if (!window.confirm(`Template "${tpl.room_type}" verwijderen?`)) return;
    try {
      await axios.delete(`${API}/room-templates/${tpl.id}?soft=false`, { headers: getAuthHeaders() });
      toast.success('Template verwijderd');
      fetchAll();
    } catch (e) {
      toast.error('Verwijderen mislukt');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-6" data-testid="ruimte-templates-page">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
              <LayoutTemplate className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Ruimte-templates</h1>
              <p className="text-sm text-slate-500">AI voorstelregels — welke werkposten per kamertype automatisch worden voorgesteld</p>
            </div>
          </div>
          <Button onClick={openCreate} className="bg-slate-900 hover:bg-slate-800" data-testid="add-template-btn">
            <Plus className="h-4 w-4 mr-2" /> Nieuw template
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Laden...
          </div>
        ) : templates.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-slate-500">
            <LayoutTemplate className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            Nog geen ruimte-templates.
          </CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((tpl) => (
              <Card key={tpl.id} data-testid={`template-card-${tpl.id}`} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-amber-500" />
                        <span className="font-semibold text-slate-900">{tpl.room_type}</span>
                        <Badge variant="secondary">{(tpl.lines || []).length} regels</Badge>
                      </div>
                      {tpl.description && <p className="text-xs text-slate-500 mt-1">{tpl.description}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(tpl)} data-testid={`edit-template-${tpl.id}`}>
                        <Edit2 className="h-4 w-4 text-slate-600" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(tpl)} data-testid={`delete-template-${tpl.id}`}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    {(tpl.lines || []).map((l, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        <span className="font-medium">{l.label}</span>
                        <span className="text-slate-400">→ {sourceLabel[l.source] || l.source}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto" data-testid="template-form-dialog">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Template bewerken' : 'Nieuw ruimte-template'}</DialogTitle>
            <DialogDescription>Bepaal welke werkposten automatisch worden voorgesteld voor dit kamertype en uit welke meetstaat-bron de hoeveelheid komt.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ruimte-type *</Label>
                <Input list="roomtype-list" value={form.room_type} onChange={(e) => setForm({ ...form, room_type: e.target.value })} placeholder="bv. Badkamer" data-testid="template-room-type" />
                <datalist id="roomtype-list">{ROOM_TYPE_PRESETS.map((p) => <option key={p} value={p} />)}</datalist>
              </div>
              <div>
                <Label>Omschrijving</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="korte omschrijving" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Voorstelregels</Label>
                <Button type="button" size="sm" variant="outline" onClick={addLine} data-testid="add-template-line">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Regel
                </Button>
              </div>
              <div className="space-y-2">
                {form.lines.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center border rounded-lg p-2 bg-slate-50/50">
                    <GripVertical className="h-4 w-4 text-slate-300 col-span-1 hidden sm:block" />
                    <Input
                      className="col-span-12 sm:col-span-3 h-8 text-sm"
                      placeholder="Label (bv. Tegelvloer)"
                      value={l.label}
                      onChange={(e) => updateLine(idx, 'label', e.target.value)}
                      data-testid={`template-line-label-${idx}`}
                    />
                    <Input
                      className="col-span-6 sm:col-span-2 h-8 text-sm"
                      list="category-list"
                      placeholder="Categorie"
                      value={l.category}
                      onChange={(e) => updateLine(idx, 'category', e.target.value)}
                    />
                    <div className="col-span-6 sm:col-span-3">
                      <Select value={l.source} onValueChange={(v) => updateLine(idx, 'source', v)}>
                        <SelectTrigger className="h-8 text-xs" data-testid={`template-line-source-${idx}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {sources.map((s) => <SelectItem key={s.key} value={s.key}>{s.label} ({s.unit})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-5 sm:col-span-2">
                      <Select value={l.item_type} onValueChange={(v) => updateLine(idx, 'item_type', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{ITEM_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 col-span-1" onClick={() => removeLine(idx)}>
                      <X className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                ))}
              </div>
              <datalist id="category-list">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuleren</Button>
            <Button onClick={save} disabled={saving} className="bg-slate-900 hover:bg-slate-800" data-testid="save-template-btn">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
