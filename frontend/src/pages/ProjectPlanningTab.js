import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, Plus, Trash2, Save, Package } from 'lucide-react';
import { toast } from 'sonner';

export default function ProjectPlanningTab({ project, approvedQuotes = [], onUpdate }) {
  const [startDate, setStartDate] = useState(project?.start_date ? project.start_date.split('T')[0] : '');
  const [endDate, setEndDate] = useState(project?.end_date ? project.end_date.split('T')[0] : '');
  const [scheduledDays, setScheduledDays] = useState(project?.scheduled_days || []);
  const [requiredMaterials, setRequiredMaterials] = useState(project?.required_materials || '');
  const [newDayDate, setNewDayDate] = useState('');
  const [newDayNotes, setNewDayNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [quoteMaterials, setQuoteMaterials] = useState([]);

  // Fetch materials from approved quotes
  useEffect(() => {
    const fetchMaterials = async () => {
      const materials = [];
      for (const quote of approvedQuotes) {
        try {
          const response = await axios.get(`${API}/quotes/${quote.id}/items`, { withCredentials: true });
          const materialItems = response.data.filter(item => item.item_type === 'materiaal');
          materials.push(...materialItems);
        } catch (error) {
          console.error('Error fetching quote items:', error);
        }
      }
      setQuoteMaterials(materials);
    };

    if (approvedQuotes.length > 0) {
      fetchMaterials();
    }
  }, [approvedQuotes]);

  const handleSavePlanning = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${API}/projects/${project.id}`,
        {
          start_date: startDate ? new Date(startDate).toISOString() : null,
          end_date: endDate ? new Date(endDate).toISOString() : null,
          scheduled_days: scheduledDays,
          required_materials: requiredMaterials
        },
        { withCredentials: true }
      );
      toast.success('Planning opgeslagen! 📅');
      onUpdate();
    } catch (error) {
      console.error('Error saving planning:', error);
      toast.error('Kon planning niet opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleAddScheduledDay = () => {
    if (!newDayDate) {
      toast.error('Selecteer een datum');
      return;
    }

    // Check if date already exists
    if (scheduledDays.some(d => d.date === newDayDate)) {
      toast.error('Deze datum is al gepland');
      return;
    }

    setScheduledDays([
      ...scheduledDays,
      { date: newDayDate, notes: newDayNotes }
    ].sort((a, b) => new Date(a.date) - new Date(b.date)));
    
    setNewDayDate('');
    setNewDayNotes('');
    toast.success('Werkdag toegevoegd');
  };

  const handleRemoveScheduledDay = (date) => {
    setScheduledDays(scheduledDays.filter(d => d.date !== date));
    toast.success('Werkdag verwijderd');
  };

  const handleUpdateDayNotes = (date, notes) => {
    setScheduledDays(scheduledDays.map(d => 
      d.date === date ? { ...d, notes } : d
    ));
  };

  return (
    <div className="space-y-6">
      {/* Start & End Date */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar size={20} style={{color: '#1E40AF'}} />
            Project Periode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Startdatum</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Einddatum</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Work Days */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📅 Geplande Werkdagen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Add new day */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold mb-3" style={{color: '#1E40AF'}}>Nieuwe Werkdag Toevoegen</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Datum</Label>
                  <Input
                    type="date"
                    value={newDayDate}
                    onChange={(e) => setNewDayDate(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Notities (welke werken?)</Label>
                  <Input
                    placeholder="Bijv: Tegels plaatsen, egaliseren..."
                    value={newDayNotes}
                    onChange={(e) => setNewDayNotes(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                onClick={handleAddScheduledDay}
                className="mt-3"
                style={{backgroundColor: '#1E40AF'}}
              >
                <Plus size={16} className="mr-2" /> Werkdag Toevoegen
              </Button>
            </div>

            {/* List of scheduled days */}
            {scheduledDays.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-semibold" style={{color: '#1E293B'}}>
                  Geplande dagen ({scheduledDays.length})
                </h4>
                {scheduledDays.map((day, index) => (
                  <div 
                    key={day.date} 
                    className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border"
                    style={{borderColor: '#E5E7EB'}}
                  >
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-lg flex flex-col items-center justify-center" style={{backgroundColor: '#F59E0B'}}>
                        <span className="text-white text-xs font-semibold">
                          {new Date(day.date).toLocaleDateString('nl-NL', { weekday: 'short' })}
                        </span>
                        <span className="text-white text-lg font-bold">
                          {new Date(day.date).getDate()}
                        </span>
                        <span className="text-white text-xs">
                          {new Date(day.date).toLocaleDateString('nl-NL', { month: 'short' })}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold" style={{color: '#1E293B'}}>
                        {new Date(day.date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <Textarea
                        value={day.notes}
                        onChange={(e) => handleUpdateDayNotes(day.date, e.target.value)}
                        placeholder="Notities over de werkzaamheden..."
                        className="mt-2"
                        rows={2}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveScheduledDay(day.date)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar size={48} className="mx-auto mb-3 opacity-50" />
                <p>Nog geen werkdagen gepland</p>
                <p className="text-sm mt-1">Voeg werkdagen toe om ze in de kalender te zien</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Required Materials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package size={20} style={{color: '#1E40AF'}} />
            Benodigde Materialen voor Aanvang
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Materials from quotes */}
            {quoteMaterials.length > 0 && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold mb-3" style={{color: '#065F46'}}>
                  📦 Materialen uit Goedgekeurde Offertes
                </h4>
                <div className="space-y-2">
                  {quoteMaterials.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-green-100 last:border-0">
                      <span style={{color: '#1E293B'}}>{item.description}</span>
                      <span className="font-semibold" style={{color: '#065F46'}}>
                        {item.quantity} {item.unit || 'x'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual materials input */}
            <div>
              <Label>Aanvullende Materialen (handmatig)</Label>
              <Textarea
                value={requiredMaterials}
                onChange={(e) => setRequiredMaterials(e.target.value)}
                placeholder="Bijv: Extra tegels bestellen, voegsel, kit..."
                rows={4}
              />
              <p className="text-xs mt-1" style={{color: '#64748B'}}>
                💡 Je krijgt een herinnering op het dashboard 1 maand voor de startdatum
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSavePlanning}
          disabled={saving}
          size="lg"
          style={{backgroundColor: '#1E40AF'}}
        >
          <Save size={20} className="mr-2" />
          {saving ? 'Opslaan...' : 'Planning Opslaan'}
        </Button>
      </div>
    </div>
  );
}
