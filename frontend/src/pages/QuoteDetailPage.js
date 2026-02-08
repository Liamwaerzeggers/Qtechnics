import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Download, Trash2, Search, Mail, Scissors, Loader2, Edit2, Check, X, Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer \${token}` } : {};
};

export default function QuoteDetailPage() {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromProjectId = location.state?.fromProject;
  const [quote, setQuote] = useState(null);
  const [lead, setLead] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [defaultVatRate, setDefaultVatRate] = useState(21); // Global VAT setting for quote
  const [sessionAddedItems, setSessionAddedItems] = useState([]); // Items added in current session
  const [formData, setFormData] = useState({
    description: '',
    quantity: '',
    unit_price: '',
    item_type: 'materiaal',
    vat_rate: 21,
    unit: 'm²'  // Added for custom work items
  });
  const [materials, setMaterials] = useState([]);
  const [materialSearch, setMaterialSearch] = useState('');
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);
  const [useCustomMaterial, setUseCustomMaterial] = useState(false);
  
  // Material image upload state
  const [materialImage, setMaterialImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Work items state
  const [workItems, setWorkItems] = useState([]);
  const [workItemSearch, setWorkItemSearch] = useState('');
  const [filteredWorkItems, setFilteredWorkItems] = useState([]);
  const [showWorkItemDropdown, setShowWorkItemDropdown] = useState(false);
  
  // Split quote state
  const [splitting, setSplitting] = useState(false);
  
  // Inline editing state for line items
  const [editingItem, setEditingItem] = useState(null);
  const [editValues, setEditValues] = useState({ quantity: '', unit_price: '' });

  useEffect(() => {
    fetchQuoteData();
    fetchMaterials();
    fetchWorkItems();
  }, [quoteId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMaterialDropdown && !event.target.closest('[data-testid="material-search-input"]')) {
        const dropdown = event.target.closest('.absolute.z-50');
        if (!dropdown) {
          setShowMaterialDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMaterialDropdown]);

  useEffect(() => {
    if (materialSearch && materialSearch.trim().length > 0) {
      const searchTerm = materialSearch.toLowerCase().trim();
      
      // Filter materials - case insensitive, partial matching
      const filtered = materials.filter(m => {
        // Search in name
        if (m.name && m.name.toLowerCase().includes(searchTerm)) return true;
        // Search in SKU
        if (m.sku && m.sku.toLowerCase().includes(searchTerm)) return true;
        // Search in description
        if (m.description && m.description.toLowerCase().includes(searchTerm)) return true;
        // Search in category
        if (m.category && m.category.toLowerCase().includes(searchTerm)) return true;
        // Search in brand
        if (m.brand && m.brand.toLowerCase().includes(searchTerm)) return true;
        
        return false;
      });
      
      console.log(`Found ${filtered.length} results for "${materialSearch}"`);
      setFilteredMaterials(filtered.slice(0, 50)); // Limit to 50 results for performance
    } else {
      // Show first 50 materials when no search term
      setFilteredMaterials(materials.slice(0, 50));
    }
  }, [materialSearch, materials]);

  // Work item search effect
  useEffect(() => {
    if (workItemSearch && workItemSearch.trim().length > 0) {
      const searchTerm = workItemSearch.toLowerCase().trim();
      const filtered = workItems.filter(w => {
        if (w.title && w.title.toLowerCase().includes(searchTerm)) return true;
        if (w.unit && w.unit.toLowerCase().includes(searchTerm)) return true;
        return false;
      });
      setFilteredWorkItems(filtered.slice(0, 50));
    } else {
      setFilteredWorkItems([]);
    }
  }, [workItemSearch, workItems]);

  const fetchQuoteData = async () => {
    try {
      const [quoteRes, itemsRes] = await Promise.all([
        axios.get(`${API}/quotes/${quoteId}`, { headers: getAuthHeaders() }),
        axios.get(`${API}/quotes/${quoteId}/items`, { headers: getAuthHeaders() })
      ]);
      
      setQuote(quoteRes.data);
      setLineItems(itemsRes.data);
      
      if (quoteRes.data.lead_id) {
        const leadRes = await axios.get(`${API}/leads/${quoteRes.data.lead_id}`, { headers: getAuthHeaders() });
        setLead(leadRes.data);
      }
    } catch (error) {
      console.error('Error fetching quote:', error);
      
      // Check for authentication errors
      if (error.response?.status === 401) {
        toast.error('Sessie verlopen. Log opnieuw in.');
        // Redirect to login after a short delay
        setTimeout(() => navigate('/'), 2000);
      } else if (error.response?.status === 404) {
        toast.error('Offerte niet gevonden');
      } else {
        toast.error('Kon offerte niet ophalen: ' + (error.response?.data?.detail || 'Onbekende fout'));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    try {
      const response = await axios.get(`${API}/materials?limit=15000`, { headers: getAuthHeaders() });
      const materialsList = response.data.materials || [];
      setMaterials(materialsList);
      console.log('✓ Loaded materials:', materialsList.length);
      if (materialsList.length === 0) {
        console.warn('⚠ No materials found. Please upload CSV in Materials page.');
      }
    } catch (error) {
      console.error('✗ Could not fetch materials:', error);
      toast.error('Kon materialen niet laden');
    }
  };

  const fetchWorkItems = async () => {
    try {
      const response = await axios.get(`${API}/work-items?limit=15000`, { headers: getAuthHeaders() });
      const workItemsList = response.data.work_items || [];
      setWorkItems(workItemsList);
      console.log('✓ Loaded work items:', workItemsList.length);
    } catch (error) {
      console.error('✗ Could not fetch work items:', error);
      toast.error('Kon werk items niet laden');
    }
  };

  const handleSelectMaterial = (material) => {
    setFormData({
      ...formData,
      description: material.name,
      unit_price: material.price.toString()
    });
    setMaterialSearch('');
    setShowMaterialDropdown(false);
    toast.success(`${material.name} geselecteerd`);
  };

  const handleSelectWorkItem = (workItem) => {
    setFormData({
      ...formData,
      description: workItem.title,
      unit_price: workItem.price.toString(),
      item_type: 'arbeid'
    });
    setWorkItemSearch('');
    setShowWorkItemDropdown(false);
    toast.success(`${workItem.title} geselecteerd`);
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      // If this is a custom work item (not from dropdown), auto-add to catalog
      if (formData.item_type === 'arbeid' && useCustomMaterial && formData.description && formData.unit_price) {
        try {
          // Try to auto-add to work items catalog
          const params = new URLSearchParams({
            title: formData.description,
            unit: formData.unit || 'm²',
            price: parseFloat(formData.unit_price)
          });
          const autoAddResponse = await axios.post(`${API}/work-items/auto-add?${params.toString()}`, {}, { headers: getAuthHeaders() });
          if (autoAddResponse.data.created) {
            toast.info(`"${formData.description}" toegevoegd aan werk items catalogus`);
            // Refresh work items list
            fetchWorkItems();
          }
        } catch (autoAddError) {
          // Silently fail - the item might already exist or there was an error
          console.log('Auto-add work item:', autoAddError?.response?.data?.detail || autoAddError.message);
        }
      }
      
      // If this is a custom material (not from dropdown), auto-add to catalog with optional image
      if (formData.item_type === 'materiaal' && useCustomMaterial && formData.description && formData.unit_price) {
        try {
          setUploadingImage(true);
          
          // Use FormData for multipart upload if image is provided
          if (materialImage) {
            const formDataUpload = new FormData();
            formDataUpload.append('name', formData.description);
            formDataUpload.append('price', parseFloat(formData.unit_price));
            formDataUpload.append('unit', formData.unit || 'stuk');
            formDataUpload.append('file', materialImage);
            
            const autoAddResponse = await axios.post(
              `${API}/materials/create-with-image`,
              formDataUpload,
              { 
                headers: getAuthHeaders(), headers: { 'Content-Type': 'multipart/form-data' }
              }
            );
            
            if (autoAddResponse.data.created) {
              toast.info(`"${formData.description}" toegevoegd aan materialen catalogus met foto 📷`);
              fetchMaterials(); // Refresh materials list
            } else if (autoAddResponse.data.material?.image_url) {
              toast.info(`Foto toegevoegd aan bestaand materiaal "${formData.description}" 📷`);
            }
          } else {
            // No image, just auto-add material
            const params = new URLSearchParams({
              name: formData.description,
              price: parseFloat(formData.unit_price),
              unit: formData.unit || 'stuk'
            });
            const autoAddResponse = await axios.post(`${API}/materials/auto-add?${params.toString()}`, {}, { headers: getAuthHeaders() });
            if (autoAddResponse.data.created) {
              toast.info(`"${formData.description}" toegevoegd aan materialen catalogus`);
              fetchMaterials(); // Refresh materials list
            }
          }
        } catch (autoAddError) {
          console.log('Auto-add material:', autoAddError?.response?.data?.detail || autoAddError.message);
        } finally {
          setUploadingImage(false);
        }
      }

      await axios.post(`${API}/quotes/${quoteId}/items`, {
        ...formData,
        quantity: parseFloat(formData.quantity),
        unit_price: parseFloat(formData.unit_price)
      }, { headers: getAuthHeaders() });
      
      // Track added item in session
      const addedItem = {
        description: formData.description,
        quantity: parseFloat(formData.quantity),
        unit_price: parseFloat(formData.unit_price),
        item_type: formData.item_type,
        total: parseFloat(formData.quantity) * parseFloat(formData.unit_price)
      };
      setSessionAddedItems(prev => [...prev, addedItem]);
      
      toast.success('Item toegevoegd! ✓');
      
      // Reset form but keep dialog open and preserve default VAT
      setFormData({ 
        description: '', 
        quantity: '', 
        unit_price: '', 
        item_type: 'materiaal', 
        vat_rate: defaultVatRate, // Use default VAT
        unit: 'm²' 
      });
      setMaterialSearch('');
      setWorkItemSearch('');
      setMaterialImage(null);
      setUseCustomMaterial(false);
      
      // Refresh quote data to update totals
      fetchQuoteData();
    } catch (error) {
      toast.error('Kon item niet toevoegen');
    }
  };
  
  // Close dialog and reset session
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSessionAddedItems([]);
    setFormData({ description: '', quantity: '', unit_price: '', item_type: 'materiaal', vat_rate: defaultVatRate, unit: 'm²' });
    setMaterialSearch('');
    setWorkItemSearch('');
    setMaterialImage(null);
    setUseCustomMaterial(false);
  };
  
  // Apply default VAT to all items in quote
  const handleApplyDefaultVat = async () => {
    if (!window.confirm(`Weet je zeker dat je BTW ${defaultVatRate}% wilt toepassen op alle items?`)) return;
    
    try {
      // Update all line items to use the default VAT rate
      for (const item of lineItems) {
        await axios.put(
          `${API}/quotes/${quoteId}/items/${item.id}`,
          { vat_rate: defaultVatRate },
          { headers: getAuthHeaders() }
        );
      }
      toast.success(`BTW ${defaultVatRate}% toegepast op alle items`);
      fetchQuoteData();
    } catch (error) {
      toast.error('Kon BTW niet bijwerken');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Weet je zeker dat je dit item wil verwijderen?')) return;
    
    try {
      await axios.delete(`${API}/quotes/${quoteId}/items/${itemId}`, { headers: getAuthHeaders() });
      toast.success('Item verwijderd');
      fetchQuoteData();
    } catch (error) {
      toast.error('Kon item niet verwijderen');
    }
  };

  // Start editing a line item
  const startEditingItem = (item) => {
    setEditingItem(item.id);
    setEditValues({
      quantity: item.quantity.toString(),
      unit_price: item.unit_price.toString()
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingItem(null);
    setEditValues({ quantity: '', unit_price: '' });
  };

  // Save edited line item
  const handleUpdateItem = async (itemId) => {
    const quantity = parseFloat(editValues.quantity);
    const unit_price = parseFloat(editValues.unit_price);

    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Voer een geldige hoeveelheid in');
      return;
    }
    if (isNaN(unit_price) || unit_price < 0) {
      toast.error('Voer een geldige prijs in');
      return;
    }

    try {
      await axios.put(
        `${API}/quotes/${quoteId}/items/${itemId}`,
        { quantity, unit_price },
        { headers: getAuthHeaders() }
      );
      toast.success('Item bijgewerkt! ✏️');
      setEditingItem(null);
      setEditValues({ quantity: '', unit_price: '' });
      fetchQuoteData();
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Kon item niet bijwerken');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await axios.get(`${API}/quotes/${quoteId}/export/pdf`, {
        headers: getAuthHeaders(), responseType: 'blob'
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
        headers: getAuthHeaders(), responseType: 'blob'
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

  // Split quote into Labor and Materials
  const handleSplitQuote = async () => {
    if (!quote) return;
    
    const hasLabor = lineItems.some(item => item.item_type === 'arbeid');
    const hasMaterial = lineItems.some(item => item.item_type === 'materiaal');
    
    if (!hasLabor || !hasMaterial) {
      toast.error('Splitsen vereist zowel arbeid als materiaal items');
      return;
    }
    
    if (!window.confirm('Weet je zeker dat je deze offerte wilt splitsen in een Arbeid en Materialen offerte?')) {
      return;
    }
    
    setSplitting(true);
    try {
      const response = await axios.post(`${API}/quotes/${quoteId}/split`, {}, { headers: getAuthHeaders() });
      
      toast.success(response.data.message);
      
      // Show details of created quotes
      const createdQuotes = response.data.created_quotes;
      createdQuotes.forEach(q => {
        toast.info(`${q.type === 'arbeid' ? '🔧' : '📦'} ${q.type.toUpperCase()}: ${q.id} (€${q.total_incl_vat.toFixed(2)})`, {
          duration: 5000
        });
      });
      
      // Refresh quote data
      fetchQuoteData();
      
      // Navigate to the labor quote
      const laborQuote = createdQuotes.find(q => q.type === 'arbeid');
      if (laborQuote) {
        setTimeout(() => {
          navigate(`/quotes/${laborQuote.id}`);
        }, 2000);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Kon offerte niet splitsen';
      toast.error(errorMsg);
    } finally {
      setSplitting(false);
    }
  };

  const handleSendEmail = async () => {
    if (!lead || !quote) {
      toast.error('Klantgegevens niet beschikbaar');
      return;
    }

    try {
      // First, download the PDF
      toast.info('PDF wordt gedownload...');
      const response = await axios.get(`${API}/quotes/${quoteId}/export/pdf`, {
        headers: getAuthHeaders(), responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `offerte_${quote.quote_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Prepare email
      const subject = `Offerte ${quote.quote_number} - Q Technics`;
      const body = `Beste ${lead.name},

Hierbij ontvangt u onze offerte ${quote.quote_number} voor uw project "${lead.project_type}".

📄 OFFERTE BIJLAGE:
De PDF is automatisch gedownload. Voeg deze toe als bijlage aan deze email.

💰 TOTAALBEDRAG: €${quote.total_incl_vat?.toFixed(2) || quote.total_price?.toFixed(2) || '0.00'}

Wij hopen u hiermee van dienst te zijn geweest en zien uw reactie met belangstelling tegemoet.

Heeft u vragen over deze offerte? Neem gerust contact met ons op.

Met vriendelijke groet,
Q Technics`;

      const mailtoLink = `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;
      
      toast.success(`✅ PDF gedownload en email voorbereid voor ${lead.email}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      toast.error('Kon email niet voorbereiden');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await axios.put(`${API}/quotes/${quoteId}`, { status: newStatus }, { headers: getAuthHeaders() });
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
          <div className="space-y-4">
            <p className="text-xl" style={{color: '#64748B'}}>Offerte niet gevonden</p>
            <p style={{color: '#94A3B8'}}>
              Deze offerte bestaat niet of u heeft geen toegang. 
              Mogelijk is uw sessie verlopen.
            </p>
            <div className="flex justify-center gap-4 mt-6">
              <Button onClick={() => navigate('/quotes')} variant="outline">
                <ArrowLeft size={16} className="mr-2" />
                Terug naar Offertes
              </Button>
              <Button onClick={() => navigate('/')} style={{backgroundColor: '#500000', color: 'white'}}>
                Opnieuw Inloggen
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div data-testid="quote-detail-page" className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button data-testid="back-button" variant="ghost" onClick={() => fromProjectId ? navigate(`/projects/${fromProjectId}`) : navigate('/quotes')}>
              <ArrowLeft size={20} />
            </Button>
            {fromProjectId && (
              <Button 
                onClick={() => {
                  toast.success('Offerte opgeslagen! Terug naar project...');
                  navigate(`/projects/${fromProjectId}`);
                }}
                style={{backgroundColor: '#10B981', color: 'white'}}
              >
                ✓ Opslaan en Terug naar Project
              </Button>
            )}
            <h1 className="text-4xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>
              {quote.quote_number}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSendEmail} variant="outline" style={{color: '#059669', borderColor: '#059669'}}>
              <Mail className="mr-2" size={20} /> Verstuur Email
            </Button>
            <Button data-testid="download-pdf-button" onClick={handleDownloadPDF} variant="outline">
              <Download className="mr-2" size={20} /> PDF
            </Button>
            <Button data-testid="download-excel-button" onClick={handleDownloadExcel} variant="outline">
              <Download className="mr-2" size={20} /> Excel
            </Button>
            {/* Split Quote Button - only show if both labor and material items exist */}
            {lineItems.some(item => item.item_type === 'arbeid') && 
             lineItems.some(item => item.item_type === 'materiaal') && 
             quote.status !== 'gesplitst' && (
              <Button 
                onClick={handleSplitQuote} 
                variant="outline" 
                disabled={splitting}
                style={{color: '#7C3AED', borderColor: '#7C3AED'}}
              >
                {splitting ? (
                  <><Loader2 className="mr-2 animate-spin" size={20} /> Splitsen...</>
                ) : (
                  <><Scissors className="mr-2" size={20} /> Splits Arbeid/Materiaal</>
                )}
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Offerte Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label>Status:</Label>
                <Select value={quote.status} onValueChange={handleStatusChange}>
                  <SelectTrigger data-testid="quote-status-select" className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concept">Concept</SelectItem>
                    <SelectItem value="klaar">Klaar</SelectItem>
                    <SelectItem value="verzonden">Verzonden</SelectItem>
                    <SelectItem value="goedgekeurd">Goedgekeurd</SelectItem>
                    <SelectItem value="afgewezen">Afgewezen</SelectItem>
                    <SelectItem value="gesplitst">Gesplitst</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Label>🏠 Kamer:</Label>
                <Select 
                  value={quote.room || 'none'} 
                  onValueChange={async (value) => {
                    try {
                      const newRoom = value === 'none' ? null : value;
                      await axios.put(`${API}/quotes/${quoteId}`, { room: newRoom }, { headers: getAuthHeaders() });
                      setQuote(prev => ({ ...prev, room: newRoom }));
                      toast.success('Kamer bijgewerkt');
                    } catch (error) {
                      toast.error('Kon kamer niet bijwerken');
                    }
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Selecteer kamer..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geen kamer</SelectItem>
                    <SelectItem value="Badkamer">Badkamer</SelectItem>
                    <SelectItem value="Keuken">Keuken</SelectItem>
                    <SelectItem value="Woonkamer">Woonkamer</SelectItem>
                    <SelectItem value="Slaapkamer">Slaapkamer</SelectItem>
                    <SelectItem value="Toilet">Toilet</SelectItem>
                    <SelectItem value="Gang">Gang</SelectItem>
                    <SelectItem value="Garage">Garage</SelectItem>
                    <SelectItem value="Tuin">Tuin</SelectItem>
                    <SelectItem value="Zolder">Zolder</SelectItem>
                    <SelectItem value="Kelder">Kelder</SelectItem>
                    <SelectItem value="Volledige woning">Volledige woning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

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
              <Dialog open={isDialogOpen} onOpenChange={(open) => open ? setIsDialogOpen(true) : handleCloseDialog()}>
                <DialogTrigger asChild>
                  <Button data-testid="add-item-button" style={{backgroundColor: '#500000'}}>
                    <Plus className="mr-2" size={20} /> Items Toevoegen
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                      <span>Items Toevoegen aan Offerte</span>
                      {sessionAddedItems.length > 0 && (
                        <span className="text-sm font-normal px-2 py-1 rounded-full" style={{backgroundColor: '#D1FAE5', color: '#065F46'}}>
                          {sessionAddedItems.length} item(s) toegevoegd
                        </span>
                      )}
                    </DialogTitle>
                  </DialogHeader>
                  
                  {/* Global VAT Setting */}
                  <div className="p-3 rounded-lg mb-4" style={{backgroundColor: '#FEF3C7'}}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label className="font-semibold" style={{color: '#92400E'}}>Standaard BTW voor nieuwe items:</Label>
                        <Select 
                          value={defaultVatRate.toString()} 
                          onValueChange={(value) => {
                            const rate = parseFloat(value);
                            setDefaultVatRate(rate);
                            setFormData(prev => ({...prev, vat_rate: rate}));
                          }}
                        >
                          <SelectTrigger className="w-32" style={{backgroundColor: 'white'}}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0%</SelectItem>
                            <SelectItem value="6">6%</SelectItem>
                            <SelectItem value="9">9%</SelectItem>
                            <SelectItem value="21">21%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {lineItems.length > 0 && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={handleApplyDefaultVat}
                          style={{color: '#92400E', borderColor: '#92400E'}}
                        >
                          Pas toe op alles
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Session Added Items List */}
                  {sessionAddedItems.length > 0 && (
                    <div className="mb-4 p-3 rounded-lg" style={{backgroundColor: '#F0FDF4'}}>
                      <div className="text-sm font-semibold mb-2" style={{color: '#166534'}}>
                        Toegevoegd in deze sessie:
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {sessionAddedItems.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm py-1 border-b border-green-100">
                            <span className="truncate flex-1" style={{color: '#166534'}}>
                              {item.item_type === 'arbeid' ? '🔧' : '📦'} {item.description}
                            </span>
                            <span className="ml-2 font-medium" style={{color: '#166534'}}>
                              {item.quantity} x €{item.unit_price.toFixed(2)} = €{item.total.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t border-green-200 flex justify-between font-semibold" style={{color: '#166534'}}>
                        <span>Sessie totaal:</span>
                        <span>€{sessionAddedItems.reduce((sum, item) => sum + item.total, 0).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  
                  <form onSubmit={handleAddItem} className="space-y-4" data-testid="add-item-form">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label>Type Item</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setUseCustomMaterial(!useCustomMaterial)}
                        >
                          {useCustomMaterial ? 'Gebruik Lijst' : 'Custom Item'}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label>Type</Label>
                      <Select 
                        value={formData.item_type} 
                        onValueChange={(value) => {
                          setFormData({...formData, item_type: value});
                          if (value !== 'materiaal') {
                            setMaterialSearch('');
                            setShowMaterialDropdown(false);
                          }
                        }}
                      >
                        <SelectTrigger data-testid="item-type-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="arbeid">Arbeid</SelectItem>
                          <SelectItem value="materiaal">Materiaal</SelectItem>
                          <SelectItem value="overig">Overig</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {!useCustomMaterial && formData.item_type === 'materiaal' ? (
                      <div>
                        <Label>Selecteer Materiaal</Label>
                        <div className="relative">
                          <div className="relative">
                            <Input 
                              data-testid="material-search-input"
                              placeholder="Zoek materiaal (tegels, cement...)..."
                              value={materialSearch} 
                              onChange={(e) => {
                                setMaterialSearch(e.target.value);
                                setShowMaterialDropdown(true);
                              }}
                              onFocus={() => setShowMaterialDropdown(true)}
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-2.5"
                              onClick={() => {
                                setShowMaterialDropdown(!showMaterialDropdown);
                                if (!showMaterialDropdown) {
                                  setMaterialSearch('');
                                }
                              }}
                            >
                              <svg className="w-5 h-5" style={{color: '#64748B'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                          {showMaterialDropdown && (
                            <div 
                              className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-80 overflow-y-auto"
                              style={{borderColor: '#E2E8F0'}}
                            >
                              {filteredMaterials.length > 0 ? (
                                <>
                                  <div className="sticky top-0 bg-gray-100 px-3 py-2 text-sm font-semibold" style={{color: '#64748B'}}>
                                    {filteredMaterials.length} resultaten {materialSearch && `voor "${materialSearch}"`}
                                  </div>
                                  {filteredMaterials.map((material) => (
                                    <div
                                      key={material.id}
                                      data-testid={`material-option-${material.id}`}
                                      className="p-3 hover:bg-red-50 cursor-pointer border-b transition-colors"
                                      onClick={() => handleSelectMaterial(material)}
                                      style={{borderColor: '#F1F5F9'}}
                                    >
                                      <div className="font-semibold" style={{color: '#1E293B'}}>{material.name}</div>
                                      <div className="text-sm flex justify-between" style={{color: '#64748B'}}>
                                        <span>SKU: {material.sku}</span>
                                        <span className="font-bold" style={{color: '#7a1f1f'}}>€{material.price.toFixed(2)}</span>
                                      </div>
                                      {material.brand && (
                                        <div className="text-xs mt-1" style={{color: '#94A3B8'}}>Merk: {material.brand}</div>
                                      )}
                                    </div>
                                  ))}
                                  {materials.length > 50 && !materialSearch && (
                                    <div className="p-3 text-center text-sm" style={{color: '#64748B'}}>
                                      Typ om door {materials.length} materialen te zoeken...
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="p-4 text-center" style={{color: '#94A3B8'}}>
                                  {materialSearch ? `Geen materialen gevonden voor "${materialSearch}"` : 'Geen materialen beschikbaar'}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs" style={{color: '#64748B'}}>
                            {materials.length > 0 ? (
                              `${materials.length} materialen beschikbaar - typ om te zoeken`
                            ) : (
                              'Geen materialen gevonden - upload eerst een CSV in de Materialen pagina'
                            )}
                          </p>
                          {materials.length === 0 && (
                            <button
                              type="button"
                              onClick={() => window.location.href = '/materials'}
                              className="text-xs px-2 py-1 rounded"
                              style={{backgroundColor: '#f5e6e6', color: '#500000'}}
                            >
                              Naar Materialen →
                            </button>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {!useCustomMaterial && formData.item_type === 'arbeid' ? (
                      <div>
                        <Label>Selecteer Werk</Label>
                        <div className="relative">
                          <div className="relative">
                            <Input 
                              data-testid="work-item-search-input"
                              placeholder="Zoek werk (stucwerk, schilderwerk...)..."
                              value={workItemSearch} 
                              onChange={(e) => {
                                setWorkItemSearch(e.target.value);
                                setShowWorkItemDropdown(true);
                              }}
                              onFocus={() => setShowWorkItemDropdown(true)}
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-2.5"
                              onClick={() => {
                                setShowWorkItemDropdown(!showWorkItemDropdown);
                                if (!showWorkItemDropdown) {
                                  setWorkItemSearch('');
                                }
                              }}
                            >
                              <svg className="w-5 h-5" style={{color: '#64748B'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                          {showWorkItemDropdown && (
                            <div 
                              className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-80 overflow-y-auto"
                              style={{borderColor: '#E2E8F0'}}
                            >
                              {filteredWorkItems.length > 0 ? (
                                <>
                                  <div className="sticky top-0 bg-gray-100 px-3 py-2 text-sm font-semibold" style={{color: '#64748B'}}>
                                    {filteredWorkItems.length} resultaten {workItemSearch && `voor "${workItemSearch}"`}
                                  </div>
                                  {filteredWorkItems.map((workItem) => (
                                    <div
                                      key={workItem.id}
                                      data-testid={`work-item-option-${workItem.id}`}
                                      className="p-3 hover:bg-red-50 cursor-pointer border-b transition-colors"
                                      onClick={() => handleSelectWorkItem(workItem)}
                                      style={{borderColor: '#F1F5F9'}}
                                    >
                                      <div className="font-semibold" style={{color: '#1E293B'}}>{workItem.title}</div>
                                      <div className="text-sm flex justify-between" style={{color: '#64748B'}}>
                                        <span>Eenheid: {workItem.unit}</span>
                                        <span className="font-bold" style={{color: '#7a1f1f'}}>€{workItem.price.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </>
                              ) : workItemSearch ? (
                                <div className="p-4 text-center" style={{color: '#94A3B8'}}>
                                  Geen werk items gevonden voor &quot;{workItemSearch}&quot;
                                </div>
                              ) : (
                                <>
                                  <div className="sticky top-0 bg-gray-100 px-3 py-2 text-sm font-semibold" style={{color: '#64748B'}}>
                                    Alle werk items ({workItems.length})
                                  </div>
                                  {workItems.slice(0, 50).map((workItem) => (
                                    <div
                                      key={workItem.id}
                                      data-testid={`work-item-option-${workItem.id}`}
                                      className="p-3 hover:bg-red-50 cursor-pointer border-b transition-colors"
                                      onClick={() => handleSelectWorkItem(workItem)}
                                      style={{borderColor: '#F1F5F9'}}
                                    >
                                      <div className="font-semibold" style={{color: '#1E293B'}}>{workItem.title}</div>
                                      <div className="text-sm flex justify-between" style={{color: '#64748B'}}>
                                        <span>Eenheid: {workItem.unit}</span>
                                        <span className="font-bold" style={{color: '#7a1f1f'}}>€{workItem.price.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  ))}
                                  {workItems.length > 50 && (
                                    <div className="p-3 text-center text-sm" style={{color: '#64748B'}}>
                                      Typ om door {workItems.length} werk items te zoeken...
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs" style={{color: '#64748B'}}>
                            {workItems.length > 0 ? (
                              `${workItems.length} werk items beschikbaar - typ om te zoeken`
                            ) : (
                              'Geen werk items gevonden - upload eerst een CSV in de Materialen pagina'
                            )}
                          </p>
                          {workItems.length === 0 && (
                            <button
                              type="button"
                              onClick={() => window.location.href = '/materials'}
                              className="text-xs px-2 py-1 rounded"
                              style={{backgroundColor: '#f5e6e6', color: '#500000'}}
                            >
                              Naar Materialen →
                            </button>
                          )}
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <Label>Omschrijving</Label>
                      <Input 
                        data-testid="item-description-input"
                        value={formData.description} 
                        onChange={(e) => setFormData({...formData, description: e.target.value})} 
                        required 
                      />
                    </div>
                    
                    {/* Unit selector for custom work items */}
                    {useCustomMaterial && formData.item_type === 'arbeid' && (
                      <div>
                        <Label>Eenheid</Label>
                        <select
                          value={formData.unit}
                          onChange={(e) => setFormData({...formData, unit: e.target.value})}
                          className="w-full h-10 px-3 border rounded-md text-sm"
                          style={{borderColor: '#E2E8F0'}}
                        >
                          <option value="m²">m² (vierkante meter)</option>
                          <option value="m">m (lopende meter)</option>
                          <option value="stuk">stuk</option>
                          <option value="uur">uur</option>
                          <option value="dag">dag</option>
                          <option value="forfait">forfait</option>
                        </select>
                        <p className="text-xs mt-1" style={{color: '#64748B'}}>
                          Dit werk item wordt automatisch aan je catalogus toegevoegd
                        </p>
                      </div>
                    )}
                    
                    {/* Image upload for custom materials */}
                    {useCustomMaterial && formData.item_type === 'materiaal' && (
                      <div>
                        <Label>Eenheid</Label>
                        <select
                          value={formData.unit}
                          onChange={(e) => setFormData({...formData, unit: e.target.value})}
                          className="w-full h-10 px-3 border rounded-md text-sm mb-3"
                          style={{borderColor: '#E2E8F0'}}
                        >
                          <option value="stuk">stuk</option>
                          <option value="m²">m² (vierkante meter)</option>
                          <option value="m">m (lopende meter)</option>
                          <option value="doos">doos</option>
                          <option value="rol">rol</option>
                          <option value="kg">kg</option>
                          <option value="liter">liter</option>
                        </select>
                        
                        <Label>Productfoto (optioneel)</Label>
                        <div className="mt-1">
                          {materialImage ? (
                            <div className="relative">
                              <div className="border rounded-lg p-2 flex items-center gap-3" style={{borderColor: '#E2E8F0'}}>
                                <ImageIcon size={20} style={{color: '#10B981'}} />
                                <span className="text-sm flex-1 truncate">{materialImage.name}</span>
                                <button
                                  type="button"
                                  onClick={() => setMaterialImage(null)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setMaterialImage(e.target.files[0])}
                                className="hidden"
                              />
                              <div 
                                className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-gray-50 transition-colors"
                                style={{borderColor: '#E2E8F0'}}
                              >
                                <Upload size={24} className="mx-auto mb-2" style={{color: '#94A3B8'}} />
                                <p className="text-sm" style={{color: '#64748B'}}>
                                  Klik om een foto te uploaden
                                </p>
                                <p className="text-xs mt-1" style={{color: '#94A3B8'}}>
                                  JPG, PNG of WebP
                                </p>
                              </div>
                            </label>
                          )}
                        </div>
                        <p className="text-xs mt-2" style={{color: '#64748B'}}>
                          📷 De foto wordt opgeslagen bij het materiaal in je catalogus en verschijnt in de visuele materiaallijst van de offerte PDF.
                        </p>
                      </div>
                    )}

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
                      <Label>Eenheidsprijs (€ excl. BTW)</Label>
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
                      <Label>BTW Tarief</Label>
                      <Select 
                        value={formData.vat_rate.toString()} 
                        onValueChange={(value) => setFormData({...formData, vat_rate: parseFloat(value)})}
                      >
                        <SelectTrigger data-testid="item-vat-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0% (Vrijgesteld)</SelectItem>
                          <SelectItem value="6">6% (Laag tarief)</SelectItem>
                          <SelectItem value="9">9% (Verlaagd tarief)</SelectItem>
                          <SelectItem value="21">21% (Hoog tarief)</SelectItem>
                        </SelectContent>
                      </Select>
                      {formData.vat_rate !== defaultVatRate && (
                        <p className="text-xs mt-1" style={{color: '#F59E0B'}}>
                          ⚠️ Afwijkend van standaard BTW ({defaultVatRate}%)
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button data-testid="submit-item-button" type="submit" className="flex-1" style={{backgroundColor: '#500000'}}>
                        <Plus size={16} className="mr-1" />
                        Toevoegen & Volgende
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleCloseDialog}
                        className="px-6"
                      >
                        Klaar
                      </Button>
                    </div>
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
                    className="p-4 rounded-lg"
                    style={{backgroundColor: '#F8FAFC'}}
                  >
                    {editingItem === item.id ? (
                      // Edit mode
                      <div className="space-y-3">
                        <div className="font-semibold" style={{color: '#1E293B'}}>{item.description}</div>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2">
                            <label className="text-sm" style={{color: '#64748B'}}>Aantal:</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editValues.quantity}
                              onChange={(e) => setEditValues({...editValues, quantity: e.target.value})}
                              className="w-24 px-2 py-1 border rounded text-sm"
                              style={{borderColor: '#E5E7EB'}}
                              autoFocus
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-sm" style={{color: '#64748B'}}>Prijs €:</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editValues.unit_price}
                              onChange={(e) => setEditValues({...editValues, unit_price: e.target.value})}
                              className="w-24 px-2 py-1 border rounded text-sm"
                              style={{borderColor: '#E5E7EB'}}
                            />
                          </div>
                          <span className="text-sm" style={{color: '#64748B'}}>
                            = €{((parseFloat(editValues.quantity) || 0) * (parseFloat(editValues.unit_price) || 0)).toFixed(2)}
                          </span>
                          <div className="flex gap-2 ml-auto">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateItem(item.id)}
                              style={{backgroundColor: '#10B981', color: 'white'}}
                            >
                              <Check size={16} className="mr-1" />
                              Opslaan
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={cancelEditing}
                            >
                              <X size={16} className="mr-1" />
                              Annuleren
                            </Button>
                          </div>
                        </div>
                        <div className="text-xs" style={{color: '#94A3B8'}}>
                          Type: {item.item_type} | BTW: {item.vat_rate}%
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="font-semibold" style={{color: '#1E293B'}}>{item.description}</div>
                          <div className="text-sm mt-1" style={{color: '#64748B'}}>
                            {item.quantity} x €{item.unit_price.toFixed(2)} | Type: {item.item_type}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-xl font-bold" style={{color: '#7a1f1f'}}>
                            €{item.total.toFixed(2)}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => startEditingItem(item)}
                            title="Bewerken"
                          >
                            <Edit2 size={18} style={{color: '#7a1f1f'}} />
                          </Button>
                          <Button 
                            data-testid={`delete-item-${item.id}`}
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItem(item.id);
                            }}
                            title="Verwijderen"
                          >
                            <Trash2 size={18} style={{color: '#EF4444'}} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="flex justify-between text-lg">
              <span style={{color: '#64748B'}}>Totaal excl. BTW:</span>
              <span className="font-semibold" style={{color: '#1E293B'}}>€{(quote.total_excl_vat || quote.total_price || 0).toFixed(2)}</span>
            </div>
            
            {quote.vat_breakdown && Object.keys(quote.vat_breakdown).length > 0 && (
              <div className="border-t pt-2 pb-2">
                {Object.entries(quote.vat_breakdown).map(([rate, amount]) => (
                  <div key={rate} className="flex justify-between text-sm" style={{color: '#64748B'}}>
                    <span>BTW {rate}%:</span>
                    <span>€{amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-between text-lg">
              <span style={{color: '#64748B'}}>Totaal BTW:</span>
              <span className="font-semibold" style={{color: '#1E293B'}}>€{(quote.total_vat || 0).toFixed(2)}</span>
            </div>
            
            <div className="border-t pt-3 flex justify-between text-2xl">
              <span className="font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>Totaal incl. BTW:</span>
              <span className="font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>€{(quote.total_incl_vat || quote.total_price || 0).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
