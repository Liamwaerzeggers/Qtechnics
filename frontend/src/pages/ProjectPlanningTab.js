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
  const [newWorkStart, setNewWorkStart] = useState('');
  const [newWorkEnd, setNewWorkEnd] = useState('');
  const [newWorkDescription, setNewWorkDescription] = useState('');
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

  const handleAddWorkPeriod = () => {
    if (!newWorkStart || !newWorkEnd) {
      toast.error('Vul zowel begin- als einddatum in');
      return;
    }

    if (!newWorkDescription.trim()) {
      toast.error('Vul een omschrijving in van de werken');
      return;
    }

    if (new Date(newWorkEnd) < new Date(newWorkStart)) {
      toast.error('Einddatum moet na begindatum liggen');
      return;
    }

    const newPeriod = {
      id: Date.now().toString(),
      start_date: newWorkStart,
      end_date: newWorkEnd,
      description: newWorkDescription
    };

    setScheduledDays([
      ...scheduledDays,
      newPeriod
    ].sort((a, b) => new Date(a.start_date) - new Date(b.start_date)));
    
    setNewWorkStart('');
    setNewWorkEnd('');
    setNewWorkDescription('');
    toast.success('Werkperiode toegevoegd');
  };

  const handleRemoveWorkPeriod = (id) => {
    setScheduledDays(scheduledDays.filter(d => d.id !== id));
    toast.success('Werkperiode verwijderd');
  };

  const handleUpdateWorkPeriod = (id, field, value) => {
    setScheduledDays(scheduledDays.map(d => 
      d.id === id ? { ...d, [field]: value } : d
    ));
  };

  // Calculate days between two dates
  const getDaysDiff = (start, end) => {
    const diffTime = Math.abs(new Date(end) - new Date(start));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
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
              <Label>Startdatum Project</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Einddatum Project</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Work Periods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📅 Geplande Werken
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Add new work period */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold mb-3" style={{color: '#1E40AF'}}>Nieuwe Werkperiode Toevoegen</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label>Van</Label>
                  <Input
                    type="date"
                    value={newWorkStart}
                    onChange={(e) => setNewWorkStart(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Tot en met</Label>
                  <Input
                    type="date"
                    value={newWorkEnd}
                    onChange={(e) => setNewWorkEnd(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Omschrijving werken</Label>
                  <Input
                    placeholder="Bijv: Tegelwerken badkamer, Leidingwerk..."
                    value={newWorkDescription}
                    onChange={(e) => setNewWorkDescription(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                onClick={handleAddWorkPeriod}
                className="mt-3"
                style={{backgroundColor: '#1E40AF'}}
              >
                <Plus size={16} className="mr-2" /> Werkperiode Toevoegen
              </Button>
            </div>

            {/* List of scheduled work periods */}
            {scheduledDays.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-semibold" style={{color: '#1E293B'}}>
                  Geplande werkperiodes ({scheduledDays.length})
                </h4>
                {scheduledDays.map((period) => (
                  <div 
                    key={period.id || period.start_date} 
                    className="p-4 bg-gray-50 rounded-lg border"
                    style={{borderColor: '#E5E7EB'}}
                  >
                    <div className="flex items-start gap-4">
                      {/* Date Range Display */}
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <div className="w-20 h-20 rounded-lg flex flex-col items-center justify-center" style={{backgroundColor: '#F59E0B'}}>
                          <span className="text-white text-xs font-semibold">VAN</span>
                          <span className="text-white text-lg font-bold">
                            {new Date(period.start_date).getDate()}
                          </span>
                          <span className="text-white text-xs">
                            {new Date(period.start_date).toLocaleDateString('nl-NL', { month: 'short' })}
                          </span>
                        </div>
                        <div className="text-2xl font-bold" style={{color: '#9CA3AF'}}>→</div>
                        <div className="w-20 h-20 rounded-lg flex flex-col items-center justify-center" style={{backgroundColor: '#10B981'}}>
                          <span className="text-white text-xs font-semibold">TOT</span>
                          <span className="text-white text-lg font-bold">
                            {new Date(period.end_date).getDate()}
                          </span>
                          <span className="text-white text-xs">
                            {new Date(period.end_date).toLocaleDateString('nl-NL', { month: 'short' })}
                          </span>
                        </div>
                      </div>
                      
                      {/* Description */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 text-xs rounded-full" style={{backgroundColor: '#DBEAFE', color: '#1E40AF'}}>
                            {getDaysDiff(period.start_date, period.end_date)} dagen
                          </span>
                        </div>
                        
                        {/* Editable date inputs */}
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <Label className="text-xs">Van</Label>
                            <Input
                              type="date"
                              value={period.start_date}
                              onChange={(e) => handleUpdateWorkPeriod(period.id || period.start_date, 'start_date', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Tot</Label>
                            <Input
                              type="date"
                              value={period.end_date}
                              onChange={(e) => handleUpdateWorkPeriod(period.id || period.start_date, 'end_date', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                        </div>
                        
                        <Input
                          value={period.description || period.notes || ''}
                          onChange={(e) => handleUpdateWorkPeriod(period.id || period.start_date, 'description', e.target.value)}
                          placeholder="Omschrijving van de werken..."
                          className="font-medium"
                        />
                        <p className="text-sm mt-2" style={{color: '#64748B'}}>
                          {new Date(period.start_date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })} 
                          {' '} t/m {' '}
                          {new Date(period.end_date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      
                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveWorkPeriod(period.id || period.start_date)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar size={48} className="mx-auto mb-3 opacity-50" />
                <p>Nog geen werkperiodes gepland</p>
                <p className="text-sm mt-1">Voeg werkperiodes toe om ze in de kalender te zien</p>
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
