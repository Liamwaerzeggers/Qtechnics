import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Folder, FolderOpen, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { toast } from 'sonner';

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer \${token}` } : {};
};

export default function QuotesPage() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProjects, setExpandedProjects] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [quotesRes, projectsRes, leadsRes] = await Promise.all([
        axios.get(`${API}/quotes`, { headers: getAuthHeaders() }),
        axios.get(`${API}/projects`, { headers: getAuthHeaders() }),
        axios.get(`${API}/leads`, { headers: getAuthHeaders() })
      ]);
      
      setQuotes(quotesRes.data);
      setProjects(projectsRes.data);
      setLeads(leadsRes.data);
      
      // Expand all projects by default
      const expanded = {};
      projectsRes.data.forEach(p => {
        expanded[p.lead_id] = true;
      });
      setExpandedProjects(expanded);
    } catch (error) {
      toast.error('Kon offertes niet ophalen');
    } finally {
      setLoading(false);
    }
  };

  // Group quotes by project (via lead_id)
  const getGroupedQuotes = () => {
    const grouped = {};
    
    // Create a map of lead_id to project
    const leadToProject = {};
    projects.forEach(project => {
      if (project.lead_id) {
        leadToProject[project.lead_id] = project;
      }
    });
    
    // Create a map of lead_id to lead
    const leadMap = {};
    leads.forEach(lead => {
      leadMap[lead.id] = lead;
    });
    
    // Filter quotes based on search
    let filteredQuotes = quotes;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredQuotes = quotes.filter(quote => {
        const project = leadToProject[quote.lead_id];
        const lead = leadMap[quote.lead_id];
        const projectName = project?.name || lead?.name || '';
        return (
          quote.quote_number.toLowerCase().includes(query) ||
          quote.status.toLowerCase().includes(query) ||
          projectName.toLowerCase().includes(query)
        );
      });
    }
    
    // Group by lead_id (which corresponds to a project)
    filteredQuotes.forEach(quote => {
      const leadId = quote.lead_id;
      if (!grouped[leadId]) {
        const project = leadToProject[leadId];
        const lead = leadMap[leadId];
        grouped[leadId] = {
          project: project,
          lead: lead,
          projectName: project?.name || lead?.name || 'Onbekend Project',
          quotes: []
        };
      }
      grouped[leadId].quotes.push(quote);
    });
    
    // Sort quotes within each group by date (newest first)
    Object.values(grouped).forEach(group => {
      group.quotes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    });
    
    // Convert to array and sort by project name
    return Object.entries(grouped)
      .sort((a, b) => a[1].projectName.localeCompare(b[1].projectName));
  };

  const toggleProject = (leadId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [leadId]: !prev[leadId]
    }));
  };

  const expandAll = () => {
    const expanded = {};
    Object.keys(getGroupedQuotes().reduce((acc, [leadId]) => ({ ...acc, [leadId]: true }), {}));
    projects.forEach(p => {
      expanded[p.lead_id] = true;
    });
    leads.forEach(l => {
      expanded[l.id] = true;
    });
    setExpandedProjects(expanded);
  };

  const collapseAll = () => {
    setExpandedProjects({});
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'goedgekeurd':
        return { backgroundColor: '#D1FAE5', color: '#059669' };
      case 'verzonden':
        return { backgroundColor: '#f5e6e6', color: '#500000' };
      case 'afgekeurd':
        return { backgroundColor: '#FEE2E2', color: '#DC2626' };
      case 'gesplitst':
        return { backgroundColor: '#F3E8FF', color: '#7C3AED' };
      default: // concept
        return { backgroundColor: '#F3F4F6', color: '#6B7280' };
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'goedgekeurd': return 'Goedgekeurd';
      case 'verzonden': return 'Verzonden';
      case 'afgekeurd': return 'Afgekeurd';
      case 'gesplitst': return 'Gesplitst';
      default: return 'Concept';
    }
  };

  const groupedQuotes = getGroupedQuotes();
  const totalQuotes = groupedQuotes.reduce((sum, [, group]) => sum + group.quotes.length, 0);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout showBackToDashboard={true}>
      <div data-testid="quotes-page" className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>
              Offertes
            </h1>
            <p className="text-sm mt-1" style={{color: '#64748B'}}>
              {totalQuotes} offerte{totalQuotes !== 1 ? 's' : ''} in {groupedQuotes.length} project{groupedQuotes.length !== 1 ? 'en' : ''}
            </p>
          </div>
          <Button 
            onClick={() => navigate('/leads')}
            className="flex items-center gap-2"
            style={{backgroundColor: '#500000', color: 'white'}}
            title="Maak eerst een lead aan, dan kun je een offerte genereren"
          >
            <Plus size={20} />
            Nieuwe Offerte
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <Input
              data-testid="search-quotes-input"
              placeholder="Zoek op project, offertenummer of status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Alles uitklappen
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Alles inklappen
            </Button>
          </div>
        </div>

        {/* Project folders with quotes */}
        <div className="space-y-4">
          {groupedQuotes.map(([leadId, group]) => (
            <Card key={leadId} className="overflow-hidden">
              {/* Project folder header */}
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleProject(leadId)}
                style={{borderBottom: expandedProjects[leadId] ? '1px solid #E5E7EB' : 'none'}}
              >
                <div className="flex items-center gap-3">
                  {expandedProjects[leadId] ? (
                    <FolderOpen size={24} style={{color: '#500000'}} />
                  ) : (
                    <Folder size={24} style={{color: '#500000'}} />
                  )}
                  <div>
                    <h2 className="text-lg font-bold" style={{color: '#1E293B'}}>
                      {group.projectName}
                    </h2>
                    <p className="text-sm" style={{color: '#64748B'}}>
                      {group.quotes.length} offerte{group.quotes.length !== 1 ? 's' : ''}
                      {group.lead && ` • ${group.lead.name}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {/* Quick stats */}
                  <div className="hidden sm:flex gap-2">
                    {['goedgekeurd', 'verzonden', 'concept'].map(status => {
                      const count = group.quotes.filter(q => q.status === status).length;
                      if (count === 0) return null;
                      return (
                        <span 
                          key={status}
                          className="text-xs px-2 py-1 rounded-full"
                          style={getStatusStyle(status)}
                        >
                          {count} {getStatusLabel(status).toLowerCase()}
                        </span>
                      );
                    })}
                  </div>
                  {expandedProjects[leadId] ? (
                    <ChevronDown size={20} style={{color: '#64748B'}} />
                  ) : (
                    <ChevronRight size={20} style={{color: '#64748B'}} />
                  )}
                </div>
              </div>

              {/* Quotes list (collapsible) */}
              {expandedProjects[leadId] && (
                <div className="p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.quotes.map((quote) => (
                      <Card 
                        key={quote.id} 
                        data-testid={`quote-card-${quote.id}`} 
                        className="cursor-pointer hover:shadow-lg transition-all bg-white"
                        onClick={() => navigate(`/quotes/${quote.id}`)}
                      >
                        <CardContent className="p-4">
                          {/* Room badge if set */}
                          {quote.room && (
                            <div className="mb-2">
                              <span className="text-xs px-2 py-1 rounded-full font-medium" style={{
                                backgroundColor: '#FEF3C7',
                                color: '#92400E'
                              }}>
                                🏠 {quote.room}
                              </span>
                            </div>
                          )}
                          
                          {/* Project name prominently */}
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg" style={{backgroundColor: '#f5e6e6'}}>
                              <FileText size={20} style={{color: '#500000'}} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-base truncate" style={{color: '#1E293B'}}>
                                {quote.room ? `${quote.room}` : group.projectName}
                              </h3>
                              <p className="text-sm" style={{color: '#64748B'}}>
                                {quote.quote_number}
                              </p>
                              {quote.quote_type && (
                                <span className="text-xs px-2 py-0.5 rounded mt-1 inline-block" style={{
                                  backgroundColor: quote.quote_type === 'arbeid' ? '#FEF3C7' : '#E0E7FF',
                                  color: quote.quote_type === 'arbeid' ? '#92400E' : '#3730A3'
                                }}>
                                  {quote.quote_type === 'arbeid' ? 'Arbeid' : 'Materialen'}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Status and price */}
                          <div className="flex justify-between items-center mt-4 pt-3 border-t" style={{borderColor: '#E5E7EB'}}>
                            <span 
                              className="text-xs px-3 py-1 rounded-full font-medium"
                              style={getStatusStyle(quote.status)}
                            >
                              {getStatusLabel(quote.status)}
                            </span>
                            <span className="text-lg font-bold" style={{color: '#500000'}}>
                              €{(quote.total_price || 0).toFixed(2)}
                            </span>
                          </div>
                          
                          {/* Date */}
                          <p className="text-xs mt-2" style={{color: '#94A3B8'}}>
                            {new Date(quote.date || quote.created_at).toLocaleDateString('nl-BE')}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  {/* Quick actions */}
                  {group.project && (
                    <div className="mt-4 pt-4 border-t" style={{borderColor: '#E5E7EB'}}>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/projects/${group.project.id}`);
                        }}
                      >
                        Naar Project →
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>

        {groupedQuotes.length === 0 && (
          <div className="text-center py-12">
            <Folder size={48} className="mx-auto mb-4" style={{color: '#94A3B8'}} />
            <p style={{color: '#94A3B8'}}>Geen offertes gevonden.</p>
            <p className="mt-2 text-sm" style={{color: '#64748B'}}>
              💡 Tip: Maak een offerte door naar <button onClick={() => navigate('/leads')} className="text-blue-600 underline hover:text-blue-800">Leads</button> te gaan en op "Offerte Maken" te klikken, of maak een offerte vanuit een project.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
