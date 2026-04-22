import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API, useAuth } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, CheckCircle, Trash2, UserPlus, Clock, Filter } from 'lucide-react';
import { toast } from 'sonner';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const TASK_TYPE_LABELS = {
  nieuwe_lead: 'Nieuwe Lead', eerste_bezoek: 'Eerste Bezoek', offerte_maken: 'Offerte Maken',
  materiaal_bestellen: 'Materiaal', planning: 'Planning', opvolging: 'Opvolging',
  administratie: 'Administratie', overig: 'Overig'
};

const TASK_TYPE_COLORS = {
  nieuwe_lead: { bg: '#DBEAFE', color: '#1E40AF', dot: '#3B82F6' },
  eerste_bezoek: { bg: '#EDE9FE', color: '#5B21B6', dot: '#8B5CF6' },
  offerte_maken: { bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },
  materiaal_bestellen: { bg: '#FFEDD5', color: '#9A3412', dot: '#F97316' },
  planning: { bg: '#D1FAE5', color: '#065F46', dot: '#10B981' },
  opvolging: { bg: '#FCE7F3', color: '#9D174D', dot: '#EC4899' },
  administratie: { bg: '#E0E7FF', color: '#3730A3', dot: '#6366F1' },
  overig: { bg: '#F3F4F6', color: '#374151', dot: '#6B7280' }
};

const STATUS_LABELS = { open: 'Open', assigned: 'Toegewezen', in_progress: 'Bezig', completed: 'Voltooid' };
const STATUS_COLORS = { open: '#DC2626', assigned: '#F59E0B', in_progress: '#3B82F6', completed: '#10B981' };

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('active'); // active, completed, all
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', task_type: 'overig', assigned_to: '', project_id: '' });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [tasksRes, membersRes, projectsRes] = await Promise.allSettled([
        axios.get(`${API}/team-tasks`, { headers: getAuthHeaders() }),
        axios.get(`${API}/team-members`, { headers: getAuthHeaders() }),
        axios.get(`${API}/projects`, { headers: getAuthHeaders() })
      ]);
      if (tasksRes.status === 'fulfilled') setTasks(tasksRes.value.data);
      if (membersRes.status === 'fulfilled') setTeamMembers(membersRes.value.data);
      if (projectsRes.status === 'fulfilled') setProjects(projectsRes.value.data);
    } catch (e) {} finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Titel is vereist'); return; }
    try {
      const data = { ...form };
      if (!data.assigned_to) delete data.assigned_to;
      if (!data.project_id) delete data.project_id;
      await axios.post(`${API}/team-tasks`, data, { headers: getAuthHeaders() });
      toast.success('Taak aangemaakt!');
      setDialogOpen(false);
      setForm({ title: '', description: '', task_type: 'overig', assigned_to: '', project_id: '' });
      fetchAll();
    } catch (e) { toast.error('Kon taak niet aanmaken'); }
  };

  const handleAssign = async (taskId, assigneeId) => {
    try {
      await axios.put(`${API}/team-tasks/${taskId}/assign`, { assigned_to: assigneeId }, { headers: getAuthHeaders() });
      toast.success('Taak toegewezen!');
      fetchAll();
    } catch (e) { toast.error('Kon taak niet toewijzen'); }
  };

  const handleComplete = async (taskId) => {
    try {
      await axios.put(`${API}/team-tasks/${taskId}/complete`, {}, { headers: getAuthHeaders() });
      toast.success('Taak voltooid!');
      fetchAll();
    } catch (e) { toast.error('Kon taak niet voltooien'); }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Weet je zeker dat je deze taak wilt verwijderen?')) return;
    try {
      await axios.delete(`${API}/team-tasks/${taskId}`, { headers: getAuthHeaders() });
      toast.success('Taak verwijderd');
      fetchAll();
    } catch (e) { toast.error('Kon taak niet verwijderen'); }
  };

  const filtered = tasks.filter(t => {
    if (filterStatus === 'active') return !t.completed;
    if (filterStatus === 'completed') return t.completed;
    return true;
  });

  const statusCounts = { active: tasks.filter(t => !t.completed).length, completed: tasks.filter(t => t.completed).length };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div></div></DashboardLayout>;

  return (
    <DashboardLayout showBackToDashboard={true}>
      <div data-testid="tasks-page" className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#500000' }}>Taken</h1>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {[
                { key: 'active', label: 'Actief', count: statusCounts.active },
                { key: 'completed', label: 'Voltooid', count: statusCounts.completed },
                { key: 'all', label: 'Alle', count: tasks.length }
              ].map(f => (
                <button key={f.key} data-testid={`filter-${f.key}`}
                  onClick={() => setFilterStatus(f.key)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filterStatus === f.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                  {f.label} <span className="text-xs ml-1">({f.count})</span>
                </button>
              ))}
            </div>
            {user?.role === 'admin' && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="create-task-btn" style={{ backgroundColor: '#500000' }}><Plus className="mr-2" size={18} /> Nieuwe Taak</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nieuwe Taak Aanmaken</DialogTitle></DialogHeader>
                  <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                      <Label>Titel *</Label>
                      <Input data-testid="task-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select value={form.task_type} onValueChange={(v) => setForm({ ...form, task_type: v })}>
                        <SelectTrigger data-testid="task-type-select"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Omschrijving</Label>
                      <Textarea data-testid="task-desc-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                    </div>
                    <div>
                      <Label>Toewijzen aan (optioneel)</Label>
                      <Select value={form.assigned_to || undefined} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                        <SelectTrigger data-testid="task-assign-select"><SelectValue placeholder="Niet toegewezen" /></SelectTrigger>
                        <SelectContent>
                          {teamMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name} ({m.role})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Gekoppeld project (optioneel)</Label>
                      <Select value={form.project_id || undefined} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                        <SelectTrigger data-testid="task-project-select"><SelectValue placeholder="Geen project" /></SelectTrigger>
                        <SelectContent>
                          {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button data-testid="submit-task-btn" type="submit" className="w-full" style={{ backgroundColor: '#500000' }}>Aanmaken</Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map(task => {
            const typeColor = TASK_TYPE_COLORS[task.task_type] || TASK_TYPE_COLORS.overig;
            const statusColor = STATUS_COLORS[task.status] || '#6B7280';
            return (
              <Card key={task.id} data-testid={`task-card-${task.id}`} className={`transition-all ${task.completed ? 'opacity-60' : ''}`} style={{ borderLeft: `4px solid ${typeColor.dot}` }}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: typeColor.bg, color: typeColor.color }}>
                          {TASK_TYPE_LABELS[task.task_type] || 'Overig'}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>
                          {STATUS_LABELS[task.status] || task.status}
                        </span>
                        {task.auto_created && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Auto</span>}
                      </div>
                      <h3 className="text-base font-bold" style={{ color: '#1F2937', textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</h3>
                      {task.description && <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{task.description}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: '#9CA3AF' }}>
                        {task.assigned_to_name && <span>Toegewezen: <strong style={{ color: '#374151' }}>{task.assigned_to_name}</strong></span>}
                        {task.project_name && <span>Project: {task.project_name}</span>}
                        <span><Clock size={12} className="inline mr-1" />{new Date(task.created_at).toLocaleDateString('nl-NL')}</span>
                        {task.completed_at && <span style={{ color: '#10B981' }}>Voltooid: {new Date(task.completed_at).toLocaleDateString('nl-NL')}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!task.completed && !task.assigned_to && user?.role === 'admin' && (
                        <Select onValueChange={(val) => handleAssign(task.id, val)}>
                          <SelectTrigger data-testid={`assign-task-${task.id}`} className="h-8 text-xs w-32">
                            <SelectValue placeholder="Toewijzen" />
                          </SelectTrigger>
                          <SelectContent>
                            {teamMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                      {!task.completed && (task.assigned_to === user?.id || user?.role === 'admin') && (
                        <Button data-testid={`complete-task-${task.id}`} size="sm" className="h-8 text-xs" style={{ backgroundColor: '#10B981' }} onClick={() => handleComplete(task.id)}>
                          <CheckCircle size={14} className="mr-1" /> Voltooid
                        </Button>
                      )}
                      {user?.role === 'admin' && (
                        <Button data-testid={`delete-task-${task.id}`} variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-500" onClick={() => handleDelete(task.id)}>
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && <p className="text-center py-12 text-gray-400">{filterStatus === 'completed' ? 'Nog geen voltooide taken' : 'Geen openstaande taken'}</p>}
        </div>
      </div>
    </DashboardLayout>
  );
}
