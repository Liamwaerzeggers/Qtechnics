import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { FileText, Clock, Users, Euro, Trash2, Edit2, Save, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function ProjectWorkSlipsTab({ project, onUpdate }) {
  const navigate = useNavigate();
  const [workSlips, setWorkSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    fetchWorkSlips();
  }, [project.id]);

  const fetchWorkSlips = async () => {
    try {
      const response = await axios.get(
        `${API}/projects/${project.id}/work-slips`,
        { withCredentials: true }
      );
      setWorkSlips(response.data);
    } catch (error) {
      console.error('Failed to fetch work slips:', error);
      toast.error('Kon werkbonnen niet laden');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-BE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleEdit = (slip) => {
    setEditingId(slip.id);
    setEditData({
      hours_worked: slip.hours_worked || 0,
      number_of_workers: slip.number_of_workers || 1,
      hourly_rate: slip.hourly_rate || 32
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleSaveEdit = async (slipId) => {
    try {
      await axios.put(
        `${API}/projects/${project.id}/work-slips/${slipId}`,
        editData,
        { withCredentials: true }
      );
      toast.success('Werkbon bijgewerkt! ✅');
      setEditingId(null);
      setEditData({});
      fetchWorkSlips();
      onUpdate(); // Refresh project data to update costs
    } catch (error) {
      console.error('Failed to update work slip:', error);
      toast.error('Kon werkbon niet bijwerken');
    }
  };

  const handleDelete = async (slipId) => {
    if (!window.confirm('Weet je zeker dat je deze werkbon wilt verwijderen?')) {
      return;
    }
    try {
      await axios.delete(
        `${API}/projects/${project.id}/work-slips/${slipId}`,
        { withCredentials: true }
      );
      toast.success('Werkbon verwijderd');
      fetchWorkSlips();
      onUpdate(); // Refresh project data to update costs
    } catch (error) {
      console.error('Failed to delete work slip:', error);
      toast.error('Kon werkbon niet verwijderen');
    }
  };

  // Calculate totals
  const totalLaborCost = workSlips.reduce((sum, slip) => sum + (slip.labor_cost || 0), 0);
  const totalManHours = workSlips.reduce((sum, slip) => 
    sum + ((slip.hours_worked || 0) * (slip.number_of_workers || 1)), 0
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin mr-2" />
            <span>Werkbonnen laden...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm" style={{color: '#64748B'}}>Aantal Werkbonnen</p>
                <p className="text-2xl font-bold" style={{color: '#1E40AF'}}>{workSlips.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-sm" style={{color: '#64748B'}}>Totaal Man-uren</p>
                <p className="text-2xl font-bold" style={{color: '#166534'}}>{totalManHours.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Euro className="text-yellow-600" size={24} />
              </div>
              <div>
                <p className="text-sm" style={{color: '#64748B'}}>Totaal Arbeidskosten</p>
                <p className="text-2xl font-bold" style={{color: '#CA8A04'}}>€{totalLaborCost.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        <Button 
          onClick={() => navigate(`/projects/${project.id}/work-slips`)}
          style={{backgroundColor: '#1E40AF', color: 'white'}}
        >
          + Nieuwe Werkbon Invullen
        </Button>
      </div>

      {/* Work Slips List */}
      {workSlips.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="mx-auto mb-4 text-gray-300" size={48} />
            <p className="text-lg font-semibold" style={{color: '#64748B'}}>
              Nog geen werkbonnen
            </p>
            <p className="text-sm mt-2" style={{color: '#94A3B8'}}>
              Werkbonnen worden hier getoond zodra werkmannen deze invullen.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{backgroundColor: '#F8FAFC'}}>
                    <th className="text-left p-4 font-semibold" style={{color: '#64748B'}}>Datum</th>
                    <th className="text-left p-4 font-semibold" style={{color: '#64748B'}}>Uren</th>
                    <th className="text-left p-4 font-semibold" style={{color: '#64748B'}}>Werkmannen</th>
                    <th className="text-left p-4 font-semibold" style={{color: '#64748B'}}>Uurtarief</th>
                    <th className="text-left p-4 font-semibold" style={{color: '#64748B'}}>Arbeidskosten</th>
                    <th className="text-left p-4 font-semibold" style={{color: '#64748B'}}>Beschrijving</th>
                    <th className="text-right p-4 font-semibold" style={{color: '#64748B'}}>Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {workSlips.map((slip) => (
                    <tr key={slip.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <span className="text-sm font-medium" style={{color: '#1E293B'}}>
                          {formatDate(slip.date)}
                        </span>
                      </td>
                      <td className="p-4">
                        {editingId === slip.id ? (
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            value={editData.hours_worked}
                            onChange={(e) => setEditData({...editData, hours_worked: parseFloat(e.target.value) || 0})}
                            className="w-20"
                          />
                        ) : (
                          <span className="text-sm" style={{color: '#334155'}}>
                            {slip.hours_worked || 0}u
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {editingId === slip.id ? (
                          <Input
                            type="number"
                            min="1"
                            value={editData.number_of_workers}
                            onChange={(e) => setEditData({...editData, number_of_workers: parseInt(e.target.value) || 1})}
                            className="w-16"
                          />
                        ) : (
                          <div className="flex items-center space-x-1">
                            <Users size={14} className="text-gray-400" />
                            <span className="text-sm" style={{color: '#334155'}}>
                              {slip.number_of_workers || 1}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {editingId === slip.id ? (
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            value={editData.hourly_rate}
                            onChange={(e) => setEditData({...editData, hourly_rate: parseFloat(e.target.value) || 32})}
                            className="w-20"
                          />
                        ) : (
                          <span className="text-sm font-medium" style={{color: '#1E40AF'}}>
                            €{(slip.hourly_rate || 32).toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {editingId === slip.id ? (
                          <span className="text-sm font-bold" style={{color: '#166534'}}>
                            €{(editData.hours_worked * editData.number_of_workers * editData.hourly_rate).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-sm font-bold" style={{color: '#166534'}}>
                            €{(slip.labor_cost || 0).toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="p-4 max-w-xs">
                        <p className="text-sm truncate" style={{color: '#334155'}} title={slip.work_description_nl}>
                          {slip.work_description_nl || '-'}
                        </p>
                        {slip.photos && slip.photos.length > 0 && (
                          <span className="text-xs" style={{color: '#64748B'}}>
                            📷 {slip.photos.length} foto(s)
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {editingId === slip.id ? (
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelEdit}
                            >
                              <X size={16} />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(slip.id)}
                              style={{backgroundColor: '#10B981', color: 'white'}}
                            >
                              <Save size={16} />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(slip)}
                              title="Bewerken"
                            >
                              <Edit2 size={16} className="text-blue-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(slip.id)}
                              title="Verwijderen"
                            >
                              <Trash2 size={16} className="text-red-500" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{backgroundColor: '#F0FDF4'}}>
                    <td className="p-4 font-bold" style={{color: '#166534'}}>Totaal</td>
                    <td className="p-4 font-bold" style={{color: '#166534'}}>
                      {workSlips.reduce((sum, s) => sum + (s.hours_worked || 0), 0).toFixed(1)}u
                    </td>
                    <td className="p-4"></td>
                    <td className="p-4"></td>
                    <td className="p-4 font-bold" style={{color: '#166534'}}>
                      €{totalLaborCost.toFixed(2)}
                    </td>
                    <td className="p-4 text-sm" style={{color: '#166534'}}>
                      {totalManHours.toFixed(1)} man-uren totaal
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
