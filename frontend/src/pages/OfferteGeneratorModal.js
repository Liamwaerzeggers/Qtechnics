import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API } from '../App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Zap, Loader2, AlertTriangle, FileText, Info, Check, Save } from 'lucide-react';
import { toast } from 'sonner';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const ITEM_TYPES = [
  { value: 'arbeid', label: 'Arbeid' },
  { value: 'materiaal', label: 'Materiaal' },
  { value: 'overig', label: 'Overig' },
];
const VAT_RATES = [6, 9, 21, 0];

const num = (v) => (v === '' || v === null || v === undefined || isNaN(Number(v)) ? 0 : Number(v));

export default function OfferteGeneratorModal({ projectId, open, onClose }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [data, setData] = useState(null);
  const [edit, setEdit] = useState({});           // line.id -> {include, quantity, unit_price, vat_rate, item_type, skip, wasMissing}
  const [overrides, setOverrides] = useState({}); // room_id -> template_id
  const [savedToLib, setSavedToLib] = useState({}); // line.id -> true
  const [savingLine, setSavingLine] = useState(null);

  const initEditState = (resp) => {
    const e = {};
    (resp.rooms || []).forEach((room) => {
      (room.lines || []).forEach((ln) => {
        const missing = ln.unit_price === null || ln.unit_price === undefined;
        e[ln.id] = {
          include: true,
          quantity: ln.quantity ?? 0,
          unit_price: missing ? '' : ln.unit_price,
          vat_rate: ln.vat_rate ?? 6,
          item_type: ln.item_type || 'arbeid',
          skip: false,
          wasMissing: missing,
          work_item_id: ln.work_item_id || null,
        };
      });
    });
    setEdit(e);
    setSavedToLib({});
  };

  const fetchSuggest = useCallback(async (ovr = {}) => {
    setLoading(true);
    try {
      const resp = await axios.post(
        `${API}/projects/${projectId}/offerte-generator/suggest`,
        { room_template_map: ovr },
        { headers: getAuthHeaders() }
      );
      setData(resp.data);
      initEditState(resp.data);
    } catch (e) {
      toast.error('Kon voorstellen niet genereren');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) {
      setOverrides({});
      fetchSuggest({});
    } else {
      setData(null);
      setEdit({});
    }
  }, [open, fetchSuggest]);

  const setLine = (id, patch) => setEdit((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const changeTemplate = (roomId, templateId) => {
    const next = { ...overrides, [roomId]: templateId };
    setOverrides(next);
    fetchSuggest(next);
  };

  const includedLines = useMemo(() => {
    if (!data) return [];
    const result = [];
    (data.rooms || []).forEach((room) => {
      (room.lines || []).forEach((ln) => {
        const e = edit[ln.id];
        if (e && e.include) {
          result.push({ ln, e, room });
        }
      });
    });
    return result;
  }, [data, edit]);

  // Regels die bij het voorstel geen prijs hadden en aandacht nodig hebben
  const missingBlockLines = useMemo(() => {
    return includedLines.filter(({ e }) => e.wasMissing && !e.skip);
  }, [includedLines]);

  // Blokkeer aanmaken zolang een noodzakelijke (niet-overgeslagen) prijs ontbreekt
  const blockingLines = useMemo(() => {
    return includedLines.filter(({ e }) => !e.skip && (e.unit_price === '' || num(e.unit_price) === 0));
  }, [includedLines]);

  const totals = useMemo(() => {
    let excl = 0, incl = 0, missingPrice = 0;
    includedLines.forEach(({ e }) => {
      const lineExcl = num(e.quantity) * num(e.unit_price);
      excl += lineExcl;
      incl += lineExcl * (1 + num(e.vat_rate) / 100);
      if (e.unit_price === '' || num(e.unit_price) === 0) missingPrice += 1;
    });
    return { excl, incl, missingPrice, count: includedLines.length };
  }, [includedLines]);

  const learnPrice = async ({ ln, e }) => {
    const price = num(e.unit_price);
    if (price <= 0) { toast.error('Vul eerst een prijs in'); return; }
    setSavingLine(ln.id);
    try {
      const resp = await axios.post(
        `${API}/werkposten/learn-price`,
        {
          work_item_id: e.work_item_id || ln.work_item_id || null,
          name: ln.label,
          category: ln.category || 'Algemeen',
          unit: ln.unit || 'stuk',
          vat_rate: num(e.vat_rate) || 6,
          default_source: ln.source || null,
          price,
          note: 'Aangevuld via offertegenerator',
        },
        { headers: getAuthHeaders() }
      );
      setLine(ln.id, { work_item_id: resp.data.id });
      setSavedToLib((prev) => ({ ...prev, [ln.id]: true }));
      toast.success(resp.data.created ? `"${ln.label}" toegevoegd aan bibliotheek` : `Prijs "${ln.label}" bijgewerkt`);
    } catch (err) {
      toast.error('Opslaan in bibliotheek mislukt');
    } finally {
      setSavingLine(null);
    }
  };

  const createQuote = async () => {
    if (includedLines.length === 0) {
      toast.error('Selecteer minstens één regel');
      return;
    }
    if (blockingLines.length > 0) {
      toast.error('Vul eerst alle noodzakelijke prijzen in of zet ze op "overslaan"');
      return;
    }
    setCreating(true);
    try {
      const lines = includedLines.map(({ ln, e }) => ({
        description: ln.label,
        quantity: num(e.quantity),
        unit_price: num(e.unit_price),
        vat_rate: num(e.vat_rate),
        unit: ln.unit,
        item_type: e.item_type,
        source: ln.source,
        work_item_id: e.work_item_id || ln.work_item_id || null,
        category: ln.category,
        room_name: ln.room_name,
      }));
      const resp = await axios.post(
        `${API}/projects/${projectId}/offerte-generator/create-quote`,
        { lines, learn_prices: true },
        { headers: getAuthHeaders() }
      );
      const { quote_id, prices_learned } = resp.data;
      toast.success(`Offerte ${quote_id} aangemaakt${prices_learned ? ` · ${prices_learned} prijs/prijzen geleerd` : ''}`);
      onClose();
      navigate(`/quotes/${quote_id}`);
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Offerte aanmaken mislukt';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto" data-testid="offerte-generator-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: '#500000' }}>
            <Zap className="h-5 w-5" /> Slimme offerte genereren
          </DialogTitle>
          <DialogDescription>
            Op basis van de meetstaat stellen we per ruimte werkposten met de juiste hoeveelheden voor. Controleer en pas aan voordat je de offerte aanmaakt.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Voorstellen genereren...
          </div>
        ) : !data ? null : (data.rooms || []).length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-400" />
            Geen ruimtes in de meetstaat. Voeg eerst ruimtes toe.
          </div>
        ) : (
          <div className="space-y-5">
            {/* Ontbrekende prijzen aanvullen */}
            {missingBlockLines.length > 0 && (
              <div className="border-2 border-amber-300 rounded-xl overflow-hidden" data-testid="missing-prices-block">
                <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="font-semibold text-amber-800 text-sm">Ontbrekende prijzen aanvullen</span>
                  <span className="text-xs text-amber-600">({missingBlockLines.length}) — vul aan, sla op in de bibliotheek, of sla over</span>
                </div>
                <div className="divide-y divide-amber-100">
                  {missingBlockLines.map(({ ln, room }) => {
                    const e = edit[ln.id] || {};
                    const saved = !!savedToLib[ln.id];
                    return (
                      <div key={ln.id} className="grid grid-cols-12 gap-2 items-center px-4 py-2" data-testid={`missing-row-${ln.id}`}>
                        <div className="col-span-12 sm:col-span-4 min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{ln.label}</div>
                          <div className="text-[11px] text-slate-400">{room?.room_name || ln.category} · {ln.source_label}</div>
                        </div>
                        <div className="col-span-3 sm:col-span-2 text-xs text-slate-500">
                          {num(e.quantity)} {ln.unit}
                        </div>
                        <div className="col-span-4 sm:col-span-2">
                          <Input
                            type="number" step="0.01"
                            className="h-8 text-right text-sm border-amber-300"
                            placeholder="€ prijs"
                            value={e.unit_price}
                            onChange={(ev) => { setLine(ln.id, { unit_price: ev.target.value }); setSavedToLib((p) => ({ ...p, [ln.id]: false })); }}
                            data-testid={`missing-price-input-${ln.id}`}
                          />
                        </div>
                        <div className="col-span-5 sm:col-span-2">
                          {saved ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                              <Check className="h-3.5 w-3.5" /> Opgeslagen
                            </span>
                          ) : (
                            <Button
                              size="sm" variant="outline"
                              className="h-8 text-xs w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                              onClick={() => learnPrice({ ln, e })}
                              disabled={savingLine === ln.id}
                              data-testid={`save-to-lib-${ln.id}`}
                            >
                              {savingLine === ln.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                              Bibliotheek
                            </Button>
                          )}
                        </div>
                        <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-1.5">
                          <Checkbox
                            checked={!!e.skip}
                            onCheckedChange={(c) => setLine(ln.id, { skip: !!c })}
                            data-testid={`skip-price-${ln.id}`}
                          />
                          <span className="text-[11px] text-slate-500">Overslaan</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {data.rooms.map((room) => (
              <div key={room.room_id} className="border rounded-xl overflow-hidden" data-testid={`gen-room-${room.room_id}`}>
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 border-b">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800">{room.room_name}</span>
                    <span className="text-xs text-slate-400">
                      vloer {room.computed?.floor_area}m² · wand {room.computed?.wall_area}m² · plafond {room.computed?.ceiling_area}m² · dagk. {room.computed?.dagkanten_total_lm}lm
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Template:</span>
                    <Select
                      value={room.template_id || 'none'}
                      onValueChange={(v) => changeTemplate(room.room_id, v === 'none' ? '' : v)}
                    >
                      <SelectTrigger className="h-8 w-40 text-xs" data-testid={`gen-template-select-${room.room_id}`}>
                        <SelectValue placeholder="Geen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Geen template</SelectItem>
                        {(data.available_templates || []).map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.room_type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {room.lines.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-slate-400 flex items-center gap-2">
                    <Info className="h-4 w-4" /> Geen voorstellen — kies een template voor deze ruimte.
                  </div>
                ) : (
                  <div className="divide-y">
                    {/* header row */}
                    <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-1.5 text-[11px] uppercase tracking-wide text-slate-400">
                      <div className="col-span-4">Werkpost</div>
                      <div className="col-span-2">Bron</div>
                      <div className="col-span-1 text-right">Aantal</div>
                      <div className="col-span-2 text-right">Eenheidsprijs</div>
                      <div className="col-span-1 text-right">BTW</div>
                      <div className="col-span-2 text-right">Totaal</div>
                    </div>
                    {room.lines.map((ln) => {
                      const e = edit[ln.id] || {};
                      const lineTotal = num(e.quantity) * num(e.unit_price);
                      const noPrice = e.unit_price === '' || num(e.unit_price) === 0;
                      return (
                        <div
                          key={ln.id}
                          className={`grid grid-cols-12 gap-2 px-4 py-2 items-center ${e.include ? '' : 'opacity-45'}`}
                          data-testid={`gen-line-${ln.id}`}
                        >
                          <div className="col-span-12 md:col-span-4 flex items-center gap-2">
                            <Checkbox
                              checked={!!e.include}
                              onCheckedChange={(c) => setLine(ln.id, { include: !!c })}
                              data-testid={`gen-line-include-${ln.id}`}
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-slate-800 truncate">{ln.label}</div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{ln.category}</Badge>
                                <Select value={e.item_type} onValueChange={(v) => setLine(ln.id, { item_type: v })}>
                                  <SelectTrigger className="h-5 w-20 text-[10px] px-1.5 border-0 bg-transparent text-slate-400">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ITEM_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                          <div className="col-span-4 md:col-span-2 text-xs text-slate-500">
                            {ln.source_label}
                          </div>
                          <div className="col-span-3 md:col-span-1">
                            <Input
                              type="number" step="0.01"
                              className="h-8 text-right text-sm"
                              value={e.quantity}
                              onChange={(ev) => setLine(ln.id, { quantity: ev.target.value })}
                              data-testid={`gen-line-qty-${ln.id}`}
                            />
                            <div className="text-[10px] text-slate-400 text-right mt-0.5">{ln.unit}</div>
                          </div>
                          <div className="col-span-3 md:col-span-2">
                            <Input
                              type="number" step="0.01"
                              className={`h-8 text-right text-sm ${noPrice ? 'border-amber-300 bg-amber-50' : ''}`}
                              placeholder="prijs?"
                              value={e.unit_price}
                              onChange={(ev) => setLine(ln.id, { unit_price: ev.target.value })}
                              data-testid={`gen-line-price-${ln.id}`}
                            />
                          </div>
                          <div className="col-span-2 md:col-span-1">
                            <Select value={String(e.vat_rate)} onValueChange={(v) => setLine(ln.id, { vat_rate: Number(v) })}>
                              <SelectTrigger className="h-8 text-xs px-2"><SelectValue /></SelectTrigger>
                              <SelectContent>{VAT_RATES.map((r) => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-12 md:col-span-2 text-right text-sm font-medium text-slate-700">
                            € {lineTotal.toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t pt-4">
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{totals.count}</span> regels ·
            excl. btw <span className="font-semibold">€ {totals.excl.toFixed(2)}</span> ·
            incl. btw <span className="font-semibold">€ {totals.incl.toFixed(2)}</span>
            {blockingLines.length > 0 && (
              <span className="ml-2 text-amber-600 inline-flex items-center gap-1" data-testid="blocking-warning">
                <AlertTriangle className="h-3.5 w-3.5" /> {blockingLines.length} noodzakelijke prijs/prijzen ontbreekt
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Annuleren</Button>
            <Button
              onClick={createQuote}
              disabled={creating || totals.count === 0 || blockingLines.length > 0}
              style={{ backgroundColor: '#500000', color: 'white' }}
              data-testid="gen-create-quote-btn"
            >
              {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Offerte aanmaken
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
