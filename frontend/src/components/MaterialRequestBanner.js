import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Package, Check, Truck, X, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function MaterialRequestBanner({ user }) {
  const [requests, setRequests] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchPendingRequests();
      // Poll every 30 seconds for new requests
      const interval = setInterval(fetchPendingRequests, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchPendingRequests = async () => {
    try {
      const response = await axios.get(`${API}/material-requests/pending`, {
        headers: getAuthHeaders()
      });
      
      const newRequests = response.data || [];
      
      // Show toast for new requests
      if (requests.length > 0 && newRequests.length > requests.length) {
        const diff = newRequests.length - requests.length;
        toast.info(`🔔 ${diff} nieuwe materiaal aanvra${diff > 1 ? 'gen' : 'ag'}!`, {
          duration: 5000
        });
      }
      
      setRequests(newRequests);
    } catch (error) {
      console.error('Error fetching material requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOrdered = async (requestId, currentValue) => {
    try {
      await axios.put(
        `${API}/material-requests/${requestId}/status?is_ordered=${!currentValue}`,
        {},
        { headers: getAuthHeaders() }
      );
      fetchPendingRequests();
      toast.success(currentValue ? 'Bestelling ongedaan gemaakt' : '✅ Gemarkeerd als besteld');
    } catch (error) {
      toast.error('Kon status niet bijwerken');
    }
  };

  const handleToggleDelivered = async (requestId, currentValue) => {
    try {
      await axios.put(
        `${API}/material-requests/${requestId}/status?is_delivered=${!currentValue}`,
        {},
        { headers: getAuthHeaders() }
      );
      fetchPendingRequests();
      toast.success(currentValue ? 'Levering ongedaan gemaakt' : '✅ Gemarkeerd als geleverd');
    } catch (error) {
      toast.error('Kon status niet bijwerken');
    }
  };

  // Don't show if not admin or no pending requests
  if (user?.role !== 'admin' || loading || requests.length === 0) {
    return null;
  }

  const urgentCount = requests.filter(r => !r.is_ordered).length;
  const orderedCount = requests.filter(r => r.is_ordered && !r.is_delivered).length;

  return (
    <div className="bg-orange-500 text-white">
      {/* Header bar - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-orange-600 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Package size={20} />
          <span className="font-semibold">
            📦 {requests.length} materiaal aanvra{requests.length > 1 ? 'gen' : 'ag'} wachten op actie
          </span>
          {urgentCount > 0 && (
            <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">
              {urgentCount} te bestellen
            </span>
          )}
          {orderedCount > 0 && (
            <span className="bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-xs font-bold">
              {orderedCount} onderweg
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm opacity-80">Klik om te bekijken</span>
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* Expanded list */}
      {expanded && (
        <div className="bg-orange-50 text-gray-800 p-4 max-h-96 overflow-y-auto">
          <div className="space-y-3">
            {requests.map((request) => (
              <div 
                key={request.id} 
                className={`p-3 rounded-lg border-2 ${
                  request.is_delivered ? 'bg-green-50 border-green-300' :
                  request.is_ordered ? 'bg-yellow-50 border-yellow-300' :
                  'bg-white border-red-300'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Photo + Info */}
                  <div className="flex items-start gap-3 flex-1">
                    {request.photo_url ? (
                      <img 
                        src={request.photo_url} 
                        alt={request.title}
                        className="w-16 h-16 object-cover rounded-lg border"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Package size={24} className="text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">{request.title}</h4>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Hoeveelheid:</span> {request.quantity}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Nodig op:</span> {request.needed_by}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Aangevraagd door: {request.requested_by_name}
                        {request.project_name && ` • Project: ${request.project_name}`}
                      </p>
                      {request.notes && (
                        <p className="text-xs text-gray-500 mt-1 italic">
                          "{request.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Status checkboxes */}
                  <div className="flex flex-col gap-2">
                    <label className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-all ${
                      request.is_ordered ? 'bg-blue-100 border border-blue-400' : 'bg-gray-100 hover:bg-gray-200'
                    }`}>
                      <input
                        type="checkbox"
                        checked={request.is_ordered}
                        onChange={() => handleToggleOrdered(request.id, request.is_ordered)}
                        className="w-5 h-5 accent-blue-500"
                      />
                      <Check size={16} className={request.is_ordered ? 'text-blue-600' : 'text-gray-400'} />
                      <span className="text-sm font-medium">Besteld</span>
                    </label>
                    
                    <label className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-all ${
                      request.is_delivered ? 'bg-green-100 border border-green-400' : 'bg-gray-100 hover:bg-gray-200'
                    }`}>
                      <input
                        type="checkbox"
                        checked={request.is_delivered}
                        onChange={() => handleToggleDelivered(request.id, request.is_delivered)}
                        className="w-5 h-5 accent-green-500"
                      />
                      <Truck size={16} className={request.is_delivered ? 'text-green-600' : 'text-gray-400'} />
                      <span className="text-sm font-medium">Geleverd</span>
                    </label>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="mt-2 pt-2 border-t border-gray-200 flex items-center gap-2">
                  {request.is_delivered ? (
                    <span className="text-green-600 text-xs font-medium flex items-center gap-1">
                      <Truck size={14} /> Geleverd
                    </span>
                  ) : request.is_ordered ? (
                    <span className="text-yellow-600 text-xs font-medium flex items-center gap-1">
                      <Clock size={14} /> Besteld - wacht op levering
                    </span>
                  ) : (
                    <span className="text-red-600 text-xs font-medium flex items-center gap-1">
                      <Package size={14} /> ⚠️ Nog te bestellen!
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
