import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { HardHat, RefreshCw, Loader2, Plus, Trash2, Printer, Clock, AlertTriangle, Eye, EyeOff, Sparkles, Users, Settings2, Euro, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const num = (v) => (v === '' || v === null || v === undefined || isNaN(Number(v)) ? 0 : Number(v));
const eur = (v) => `€ ${Number(v || 0).toFixed(2)}`;

export default function ProjectMandagenTab({ project }) {
  const projectId = project?.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [dismissedProfiles, setDismissedProfiles] = useState({});
  const [aiFillingId, setAiFillingId] = useState(null);
  const [aiFillingAll, setAiFillingAll] = useState(false);
  const [cfg, setCfg] = useState({ hourly_rate: '', hours_per_day: '' });
  const [savingCfg, setSavingCfg] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newLine, setNewLine] = useState({ name: '', category: 'Algemeen', man_days: '', notes: '' });

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const resp = await axios.get(`${API}/projects/${projectId}/mandagen`, { headers: getAuthHeaders() });
      setData(resp.data);
      setCfg({ hourly_rate: resp.data.config.hourly_rate, hours_per_day: resp.data.config.hours_per_day });
    } catch (e) { toast.error('Kon mandagen niet laden'); } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const generate = async () => {
    setGenerating(true);
    try {
      const resp = await axios.post(`${API}/projects/${projectId}/mandagen/generate`, {}, { headers: getAuthHeaders() });
      const d = resp.data;
      toast.success(`Mandagen bijgewerkt · ${d.created} nieuw, ${d.updated} aangepast${d.removed ? `, ${d.removed} verwijderd` : ''}`);
      fetchData();
    } catch (e) { toast.error('Genereren mislukt'); } finally { setGenerating(false); }
  };

  const saveConfig = async () => {
    setSavingCfg(true);
    try {
      await axios.put(`${API}/projects/${projectId}/mandagen/config`,
        { hourly_rate: num(cfg.hourly_rate), hours_per_day: num(cfg.hours_per_day) },
        { headers: getAuthHeaders() });
      toast.success('Loon-instelling opgeslagen voor dit project');
      fetchData();
    } catch { toast.error('Opslaan mislukt'); } finally { setSavingCfg(false); }
  };

  const resetConfig = async () => {
    try {
      await axios.delete(`${API}/projects/${projectId}/mandagen/config`, { headers: getAuthHeaders() });
      toast.success('Terug naar globale loon-instelling');
      fetchData();
    } catch { toast.error('Resetten mislukt'); }
  };

  const aiFillSingle = async (workItemId) => {
    setAiFillingId(workItemId);
    try {
      const resp = await axios.post(`${API}/werkposten/${workItemId}/ai-productivity-profile`, { mode: 'fill' }, { headers: getAuthHeaders() });
      if (!resp.data.skipped) toast.success(`AI-productiviteit gegenereerd · ${resp.data.productivity_profile.production_per_man_day} ${resp.data.productivity_profile.production_unit}/mandag`);
      await generate();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'AI-generatie mislukt');
    } finally { setAiFillingId(null); }
  };

  const aiFillAll = async () => {
    const missing = (data?.missing_profiles || []).filter((mp) => !dismissedProfiles[mp.work_item_id]);
    if (missing.length === 0) return;
    setAiFillingAll(true);
    let done = 0;
    for (const mp of missing) {
      setAiFillingId(mp.work_item_id);
      try {
        const resp = await axios.post(`${API}/werkposten/${mp.work_item_id}/ai-productivity-profile`, { mode: 'fill' }, { headers: getAuthHeaders() });
        if (!resp.data.skipped) done += 1;
      } catch (e) { /* doorgaan */ }
    }
    setAiFillingId(null);
    setAiFillingAll(false);
    toast.success(`${done} productiviteitsprofiel(en) aangevuld met AI`);
    await generate();
  };

  const updateLine = async (lineId, patch) => {
    try {
      await axios.put(`${API}/mandagen/lines/${lineId}`, patch, { headers: getAuthHeaders() });
      fetchData();
    } catch { toast.error('Bijwerken mislukt'); }
  };

  const deleteLine = async (lineId) => {
    try { await axios.delete(`${API}/mandagen/lines/${lineId}`, { headers: getAuthHeaders() }); fetchData(); }
    catch { toast.error('Verwijderen mislukt'); }
  };

  const addManual = async () => {
    if (!newLine.name.trim()) { toast.error('Geef een naam'); return; }
    try {
      await axios.post(`${API}/projects/${projectId}/mandagen/lines`, {
        name: newLine.name.trim(), category: newLine.category || 'Algemeen',
        man_days: num(newLine.man_days), notes: newLine.notes?.trim() || null,
      }, { headers: getAuthHeaders() });
      setNewLine({ name: '', category: 'Algemeen', man_days: '', notes: '' });
      setShowAdd(false);
      fetchData();
    } catch { toast.error('Toevoegen mislukt'); }
  };

  const printList = () => window.print();

  const totals = data?.totals || {};
  const groups = data?.groups || [];
  const config = data?.config || {};
  const missing = useMemo(() => (data?.missing_profiles || []).filter((mp) => !dismissedProfiles[mp.work_item_id]), [data, dismissedProfiles]);

  return (
    <div data-testid="project-mandagen-tab" className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#500000' }}>
            <HardHat size={24} /> Mandagen
          </h2>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            Automatisch berekend uit de offertes (werkposten × productiviteit). Mandagen = hoeveelheid / productie per mandag.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={generate} disabled={generating} className="bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="generate-mandagen-btn">
            {generating ? <Loader2 size={16} className="mr-1 animate-spin" /> : <RefreshCw size={16} className="mr-1" />} Genereer mandagen
          </Button>
          <Button variant="outline" onClick={printList} data-testid="print-mandagen-btn"><Printer size={16} className="mr-1" /> Afdrukken</Button>
        </div>
      </div>

      {/* Loon-config */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-700">
            <Settings2 className="h-4 w-4 text-blue-500" /> Arbeidsloon
            {config.is_override
              ? <Badge variant="outline" className="text-blue-600 border-blue-200 text-[10px]">Project-override</Badge>
              : <Badge variant="outline" className="text-slate-400 border-slate-200 text-[10px]">Globaal</Badge>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-xs text-slate-500">Uurloon (€)</label>
              <Input type="number" step="0.5" value={cfg.hourly_rate}
                onChange={(e) => setCfg({ ...cfg, hourly_rate: e.target.value })} data-testid="mandagen-hourly-rate" />
            </div>
            <div>
              <label className="text-xs text-slate-500">Uren per dag</label>
              <Input type="number" step="0.5" value={cfg.hours_per_day}
                onChange={(e) => setCfg({ ...cfg, hours_per_day: e.target.value })} data-testid="mandagen-hours-per-day" />
            </div>
            <div>
              <label className="text-xs text-slate-500">Dagtarief</label>
              <div className="h-10 flex items-center font-bold" style={{ color: '#500000' }} data-testid="mandagen-day-rate">
                {eur(config.day_rate)}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveConfig} disabled={savingCfg} data-testid="save-mandagen-config-btn">
                {savingCfg ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Euro size={14} className="mr-1" />} Opslaan
              </Button>
              {config.is_override && (
                <Button size="sm" variant="ghost" onClick={resetConfig} title="Terug naar globaal" data-testid="reset-mandagen-config-btn">
                  <RotateCcw size={14} />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      {totals.line_count > 0 && (
        <Card style={{ backgroundColor: '#FFF8F0', borderColor: '#F5E6E6' }}>
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Cell label="Regels" value={totals.line_count} />
            <Cell label="Totaal mandagen" value={Number(totals.total_man_days || 0).toFixed(2)} />
            <Cell label="Totaal uren" value={Number(totals.total_hours || 0).toFixed(1)} />
            <Cell label="Totale arbeidskost" value={eur(totals.total_labor_cost)} highlight />
          </CardContent>
        </Card>
      )}

      {/* Ontbrekende productiviteitsprofielen */}
      {missing.length > 0 && (
        <div className="border-2 border-orange-300 rounded-xl overflow-hidden" data-testid="missing-prod-profiles-block">
          <div className="px-4 py-2.5 bg-orange-50 border-b border-orange-200 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="font-semibold text-orange-800 text-sm">Ontbrekende productiviteitsprofielen</span>
              <span className="text-xs text-orange-600">— deze werkposten tellen nog geen mandagen mee</span>
            </div>
            <Button size="sm" className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white" onClick={aiFillAll} disabled={aiFillingAll} data-testid="ai-fill-all-prod-btn">
              {aiFillingAll ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
              Alle met AI aanvullen
            </Button>
          </div>
          <div className="divide-y divide-orange-100">
            {missing.map((mp) => (
              <div key={mp.work_item_id} className="flex items-center justify-between px-4 py-2 gap-3" data-testid={`missing-prod-${mp.work_item_id}`}>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{mp.name}</div>
                  <div className="text-[11px] text-slate-400">{mp.quantity} {mp.unit} in offertes</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white" onClick={() => aiFillSingle(mp.work_item_id)} disabled={aiFillingId === mp.work_item_id || aiFillingAll} data-testid={`ai-fill-prod-${mp.work_item_id}`}>
                    {aiFillingId === mp.work_item_id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                    AI aanvullen
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs border-orange-300 text-orange-700" onClick={() => window.open('/werkposten', '_blank')} data-testid={`edit-prod-${mp.work_item_id}`}>
                    Handmatig
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-500" onClick={() => setDismissedProfiles((p) => ({ ...p, [mp.work_item_id]: true }))} data-testid={`skip-prod-${mp.work_item_id}`}>
                    Overslaan
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)} data-testid="toggle-add-mandag-btn"><Plus size={14} className="mr-1" /> Handmatige regel</Button>
      </div>

      {showAdd && (
        <Card><CardContent className="p-3 grid grid-cols-12 gap-2 items-end">
          <div className="col-span-12 sm:col-span-4">
            <Input placeholder="Omschrijving (bv. Coördinatie)" value={newLine.name} onChange={(e) => setNewLine({ ...newLine, name: e.target.value })} data-testid="new-mandag-name" />
          </div>
          <div className="col-span-6 sm:col-span-3"><Input placeholder="Discipline" value={newLine.category} onChange={(e) => setNewLine({ ...newLine, category: e.target.value })} /></div>
          <div className="col-span-3 sm:col-span-2"><Input type="number" step="0.25" placeholder="Mandagen" value={newLine.man_days} onChange={(e) => setNewLine({ ...newLine, man_days: e.target.value })} data-testid="new-mandag-days" /></div>
          <div className="col-span-3 sm:col-span-2"><Input placeholder="Notitie" value={newLine.notes} onChange={(e) => setNewLine({ ...newLine, notes: e.target.value })} /></div>
          <div className="col-span-12 sm:col-span-1"><Button className="w-full" onClick={addManual} data-testid="confirm-add-mandag">Toe</Button></div>
        </CardContent></Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Laden...</div>
      ) : groups.length === 0 ? (
        <Card><CardContent className="text-center py-12" style={{ color: '#94A3B8' }}>
          <Users size={48} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nog geen mandagen berekend</p>
          <p className="text-sm mt-2">Klik op &quot;Genereer mandagen&quot; om de arbeidsbehoefte uit de offertes te berekenen.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <Card key={`${g.discipline_order}-${g.discipline}`} data-testid={`discipline-group-${g.discipline}`}>
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b">
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <span className="text-xs text-slate-400 font-mono">{g.discipline_order}.</span> {g.discipline}
                    <Badge variant="secondary">{g.lines.length}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-600"><b>{Number(g.subtotal_man_days).toFixed(2)}</b> mandagen</span>
                    <span className="font-medium text-slate-700">{eur(g.subtotal_labor_cost)}</span>
                  </div>
                </div>
                <div className="divide-y">
                  {/* Header row */}
                  <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-1.5 text-[10px] uppercase tracking-wide text-slate-400 font-medium">
                    <div className="col-span-4">Werkpost</div>
                    <div className="col-span-2 text-right">Hoeveelheid</div>
                    <div className="col-span-2 text-right">Productie/mandag</div>
                    <div className="col-span-2 text-right">Mandagen</div>
                    <div className="col-span-1 text-right">Kost</div>
                    <div className="col-span-1" />
                  </div>
                  {g.lines.map((ln) => {
                    const disabled = ln.enabled === false;
                    const hasOverride = ln.override_man_days !== null && ln.override_man_days !== undefined;
                    return (
                      <div key={ln.id} className={`grid grid-cols-12 gap-2 items-center px-4 py-2 ${disabled ? 'opacity-45 bg-slate-50' : ''}`} data-testid={`mandag-line-${ln.id}`}>
                        <div className="col-span-12 sm:col-span-4 min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{ln.name}</div>
                          <div className="text-[11px] text-slate-400">{ln.source === 'auto' ? 'auto uit offertes' : 'handmatig'}{ln.notes ? ` · ${ln.notes}` : ''}</div>
                        </div>
                        <div className="col-span-4 sm:col-span-2 text-right text-sm text-slate-600">
                          {ln.source === 'auto' ? `${ln.quantity} ${ln.unit}` : '—'}
                        </div>
                        <div className="col-span-4 sm:col-span-2 text-right text-sm text-slate-500">
                          {ln.production_per_man_day ? `${ln.production_per_man_day} ${ln.production_unit}` : '—'}
                        </div>
                        <div className="col-span-3 sm:col-span-2">
                          <Input type="number" step="0.25" className={`h-8 text-right text-sm ${hasOverride ? 'border-blue-300 bg-blue-50' : ''}`}
                            defaultValue={ln.effective_man_days}
                            onBlur={(e) => {
                              const v = num(e.target.value);
                              if (v !== ln.effective_man_days) updateLine(ln.id, { override_man_days: v });
                            }}
                            data-testid={`mandag-days-${ln.id}`} />
                          <div className="text-[10px] text-slate-400 text-right flex items-center justify-end gap-1">
                            <Clock className="h-2.5 w-2.5" />{Number(ln.hours || 0).toFixed(1)}u{hasOverride ? ' · aangepast' : ''}
                          </div>
                        </div>
                        <div className="col-span-6 sm:col-span-1 text-right text-sm font-medium text-slate-700" data-testid={`mandag-cost-${ln.id}`}>
                          {eur(ln.labor_cost)}
                        </div>
                        <div className="col-span-3 sm:col-span-1 flex justify-end gap-0.5">
                          <Button size="icon" variant="ghost" className="h-8 w-8" title={disabled ? 'Inschakelen' : 'Uitschakelen'} onClick={() => updateLine(ln.id, { enabled: disabled })} data-testid={`mandag-toggle-${ln.id}`}>
                            {disabled ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-500" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deleteLine(ln.id)} data-testid={`mandag-delete-${ln.id}`}>
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
