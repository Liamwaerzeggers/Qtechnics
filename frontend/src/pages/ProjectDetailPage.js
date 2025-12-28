import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, FileText, Camera, Folder, Receipt, Briefcase, CalendarDays, Users, Copy, Link, Check } from 'lucide-react';
import { toast } from 'sonner';
import ProjectFirstVisitTab from './ProjectFirstVisitTab';
import Project3DDesignTab from './Project3DDesignTab';
import ProjectCostsTab from './ProjectCostsTab';
import ProjectWorkSlipsTab from './ProjectWorkSlipsTab';
import ProjectPlanningTab from './ProjectPlanningTab';

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [project, setProject] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('first-visit');
  const [approvedQuotes, setApprovedQuotes] = useState([]); // All approved quotes

  useEffect(() => {
    fetchProjectData();
  }, [projectId, location.key]); // Re-fetch when location changes (e.g., returning from quote page)

  const fetchProjectData = async () => {
    try {
      const projectResponse = await axios.get(`${API}/projects/${projectId}`, { withCredentials: true });
      setProject(projectResponse.data);
      
      // Fetch quotes for this project
      if (projectResponse.data.lead_id) {
        const quotesResponse = await axios.get(`${API}/quotes`, { withCredentials: true });
        const projectQuotes = quotesResponse.data.filter(q => q.lead_id === projectResponse.data.lead_id);
        setQuotes(projectQuotes);
        
        // Get ALL approved quotes (sorted by date descending)
        const approved = projectQuotes
          .filter(q => q.status === 'goedgekeurd')
          .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
        
        setApprovedQuotes(approved);
      }
    } catch (error) {
      console.error('Failed to fetch project:', error);
      toast.error('Kon project niet laden');
    } finally {
      setLoading(false);
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
          { withCredentials: true }
        );
        
        leadId = leadResponse.data.id;
        
        // Update project met nieuwe lead_id
        await axios.put(
          `${API}/projects/${project.id}`,
          { lead_id: leadId },
          { withCredentials: true }
        );
        
        toast.success('Lead aangemaakt en gekoppeld aan project');
      }

      const response = await axios.post(
        `${API}/quotes`,
        { lead_id: leadId },
        { withCredentials: true }
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
        { withCredentials: true }
      );
      toast.success('Offerte status bijgewerkt!');
      fetchProjectData(); // Refresh to show updated data
    } catch (error) {
      console.error('Failed to update quote status:', error);
      toast.error('Kon status niet bijwerken');
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
              <h1 className="text-3xl font-bold" style={{color: '#1E40AF'}}>
                {project.name}
              </h1>
              <p className="text-sm" style={{color: '#64748B'}}>
                Project ID: {project.id}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{
              backgroundColor: project.status === 'voltooid' ? '#D1FAE5' : '#DBEAFE',
              color: project.status === 'voltooid' ? '#065F46' : '#1E40AF'
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
                    <h3 className="text-xl font-bold" style={{color: '#1E3A8A'}}>
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
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                          style={{borderColor: '#E5E7EB'}}
                        >
                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={() => navigate(`/quotes/${quote.id}`, { state: { fromProject: project.id } })}
                          >
                            <p className="font-semibold" style={{color: '#1E3A8A'}}>
                              {quote.quote_number}
                            </p>
                            <p className="text-xs mt-1" style={{color: '#94A3B8'}}>
                              {new Date(quote.date).toLocaleDateString('nl-NL')}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                            <div className="text-right">
                              <p className="font-bold" style={{color: '#1E3A8A'}}>
                                €{quote.total_incl_vat?.toFixed(2) || '0.00'}
                              </p>
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
                                       quote.status === 'verzonden' ? '#3B82F6' : '#F59E0B',
                                backgroundColor: quote.status === 'goedgekeurd' ? '#ECFDF5' : 
                                                quote.status === 'afgekeurd' ? '#FEE2E2' : 
                                                quote.status === 'verzonden' ? '#DBEAFE' : '#FEF3C7'
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

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium" style={{color: '#1E40AF'}}>
                  💡 <strong>Workflow:</strong>
                </p>
                <p className="text-sm mt-1" style={{color: '#1E3A8A'}}>
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
        { withCredentials: true }
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
        { withCredentials: true }
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
          <h3 className="text-xl font-bold mb-4" style={{color: '#1E3A8A'}}>
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
              <p className="text-xs text-gray-500">
                ⚠️ Deel deze link alleen met de klant. Iedereen met deze link kan het project bekijken.
              </p>
              <Button variant="outline" onClick={generateLink} disabled={generating}>
                {generating ? 'Genereren...' : 'Nieuwe link genereren'}
              </Button>
            </div>
          ) : (
            <Button onClick={generateLink} disabled={generating}>
              {generating ? 'Genereren...' : '🔗 Klantportaal link genereren'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Customer Rating */}
      {project.customer_rating && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-4" style={{color: '#1E3A8A'}}>
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
          <h3 className="text-xl font-bold mb-4" style={{color: '#1E3A8A'}}>
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
                        ? 'bg-blue-50 border-l-4 border-blue-500'
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
          <h3 className="text-xl font-bold mb-4" style={{color: '#1E3A8A'}}>
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
