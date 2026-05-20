import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Image as ImageIcon, X, Sparkles, Loader2, Check, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import DescriptionView from '../components/DescriptionView';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const ROOM_OPTIONS = ['Badkamer', 'Keuken', 'Woonkamer', 'Slaapkamer', 'Toilet', 'Gang', 'Volledige woning'];

// Helper: read file → base64 (zonder de "data:...;base64," prefix)
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = r.result || '';
      const idx = result.indexOf('base64,');
      resolve(idx >= 0 ? result.slice(idx + 7) : result);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });

export default function AIQuoteAgentPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [proposal, setProposal] = useState(null);
  const [selectedItems, setSelectedItems] = useState({}); // index -> true (geselecteerd voor offerte)
  const [loading, setLoading] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('AI offerte');
  const [pastSessions, setPastSessions] = useState([]);

  const [input, setInput] = useState('');
  const [pendingImages, setPendingImages] = useState([]); // [{base64, name, preview}]
  const [dimensions, setDimensions] = useState([{ room: 'Badkamer', length: '', width: '', height: '2.7' }]);
  const [showDimensions, setShowDimensions] = useState(false);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // --- Initialiseer of laad sessie ---
  useEffect(() => {
    const init = async () => {
      try {
        // Probeer eerst de laatste sessie te hergebruiken
        const list = await axios.get(`${API}/ai-quote-agent/sessions/${projectId}`, { headers: getAuthHeaders() });
        setPastSessions(list.data || []);

        if (list.data && list.data.length > 0) {
          await loadSession(list.data[0].id);
        } else {
          await startNewSession();
        }
      } catch (e) {
        console.error('init agent error', e);
        toast.error('Kon AI agent niet starten');
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startNewSession = async () => {
    const resp = await axios.post(
      `${API}/ai-quote-agent/start-session`,
      { project_id: projectId },
      { headers: getAuthHeaders() }
    );
    setSessionId(resp.data.session_id);
    setSessionTitle(resp.data.title);
    setMessages([]);
    setProposal(null);
    setSelectedItems({});
    // refresh list
    const list = await axios.get(`${API}/ai-quote-agent/sessions/${projectId}`, { headers: getAuthHeaders() });
    setPastSessions(list.data || []);
  };

  const loadSession = async (sid) => {
    const resp = await axios.get(`${API}/ai-quote-agent/session/${sid}`, { headers: getAuthHeaders() });
    setSessionId(sid);
    setSessionTitle(resp.data.title);
    setMessages(resp.data.messages || []);
    setProposal(resp.data.current_proposal || null);
    // standaard alle items geselecteerd
    const items = resp.data.current_proposal?.items || [];
    const sel = {};
    items.forEach((_, i) => { sel[i] = true; });
    setSelectedItems(sel);
  };

  const deleteSession = async (sid) => {
    if (!window.confirm('Sessie definitief verwijderen?')) return;
    await axios.delete(`${API}/ai-quote-agent/session/${sid}`, { headers: getAuthHeaders() });
    if (sid === sessionId) {
      await startNewSession();
    } else {
      const list = await axios.get(`${API}/ai-quote-agent/sessions/${projectId}`, { headers: getAuthHeaders() });
      setPastSessions(list.data || []);
    }
  };

  const resetStuckSession = async () => {
    if (!sessionId) return;
    try {
      await axios.post(`${API}/ai-quote-agent/session/${sessionId}/reset-status`, {}, { headers: getAuthHeaders() });
      toast.success('Sessie status gereset. Je kan opnieuw een bericht sturen.');
      setLoading(false);
    } catch {
      toast.error('Kon sessie niet resetten');
    }
  };

  // --- Bestanden toevoegen ---
  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const added = await Promise.all(files.map(async (f) => ({
      base64: await fileToBase64(f),
      name: f.name,
      preview: URL.createObjectURL(f),
    })));
    setPendingImages((prev) => [...prev, ...added]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingImage = (idx) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // --- Bericht versturen ---
  const sendMessage = async () => {
    if (!input.trim() && pendingImages.length === 0) {
      toast.error('Schrijf een bericht of voeg een afbeelding toe');
      return;
    }
    if (!sessionId) return;
    setLoading(true);

    // Optimistic toevoegen van user-bericht
    const userMsg = {
      role: 'user',
      text: input || '(alleen afbeeldingen meegestuurd)',
      attachments: pendingImages.map((p) => ({ kind: 'image', name: p.name })),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const validDims = dimensions
      .filter((d) => d.room && (d.length || d.width))
      .map((d) => ({
        room: d.room,
        length: parseFloat(d.length) || 0,
        width: parseFloat(d.width) || 0,
        height: parseFloat(d.height) || 2.7,
      }));

    try {
      // Backend start nu een background task — we krijgen meteen "processing" terug
      await axios.post(
        `${API}/ai-quote-agent/message`,
        {
          session_id: sessionId,
          text: input,
          image_base64s: pendingImages.map((p) => p.base64),
          dimensions: validDims,
        },
        { headers: getAuthHeaders(), timeout: 60000 } // 60s ruim voor enqueue (zou normaal <1s zijn)
      );
      setInput('');
      setPendingImages([]);

      // Begin met pollen tot status weer 'idle' is (max 8 min — langer dan typische Claude max,
      // korter dan backend auto-recovery van 10 min)
      const startedAt = Date.now();
      const POLL_INTERVAL = 3000;
      const MAX_WAIT_MS = 8 * 60 * 1000;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (Date.now() - startedAt > MAX_WAIT_MS) {
          toast.error('De agent doet er langer dan 8 minuten over. Vernieuw de pagina — het antwoord verschijnt mogelijk alsnog. Of probeer een korter bericht.', { duration: 10000 });
          // NIET het user-bericht terugrollen — task draait nog door op de backend en zal afronden
          break;
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
        const sess = await axios.get(
          `${API}/ai-quote-agent/session/${sessionId}`,
          { headers: getAuthHeaders(), timeout: 60000 } // Expliciet: erft niet meer de globale default
        );
        const status = sess.data?.status;
        if (status === 'idle') {
          // Nieuw assistant-bericht ontvangen → laad de hele lijst
          setMessages(sess.data.messages || []);
          if (sess.data.current_proposal) {
            setProposal(sess.data.current_proposal);
            const sel = {};
            (sess.data.current_proposal.items || []).forEach((_, i) => { sel[i] = true; });
            setSelectedItems(sel);
          }
          break;
        }
        if (status === 'error') {
          const errDetail = sess.data?.error || '';
          if (/budget/i.test(errDetail)) {
            toast.error('Emergent LLM budget op. Ga naar Profile → Universal Key → Add Balance.', { duration: 8000 });
          } else if (/502|503|504|BadGateway|Overloaded|429/i.test(errDetail)) {
            toast.error('De AI-dienst is even overbelast. Probeer over 10 seconden opnieuw.', { duration: 6000 });
          } else {
            toast.error(errDetail || 'Agent gaf een fout — probeer opnieuw', { duration: 6000 });
          }
          // Rol user-message terug
          setMessages(sess.data.messages.filter((m, i, arr) => !(m.role === 'user' && i === arr.length - 1)));
          break;
        }
        // status === 'processing' → blijven pollen
      }
    } catch (e) {
      console.error(e);
      const detail = e.response?.data?.detail || e.message || '';
      const status = e.response?.status;
      if (status === 409) {
        toast.error('Vorige bericht is nog aan het verwerken. Wacht even of klik "Reset" rechts als het langer dan 3 min duurt.', { duration: 8000 });
      } else if (status === 402 || /budget/i.test(detail)) {
        toast.error('Emergent LLM budget op. Ga naar Profile → Universal Key → Add Balance.', { duration: 8000 });
      } else {
        toast.error(detail || 'Agent gaf een fout — probeer opnieuw');
      }
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  // --- Voorstel toepassen ---
  // State: ingevulde prijzen voor 'unknown' items (idx -> string)
  const [priceOverrides, setPriceOverrides] = useState({});

  const applyProposal = async () => {
    if (!proposal) return;
    const selectedIdx = (proposal.items || []).map((_, i) => i).filter((i) => selectedItems[i]);
    if (selectedIdx.length === 0) {
      toast.error('Selecteer minstens één regel');
      return;
    }
    // Bouw items met overrides voor onbekende prijzen
    const items = selectedIdx.map((i) => {
      const it = proposal.items[i];
      const overridePrice = parseFloat(priceOverrides[i]);
      const finalPrice = !isNaN(overridePrice) ? overridePrice : (parseFloat(it.unit_price) || 0);
      return {
        ...it,
        unit_price: finalPrice,
        // Behoud price_source zodat backend weet welke items in catalogus opgeslagen mogen worden
        price_source: it.price_source || (it.unit_price ? 'catalog' : 'unknown'),
      };
    });
    // Controleer of er nog regels zijn met prijs 0 / leeg
    const missingPrices = items.filter((it) => !it.unit_price || it.unit_price <= 0);
    if (missingPrices.length > 0) {
      toast.error(`${missingPrices.length} regel(s) hebben nog geen prijs. Vul deze in voor je de offerte aanmaakt.`, { duration: 6000 });
      return;
    }
    if (!window.confirm(`Maak een nieuwe offerte aan met ${items.length} regels?`)) return;
    setLoading(true);
    try {
      const resp = await axios.post(
        `${API}/ai-quote-agent/apply`,
        { session_id: sessionId, items },
        { headers: getAuthHeaders() }
      );
      const adds = resp.data.catalog_additions || {};
      let msg = `Offerte ${resp.data.quote_id} aangemaakt met ${resp.data.items_added} regels`;
      const catCount = (adds.materialen || 0) + (adds.work_items || 0);
      if (catCount > 0) {
        msg += ` (✓ ${catCount} nieuwe prijs(zen) opgeslagen in catalogus voor volgende keer)`;
      }
      toast.success(msg, { duration: 6000 });
      setTimeout(() => navigate(`/quotes/${resp.data.quote_id}`, { state: { fromProject: projectId } }), 800);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Kon offerte niet aanmaken');
    } finally {
      setLoading(false);
    }
  };

  // --- Afmetingen formulier ---
  const updateDim = (i, field, value) => {
    setDimensions((prev) => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d));
  };
  const addDimRow = () => setDimensions((prev) => [...prev, { room: 'Volledige woning', length: '', width: '', height: '2.7' }]);
  const removeDimRow = (i) => setDimensions((prev) => prev.filter((_, idx) => idx !== i));

  const totalSelected = (proposal?.items || [])
    .map((it, i) => ({ it, i }))
    .filter(({ i }) => selectedItems[i])
    .reduce((sum, { it, i }) => {
      const override = parseFloat(priceOverrides[i]);
      const price = !isNaN(override) ? override : (parseFloat(it.unit_price) || 0);
      return sum + (parseFloat(it.quantity || 0) * price);
    }, 0);

  const itemsWithMissingPrice = (proposal?.items || []).filter((it, i) => {
    if (!selectedItems[i]) return false;
    const isUnknown = it.price_source === 'unknown' || !it.unit_price || parseFloat(it.unit_price) <= 0;
    if (!isUnknown) return false;
    const override = parseFloat(priceOverrides[i]);
    return isNaN(override) || override <= 0;
  }).length;

  return (
    <DashboardLayout>
      <div data-testid="ai-quote-agent-page" className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate(`/projects/${projectId}`)} data-testid="back-to-project-btn">
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: '#500000' }}>
              <Sparkles size={28} /> {sessionTitle}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={resetStuckSession} title="Reset een vastzittende sessie (vorige bericht hangt)" data-testid="reset-stuck-btn">
              🔄 Reset
            </Button>
            <Button variant="outline" onClick={startNewSession} data-testid="new-session-btn">
              <Plus size={16} className="mr-1" /> Nieuwe sessie
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* === CHAT KOLOM === */}
          <Card className="lg:col-span-2">
            <CardContent className="p-4 flex flex-col" style={{ minHeight: '70vh' }}>
              <div className="flex-1 space-y-3 overflow-y-auto pr-1" data-testid="chat-messages" style={{ maxHeight: '60vh' }}>
                {messages.length === 0 && (
                  <div className="text-center py-12" style={{ color: '#94A3B8' }}>
                    <Sparkles size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Begin een gesprek met de AI calculator</p>
                    <p className="text-sm mt-2">Beschrijf het project, upload een grondplan of foto&apos;s,<br /> of vul afmetingen in. De agent helpt je een concept-offerte op te bouwen.</p>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className="max-w-[85%] rounded-2xl px-4 py-3 text-sm"
                      style={{
                        backgroundColor: m.role === 'user' ? '#500000' : '#F8FAFC',
                        color: m.role === 'user' ? 'white' : '#1F2937',
                        border: m.role === 'user' ? 'none' : '1px solid #E5E7EB',
                      }}
                    >
                      {m.attachments && m.attachments.length > 0 && (
                        <div className="text-xs italic mb-1 opacity-80">
                          📎 {m.attachments.length} bijlage(n)
                        </div>
                      )}
                      {m.role === 'assistant' ? (
                        <DescriptionView text={m.text} />
                      ) : (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl px-4 py-3 text-sm flex items-center gap-2" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                      <Loader2 size={16} className="animate-spin" /> Agent denkt na…
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Pending images preview */}
              {pendingImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t" style={{ borderColor: '#E5E7EB' }}>
                  {pendingImages.map((p, i) => (
                    <div key={i} className="relative">
                      <img src={p.preview} alt={p.name} className="w-16 h-16 object-cover rounded-lg" />
                      <button
                        onClick={() => removePendingImage(i)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                        data-testid={`remove-pending-${i}`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Dimensions form */}
              {showDimensions && (
                <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: '#E5E7EB' }}>
                  <p className="text-xs font-semibold" style={{ color: '#64748B' }}>AFMETINGEN (optioneel)</p>
                  {dimensions.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <select
                        value={d.room}
                        onChange={(e) => updateDim(i, 'room', e.target.value)}
                        className="px-2 py-1 border rounded text-sm"
                        style={{ borderColor: '#E5E7EB', minWidth: 120 }}
                      >
                        {ROOM_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <input type="number" step="0.1" placeholder="L (m)" value={d.length}
                        onChange={(e) => updateDim(i, 'length', e.target.value)}
                        className="w-20 px-2 py-1 border rounded text-sm" style={{ borderColor: '#E5E7EB' }} />
                      <span>×</span>
                      <input type="number" step="0.1" placeholder="B (m)" value={d.width}
                        onChange={(e) => updateDim(i, 'width', e.target.value)}
                        className="w-20 px-2 py-1 border rounded text-sm" style={{ borderColor: '#E5E7EB' }} />
                      <span>×</span>
                      <input type="number" step="0.1" placeholder="H (m)" value={d.height}
                        onChange={(e) => updateDim(i, 'height', e.target.value)}
                        className="w-20 px-2 py-1 border rounded text-sm" style={{ borderColor: '#E5E7EB' }} />
                      <button onClick={() => removeDimRow(i)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addDimRow}><Plus size={14} className="mr-1" /> Kamer toevoegen</Button>
                </div>
              )}

              {/* Input bar */}
              <div className="mt-3 pt-3 border-t flex items-end gap-2" style={{ borderColor: '#E5E7EB' }}>
                <div className="flex flex-col gap-1">
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf" multiple className="hidden" onChange={handleFiles} />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} title="Foto/plan toevoegen" data-testid="attach-file-btn">
                    <ImageIcon size={16} />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowDimensions((s) => !s)} title="Afmetingen toevoegen" data-testid="toggle-dimensions-btn">
                    📐
                  </Button>
                </div>
                <textarea
                  data-testid="agent-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendMessage();
                  }}
                  placeholder="Beschrijf het project of stel een vraag… (Ctrl+Enter om te versturen)"
                  rows={3}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm resize-none"
                  style={{ borderColor: '#E5E7EB' }}
                  disabled={loading}
                />
                <Button onClick={sendMessage} disabled={loading} style={{ backgroundColor: '#500000', color: 'white' }} data-testid="send-message-btn">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* === VOORSTEL KOLOM === */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg" style={{ color: '#3a190b' }}>Huidig voorstel</h3>
                {proposal && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
                    {proposal.items?.length || 0} regels
                  </span>
                )}
              </div>

              {!proposal && (
                <p className="text-sm" style={{ color: '#94A3B8' }}>
                  Nog geen voorstel. Stel je vraag in de chat en de agent stelt regels voor.
                </p>
              )}

              {proposal && (
                <>
                  <p className="text-sm" style={{ color: '#64748B' }}>{proposal.summary}</p>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1" data-testid="proposal-items">
                    {(proposal.items || []).map((it, i) => {
                      const isUnknownPrice = it.price_source === 'unknown' || !it.unit_price || parseFloat(it.unit_price) <= 0;
                      const overrideStr = priceOverrides[i];
                      const effectivePrice = !isNaN(parseFloat(overrideStr)) ? parseFloat(overrideStr) : (parseFloat(it.unit_price) || 0);
                      const lineTotal = (parseFloat(it.quantity) || 0) * effectivePrice;
                      return (
                        <div
                          key={i}
                          className="flex items-start gap-2 p-2 border rounded-lg text-sm"
                          style={{ borderColor: selectedItems[i] ? '#500000' : '#E5E7EB' }}
                        >
                          <input
                            type="checkbox"
                            checked={!!selectedItems[i]}
                            onChange={(e) => setSelectedItems((prev) => ({ ...prev, [i]: e.target.checked }))}
                            className="mt-1"
                            data-testid={`proposal-item-checkbox-${i}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{
                                backgroundColor: it.item_type === 'arbeid' ? '#FEF3C7' : it.item_type === 'materiaal' ? '#DBEAFE' : '#F3E8FF',
                                color: it.item_type === 'arbeid' ? '#92400E' : it.item_type === 'materiaal' ? '#1E40AF' : '#6B21A8',
                              }}>{it.item_type}</span>
                              <span className="font-medium">{it.description}</span>
                              {isUnknownPrice && (
                                <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                                  prijs ontbreekt
                                </span>
                              )}
                            </div>
                            <div className="text-xs mt-1 flex items-center gap-2 flex-wrap" style={{ color: '#64748B' }}>
                              <span>{it.quantity} {it.unit} × </span>
                              {isUnknownPrice ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  data-testid={`price-override-${i}`}
                                  value={overrideStr ?? ''}
                                  onChange={(e) => setPriceOverrides((prev) => ({ ...prev, [i]: e.target.value }))}
                                  placeholder="prijs €"
                                  className="w-24 px-2 py-1 border rounded text-sm"
                                  style={{ borderColor: '#F59E0B', backgroundColor: '#FFFBEB' }}
                                />
                              ) : (
                                <span>€{(parseFloat(it.unit_price) || 0).toFixed(2)}</span>
                              )}
                              <span>= €{lineTotal.toFixed(2)}</span>
                            </div>
                            {it.rationale && (
                              <div className="text-xs italic mt-0.5" style={{ color: '#94A3B8' }}>↳ {it.rationale}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-3 border-t" style={{ borderColor: '#E5E7EB' }}>
                    <div className="flex items-center justify-between mb-2 text-sm">
                      <span style={{ color: '#64748B' }}>Geselecteerd totaal (excl. BTW):</span>
                      <span className="font-bold" style={{ color: '#500000' }}>€{totalSelected.toFixed(2)}</span>
                    </div>
                    {itemsWithMissingPrice > 0 && (
                      <div className="mb-2 p-2 rounded text-xs" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                        ⚠️ {itemsWithMissingPrice} regel(s) hebben nog geen prijs. Vul ze in (oranje vakjes) voor je de offerte aanmaakt — ze worden automatisch in je catalogus bewaard.
                      </div>
                    )}
                    <Button
                      onClick={applyProposal}
                      disabled={loading || itemsWithMissingPrice > 0}
                      className="w-full"
                      style={{ backgroundColor: itemsWithMissingPrice > 0 ? '#94A3B8' : '#10B981', color: 'white' }}
                      data-testid="apply-proposal-btn"
                    >
                      <Check size={16} className="mr-1" /> Maak offerte van selectie
                    </Button>
                  </div>

                  {proposal.questions && proposal.questions.length > 0 && (
                    <div className="pt-3 border-t" style={{ borderColor: '#E5E7EB' }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: '#64748B' }}>Open vragen van de agent:</p>
                      <ul className="text-xs space-y-1" style={{ color: '#475569' }}>
                        {proposal.questions.map((q, i) => <li key={i}>• {q}</li>)}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {/* Past sessions */}
              {pastSessions.length > 1 && (
                <div className="pt-3 border-t" style={{ borderColor: '#E5E7EB' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#64748B' }}>Oudere sessies</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {pastSessions.filter((s) => s.id !== sessionId).slice(0, 10).map((s) => (
                      <div key={s.id} className="flex items-center gap-1 text-xs">
                        <button
                          onClick={() => loadSession(s.id)}
                          className="flex-1 text-left px-2 py-1 rounded hover:bg-gray-100 truncate"
                          data-testid={`load-session-${s.id}`}
                        >
                          {s.title}
                        </button>
                        <button onClick={() => deleteSession(s.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
