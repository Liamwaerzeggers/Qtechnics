import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Loader2, Upload, Trash2, Send, Plus, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '../components/ui/switch';

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: \`Bearer \${token}\` } : {};
};

export default function ProjectCostsTab({ project, approvedQuotes = [], onUpdate }) {
  const [editingCosts, setEditingCosts] = useState(false);
  const [costData, setCostData] = useState({
    labor_cost_per_hour: 0,
    labor_hours: 0,
    material_costs: 0,
    other_costs: 0
  });
  const [invoices, setInvoices] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sendingPeppol, setSendingPeppol] = useState(null); // Track which invoice is being sent
  
  // Manual invoice entries state
  const [manualEntries, setManualEntries] = useState([]);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualFormData, setManualFormData] = useState({
    amount: '',
    description: '',
    invoice_date: new Date().toISOString().split('T')[0],
    send_via_billit: false
  });
  const [submittingManual, setSubmittingManual] = useState(false);

  // Calculate total sale price - use project.sales_price which includes approved quotes AND legacy documents
  // Fall back to calculating from approved quotes if sales_price not set
  const quotesTotal = approvedQuotes.reduce((sum, q) => sum + (q.total_incl_vat || 0), 0);
  const totalSalePrice = project.sales_price || quotesTotal;
  const hasApprovedQuotes = approvedQuotes.length > 0 || (project.sales_price && project.sales_price > 0);

  useEffect(() => {
    setCostData({
      labor_cost_per_hour: project.labor_cost_per_hour || 0,
      labor_hours: project.labor_hours || 0,
      material_costs: project.material_costs || 0,
      other_costs: project.other_costs || 0
    });
    fetchInvoices();
    fetchManualEntries();
  }, [project]);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API}/projects/${project.id}/customer-invoices`, { headers: getAuthHeaders() });
      setInvoices(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      setInvoices([]);
    }
  };
  
  const fetchManualEntries = async () => {
    try {
      const response = await axios.get(`${API}/projects/${project.id}/manual-invoices`, { headers: getAuthHeaders() });
      setManualEntries(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch manual entries:', error);
      setManualEntries([]);
    }
  };
  
  const handleSubmitManualEntry = async (e) => {
    e.preventDefault();
    if (!manualFormData.amount || parseFloat(manualFormData.amount) <= 0) {
      toast.error('Vul een geldig bedrag in');
      return;
    }
    
    setSubmittingManual(true);
    try {
      const response = await axios.post(
        `${API}/projects/${project.id}/manual-invoices`,
        {
          amount: parseFloat(manualFormData.amount),
          description: manualFormData.description,
          invoice_date: manualFormData.invoice_date,
          send_via_billit: manualFormData.send_via_billit
        },
        { headers: getAuthHeaders() }
      );
      
      toast.success(response.data.message);
      setManualFormData({
        amount: '',
        description: '',
        invoice_date: new Date().toISOString().split('T')[0],
        send_via_billit: false
      });
      setShowManualForm(false);
      fetchManualEntries();
      fetchInvoices(); // Refresh invoices in case one was created
      onUpdate();
    } catch (error) {
      console.error('Failed to create manual entry:', error);
      toast.error(error.response?.data?.detail || 'Kon registratie niet aanmaken');
    } finally {
      setSubmittingManual(false);
    }
  };
  
  const handleDeleteManualEntry = async (entryId) => {
    if (!window.confirm('Weet je zeker dat je deze registratie wilt verwijderen?')) {
      return;
    }
    
    try {
      await axios.delete(`${API}/projects/${project.id}/manual-invoices/${entryId}`, { headers: getAuthHeaders() });
      toast.success('Registratie verwijderd');
      fetchManualEntries();
      onUpdate();
    } catch (error) {
      console.error('Failed to delete manual entry:', error);
      toast.error('Kon registratie niet verwijderen');
    }
  };
  
  // Calculate total manually invoiced amount
  const totalManualInvoiced = manualEntries.reduce((sum, e) => sum + (e.amount || 0), 0);

  const handleSaveCosts = async () => {
    try {
      await axios.put(`${API}/projects/${project.id}`, costData, { headers: getAuthHeaders() });
      setEditingCosts(false);
      toast.success('Kosten bijgewerkt! 💰');
      onUpdate();
    } catch (error) {
      toast.error('Kon kosten niet bijwerken');
    }
  };

  const handleCalculateLaborCosts = async () => {
    try {
      const response = await axios.post(
        `${API}/projects/${project.id}/calculate-labor-costs`,
        {},
        { headers: getAuthHeaders() }
      );
      toast.success(`Arbeidskosten berekend! ${response.data.work_slips_count} werkbonnen verwerkt. Totaal: ${response.data.total_hours.toFixed(1)} uur × €30 = €${response.data.total_labor_cost.toFixed(2)}`);
      onUpdate();
      // Reload cost data
      setCostData({
        ...costData,
        labor_hours: response.data.total_hours
      });
    } catch (error) {
      toast.error('Kon arbeidskosten niet berekenen');
    }
  };

  const createInvoice = async (milestone, percentage) => {
    try {
      await axios.post(
        `${API}/projects/${project.id}/invoices/create`,
        { 
          milestone: milestone, 
          milestone_percentage: percentage 
        },
        { headers: getAuthHeaders() }
      );
      toast.success('Factuur aangemaakt! 📄');
      fetchInvoices();
      onUpdate();
    } catch (error) {
      console.error('Failed to create invoice:', error);
      let errorMsg = 'Kon factuur niet aanmaken';
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          errorMsg += ': ' + error.response.data.detail.map(e => e.msg || e).join(', ');
        } else {
          errorMsg += ': ' + error.response.data.detail;
        }
      }
      toast.error(errorMsg);
    }
  };

  const sendViaPeppol = async (invoiceId) => {
    setSendingPeppol(invoiceId);
    try {
      const response = await axios.post(
        `${API}/invoices/${invoiceId}/send-to-billit`,
        {},
        { headers: getAuthHeaders() }
      );
      // Show success message with transport type info
      const transportMsg = response.data.transport_type === 'Peppol' 
        ? `via PEPPOL naar ${response.data.customer_vat}` 
        : `via e-mail naar ${response.data.customer_email}`;
      toast.success(`Factuur verstuurd ${transportMsg}! 📧`);
      fetchInvoices(); // Refresh to get updated status
    } catch (error) {
      console.error('Billit send failed:', error);
      const errorMsg = error.response?.data?.detail || 'Kon factuur niet versturen';
      toast.error(errorMsg);
    } finally {
      setSendingPeppol(null);
    }
  };

  const retryBillitSend = async (invoiceId) => {
    setSendingPeppol(invoiceId);
    try {
      const response = await axios.post(
        `${API}/invoices/${invoiceId}/retry-billit`,
        {},
        { headers: getAuthHeaders() }
      );
      toast.success('Factuur opnieuw verstuurd! 📧');
      fetchInvoices();
    } catch (error) {
      console.error('Retry failed:', error);
      const errorMsg = error.response?.data?.detail || 'Kon factuur niet opnieuw versturen';
      toast.error(errorMsg);
    } finally {
      setSendingPeppol(null);
    }
  };

  const getPeppolStatusBadge = (invoice) => {
    const status = invoice.peppol_status || 'not_sent';
    const styles = {
      not_sent: { bg: '#E5E7EB', color: '#374151', text: 'Niet verstuurd', icon: '○' },
      sending: { bg: '#FEF3C7', color: '#92400E', text: 'Verzenden...', icon: '◌' },
      sent: { bg: '#f5e6e6', color: '#500000', text: 'Verstuurd', icon: '→' },
      sent_peppol: { bg: '#f5e6e6', color: '#500000', text: 'PEPPOL', icon: '🔗' },
      sent_email: { bg: '#E0E7FF', color: '#4338CA', text: 'E-mail', icon: '✉️' },
      delivered: { bg: '#D1FAE5', color: '#065F46', text: 'Afgeleverd', icon: '✓' },
      delivered_peppol: { bg: '#D1FAE5', color: '#065F46', text: 'PEPPOL ✓', icon: '🔗' },
      delivered_email: { bg: '#D1FAE5', color: '#065F46', text: 'E-mail ✓', icon: '✉️' },
      failed: { bg: '#FEE2E2', color: '#991B1B', text: 'Mislukt', icon: '✗' },
      rejected: { bg: '#FED7AA', color: '#9A3412', text: 'Geweigerd', icon: '⚠' },
      error: { bg: '#FEE2E2', color: '#991B1B', text: 'Fout', icon: '!' }
    };
    const style = styles[status] || styles.not_sent;
    
    return (
      <div className="flex items-center gap-1">
        <span 
          className="px-2 py-0.5 text-xs rounded-full font-medium"
          style={{ backgroundColor: style.bg, color: style.color }}
          title={invoice.peppol_error || ''}
        >
          {style.icon} {style.text}
        </span>
        {invoice.peppol_error && (
          <span 
            className="text-xs cursor-help" 
            title={invoice.peppol_error}
            style={{ color: '#991B1B' }}
          >
            ⓘ
          </span>
        )}
      </div>
    );
  };

  // Check if invoice can be sent (not already sent successfully)
  const canSendInvoice = (invoice) => {
    const status = invoice.peppol_status || 'not_sent';
    return !['sent', 'sent_peppol', 'sent_email', 'delivered', 'delivered_peppol', 'delivered_email', 'sending'].includes(status);
  };

  // Check if invoice can be retried (failed status)
  const canRetryInvoice = (invoice) => {
    const status = invoice.peppol_status || 'not_sent';
    return ['failed', 'rejected', 'error'].includes(status);
  };

  const handleInvoiceUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      toast.error('Alleen PDF bestanden toegestaan');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(
        `${API}/projects/${project.id}/invoices/upload`,
        formData,
        { 
          headers: getAuthHeaders(), headers: { 'Content-Type': 'multipart/form-data' }
        }
      );
      toast.success('Factuur geüpload! 📄');
      onUpdate();
      e.target.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Kon factuur niet uploaden');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteInvoice = async (invoiceIndex, filename) => {
    if (!window.confirm(`Factuur "${filename}" verwijderen? Kosten worden teruggedraaid.`)) {
      return;
    }
    
    try {
      await axios.delete(
        `${API}/projects/${project.id}/invoices/${invoiceIndex}`,
        { headers: getAuthHeaders() }
      );
      toast.success('Factuur verwijderd en kosten aangepast');
      onUpdate();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Kon factuur niet verwijderen');
    }
  };

  const downloadCustomerInvoice = async (invoice) => {
    try {
      const response = await axios.get(
        `${API}/invoices/${invoice.id}/pdf`,
        { headers: getAuthHeaders(), responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `factuur_${invoice.invoice_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF gedownload');
    } catch (error) {
      toast.error('Kon PDF niet downloaden');
    }
  };

  // Calculate financials - sum ALL approved quotes
  const totalCosts = project.total_costs || 0;
  const salePrice = totalSalePrice; // Sum of all approved quotes
  const profit = salePrice - totalCosts;
  const profitMargin = salePrice > 0 ? (profit / salePrice) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Warning if no approved quotes */}
      {!hasApprovedQuotes && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-medium" style={{color: '#92400E'}}>
            ⚠️ <strong>Let op:</strong> Er zijn nog geen goedgekeurde offertes. Keur een offerte goed in het "Offertes" tabblad om de verkoopprijs en winst te berekenen.
          </p>
        </div>
      )}

      {/* Financial Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-semibold mb-2" style={{color: '#64748B'}}>Totale Kosten</div>
            <div className="text-3xl font-bold" style={{color: '#EF4444'}}>
              €{totalCosts.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-semibold mb-2" style={{color: '#64748B'}}>Verkoopprijs</div>
            <div className="text-3xl font-bold" style={{color: '#7a1f1f'}}>
              €{salePrice.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-semibold mb-2" style={{color: '#64748B'}}>Winst</div>
            <div className="text-3xl font-bold" style={{color: profit >= 0 ? '#10B981' : '#EF4444'}}>
              €{profit.toFixed(2)}
            </div>
            <div className="text-sm mt-1" style={{color: profit >= 0 ? '#10B981' : '#EF4444'}}>
              {profitMargin.toFixed(1)}% marge
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kosten & Winstberekening */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>💰 Kosten & Winstberekening</CardTitle>
            {!editingCosts ? (
              <Button onClick={() => setEditingCosts(true)} variant="outline">
                Kosten Bewerken
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  onClick={() => { 
                    setEditingCosts(false); 
                    setCostData({
                      labor_cost_per_hour: project.labor_cost_per_hour || 0,
                      labor_hours: project.labor_hours || 0,
                      material_costs: project.material_costs || 0,
                      other_costs: project.other_costs || 0
                    });
                  }} 
                  variant="outline"
                >
                  Annuleren
                </Button>
                <Button onClick={handleSaveCosts} style={{backgroundColor: '#500000', color: 'white'}}>
                  Opslaan
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingCosts ? (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Uurtarief Arbeid (€)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={costData.labor_cost_per_hour} 
                  onChange={(e) => setCostData({...costData, labor_cost_per_hour: parseFloat(e.target.value) || 0})} 
                />
              </div>
              <div>
                <Label>Aantal Uren</Label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    step="0.5"
                    value={costData.labor_hours} 
                    onChange={(e) => setCostData({...costData, labor_hours: parseFloat(e.target.value) || 0})} 
                  />
                  <Button
                    type="button"
                    onClick={handleCalculateLaborCosts}
                    style={{backgroundColor: '#10B981', whiteSpace: 'nowrap'}}
                    title="Bereken arbeidsuren uit alle werkbonnen"
                  >
                    📊 Uit Werkbonnen
                  </Button>
                </div>
                <p className="text-xs mt-1" style={{color: '#64748B'}}>
                  💡 Klik op "Uit Werkbonnen" om automatisch alle uren te berekenen
                </p>
              </div>
              <div>
                <Label>Aankoopprijs Materialen (€)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={costData.material_costs} 
                  onChange={(e) => setCostData({...costData, material_costs: parseFloat(e.target.value) || 0})} 
                />
              </div>
              <div>
                <Label>Overige Kosten (€)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={costData.other_costs} 
                  onChange={(e) => setCostData({...costData, other_costs: parseFloat(e.target.value) || 0})} 
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Arbeidskosten uit Werkbonnen */}
              {project.labor_cost_from_workslips > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold" style={{color: '#166534'}}>
                        ⏱️ Arbeidskosten uit Werkbonnen
                      </div>
                      <div className="text-xs" style={{color: '#15803d'}}>
                        Automatisch berekend: {project.labor_hours?.toFixed(1) || '0'} man-uren × €30/uur
                      </div>
                    </div>
                    <div className="text-2xl font-bold" style={{color: '#166534'}}>
                      €{project.labor_cost_from_workslips?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold" style={{color: '#64748B'}}>Man-uren (uit werkbonnen)</div>
                  <div style={{color: '#1E293B'}}>{project.labor_hours?.toFixed(1) || '0.0'} man-uur</div>
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{color: '#64748B'}}>Arbeidskosten (uit werkbonnen)</div>
                  <div style={{color: '#166534'}}>€{project.labor_cost_from_workslips?.toFixed(2) || '0.00'}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{color: '#64748B'}}>Aankoopprijs Materialen</div>
                  <div style={{color: '#1E293B'}}>€{project.material_costs?.toFixed(2) || '0.00'}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{color: '#64748B'}}>Overige Kosten</div>
                  <div style={{color: '#1E293B'}}>€{project.other_costs?.toFixed(2) || '0.00'}</div>
                </div>
              </div>
              
              <div className="border-t pt-4 mt-4 space-y-3">
                <div className="flex justify-between text-lg">
                  <span className="font-semibold" style={{color: '#64748B'}}>Totale Kosten:</span>
                  <span className="font-bold" style={{color: '#EF4444'}}>€{project.total_costs?.toFixed(2) || '0.00'}</span>
                </div>
                
                {/* Approved Quotes List */}
                {hasApprovedQuotes && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-sm font-semibold mb-3" style={{color: '#500000'}}>
                      📄 Goedgekeurde Offertes ({approvedQuotes.length})
                    </div>
                    <div className="space-y-2">
                      {approvedQuotes.map((q) => (
                        <div key={q.id} className="flex justify-between items-center py-2 border-b border-blue-100 last:border-0">
                          <div>
                            <span className="font-medium" style={{color: '#1E293B'}}>{q.quote_number || q.id}</span>
                            <span className="text-xs ml-2" style={{color: '#64748B'}}>
                              {new Date(q.date || q.created_at).toLocaleDateString('nl-NL')}
                            </span>
                          </div>
                          <span className="font-bold" style={{color: '#7a1f1f'}}>
                            €{(q.total_incl_vat || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {approvedQuotes.length > 1 && (
                      <div className="flex justify-between items-center pt-3 mt-2 border-t border-red-200">
                        <span className="font-semibold" style={{color: '#500000'}}>Totaal alle offertes:</span>
                        <span className="font-bold text-lg" style={{color: '#500000'}}>
                          €{totalSalePrice.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-between text-lg">
                  <span className="font-semibold" style={{color: '#64748B'}}>Verkoopprijs (incl. BTW):</span>
                  <span className="font-bold" style={{color: '#7a1f1f'}}>
                    €{totalSalePrice.toFixed(2)}
                  </span>
                </div>
                
                {!hasApprovedQuotes && (
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm" style={{color: '#92400E'}}>
                      💡 <strong>Let op:</strong> Keur een offerte goed in het "Offertes" tabblad. Alleen goedgekeurde offertes worden gebruikt voor winstberekening.
                    </p>
                  </div>
                )}
                
                {(() => {
                  const totalCosts = project.total_costs || 0;
                  const profit = totalSalePrice - totalCosts;
                  const profitMargin = totalSalePrice > 0 ? (profit / totalSalePrice) * 100 : 0;
                  
                  return (
                    <>
                      <div className="flex justify-between text-2xl border-t pt-3">
                        <span className="font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>Winst:</span>
                        <span className="font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: profit >= 0 ? '#10B981' : '#EF4444'}}>
                          €{profit.toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="font-semibold" style={{color: '#64748B'}}>Winstmarge:</span>
                        <span className="font-bold text-lg" style={{color: profit >= 0 ? '#10B981' : '#EF4444'}}>
                          {profitMargin.toFixed(1)}%
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Facturatie (Klant) */}
      <Card>
        <CardHeader>
          <CardTitle>📄 Facturatie (Klant)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Milestone Buttons */}
            <div>
              <h4 className="font-semibold mb-3" style={{color: '#3a190b'}}>Deelfacturen Aanmaken</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => createInvoice('25_approval', 25)}
                  disabled={Array.isArray(invoices) && invoices.some(inv => inv.milestone === '25_approval')}
                  className="flex items-center justify-between p-4 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-500 hover:bg-red-50"
                  style={{borderColor: '#CBD5E1'}}
                >
                  <div className="text-left">
                    <div className="font-semibold" style={{color: '#1E293B'}}>25% Bij Akkoord</div>
                    <div className="text-sm" style={{color: '#64748B'}}>Akkoord offerte</div>
                  </div>
                  {Array.isArray(invoices) && invoices.some(inv => inv.milestone === '25_approval') && (
                    <span className="text-green-600 font-bold">✓</span>
                  )}
                </button>
                
                <button
                  onClick={() => createInvoice('40_before_start', 40)}
                  disabled={Array.isArray(invoices) && invoices.some(inv => inv.milestone === '40_before_start')}
                  className="flex items-center justify-between p-4 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-500 hover:bg-red-50"
                  style={{borderColor: '#CBD5E1'}}
                >
                  <div className="text-left">
                    <div className="font-semibold" style={{color: '#1E293B'}}>40% Voor Aanvang</div>
                    <div className="text-sm" style={{color: '#64748B'}}>Een week voor aanvang</div>
                  </div>
                  {Array.isArray(invoices) && invoices.some(inv => inv.milestone === '40_before_start') && (
                    <span className="text-green-600 font-bold">✓</span>
                  )}
                </button>
                
                <button
                  onClick={() => createInvoice('25_completion', 25)}
                  disabled={Array.isArray(invoices) && invoices.some(inv => inv.milestone === '25_completion')}
                  className="flex items-center justify-between p-4 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-500 hover:bg-red-50"
                  style={{borderColor: '#CBD5E1'}}
                >
                  <div className="text-left">
                    <div className="font-semibold" style={{color: '#1E293B'}}>25% Bij Oplevering</div>
                    <div className="text-sm" style={{color: '#64748B'}}>Werken afgerond</div>
                  </div>
                  {Array.isArray(invoices) && invoices.some(inv => inv.milestone === '25_completion') && (
                    <span className="text-green-600 font-bold">✓</span>
                  )}
                </button>
                
                <button
                  onClick={() => createInvoice('10_satisfaction', 10)}
                  disabled={Array.isArray(invoices) && invoices.some(inv => inv.milestone === '10_satisfaction')}
                  className="flex items-center justify-between p-4 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-500 hover:bg-red-50"
                  style={{borderColor: '#CBD5E1'}}
                >
                  <div className="text-left">
                    <div className="font-semibold" style={{color: '#1E293B'}}>10% Tevredenheid</div>
                    <div className="text-sm" style={{color: '#64748B'}}>Klant tevreden</div>
                  </div>
                  {Array.isArray(invoices) && invoices.some(inv => inv.milestone === '10_satisfaction') && (
                    <span className="text-green-600 font-bold">✓</span>
                  )}
                </button>
              </div>
            </div>

            {/* Invoices List */}
            {Array.isArray(invoices) && invoices.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3" style={{color: '#3a190b'}}>
                  Uitgegeven Facturen ({invoices.length})
                </h4>
                <div className="space-y-2">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-semibold" style={{color: '#500000'}}>
                          {invoice.invoice_number}
                        </div>
                        <div className="text-sm" style={{color: '#64748B'}}>
                          {new Date(invoice.invoice_date).toLocaleDateString('nl-NL')} • {
                            invoice.milestone === '25_approval' ? '25% Akkoord' :
                            invoice.milestone === '10_approval' ? '10% Akkoord' :
                            invoice.milestone === '40_before_start' ? '40% Voor Aanvang' :
                            invoice.milestone === '25_completion' ? '25% Oplevering' :
                            invoice.milestone === '40_completion' ? '40% Oplevering' :
                            '10% Tevredenheid'
                          }
                        </div>
                        {invoice.structured_communication && (
                          <div className="text-xs font-mono mt-1" style={{color: '#7a1f1f'}}>
                            OGM: {invoice.structured_communication}
                          </div>
                        )}
                        {/* Peppol Status Badge */}
                        <div className="mt-1">
                          {getPeppolStatusBadge(invoice)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right mr-2">
                          <div className="font-bold" style={{color: '#1E293B'}}>
                            €{invoice.total_incl_vat.toFixed(2)}
                          </div>
                          <div className="text-xs" style={{color: invoice.payment_status === 'paid' ? '#10B981' : '#F59E0B'}}>
                            {invoice.payment_status === 'paid' ? 'Betaald' : 'Onbetaald'}
                          </div>
                        </div>
                        <Button
                          onClick={() => downloadCustomerInvoice(invoice)}
                          variant="outline"
                          size="sm"
                        >
                          📄 PDF
                        </Button>
                        {/* Billit Send Button - Smart transport selection */}
                        {canSendInvoice(invoice) && (
                          <Button
                            onClick={() => sendViaPeppol(invoice.id)}
                            disabled={sendingPeppol === invoice.id}
                            size="sm"
                            style={{
                              backgroundColor: '#500000',
                              color: 'white'
                            }}
                          >
                            {sendingPeppol === invoice.id ? (
                              <Loader2 size={14} className="animate-spin mr-1" />
                            ) : (
                              <Send size={14} className="mr-1" />
                            )}
                            Versturen
                          </Button>
                        )}
                        {/* Retry Button for failed invoices */}
                        {canRetryInvoice(invoice) && (
                          <Button
                            onClick={() => retryBillitSend(invoice.id)}
                            disabled={sendingPeppol === invoice.id}
                            size="sm"
                            variant="outline"
                            style={{
                              borderColor: '#DC2626',
                              color: '#DC2626'
                            }}
                          >
                            {sendingPeppol === invoice.id ? (
                              <Loader2 size={14} className="animate-spin mr-1" />
                            ) : (
                              <span className="mr-1">↻</span>
                            )}
                            Opnieuw
                          </Button>
                        )}
                        {/* Success indicator for sent invoices */}
                        {!canSendInvoice(invoice) && !canRetryInvoice(invoice) && (
                          <Button
                            disabled
                            size="sm"
                            style={{
                              backgroundColor: '#D1FAE5',
                              color: '#065F46'
                            }}
                          >
                            <span className="mr-1">✓</span>
                            Verstuurd
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Handmatige Facturatieregistratie - Gefaseerde Facturatie */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>📊 Gefaseerde Facturatie</CardTitle>
            <Button 
              onClick={() => setShowManualForm(!showManualForm)}
              variant={showManualForm ? "outline" : "default"}
              style={!showManualForm ? {backgroundColor: '#500000'} : {}}
            >
              {showManualForm ? 'Annuleren' : <><Plus size={16} className="mr-1" /> Registratie Toevoegen</>}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Info box */}
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm" style={{color: '#500000'}}>
                💡 Registreer hier handmatig gefactureerde bedragen voor correcte maandelijkse rapportage. 
                Optioneel kunt u direct een factuur versturen via Billit.
              </p>
            </div>
            
            {/* Form */}
            {showManualForm && (
              <form onSubmit={handleSubmitManualEntry} className="p-4 bg-gray-50 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Bedrag (incl. BTW) *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={manualFormData.amount}
                        onChange={(e) => setManualFormData({...manualFormData, amount: e.target.value})}
                        className="pl-7"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Factuurdatum *</Label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input
                        type="date"
                        value={manualFormData.invoice_date}
                        onChange={(e) => setManualFormData({...manualFormData, invoice_date: e.target.value})}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label>Beschrijving (optioneel)</Label>
                  <Input
                    type="text"
                    placeholder="Bijv. Fase 1, Deelbetaling maart, Voorschot"
                    value={manualFormData.description}
                    onChange={(e) => setManualFormData({...manualFormData, description: e.target.value})}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <div className="font-medium" style={{color: '#1E293B'}}>Verstuur via Billit</div>
                    <div className="text-sm" style={{color: '#64748B'}}>
                      Maak automatisch een factuur aan en verstuur naar de klant
                    </div>
                  </div>
                  <Switch
                    checked={manualFormData.send_via_billit}
                    onCheckedChange={(checked) => setManualFormData({...manualFormData, send_via_billit: checked})}
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setShowManualForm(false)}
                  >
                    Annuleren
                  </Button>
                  <Button 
                    type="submit"
                    disabled={submittingManual}
                    style={{backgroundColor: '#500000'}}
                  >
                    {submittingManual ? (
                      <><Loader2 size={16} className="animate-spin mr-2" /> Bezig...</>
                    ) : (
                      'Registratie Toevoegen'
                    )}
                  </Button>
                </div>
              </form>
            )}
            
            {/* Summary */}
            {manualEntries.length > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold" style={{color: '#166534'}}>
                    Totaal Gefaseerd Gefactureerd:
                  </span>
                  <span className="text-2xl font-bold" style={{color: '#166534'}}>
                    €{totalManualInvoiced.toLocaleString('nl-NL', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>
                {totalSalePrice > 0 && (
                  <div className="text-sm mt-1" style={{color: '#15803d'}}>
                    {((totalManualInvoiced / totalSalePrice) * 100).toFixed(1)}% van verkoopprijs gefactureerd
                  </div>
                )}
              </div>
            )}
            
            {/* Entries List */}
            {manualEntries.length > 0 ? (
              <div>
                <h4 className="font-semibold mb-3" style={{color: '#3a190b'}}>
                  Geregistreerde Facturaties ({manualEntries.length})
                </h4>
                <div className="space-y-2">
                  {manualEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold" style={{color: '#500000'}}>
                            €{entry.amount?.toLocaleString('nl-NL', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </span>
                          {entry.send_via_billit && entry.billit_invoice_id && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                              Billit
                            </span>
                          )}
                          {!entry.send_via_billit && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                              Handmatig
                            </span>
                          )}
                        </div>
                        <div className="text-sm" style={{color: '#64748B'}}>
                          {entry.description || 'Geen beschrijving'}
                        </div>
                        <div className="text-xs" style={{color: '#94A3B8'}}>
                          Factuurdatum: {new Date(entry.invoice_date).toLocaleDateString('nl-NL', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteManualEntry(entry.id)}
                        className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-600 active:bg-red-100 transition-colors"
                        title="Verwijderen"
                        style={{color: '#64748B'}}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6" style={{color: '#94A3B8'}}>
                <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                <p>Nog geen facturatieregistraties</p>
                <p className="text-sm">Voeg een registratie toe om gefaseerde facturatie bij te houden</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inkoop Facturen */}
      <Card>
        <CardHeader>
          <CardTitle>📥 Inkoop Facturen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Upload Section */}
            <div className="border-2 border-dashed rounded-lg p-6 text-center" style={{borderColor: '#E5E7EB'}}>
              <input
                type="file"
                accept=".pdf"
                id="invoice-upload"
                className="hidden"
                onChange={handleInvoiceUpload}
                disabled={uploading}
              />
              <label htmlFor="invoice-upload" className="cursor-pointer">
                {uploading ? (
                  <Loader2 className="animate-spin mx-auto mb-4" size={48} style={{color: '#94A3B8'}} />
                ) : (
                  <Upload size={48} className="mx-auto mb-4" style={{color: '#94A3B8'}} />
                )}
                <p className="text-sm font-semibold mb-1" style={{color: '#1E293B'}}>
                  {uploading ? 'Uploaden...' : 'Upload Inkoop Factuur (PDF)'}
                </p>
                <p className="text-xs" style={{color: '#94A3B8'}}>
                  Materialen en kosten worden automatisch uitgelezen
                </p>
              </label>
            </div>

            {/* Uploaded Invoices */}
            {project.invoice_uploads && project.invoice_uploads.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3" style={{color: '#3a190b'}}>
                  Geüploade Facturen ({project.invoice_uploads.length})
                </h4>
                <div className="space-y-2">
                  {project.invoice_uploads.map((invoice, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-semibold" style={{color: '#1E293B'}}>
                          {invoice.filename}
                        </div>
                        <div className="text-sm" style={{color: '#64748B'}}>
                          Bedrag excl. BTW: €{invoice.total_excl_vat?.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-sm" style={{color: '#64748B'}}>
                          Bedrag incl. BTW: €{invoice.total_incl_vat?.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-xs" style={{color: '#94A3B8'}}>
                          Geüpload: {new Date(invoice.upload_date).toLocaleDateString('nl-NL')}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteInvoice(idx, invoice.filename)}
                        className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-600 active:bg-red-100 transition-colors touch-manipulation"
                        title="Verwijderen"
                        style={{color: '#64748B'}}
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
