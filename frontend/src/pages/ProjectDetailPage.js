import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, FileText, Camera, Folder, Receipt, Briefcase, CalendarDays, Users, Copy, Link, Check, Upload, Trash2, Download, File, Eye, EyeOff, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import ProjectFirstVisitTab from './ProjectFirstVisitTab';
import Project3DDesignTab from './Project3DDesignTab';
import ProjectCostsTab from './ProjectCostsTab';
import ProjectWorkSlipsTab from './ProjectWorkSlipsTab';
import ProjectPlanningTab from './ProjectPlanningTab';

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: \`Bearer \${token}\` } : {};
};

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [project, setProject] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('first-visit');
  const [approvedQuotes, setApprovedQuotes] = useState([]); // All approved quotes
  
  // Legacy documents state
  const [legacyDocuments, setLegacyDocuments] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileInputRef = useRef(null);
  const [newDocData, setNewDocData] = useState({
    document_type: 'offerte',
    document_date: '',
    description: '',
    total_price: ''
  });

  useEffect(() => {
    fetchProjectData();
  }, [projectId, location.key]); // Re-fetch when location changes (e.g., returning from quote page)

  const fetchProjectData = async () => {
    try {
      const projectResponse = await axios.get(`${API}/projects/${projectId}`, { headers: getAuthHeaders() });
      setProject(projectResponse.data);
      
      // Fetch quotes for this project
      if (projectResponse.data.lead_id) {
        const quotesResponse = await axios.get(`${API}/quotes`, { headers: getAuthHeaders() });
        const projectQuotes = quotesResponse.data.filter(q => q.lead_id === projectResponse.data.lead_id);
        setQuotes(projectQuotes);
        
        // Get ALL approved quotes (sorted by date descending)
        const approved = projectQuotes
          .filter(q => q.status === 'goedgekeurd')
          .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
        
        setApprovedQuotes(approved);
      }
      
      // Fetch legacy documents
      try {
        const legacyRes = await axios.get(`${API}/projects/${projectId}/legacy-documents`, { headers: getAuthHeaders() });
        setLegacyDocuments(legacyRes.data || []);
      } catch (e) {
        console.log('No legacy documents or endpoint not available');
      }
    } catch (error) {
      console.error('Failed to fetch project:', error);
      toast.error('Kon project niet laden');
    } finally {
      setLoading(false);
    }
  };

  // Legacy document functions
  const handleUploadLegacyDocument = async (e) => {
    e.preventDefault();
    const file = fileInputRef.current?.files[0];
    if (!file) {
      toast.error('Selecteer een PDF bestand');
      return;
    }
    
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Alleen PDF bestanden zijn toegestaan');
      return;
    }
    
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const params = new URLSearchParams({
        document_type: newDocData.document_type,
        ...(newDocData.document_date && { document_date: newDocData.document_date }),
        ...(newDocData.description && { description: newDocData.description }),
        ...(newDocData.total_price && { total_price: parseFloat(newDocData.total_price) })
      });
      
      await axios.post(
        `${API}/projects/${projectId}/legacy-documents?${params.toString()}`,
        formData,
        { 
          headers: getAuthHeaders(), headers: { 'Content-Type': 'multipart/form-data' }
        }
      );
      
      toast.success('Document succesvol geüpload! 📄');
      setShowUploadModal(false);
      setNewDocData({ document_type: 'offerte', document_date: '', description: '', total_price: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Refresh documents and project data (for updated sales_price)
      const legacyRes = await axios.get(`${API}/projects/${projectId}/legacy-documents`, { headers: getAuthHeaders() });
      setLegacyDocuments(legacyRes.data || []);
      fetchProjectData(); // Refresh project to get updated sales_price
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error.response?.data?.detail || 'Upload mislukt');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDownloadLegacyDocument = async (doc) => {
    try {
      const response = await axios.get(
        `${API}/legacy-documents/${doc.id}/download`,
        { headers: getAuthHeaders(), responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.original_filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Kon document niet downloaden');
    }
  };

  const handleDeleteLegacyDocument = async (docId) => {
    if (!window.confirm('Weet u zeker dat u dit document wilt verwijderen?')) return;
    
    try {
      await axios.delete(`${API}/legacy-documents/${docId}`, { headers: getAuthHeaders() });
      toast.success('Document verwijderd');
      setLegacyDocuments(prev => prev.filter(d => d.id !== docId));
      fetchProjectData(); // Refresh project to update sales_price
    } catch (error) {
      toast.error('Kon document niet verwijderen');
    }
  };

  const handleToggleDocumentVisibility = async (doc) => {
    try {
      const newVisibility = !doc.visible_to_customer;
      await axios.put(
        `${API}/legacy-documents/${doc.id}`,
        { visible_to_customer: newVisibility },
        { headers: getAuthHeaders() }
      );
      
      setLegacyDocuments(prev => prev.map(d => 
        d.id === doc.id ? { ...d, visible_to_customer: newVisibility } : d
      ));
      
      toast.success(newVisibility ? 'Document zichtbaar voor klant 👁️' : 'Document verborgen voor klant');
    } catch (error) {
      toast.error('Kon zichtbaarheid niet wijzigen');
    }
  };

  const handleUpdateDocumentPrice = async (doc, newPrice) => {
    try {
      await axios.put(
        `${API}/legacy-documents/${doc.id}`,
        { total_price: parseFloat(newPrice) || null },
        { headers: getAuthHeaders() }
      );
      
      setLegacyDocuments(prev => prev.map(d => 
        d.id === doc.id ? { ...d, total_price: parseFloat(newPrice) || null } : d
      ));
      
      fetchProjectData(); // Refresh project to update sales_price
      toast.success('Prijs bijgewerkt');
    } catch (error) {
      toast.error('Kon prijs niet bijwerken');
    }
  };

  const handleCreateQuote = async () => {
    try {
      let leadId = project.lead_id;
      
      // Als er geen lead_id is, maak eerst een lead aan voor dit project
      if (!leadId) {
        const leadResponse = await axios.post(
          `${API}/leads`,
          {
            name: project.name || 'Onbekende Klant',
            email: project.customer_email || 'geen-email@example.com',
            phone: project.customer_phone || '0000000000',
            address: project.customer_address || 'Geen adres opgegeven',
            project_type: project.project_type || 'Renovatie',
            description: `Automatisch aangemaakt voor bestaand project: ${project.name || project.id}`
          },
          { headers: getAuthHeaders() }
        );
        
        leadId = leadResponse.data.id;
        
        // Update project met nieuwe lead_id
        await axios.put(
          `${API}/projects/${project.id}`,
          { lead_id: leadId },
          { headers: getAuthHeaders() }
        );
        
        toast.success('Lead aangemaakt en gekoppeld aan project');
      }

      const response = await axios.post(
        `${API}/quotes`,
        { lead_id: leadId },
        { headers: getAuthHeaders() }
      );
      
      toast.success('Offerte aangemaakt! 📄');
      navigate(`/quotes/${response.data.id}`, { state: { fromProject: project.id } });
    } catch (error) {
      console.error('Failed to create quote:', error);
      toast.error('Kon offerte niet aanmaken');
    }
  };

  const handleUpdateQuoteStatus = async (quoteId, newStatus) => {
    try {
      await axios.put(
        `${API}/quotes/${quoteId}`,
        { status: newStatus },
        { headers: getAuthHeaders() }
      );
      toast.success('Offerte status bijgewerkt!');
      fetchProjectData(); // Refresh to show updated data
    } catch (error) {
      console.error('Failed to update quote status:', error);
      toast.error('Kon status niet bijwerken');
    }
  };

  // Mark quote as sold
  const handleToggleQuoteSold = async (quoteId, isSold) => {
    try {
      await axios.put(
        `${API}/quotes/${quoteId}`,
        { is_sold: isSold },
        { headers: getAuthHeaders() }
      );
      if (isSold) {
        toast.success('🎉 Offerte gemarkeerd als verkocht! Project status is nu "in uitvoering"');
      } else {
        toast.success('Offerte niet meer als verkocht gemarkeerd');
      }
      fetchProjectData();
    } catch (error) {
      console.error('Failed to update quote sold status:', error);
      toast.error('Kon verkocht status niet bijwerken');
    }
  };

  // Mark legacy document as sold
  const handleToggleLegacyDocSold = async (docId, isSold) => {
    try {
      await axios.put(
        `${API}/legacy-documents/${docId}`,
        { is_sold: isSold },
        { headers: getAuthHeaders() }
      );
      if (isSold) {
        toast.success('🎉 Offerte gemarkeerd als verkocht! Project status is nu "in uitvoering"');
      } else {
        toast.success('Offerte niet meer als verkocht gemarkeerd');
      }
      fetchProjectData();
      fetchLegacyDocuments();
    } catch (error) {
      console.error('Failed to update legacy doc sold status:', error);
      toast.error('Kon verkocht status niet bijwerken');
    }
  };

  const tabs = [
    { id: 'first-visit', label: '📸 Eerste Bezoek', icon: Camera },
    { id: '3d-designs', label: '🏗️ 3D Ontwerpen', icon: Folder },
    { id: 'quotes', label: '📄 Offertes', icon: FileText },
    { id: 'planning', label: '📅 Planning', icon: CalendarDays },
    { id: 'costs', label: '💰 Financieel', icon: Receipt },
    { id: 'work', label: '📋 Werkbonnen', icon: Briefcase },
    { id: 'customer', label: '👤 Klantportaal', icon: Users },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p>Laden...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p>Project niet gevonden</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/projects')}>
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold" style={{color: '#500000'}}>
                {project.name}
              </h1>
              <p className="text-sm" style={{color: '#64748B'}}>
                Project ID: {project.id}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{
              backgroundColor: project.status === 'voltooid' ? '#D1FAE5' : '#f5e6e6',
              color: project.status === 'voltooid' ? '#065F46' : '#500000'
            }}>
              {project.status}
            </span>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b" style={{borderColor: '#E5E7EB'}}>
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    // Refresh data when switching to quotes tab to show newly created quotes
                    if (tab.id === 'quotes') {
                      fetchProjectData();
                    }
                  }}
                  className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 font-semibold'
                      : 'border-transparent text-gray-600 hover:text-blue-600 hover:border-gray-300'
                  }`}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'first-visit' && (
            <ProjectFirstVisitTab project={project} onUpdate={fetchProjectData} />
          )}

          {activeTab === '3d-designs' && (
            <Project3DDesignTab project={project} onUpdate={fetchProjectData} />
          )}

          {activeTab === 'quotes' && (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold" style={{color: '#3a190b'}}>
                      📄 Offertes voor dit Project
                    </h3>
                    <Button onClick={handleCreateQuote}>
                      + Nieuwe Offerte
                    </Button>
                  </div>

                  {quotes.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText size={48} className="mx-auto mb-4" style={{color: '#94A3B8'}} />
                      <p className="text-sm" style={{color: '#64748B'}}>Nog geen offertes</p>
                      <p className="text-xs mt-1" style={{color: '#94A3B8'}}>
                        Maak een offerte op basis van de foto's en 3D ontwerpen
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {quotes.map((quote) => (
                        <div
                          key={quote.id}
                          className={`flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 ${quote.is_sold ? 'ring-2 ring-green-500 bg-green-50' : ''}`}
                          style={{borderColor: quote.is_sold ? '#10B981' : '#E5E7EB'}}
                        >
                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={() => navigate(`/quotes/${quote.id}`, { state: { fromProject: project.id } })}
                          >
                            <div className="flex items-center gap-2">
                              <p className="font-semibold" style={{color: '#3a190b'}}>
                                {quote.quote_number}
                              </p>
                              {quote.is_sold && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{backgroundColor: '#D1FAE5', color: '#059669'}}>
                                  <Trophy size={12} /> VERKOCHT
                                </span>
                              )}
                            </div>
                            <p className="text-xs mt-1" style={{color: '#94A3B8'}}>
                              {new Date(quote.date).toLocaleDateString('nl-NL')} {quote.room && `• ${quote.room}`}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                            <div className="text-right">
                              <p className="font-bold" style={{color: '#3a190b'}}>
                                €{quote.total_incl_vat?.toFixed(2) || '0.00'}
                              </p>
                            </div>
                            
                            {/* Verkocht Switch */}
                            <div className="flex items-center gap-2 px-3 py-1 rounded-lg" style={{backgroundColor: quote.is_sold ? '#D1FAE5' : '#F3F4F6'}}>
                              <span className="text-xs font-medium" style={{color: quote.is_sold ? '#059669' : '#64748B'}}>
                                Verkocht
                              </span>
                              <Switch
                                checked={quote.is_sold || false}
                                onCheckedChange={(checked) => handleToggleQuoteSold(quote.id, checked)}
                              />
                            </div>
                            
                            <select
                              value={quote.status}
                              onChange={(e) => handleUpdateQuoteStatus(quote.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="px-3 py-2 border rounded-lg text-sm font-medium"
                              style={{
                                borderColor: '#E5E7EB',
                                color: quote.status === 'goedgekeurd' ? '#10B981' : 
                                       quote.status === 'afgekeurd' ? '#EF4444' : 
                                       quote.status === 'verzonden' ? '#7a1f1f' : '#F59E0B',
                                backgroundColor: quote.status === 'goedgekeurd' ? '#ECFDF5' : 
                                                quote.status === 'afgekeurd' ? '#FEE2E2' : 
                                                quote.status === 'verzonden' ? '#f5e6e6' : '#FEF3C7'
                              }}
                            >
                              <option value="concept">Concept</option>
                              <option value="verzonden">Verzonden</option>
                              <option value="goedgekeurd">Goedgekeurd</option>
                              <option value="afgekeurd">Afgekeurd</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Legacy Documents Section */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold" style={{color: '#3a190b'}}>
                      📁 Oude Documenten (Archief)
                    </h3>
                    <Button onClick={() => setShowUploadModal(true)} variant="outline">
                      <Upload size={16} className="mr-2" />
                      PDF Uploaden
                    </Button>
                  </div>
                  
                  <p className="text-sm mb-4" style={{color: '#64748B'}}>
                    Upload hier oude offertes en facturen uit uw vorige systeem
                  </p>
                  
                  {legacyDocuments.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg" style={{borderColor: '#E5E7EB'}}>
                      <File size={40} className="mx-auto mb-3" style={{color: '#94A3B8'}} />
                      <p className="text-sm" style={{color: '#64748B'}}>Nog geen oude documenten geüpload</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {legacyDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 ${doc.is_sold ? 'ring-2 ring-green-500 bg-green-50' : ''}`}
                          style={{borderColor: doc.is_sold ? '#10B981' : '#E5E7EB'}}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg" style={{
                              backgroundColor: doc.document_type === 'offerte' ? '#f5e6e6' :
                                              doc.document_type === 'factuur' ? '#D1FAE5' : '#F3E8FF'
                            }}>
                              <FileText size={20} style={{
                                color: doc.document_type === 'offerte' ? '#500000' :
                                       doc.document_type === 'factuur' ? '#059669' : '#7C3AED'
                              }} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm" style={{color: '#1E293B'}}>
                                  {doc.original_filename}
                                </p>
                                {doc.is_sold && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{backgroundColor: '#D1FAE5', color: '#059669'}}>
                                    <Trophy size={12} /> VERKOCHT
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{
                                  backgroundColor: doc.document_type === 'offerte' ? '#f5e6e6' :
                                                  doc.document_type === 'factuur' ? '#D1FAE5' : '#F3E8FF',
                                  color: doc.document_type === 'offerte' ? '#500000' :
                                         doc.document_type === 'factuur' ? '#059669' : '#7C3AED'
                                }}>
                                  {doc.document_type === 'offerte' ? 'Offerte' : 
                                   doc.document_type === 'factuur' ? 'Factuur' : 'Anders'}
                                </span>
                                {doc.total_price && (
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                                    backgroundColor: '#FEF3C7',
                                    color: '#92400E'
                                  }}>
                                    €{doc.total_price.toFixed(2)}
                                  </span>
                                )}
                                {doc.document_date && (
                                  <span className="text-xs" style={{color: '#94A3B8'}}>
                                    {doc.document_date}
                                  </span>
                                )}
                                {doc.description && (
                                  <span className="text-xs" style={{color: '#64748B'}}>
                                    • {doc.description}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Verkocht toggle - alleen voor offertes */}
                            {doc.document_type === 'offerte' && (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-lg mr-2" style={{backgroundColor: doc.is_sold ? '#D1FAE5' : '#F3F4F6'}}>
                                <span className="text-xs font-medium" style={{color: doc.is_sold ? '#059669' : '#64748B'}}>
                                  Verkocht
                                </span>
                                <Switch
                                  checked={doc.is_sold || false}
                                  onCheckedChange={(checked) => handleToggleLegacyDocSold(doc.id, checked)}
                                />
                              </div>
                            )}
                            {/* Zichtbaarheid toggle */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleDocumentVisibility(doc)}
                              title={doc.visible_to_customer ? 'Verbergen voor klant' : 'Zichtbaar maken voor klant'}
                              style={{color: doc.visible_to_customer ? '#10B981' : '#94A3B8'}}
                            >
                              {doc.visible_to_customer ? <Eye size={16} /> : <EyeOff size={16} />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDownloadLegacyDocument(doc)}
                            >
                              <Download size={16} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteLegacyDocument(doc.id)}
                              style={{color: '#EF4444'}}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upload Modal */}
              {showUploadModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                    <h3 className="text-xl font-bold mb-4" style={{color: '#3a190b'}}>
                      📁 Document Uploaden
                    </h3>
                    <form onSubmit={handleUploadLegacyDocument}>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{color: '#374151'}}>
                            Document Type
                          </label>
                          <select
                            value={newDocData.document_type}
                            onChange={(e) => setNewDocData({...newDocData, document_type: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg"
                            style={{borderColor: '#E5E7EB'}}
                          >
                            <option value="offerte">Offerte</option>
                            <option value="factuur">Factuur</option>
                            <option value="anders">Anders</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{color: '#374151'}}>
                            Datum Document (optioneel)
                          </label>
                          <input
                            type="date"
                            value={newDocData.document_date}
                            onChange={(e) => setNewDocData({...newDocData, document_date: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg"
                            style={{borderColor: '#E5E7EB'}}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{color: '#374151'}}>
                            Totaalprijs incl. BTW (optioneel)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={newDocData.total_price}
                            onChange={(e) => setNewDocData({...newDocData, total_price: e.target.value})}
                            placeholder="Bijv. 5500.00"
                            className="w-full px-3 py-2 border rounded-lg"
                            style={{borderColor: '#E5E7EB'}}
                          />
                          <p className="text-xs mt-1" style={{color: '#64748B'}}>
                            💡 Bij offertes wordt dit bedrag opgeteld bij de verkoopprijs in Financieel
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{color: '#374151'}}>
                            Beschrijving (optioneel)
                          </label>
                          <input
                            type="text"
                            value={newDocData.description}
                            onChange={(e) => setNewDocData({...newDocData, description: e.target.value})}
                            placeholder="Bijv. Badkamer renovatie"
                            className="w-full px-3 py-2 border rounded-lg"
                            style={{borderColor: '#E5E7EB'}}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{color: '#374151'}}>
                            PDF Bestand
                          </label>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            className="w-full px-3 py-2 border rounded-lg"
                            style={{borderColor: '#E5E7EB'}}
                          />
                          <p className="text-xs mt-1" style={{color: '#94A3B8'}}>
                            Maximaal 10MB, alleen PDF bestanden
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3 mt-6">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowUploadModal(false)}
                          className="flex-1"
                        >
                          Annuleren
                        </Button>
                        <Button
                          type="submit"
                          disabled={uploadingDoc}
                          className="flex-1"
                          style={{backgroundColor: '#500000', color: 'white'}}
                        >
                          {uploadingDoc ? 'Uploaden...' : 'Uploaden'}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium" style={{color: '#500000'}}>
                  💡 <strong>Workflow:</strong>
                </p>
                <p className="text-sm mt-1" style={{color: '#3a190b'}}>
                  1. Bekijk foto's en notities van eerste bezoek<br/>
                  2. Check de 3D ontwerpen<br/>
                  3. Maak een offerte met materialen en arbeid<br/>
                  4. Stuur offerte naar klant
                </p>
              </div>
            </div>
          )}

          {activeTab === 'planning' && (
            <ProjectPlanningTab 
              project={project} 
              approvedQuotes={approvedQuotes}
              onUpdate={fetchProjectData} 
            />
          )}

          {activeTab === 'costs' && (
            <ProjectCostsTab 
              project={project} 
              approvedQuotes={approvedQuotes} 
              onUpdate={fetchProjectData} 
            />
          )}

          {activeTab === 'work' && (
            <ProjectWorkSlipsTab 
              project={project} 
              onUpdate={fetchProjectData} 
            />
          )}

          {activeTab === 'customer' && (
            <CustomerPortalTab 
              project={project} 
              onUpdate={fetchProjectData} 
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

// Customer Portal Tab Component
function CustomerPortalTab({ project, onUpdate }) {
  const [customerLink, setCustomerLink] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    if (project.customer_access_token) {
      const baseUrl = window.location.origin;
      setCustomerLink(`${baseUrl}/klant/${project.customer_access_token}`);
    }
  }, [project.customer_access_token]);

  const generateLink = async (forceNew = false) => {
    setGenerating(true);
    try {
      const response = await axios.post(
        `${API}/projects/${project.id}/generate-customer-link?force_new=${forceNew}`,
        {},
        { headers: getAuthHeaders() }
      );
      const baseUrl = window.location.origin;
      setCustomerLink(`${baseUrl}/klant/${response.data.token}`);
      
      if (response.data.is_existing) {
        toast.success('Bestaande link opgehaald');
      } else {
        toast.success('Nieuwe klantportaal link gegenereerd!');
      }
      onUpdate();
    } catch (error) {
      toast.error('Kon link niet genereren');
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(customerLink);
    setCopied(true);
    toast.success('Link gekopieerd!');
    setTimeout(() => setCopied(false), 2000);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setSendingMessage(true);
    try {
      await axios.post(
        `${API}/projects/${project.id}/customer-messages`,
        { message: newMessage },
        { headers: getAuthHeaders() }
      );
      toast.success('Bericht verzonden naar klant!');
      setNewMessage('');
      onUpdate();
    } catch (error) {
      toast.error('Kon bericht niet verzenden');
    } finally {
      setSendingMessage(false);
    }
  };

  const messages = project.customer_messages || [];
  const unreadCount = messages.filter(m => m.is_from_customer && !m.is_read).length;

  return (
    <div className="space-y-6">
      {/* Customer Portal Link */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xl font-bold mb-4" style={{color: '#3a190b'}}>
            🔗 Klantportaal Link
          </h3>
          <p className="text-gray-600 mb-4">
            Genereer een unieke link die u kunt delen met uw klant. 
            Via deze link kan de klant hun projectvoortgang volgen zonder in te loggen.
          </p>
          
          {customerLink ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Link className="w-5 h-5 text-green-600 flex-shrink-0" />
                <input
                  type="text"
                  value={customerLink}
                  readOnly
                  className="flex-1 bg-transparent border-none text-sm text-green-800 focus:outline-none"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={copyLink}
                  className="flex-shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-green-600 font-medium">
                ✅ Deze link vervalt nooit en blijft altijd werken.
              </p>
              <p className="text-xs text-gray-500">
                ⚠️ Deel deze link alleen met de klant. Iedereen met deze link kan het project bekijken.
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  if (window.confirm('Weet u zeker dat u een nieuwe link wilt genereren? De oude link zal niet meer werken.')) {
                    generateLink(true);
                  }
                }} 
                disabled={generating}
                className="text-orange-600 border-orange-300 hover:bg-orange-50"
              >
                {generating ? 'Genereren...' : '🔄 Nieuwe link genereren (oude vervalt)'}
              </Button>
            </div>
          ) : (
            <Button onClick={() => generateLink(false)} disabled={generating}>
              {generating ? 'Genereren...' : '🔗 Klantportaal link genereren'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Customer Rating */}
      {project.customer_rating && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-4" style={{color: '#3a190b'}}>
              ⭐ Klant Beoordeling
            </h3>
            <div className="flex items-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map(star => (
                <span 
                  key={star} 
                  className={`text-2xl ${star <= project.customer_rating ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  ★
                </span>
              ))}
              <span className="ml-2 font-semibold">{project.customer_rating}/5</span>
            </div>
            {project.customer_rating_comment && (
              <p className="text-gray-600 italic">"{project.customer_rating_comment}"</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xl font-bold mb-4" style={{color: '#3a190b'}}>
            💬 Berichten met Klant
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                {unreadCount} nieuw
              </span>
            )}
          </h3>
          
          {/* Messages List */}
          <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
            {messages.length > 0 ? (
              messages
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                .map(msg => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg ${
                      msg.is_from_customer
                        ? 'bg-red-50 border-l-4 border-blue-500'
                        : 'bg-gray-50 border-l-4 border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-medium">
                        {msg.is_from_customer ? '👤 Klant' : `📤 ${msg.sender || 'U'}`}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(msg.timestamp).toLocaleString('nl-BE')}
                      </span>
                    </div>
                    <p className="text-gray-800">{msg.message}</p>
                  </div>
                ))
            ) : (
              <p className="text-gray-500 text-center py-4">
                Nog geen berichten. Stuur een bericht naar de klant of wacht op hun vragen.
              </p>
            )}
          </div>

          {/* Send Message */}
          <div className="flex gap-2">
            <textarea
              placeholder="Typ een bericht naar de klant..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 p-2 border rounded-lg resize-none"
              rows={2}
            />
            <Button
              onClick={sendMessage}
              disabled={sendingMessage || !newMessage.trim()}
              className="self-end"
            >
              {sendingMessage ? '...' : 'Verzenden'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* What Customer Can See */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xl font-bold mb-4" style={{color: '#3a190b'}}>
            👁️ Wat ziet de klant?
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="font-semibold text-green-800 mb-2">✅ Wel zichtbaar:</p>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Projectplanning en kalender</li>
                <li>• Foto's van eerste bezoek</li>
                <li>• 3D ontwerpen</li>
                <li>• Goedgekeurde offertes (met prijzen)</li>
                <li>• Werkbonnen (alleen aangevinkte)</li>
                <li>• Berichten uitwisselen</li>
              </ul>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="font-semibold text-red-800 mb-2">❌ Niet zichtbaar:</p>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Kosten en winstmarges</li>
                <li>• Uurtarieven en arbeidskosten</li>
                <li>• Inkoopfacturen</li>
                <li>• Interne notities</li>
                <li>• Andere projecten</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
