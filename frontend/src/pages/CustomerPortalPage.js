import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { 
  Calendar, 
  Image, 
  FileText, 
  MessageCircle, 
  Star, 
  Camera,
  Clock,
  CheckCircle,
  Send,
  Home,
  Hammer,
  Eye,
  Download,
  FolderArchive
} from 'lucide-react';
import { toast } from 'sonner';

// Helper function to get correct photo URL
const getPhotoUrl = (photo) => {
  if (!photo) return '';
  if (photo.startsWith('http')) return photo;
  // API already contains /api, so we need the base URL without /api
  const baseUrl = API.replace('/api', '');
  // Photo path already starts with /api/static/... so just append to base
  if (photo.startsWith('/api/')) {
    return `${baseUrl}${photo}`;
  }
  return `${baseUrl}/api${photo}`;
};

export default function CustomerPortalPage() {
  const { accessToken } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [legacyDocuments, setLegacyDocuments] = useState([]);

  useEffect(() => {
    fetchPortalData();
  }, [accessToken]);

  const fetchPortalData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/customer-portal/${accessToken}`);
      setData(response.data);
      if (response.data.project?.customer_rating) {
        setRating(response.data.project.customer_rating);
        setRatingComment(response.data.project.customer_rating_comment || '');
      }
    } catch (err) {
      console.error('Portal error:', err);
      setError(err.response?.data?.detail || 'Kon projectgegevens niet laden');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setSendingMessage(true);
    try {
      await axios.post(`${API}/customer-portal/${accessToken}/message`, {
        message: newMessage
      });
      toast.success('Bericht verzonden!');
      setNewMessage('');
      fetchPortalData(); // Refresh to show new message
    } catch (err) {
      toast.error('Kon bericht niet verzenden');
    } finally {
      setSendingMessage(false);
    }
  };

  const submitRating = async () => {
    if (rating === 0) {
      toast.error('Selecteer eerst een rating');
      return;
    }
    
    setSubmittingRating(true);
    try {
      const response = await axios.post(`${API}/customer-portal/${accessToken}/rating`, {
        rating: rating,
        comment: ratingComment
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('Rating response:', response.data);
      toast.success('Bedankt voor uw beoordeling!');
      fetchPortalData();
    } catch (err) {
      console.error('Rating error:', err.response?.data || err.message);
      toast.error(err.response?.data?.detail || 'Kon beoordeling niet opslaan');
    } finally {
      setSubmittingRating(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('nl-BE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatShortDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('nl-BE', {
      day: 'numeric',
      month: 'short'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Project laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Toegang geweigerd</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { project, customer_name, approved_quotes, work_updates } = data;

  const tabs = [
    { id: 'overview', label: 'Overzicht', icon: Home },
    { id: 'calendar', label: 'Planning', icon: Calendar },
    { id: 'photos', label: "Foto's", icon: Camera },
    { id: 'quotes', label: 'Offertes', icon: FileText },
    { id: 'updates', label: 'Updates', icon: Hammer },
    { id: 'messages', label: 'Berichten', icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header - Mobile Optimized */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-800">Uw Project</h1>
              <p className="text-sm text-gray-500">Welkom, {customer_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-800 text-sm sm:text-base">{project.name}</p>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                project.status === 'completed' ? 'bg-green-100 text-green-700' :
                project.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {project.status === 'completed' ? 'Voltooid' :
                 project.status === 'in_progress' ? 'In uitvoering' :
                 project.status === 'planning' ? 'Planning' : project.status || 'Gepland'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs - Scrollable on Mobile */}
      <div className="bg-white border-b sticky top-0 z-10">
        <nav className="flex overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content - Mobile Optimized */}
      <main className="px-3 sm:px-4 py-4 sm:py-6 max-w-6xl mx-auto">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {/* Project Status Card */}
            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  Project Status
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-500">Start datum</p>
                    <p className="font-medium text-sm sm:text-base">{formatDate(project.planning_start_date || project.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-500">Verwachte einddatum</p>
                    <p className="font-medium text-sm sm:text-base">{formatDate(project.planning_end_date || project.end_date)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  In één oogopslag
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Foto's eerste bezoek</span>
                    <span className="font-medium">{project.first_visit_photos?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">3D Ontwerpen</span>
                    <span className="font-medium">{project.design_3d_files?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Goedgekeurde offertes</span>
                    <span className="font-medium">{approved_quotes?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Werk updates</span>
                    <span className="font-medium">{work_updates?.length || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rating Card */}
            <Card className="md:col-span-2 lg:col-span-1">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                  Uw Beoordeling
                  {project.customer_rating && (
                    <span className="ml-auto text-xs font-normal text-green-600 bg-green-100 px-2 py-0.5 rounded">
                      ✓ Opgeslagen
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-1 mb-3 justify-center sm:justify-start">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="focus:outline-none p-1"
                    >
                      <Star
                        className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                          star <= rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 hover:text-yellow-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Optioneel: laat een opmerking achter..."
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  className="mb-3 text-sm"
                  rows={2}
                />
                <Button 
                  onClick={submitRating} 
                  disabled={submittingRating || rating === 0}
                  className="w-full text-sm"
                  size="sm"
                  variant={project.customer_rating ? "outline" : "default"}
                >
                  {submittingRating ? 'Opslaan...' : project.customer_rating ? 'Beoordeling wijzigen' : 'Beoordeling opslaan'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Calendar Tab - Mobile Optimized */}
        {activeTab === 'calendar' && (
          <Card>
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">📅 Geplande Werkperiodes</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {project.scheduled_days && project.scheduled_days.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {project.scheduled_days
                    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
                    .map((period, idx) => {
                      const startDate = new Date(period.start_date);
                      const endDate = new Date(period.end_date);
                      const diffTime = Math.abs(endDate - startDate);
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                      
                      return (
                        <div key={idx} className="bg-white border rounded-lg p-3 sm:p-4 shadow-sm">
                          {/* Description and Team - Mobile First */}
                          <div className="mb-3">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-semibold text-gray-800 text-base sm:text-lg">{period.description || 'Werkzaamheden'}</h4>
                              {period.team_name && (
                                <span className="flex-shrink-0 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                  👥 {period.team_name}
                                </span>
                              )}
                            </div>
                            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                              {diffDays} {diffDays === 1 ? 'dag' : 'dagen'}
                            </span>
                          </div>
                          
                          {/* Date Display - Responsive */}
                          <div className="flex items-center gap-2 sm:gap-3">
                            {/* Start Date */}
                            <div className="text-center bg-blue-500 text-white rounded-lg p-2 min-w-[50px] sm:min-w-[60px]">
                              <p className="text-[10px] sm:text-xs font-medium opacity-80">VAN</p>
                              <p className="text-lg sm:text-xl font-bold">{startDate.getDate()}</p>
                              <p className="text-[10px] sm:text-xs">{startDate.toLocaleDateString('nl-BE', { month: 'short' })}</p>
                            </div>
                            
                            {/* Arrow */}
                            <span className="text-gray-400 text-sm">→</span>
                            
                            {/* End Date */}
                            <div className="text-center bg-orange-500 text-white rounded-lg p-2 min-w-[50px] sm:min-w-[60px]">
                              <p className="text-[10px] sm:text-xs font-medium opacity-80">T/M</p>
                              <p className="text-lg sm:text-xl font-bold">{endDate.getDate()}</p>
                              <p className="text-[10px] sm:text-xs">{endDate.toLocaleDateString('nl-BE', { month: 'short' })}</p>
                            </div>
                            
                            {/* Year badge - only on larger screens */}
                            <span className="hidden sm:inline-block text-xs text-gray-500">
                              {endDate.getFullYear()}
                            </span>
                          </div>
                          
                          {/* Full date text - smaller on mobile */}
                          <p className="text-xs text-gray-500 mt-2">
                            {startDate.toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })} t/m {endDate.toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-6 text-sm">
                  Nog geen werkperiodes ingepland
                </p>
              )}
              
              {(project.planning_start_date || project.planning_end_date) && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-1 text-sm">Projectperiode</h4>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {formatDate(project.planning_start_date)} - {formatDate(project.planning_end_date)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Photos Tab - Mobile Optimized */}
        {activeTab === 'photos' && (
          <div className="space-y-4 sm:space-y-6">
            {/* First Visit Photos */}
            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-base sm:text-lg">📸 Foto's Eerste Bezoek</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {project.first_visit_photos && project.first_visit_photos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                    {project.first_visit_photos.map((photo, idx) => (
                      <div 
                        key={idx} 
                        className="relative aspect-square cursor-pointer group"
                        onClick={() => setSelectedPhoto(photo)}
                      >
                        <img
                          src={getPhotoUrl(photo)}
                          alt={`Foto ${idx + 1}`}
                          className="w-full h-full object-cover rounded-lg group-hover:opacity-90 transition"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition rounded-lg flex items-center justify-center">
                          <Eye className="w-6 h-6 sm:w-8 sm:h-8 text-white opacity-0 group-hover:opacity-100 transition" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-6 text-sm">Nog geen foto's van het eerste bezoek</p>
                )}
              </CardContent>
            </Card>

            {/* 3D Designs */}
            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-base sm:text-lg">🏠 3D Ontwerpen</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {project.design_3d_files && project.design_3d_files.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {project.design_3d_files.map((design, idx) => (
                      <a
                        key={idx}
                        href={getPhotoUrl(design.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                      >
                        <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate">{design.filename || `Ontwerp ${idx + 1}`}</p>
                          <p className="text-xs sm:text-sm text-gray-500">Klik om te bekijken</p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-6 text-sm">Nog geen 3D ontwerpen beschikbaar</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quotes Tab - Mobile Optimized */}
        {activeTab === 'quotes' && (
          <div className="space-y-4 sm:space-y-6">
            {approved_quotes && approved_quotes.length > 0 ? (
              approved_quotes.map(quote => (
                <Card key={quote.id}>
                  <CardHeader className="pb-2 sm:pb-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div>
                        <CardTitle className="text-base sm:text-lg">Offerte {quote.quote_number}</CardTitle>
                        <p className="text-xs sm:text-sm text-gray-500">{formatDate(quote.date)}</p>
                      </div>
                      <span className="self-start px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-medium">
                        Goedgekeurd
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {/* Line Items - Mobile Card View (NO unit prices for customers) */}
                    <div className="space-y-2 sm:hidden">
                      {quote.line_items?.map((item, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                          <p className="font-medium text-sm text-gray-800">{item.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {item.quantity} {item.unit}
                          </p>
                        </div>
                      ))}
                    </div>
                    
                    {/* Line Items - Desktop Table (NO unit prices for customers) */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Omschrijving</th>
                            <th className="text-right py-2">Aantal</th>
                            <th className="text-right py-2">Eenheid</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quote.line_items?.map((item, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="py-2">{item.description}</td>
                              <td className="text-right py-2">{item.quantity}</td>
                              <td className="text-right py-2">{item.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Totals - Only show grand total for customers */}
                    <div className="mt-4 pt-4 border-t text-right">
                      <p className="text-lg sm:text-xl font-bold" style={{color: '#1E40AF'}}>
                        Totaal incl. BTW: €{quote.total_incl_vat?.toFixed(2)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-6 text-center text-gray-500 text-sm">
                  Nog geen goedgekeurde offertes
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Work Updates Tab - Mobile Optimized */}
        {activeTab === 'updates' && (
          <div className="space-y-3 sm:space-y-4">
            {work_updates && work_updates.length > 0 ? (
              work_updates
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map(update => (
                  <Card key={update.id}>
                    <CardContent className="p-3 sm:pt-6">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="bg-blue-100 p-2 sm:p-3 rounded-full flex-shrink-0">
                          <Hammer className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm text-gray-500">{formatDate(update.date)}</p>
                          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-800">{update.work_description_nl || 'Werkzaamheden uitgevoerd'}</p>
                          
                          {/* Work Photos */}
                          {update.photos && update.photos.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {update.photos.map((photo, idx) => (
                                <img
                                  key={idx}
                                  src={getPhotoUrl(photo)}
                                  alt={`Werk foto ${idx + 1}`}
                                  className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90"
                                  onClick={() => setSelectedPhoto(photo)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
            ) : (
              <Card>
                <CardContent className="py-6 text-center text-gray-500 text-sm">
                  Nog geen updates beschikbaar
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Messages Tab - Mobile Optimized */}
        {activeTab === 'messages' && (
          <Card>
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">💬 Berichten</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Messages List */}
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6 max-h-80 sm:max-h-96 overflow-y-auto">
                {project.customer_messages && project.customer_messages.length > 0 ? (
                  project.customer_messages
                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                    .map(msg => (
                      <div
                        key={msg.id}
                        className={`p-2.5 sm:p-3 rounded-lg text-sm ${
                          msg.is_from_customer
                            ? 'bg-blue-100 ml-4 sm:ml-8'
                            : 'bg-gray-100 mr-4 sm:mr-8'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <span className="text-xs font-medium text-gray-600">
                            {msg.is_from_customer ? 'U' : msg.sender || 'Qtechnics'}
                          </span>
                          <span className="text-[10px] sm:text-xs text-gray-400 flex-shrink-0">
                            {new Date(msg.timestamp).toLocaleString('nl-BE', { 
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        <p className="text-gray-800 text-sm">{msg.message}</p>
                      </div>
                    ))
                ) : (
                  <p className="text-gray-500 text-center py-4 text-sm">
                    Nog geen berichten. Stel gerust een vraag!
                  </p>
                )}
              </div>

              {/* New Message Input - Mobile Optimized */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Typ uw vraag of opmerking..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 text-sm"
                  rows={2}
                />
                <Button
                  onClick={sendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  className="self-end px-3"
                  size="sm"
                >
                  {sendingMessage ? '...' : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Photo Modal - Mobile Optimized */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-2 sm:p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <img
            src={getPhotoUrl(selectedPhoto)}
            alt="Grote weergave"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white text-lg sm:text-xl bg-black bg-opacity-50 rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-opacity-70"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
