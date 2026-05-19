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
      const resp = await axios.post(
        `${API}/ai-quote-agent/message`,
        {
          session_id: sessionId,
          text: input,
          image_base64s: pendingImages.map((p) => p.base64),
          dimensions: validDims,
        },
        { headers: getAuthHeaders(), timeout: 120000 }
      );
      const assistantMsg = resp.data.assistant_message;
      setMessages((prev) => [...prev, assistantMsg]);
      if (resp.data.current_proposal) {
        setProposal(resp.data.current_proposal);
        const sel = {};
        resp.data.current_proposal.items.forEach((_, i) => { sel[i] = true; });
        setSelectedItems(sel);
      }
      setInput('');
      setPendingImages([]);
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.detail || 'Agent gaf een fout');
      // rol user-bericht terug
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  // --- Voorstel toepassen ---
  const applyProposal = async () => {
    if (!proposal) return;
    const items = (proposal.items || []).filter((_, i) => selectedItems[i]);
    if (items.length === 0) {
      toast.error('Selecteer minstens één regel');
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
      toast.success(`Offerte ${resp.data.quote_id} aangemaakt met ${resp.data.items_added} regels`);
      setTimeout(() => navigate(`/quotes/${resp.data.quote_id}`, { state: { fromProject: projectId } }), 600);
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
    .filter((_, i) => selectedItems[i])
    .reduce((sum, it) => sum + (parseFloat(it.quantity || 0) * parseFloat(it.unit_price || 0)), 0);

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
                    {(proposal.items || []).map((it, i) => (
                      <label
                        key={i}
                        className="flex items-start gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50 text-sm"
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
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                            {it.quantity} {it.unit} × €{(parseFloat(it.unit_price) || 0).toFixed(2)} = €{((parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0)).toFixed(2)}
                          </div>
                          {it.rationale && (
                            <div className="text-xs italic mt-0.5" style={{ color: '#94A3B8' }}>↳ {it.rationale}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="pt-3 border-t" style={{ borderColor: '#E5E7EB' }}>
                    <div className="flex items-center justify-between mb-2 text-sm">
                      <span style={{ color: '#64748B' }}>Geselecteerd totaal (excl. BTW):</span>
                      <span className="font-bold" style={{ color: '#500000' }}>€{totalSelected.toFixed(2)}</span>
                    </div>
                    <Button
                      onClick={applyProposal}
                      disabled={loading}
                      className="w-full"
                      style={{ backgroundColor: '#10B981', color: 'white' }}
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
