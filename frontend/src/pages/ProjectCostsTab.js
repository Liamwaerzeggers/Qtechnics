import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Loader2, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ProjectCostsTab({ project, quote, onUpdate }) {
  const [editingCosts, setEditingCosts] = useState(false);
  const [costData, setCostData] = useState({
    labor_cost_per_hour: 0,
    labor_hours: 0,
    material_costs: 0,
    other_costs: 0
  });
  const [invoices, setInvoices] = useState([]);
  const [uploading, setUploading] = useState(false);

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

  // Calculate financials - only use approved quote
  const totalCosts = project.total_costs || 0;
  const salePrice = quote?.total_incl_vat || 0; // Only from approved quote
  const profit = salePrice - totalCosts;
  const profitMargin = salePrice > 0 ? (profit / salePrice) * 100 : 0;
  const hasApprovedQuote = quote?.status === 'goedgekeurd';

  return (
    <div className="space-y-6">
      {/* Warning if no approved quote */}
      {!hasApprovedQuote && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-medium" style={{color: '#92400E'}}>
            ⚠️ <strong>Let op:</strong> Er is nog geen goedgekeurde offerte. Keur een offerte goed in het "Offertes" tabblad om de verkoopprijs en winst te berekenen.
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
                <Input 
                  type="number" 
                  step="0.5"
                  value={costData.labor_hours} 
                  onChange={(e) => setCostData({...costData, labor_hours: parseFloat(e.target.value) || 0})} 
                />
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
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold" style={{color: '#64748B'}}>Uurtarief Arbeid</div>
                  <div style={{color: '#1E293B'}}>€{project.labor_cost_per_hour?.toFixed(2) || '0.00'}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{color: '#64748B'}}>Aantal Uren</div>
                  <div style={{color: '#1E293B'}}>{project.labor_hours?.toFixed(1) || '0.0'} uur</div>
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{color: '#64748B'}}>Totale Arbeidskosten</div>
                  <div style={{color: '#1E293B'}}>€{((project.labor_cost_per_hour || 0) * (project.labor_hours || 0)).toFixed(2)}</div>
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
                
                <div className="flex justify-between text-lg">
                  <span className="font-semibold" style={{color: '#64748B'}}>Verkoopprijs (incl. BTW):</span>
                  <span className="font-bold" style={{color: '#3B82F6'}}>
                    €{quote?.total_incl_vat?.toFixed(2) || project.total_price?.toFixed(2) || '0.00'}
                  </span>
                </div>
                
                {!quote && !project.total_price && (
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm" style={{color: '#92400E'}}>
                      💡 <strong>Let op:</strong> Maak een offerte in het "Offertes" tabblad om de verkoopprijs en winst correct te berekenen.
                    </p>
                  </div>
                )}
                
                {(() => {
                  const totalCosts = project.total_costs || 0;
                  const salePrice = quote?.total_incl_vat || project.total_price || 0;
                  const profit = salePrice - totalCosts;
                  const profitMargin = salePrice > 0 ? (profit / salePrice) * 100 : 0;
                  
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
                  onClick={() => createInvoice('10_approval', 10)}
                  disabled={Array.isArray(invoices) && invoices.some(inv => inv.milestone === '10_approval')}
                  className="flex items-center justify-between p-4 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-500 hover:bg-blue-50"
                  style={{borderColor: '#CBD5E1'}}
                >
                  <div className="text-left">
                    <div className="font-semibold" style={{color: '#1E293B'}}>10% Bij Akkoord</div>
                    <div className="text-sm" style={{color: '#64748B'}}>Akkoord offerte</div>
                  </div>
                  {Array.isArray(invoices) && invoices.some(inv => inv.milestone === '10_approval') && (
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
                    <div className="font-semibold" style={{color: '#1E293B'}}>40% Voor Start</div>
                    <div className="text-sm" style={{color: '#64748B'}}>Een week voor aanvang</div>
                  </div>
                  {Array.isArray(invoices) && invoices.some(inv => inv.milestone === '40_before_start') && (
                    <span className="text-green-600 font-bold">✓</span>
                  )}
                </button>
                
                <button
                  onClick={() => createInvoice('40_completion', 40)}
                  disabled={Array.isArray(invoices) && invoices.some(inv => inv.milestone === '40_completion')}
                  className="flex items-center justify-between p-4 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-500 hover:bg-blue-50"
                  style={{borderColor: '#CBD5E1'}}
                >
                  <div className="text-left">
                    <div className="font-semibold" style={{color: '#1E293B'}}>40% Bij Oplevering</div>
                    <div className="text-sm" style={{color: '#64748B'}}>Werken afgerond</div>
                  </div>
                  {Array.isArray(invoices) && invoices.some(inv => inv.milestone === '40_completion') && (
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
                            invoice.milestone === '10_approval' ? '10% Akkoord' :
                            invoice.milestone === '40_before_start' ? '40% Voor Start' :
                            invoice.milestone === '40_completion' ? '40% Oplevering' :
                            '10% Tevredenheid'
                          }
                        </div>
                        {invoice.structured_communication && (
                          <div className="text-xs font-mono mt-1" style={{color: '#3B82F6'}}>
                            OGM: {invoice.structured_communication}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
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
                        className="p-2 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Verwijderen"
                      >
                        <Trash2 size={18} />
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
