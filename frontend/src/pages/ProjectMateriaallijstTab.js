import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Boxes, RefreshCw, Loader2, Plus, Trash2, Truck, ShoppingCart, Printer, Package, AlertTriangle, Eye, EyeOff, Info } from 'lucide-react';
import { toast } from 'sonner';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const STATUS = {
  te_bestellen: { label: 'Te bestellen', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  besteld: { label: 'Besteld', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  geleverd: { label: 'Geleverd', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};
const REQUIREMENT = {
  verplicht: { label: 'Verplicht', cls: 'bg-red-50 text-red-600 border-red-200' },
  aanbevolen: { label: 'Aanbevolen', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  optioneel: { label: 'Optioneel', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
};
const num = (v) => (v === '' || v === null || v === undefined || isNaN(Number(v)) ? 0 : Number(v));

export default function ProjectMateriaallijstTab({ project }) {
  const projectId = project?.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState({});
  const [dismissedProfiles, setDismissedProfiles] = useState({});
  const [newLine, setNewLine] = useState({ name: '', unit: 'stuk', quantity: '', unit_price: '', supplier: '' });
  const [showAdd, setShowAdd] = useState(false);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const resp = await axios.get(`${API}/projects/${projectId}/materiaallijst`, { headers: getAuthHeaders() });
      setData(resp.data);
    } catch (e) { toast.error('Kon materiaallijst niet laden'); } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const generate = async () => {
    setGenerating(true);
    try {
      const resp = await axios.post(`${API}/projects/${projectId}/materiaallijst/generate`, {}, { headers: getAuthHeaders() });
      const d = resp.data;
      toast.success(`Materiaallijst bijgewerkt · ${d.created} nieuw, ${d.updated} aangepast${d.removed ? `, ${d.removed} verwijderd` : ''}`);
      fetchData();
    } catch (e) { toast.error('Genereren mislukt'); } finally { setGenerating(false); }
  };

  const updateLine = async (lineId, patch) => {
    try {
      await axios.put(`${API}/materiaallijst/lines/${lineId}`, patch, { headers: getAuthHeaders() });
      fetchData();
    } catch (e) { toast.error('Bijwerken mislukt'); }
  };

  const deleteLine = async (lineId) => {
    try { await axios.delete(`${API}/materiaallijst/lines/${lineId}`, { headers: getAuthHeaders() }); fetchData(); }
    catch { toast.error('Verwijderen mislukt'); }
  };

  const addManual = async () => {
    if (!newLine.name.trim()) { toast.error('Geef een naam'); return; }
    try {
      await axios.post(`${API}/projects/${projectId}/materiaallijst/lines`, {
        name: newLine.name.trim(), unit: newLine.unit, quantity: num(newLine.quantity),
        unit_price: newLine.unit_price === '' ? null : num(newLine.unit_price), supplier: newLine.supplier?.trim() || null,
      }, { headers: getAuthHeaders() });
      setNewLine({ name: '', unit: 'stuk', quantity: '', unit_price: '', supplier: '' });
      setShowAdd(false);
      fetchData();
    } catch { toast.error('Toevoegen mislukt'); }
  };

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const markOrdered = async () => {
    if (selectedIds.length === 0) { toast.error('Selecteer regels'); return; }
    try {
      const resp = await axios.post(`${API}/projects/${projectId}/materiaallijst/order`,
        { line_ids: selectedIds, create_material_requests: true },
        { headers: getAuthHeaders() });
      toast.success(`${resp.data.ordered} regels besteld${resp.data.material_requests_created ? ` · ${resp.data.material_requests_created} bestelaanvragen aangemaakt` : ''}`);
      setSelected({});
      fetchData();
    } catch { toast.error('Bestellen mislukt'); }
  };

  const printList = () => window.print();

  const totals = data?.totals || {};
  const groups = data?.groups || [];

  return (
    <div data-testid="project-materiaallijst-tab" className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#500000' }}>
            <Boxes size={24} /> Materiaallijst
          </h2>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            Automatisch berekend uit de offertes (werkposten × materiaalprofiel). Volg op wat besteld en geleverd moet worden.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={generate} disabled={generating} className="bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="generate-materiaallijst-btn">
            {generating ? <Loader2 size={16} className="mr-1 animate-spin" /> : <RefreshCw size={16} className="mr-1" />} Genereer materiaallijst
          </Button>
          <Button variant="outline" onClick={printList} data-testid="print-materiaallijst-btn"><Printer size={16} className="mr-1" /> Afdrukken</Button>
        </div>
      </div>

      {/* Totals */}
      {totals.line_count > 0 && (
        <Card style={{ backgroundColor: '#FFF8F0', borderColor: '#F5E6E6' }}>
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <Cell label="Regels" value={totals.line_count} />
            <Cell label="Te bestellen" value={totals.te_bestellen} />
            <Cell label="Besteld" value={totals.besteld} />
            <Cell label="Geleverd" value={totals.geleverd} />
            <Cell label="Totale aankoopkost" value={`€ ${Number(totals.total_cost || 0).toFixed(2)}`} highlight />
          </CardContent>
        </Card>
      )}

      {totals.missing_price > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="h-4 w-4" /> {totals.missing_price} materia(a)l(en) zonder aankoopprijs — vul aan in de bibliotheek of per regel.
        </div>
      )}

      {/* Ontbrekende materiaalprofielen */}
      {(data?.missing_profiles || []).filter((mp) => !dismissedProfiles[mp.work_item_id]).length > 0 && (
        <div className="border-2 border-orange-300 rounded-xl overflow-hidden" data-testid="missing-profiles-block">
          <div className="px-4 py-2.5 bg-orange-50 border-b border-orange-200 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="font-semibold text-orange-800 text-sm">Ontbrekende materiaalprofielen</span>
            <span className="text-xs text-orange-600">— deze werkposten leveren nog geen materialen op</span>
          </div>
          <div className="divide-y divide-orange-100">
            {(data.missing_profiles || []).filter((mp) => !dismissedProfiles[mp.work_item_id]).map((mp) => (
              <div key={mp.work_item_id} className="flex items-center justify-between px-4 py-2 gap-3" data-testid={`missing-profile-${mp.work_item_id}`}>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{mp.name}</div>
                  <div className="text-[11px] text-slate-400">{mp.quantity} {mp.unit} in offertes</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" className="h-8 text-xs border-orange-300 text-orange-700" onClick={() => window.open('/werkposten', '_blank')} data-testid={`add-profile-${mp.work_item_id}`}>
                    Materiaalprofiel toevoegen
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-500" onClick={() => setDismissedProfiles((p) => ({ ...p, [mp.work_item_id]: true }))} data-testid={`skip-profile-${mp.work_item_id}`}>
                    Overslaan
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)} data-testid="toggle-add-line-btn"><Plus size={14} className="mr-1" /> Handmatige regel</Button>
          {selectedIds.length > 0 && (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={markOrdered} data-testid="mark-ordered-btn">
              <ShoppingCart size={14} className="mr-1" /> Zet {selectedIds.length} op besteld
            </Button>
          )}
        </div>
      </div>

      {showAdd && (
        <Card><CardContent className="p-3 grid grid-cols-12 gap-2 items-end">
          <div className="col-span-12 sm:col-span-4">
            <Input placeholder="Materiaal" value={newLine.name} onChange={(e) => setNewLine({ ...newLine, name: e.target.value })} data-testid="new-line-name" />
          </div>
          <div className="col-span-4 sm:col-span-2"><Input type="number" placeholder="Aantal" value={newLine.quantity} onChange={(e) => setNewLine({ ...newLine, quantity: e.target.value })} /></div>
          <div className="col-span-4 sm:col-span-1"><Input placeholder="eenh." value={newLine.unit} onChange={(e) => setNewLine({ ...newLine, unit: e.target.value })} /></div>
          <div className="col-span-4 sm:col-span-2"><Input type="number" placeholder="€ prijs" value={newLine.unit_price} onChange={(e) => setNewLine({ ...newLine, unit_price: e.target.value })} /></div>
          <div className="col-span-8 sm:col-span-2"><Input placeholder="Leverancier" value={newLine.supplier} onChange={(e) => setNewLine({ ...newLine, supplier: e.target.value })} /></div>
          <div className="col-span-4 sm:col-span-1"><Button className="w-full" onClick={addManual} data-testid="confirm-add-line">Voeg toe</Button></div>
        </CardContent></Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Laden...</div>
      ) : groups.length === 0 ? (
        <Card><CardContent className="text-center py-12" style={{ color: '#94A3B8' }}>
          <Package size={48} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nog geen materiaallijst</p>
          <p className="text-sm mt-2">Klik op &quot;Genereer materiaallijst&quot; om de behoefte uit de offertes te berekenen.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <Card key={g.supplier} data-testid={`supplier-group-${g.supplier}`}>
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b">
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <Truck className="h-4 w-4 text-emerald-600" /> {g.supplier}
                    <Badge variant="secondary">{g.lines.length}</Badge>
                  </div>
                  <span className="text-sm font-medium text-slate-700">€ {Number(g.subtotal).toFixed(2)}</span>
                </div>
                <div className="divide-y">
                  {g.lines.map((ln) => {
                    const disabled = ln.enabled === false;
                    const req = REQUIREMENT[ln.requirement] || REQUIREMENT.verplicht;
                    return (
                    <div key={ln.id} className={`grid grid-cols-12 gap-2 items-center px-4 py-2 ${disabled ? 'opacity-45 bg-slate-50' : ''}`} data-testid={`mll-line-${ln.id}`}>
                      <div className="col-span-1 flex justify-center">
                        {ln.status === 'te_bestellen' && !disabled && (
                          <Checkbox checked={!!selected[ln.id]} onCheckedChange={(c) => setSelected((p) => ({ ...p, [ln.id]: !!c }))} data-testid={`mll-select-${ln.id}`} />
                        )}
                      </div>
                      <div className="col-span-11 sm:col-span-4 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-slate-800 truncate">{ln.name}</span>
                          {ln.source === 'auto' && <Badge variant="outline" className={`text-[9px] px-1 py-0 ${req.cls}`} data-testid={`mll-req-${ln.id}`}>{req.label}</Badge>}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          {ln.source === 'auto' ? `auto · ${ln.source_detail || ''}` : 'handmatig'}
                          {ln.calculation && (
                            <span className="inline-flex items-center gap-0.5 text-slate-400" title={ln.calculation} data-testid={`mll-calc-${ln.id}`}>
                              <Info className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                        {ln.reason && <div className="text-[10px] text-slate-400 italic truncate" title={ln.reason}>↳ {ln.reason}</div>}
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <Input type="number" step="0.001" className="h-8 text-right text-sm" defaultValue={ln.quantity}
                          onBlur={(e) => { const v = num(e.target.value); if (v !== ln.quantity) updateLine(ln.id, { quantity: v }); }}
                          data-testid={`mll-qty-${ln.id}`} />
                        <div className="text-[10px] text-slate-400 text-right">{ln.unit}{ln.packages ? ` · ${ln.packages} verp.` : ''}</div>
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <Input type="number" step="0.01" placeholder="€ prijs" className={`h-8 text-right text-sm ${ln.unit_price === null ? 'border-amber-300 bg-amber-50' : ''}`} defaultValue={ln.unit_price ?? ''}
                          onBlur={(e) => { const v = e.target.value === '' ? null : num(e.target.value); if (v !== ln.unit_price) updateLine(ln.id, { unit_price: v }); }}
                          data-testid={`mll-price-${ln.id}`} />
                      </div>
                      <div className="col-span-3 sm:col-span-2">
                        <Select value={ln.status} onValueChange={(v) => updateLine(ln.id, { status: v })}>
                          <SelectTrigger className={`h-8 text-xs border ${STATUS[ln.status]?.cls || ''}`} data-testid={`mll-status-${ln.id}`}><SelectValue /></SelectTrigger>
                          <SelectContent>{Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1 flex justify-end gap-0.5">
                        <Button size="icon" variant="ghost" className="h-8 w-8" title={disabled ? 'Inschakelen' : 'Uitschakelen'} onClick={() => updateLine(ln.id, { enabled: disabled })} data-testid={`mll-toggle-${ln.id}`}>
                          {disabled ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-500" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deleteLine(ln.id)} data-testid={`mll-delete-${ln.id}`}>
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const Cell = ({ label, value, highlight }) => (
  <div>
    <div className="text-xs text-slate-500">{label}</div>
    <div className={`font-bold ${highlight ? 'text-lg' : ''}`} style={highlight ? { color: '#500000' } : {}}>{value}</div>
  </div>
);
