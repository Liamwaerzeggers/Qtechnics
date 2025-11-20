import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function QuoteDetailPage() {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [lead, setLead] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    quantity: '',
    unit_price: '',
    item_type: 'materiaal'
  });

  useEffect(() => {
    fetchQuoteData();
  }, [quoteId]);

  const fetchQuoteData = async () => {
    try {
      const [quoteRes, itemsRes] = await Promise.all([
        axios.get(`${API}/quotes/${quoteId}`, { withCredentials: true }),
        axios.get(`${API}/quotes/${quoteId}/items`, { withCredentials: true })
      ]);
      
      setQuote(quoteRes.data);
      setLineItems(itemsRes.data);
      
      if (quoteRes.data.lead_id) {
        const leadRes = await axios.get(`${API}/leads/${quoteRes.data.lead_id}`, { withCredentials: true });
        setLead(leadRes.data);
      }
    } catch (error) {
      toast.error('Kon offerte niet ophalen');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/quotes/${quoteId}/items`, {
        ...formData,
        quantity: parseFloat(formData.quantity),
        unit_price: parseFloat(formData.unit_price)
      }, { withCredentials: true });
      
      toast.success('Item toegevoegd!');
      setIsDialogOpen(false);
      setFormData({ description: '', quantity: '', unit_price: '', item_type: 'materiaal' });
      fetchQuoteData();
    } catch (error) {
      toast.error('Kon item niet toevoegen');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Weet je zeker dat je dit item wil verwijderen?')) return;
    
    try {
      await axios.delete(`${API}/quotes/${quoteId}/items/${itemId}`, { withCredentials: true });
      toast.success('Item verwijderd');
      fetchQuoteData();
    } catch (error) {
      toast.error('Kon item niet verwijderen');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await axios.get(`${API}/quotes/${quoteId}/export/pdf`, {
        withCredentials: true,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `offerte_${quote.quote_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF gedownload!');
    } catch (error) {
      toast.error('Kon PDF niet downloaden');
    }
  };

  const handleDownloadExcel = async () => {
    try {
      const response = await axios.get(`${API}/quotes/${quoteId}/export/excel`, {
        withCredentials: true,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `offerte_${quote.quote_number}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel gedownload!');
    } catch (error) {
      toast.error('Kon Excel niet downloaden');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await axios.put(`${API}/quotes/${quoteId}`, { status: newStatus }, { withCredentials: true });
      setQuote({ ...quote, status: newStatus });
      toast.success('Status bijgewerkt');
    } catch (error) {
      toast.error('Kon status niet bijwerken');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!quote) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p style={{color: '#94A3B8'}}>Offerte niet gevonden</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div data-testid="quote-detail-page" className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button data-testid="back-button" variant="ghost" onClick={() => navigate('/quotes')}>
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-4xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E40AF'}}>
              {quote.quote_number}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button data-testid="download-pdf-button" onClick={handleDownloadPDF} variant="outline">
              <Download className="mr-2" size={20} /> PDF
            </Button>
            <Button data-testid="download-excel-button" onClick={handleDownloadExcel} variant="outline">
              <Download className="mr-2" size={20} /> Excel
            </Button>
          </div>
        </div>

        {lead && (
          <Card>
            <CardHeader>
              <CardTitle>Klantinformatie</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-semibold" style={{color: '#64748B'}}>Naam</div>
                <div style={{color: '#1E293B'}}>{lead.name}</div>
              </div>
              <div>
                <div className="text-sm font-semibold" style={{color: '#64748B'}}>Email</div>
                <div style={{color: '#1E293B'}}>{lead.email}</div>
              </div>
              <div>
                <div className="text-sm font-semibold" style={{color: '#64748B'}}>Telefoon</div>
                <div style={{color: '#1E293B'}}>{lead.phone}</div>
              </div>
              <div>
                <div className="text-sm font-semibold" style={{color: '#64748B'}}>Adres</div>
                <div style={{color: '#1E293B'}}>{lead.address}</div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Line Items</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="add-item-button" style={{backgroundColor: '#1E40AF'}}>
                    <Plus className="mr-2" size={20} /> Item Toevoegen
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nieuw Item Toevoegen</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddItem} className="space-y-4" data-testid="add-item-form">
                    <div>
                      <Label>Omschrijving</Label>
                      <Input 
                        data-testid="item-description-input"
                        value={formData.description} 
                        onChange={(e) => setFormData({...formData, description: e.target.value})} 
                        required 
                      />
                    </div>
                    <div>
                      <Label>Aantal</Label>
                      <Input 
                        data-testid="item-quantity-input"
                        type="number" 
                        step="0.01"
                        value={formData.quantity} 
                        onChange={(e) => setFormData({...formData, quantity: e.target.value})} 
                        required 
                      />
                    </div>
                    <div>
                      <Label>Eenheidsprijs (&euro;)</Label>
                      <Input 
                        data-testid="item-unitprice-input"
                        type="number" 
                        step="0.01"
                        value={formData.unit_price} 
                        onChange={(e) => setFormData({...formData, unit_price: e.target.value})} 
                        required 
                      />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select 
                        data-testid="item-type-select"
                        value={formData.item_type} 
                        onValueChange={(value) => setFormData({...formData, item_type: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="arbeid">Arbeid</SelectItem>
                          <SelectItem value="materiaal">Materiaal</SelectItem>
                          <SelectItem value="overig">Overig</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button data-testid="submit-item-button" type="submit" className="w-full" style={{backgroundColor: '#1E40AF'}}>
                      Toevoegen
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {lineItems.length === 0 ? (
              <p style={{color: '#94A3B8'}}>Nog geen items toegevoegd</p>
            ) : (
              <div className="space-y-3">
                {lineItems.map((item) => (
                  <div 
                    key={item.id} 
                    data-testid={`line-item-${item.id}`}
                    className="p-4 rounded-lg flex justify-between items-center"
                    style={{backgroundColor: '#F8FAFC'}}
                  >
                    <div className="flex-1">
                      <div className="font-semibold" style={{color: '#1E293B'}}>{item.description}</div>
                      <div className="text-sm mt-1" style={{color: '#64748B'}}>
                        {item.quantity} x €{item.unit_price.toFixed(2)} | Type: {item.item_type}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-xl font-bold" style={{color: '#3B82F6'}}>
                        €{item.total.toFixed(2)}
                      </div>
                      <Button 
                        data-testid={`delete-item-${item.id}`}
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 size={18} style={{color: '#EF4444'}} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="flex justify-between text-lg">
              <span style={{color: '#64748B'}}>Subtotaal Arbeid:</span>
              <span className="font-semibold" style={{color: '#1E293B'}}>€{quote.subtotal_labor.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span style={{color: '#64748B'}}>Subtotaal Materiaal:</span>
              <span className="font-semibold" style={{color: '#1E293B'}}>€{quote.subtotal_material.toFixed(2)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between text-2xl">
              <span className="font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E40AF'}}>Totaalprijs:</span>
              <span className="font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E40AF'}}>€{quote.total_price.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
