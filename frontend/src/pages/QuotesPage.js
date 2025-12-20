import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function QuotesPage() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [filteredQuotes, setFilteredQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchQuotes();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      setFilteredQuotes(quotes.filter(quote => 
        quote.quote_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quote.status.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    } else {
      setFilteredQuotes(quotes);
    }
  }, [searchQuery, quotes]);

  const fetchQuotes = async () => {
    try {
      const response = await axios.get(`${API}/quotes`, { withCredentials: true });
      setQuotes(response.data);
      setFilteredQuotes(response.data);
    } catch (error) {
      toast.error('Kon offertes niet ophalen');
    } finally {
      setLoading(false);
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

  return (
    <DashboardLayout showBackToDashboard={true}>
      <div data-testid="quotes-page" className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-4xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E40AF'}}>Offertes</h1>
          <Button 
            onClick={() => navigate('/leads')}
            className="flex items-center gap-2"
            style={{backgroundColor: '#1E40AF', color: 'white'}}
            title="Maak eerst een lead aan, dan kun je een offerte genereren"
          >
            <Plus size={20} />
            Nieuwe Offerte
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <Input
            data-testid="search-quotes-input"
            placeholder="Zoek offertes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuotes.map((quote) => (
            <Card key={quote.id} data-testid={`quote-card-${quote.id}`} className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate(`/quotes/${quote.id}`)}>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-2" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E40AF'}}>{quote.quote_number}</h3>
                <div className="flex justify-between items-center mt-4">
                  <span className="text-sm px-3 py-1 rounded-full" style={{backgroundColor: '#DBEAFE', color: '#1E40AF'}}>{quote.status}</span>
                  <span className="text-lg font-bold" style={{color: '#3B82F6'}}>€{quote.total_price.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredQuotes.length === 0 && (
          <div className="text-center py-12">
            <p style={{color: '#94A3B8'}}>Geen offertes gevonden. Maak een offerte vanuit een lead.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}