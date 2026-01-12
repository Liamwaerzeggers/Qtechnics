import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Loader2, Upload, Trash2, Send } from 'lucide-react';
import { toast } from 'sonner';

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
  }, [project]);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API}/projects/${project.id}/customer-invoices`, { withCredentials: true });
      setInvoices(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      setInvoices([]);
    }
  };

  const handleSaveCosts = async () => {
    try {
      await axios.put(`${API}/projects/${project.id}`, costData, { withCredentials: true });
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
        { withCredentials: true }
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
        { withCredentials: true }
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
        { withCredentials: true }
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
        { withCredentials: true }
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
      sent: { bg: '#DBEAFE', color: '#1E40AF', text: 'Verstuurd', icon: '→' },
      sent_peppol: { bg: '#DBEAFE', color: '#1E40AF', text: 'PEPPOL', icon: '🔗' },
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
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
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
        { withCredentials: true }
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
        { withCredentials: true, responseType: 'blob' }
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
            <div className="text-3xl font-bold" style={{color: '#3B82F6'}}>
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
                <Button onClick={handleSaveCosts} style={{backgroundColor: '#1E40AF', color: 'white'}}>
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
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm font-semibold mb-3" style={{color: '#1E40AF'}}>
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
                          <span className="font-bold" style={{color: '#3B82F6'}}>
                            €{(q.total_incl_vat || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {approvedQuotes.length > 1 && (
                      <div className="flex justify-between items-center pt-3 mt-2 border-t border-blue-200">
                        <span className="font-semibold" style={{color: '#1E40AF'}}>Totaal alle offertes:</span>
                        <span className="font-bold text-lg" style={{color: '#1E40AF'}}>
                          €{totalSalePrice.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-between text-lg">
                  <span className="font-semibold" style={{color: '#64748B'}}>Verkoopprijs (incl. BTW):</span>
                  <span className="font-bold" style={{color: '#3B82F6'}}>
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
                        <span className="font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E40AF'}}>Winst:</span>
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
              <h4 className="font-semibold mb-3" style={{color: '#1E3A8A'}}>Deelfacturen Aanmaken</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => createInvoice('25_approval', 25)}
                  disabled={Array.isArray(invoices) && invoices.some(inv => inv.milestone === '25_approval')}
                  className="flex items-center justify-between p-4 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-500 hover:bg-blue-50"
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
                  className="flex items-center justify-between p-4 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-500 hover:bg-blue-50"
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
                  className="flex items-center justify-between p-4 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-500 hover:bg-blue-50"
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
                  className="flex items-center justify-between p-4 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-500 hover:bg-blue-50"
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
                <h4 className="font-semibold mb-3" style={{color: '#1E3A8A'}}>
                  Uitgegeven Facturen ({invoices.length})
                </h4>
                <div className="space-y-2">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-semibold" style={{color: '#1E40AF'}}>
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
                          <div className="text-xs font-mono mt-1" style={{color: '#3B82F6'}}>
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
                              backgroundColor: '#1E40AF',
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
                <h4 className="font-semibold mb-3" style={{color: '#1E3A8A'}}>
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
