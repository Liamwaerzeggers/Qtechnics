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
import { Plus, CheckCircle, Trash2, UserPlus, Clock, Filter, BarChart3, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
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

function buildTeamStats(tasks) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const byUser = {};

  tasks.forEach(t => {
    const uid = t.assigned_to;
    if (!uid) return;
    if (!byUser[uid]) {
      byUser[uid] = {
        id: uid,
        name: t.assigned_to_name || uid,
        openCount: 0,
        doneWeek: 0,
        doneMonth: 0,
        totalCompleted: 0,
        leadTimesMs: [],
        byType: {},
      };
    }
    const u = byUser[uid];
    if (t.completed) {
      u.totalCompleted += 1;
      const comp = t.completed_at ? new Date(t.completed_at) : null;
      if (comp) {
        if (comp >= weekAgo) u.doneWeek += 1;
        if (comp >= monthAgo) u.doneMonth += 1;
        if (t.created_at) {
          const ms = comp - new Date(t.created_at);
          if (ms > 0) u.leadTimesMs.push(ms);
        }
      }
      u.byType[t.task_type] = (u.byType[t.task_type] || 0) + 1;
    } else {
      u.openCount += 1;
    }
  });

  return Object.values(byUser)
    .map(u => {
      const avgMs = u.leadTimesMs.length
        ? u.leadTimesMs.reduce((a, b) => a + b, 0) / u.leadTimesMs.length
        : null;
      return { ...u, avgLeadTimeHours: avgMs ? avgMs / 3600000 : null };
    })
    .sort((a, b) => (b.doneWeek - a.doneWeek) || (b.totalCompleted - a.totalCompleted));
}

function formatLeadTime(hours) {
  if (hours == null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)} u`;
  return `${(hours / 24).toFixed(1)} d`;
}

function TeamPerformanceWidget({ tasks, activeUserId, onUserClick }) {
  const [open, setOpen] = React.useState(true);
  const stats = React.useMemo(() => buildTeamStats(tasks), [tasks]);

  const totals = stats.reduce((acc, u) => {
    acc.doneWeek += u.doneWeek;
    acc.doneMonth += u.doneMonth;
    acc.openCount += u.openCount;
    return acc;
  }, { doneWeek: 0, doneMonth: 0, openCount: 0 });

  return (
    <Card data-testid="team-performance-widget" className="border-0 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
      <CardContent className="p-0">
        <button
          data-testid="team-performance-toggle"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f5e6e6' }}>
              <BarChart3 size={18} style={{ color: '#500000' }} />
            </div>
            <div className="text-left">
              <h3 className="font-semibold" style={{ color: '#1F2937' }}>Team Prestaties</h3>
              <p className="text-xs" style={{ color: '#6B7280' }}>
                {totals.doneWeek} voltooid deze week · {totals.doneMonth} deze maand · {totals.openCount} open
              </p>
            </div>
          </div>
          {open ? <ChevronUp size={18} style={{ color: '#6B7280' }} /> : <ChevronDown size={18} style={{ color: '#6B7280' }} />}
        </button>

        {open && (
          <div className="px-5 pb-5">
            {stats.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">Nog geen toegewezen taken om te analyseren.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left" style={{ color: '#9CA3AF', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th className="py-2 pr-4 font-medium">Teamlid</th>
                      <th className="py-2 px-2 font-medium text-center">Week</th>
                      <th className="py-2 px-2 font-medium text-center">Maand</th>
                      <th className="py-2 px-2 font-medium text-center">Backlog</th>
                      <th className="py-2 px-2 font-medium text-center">Ø Doorlooptijd</th>
                      <th className="py-2 pl-2 font-medium">Totaal voltooid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((u, idx) => {
                      const isActive = activeUserId === u.id;
                      return (
                      <tr
                        key={u.id}
                        data-testid={`team-stat-row-${u.id}`}
                        onClick={() => onUserClick && onUserClick(u.id)}
                        className="border-t cursor-pointer transition-colors"
                        style={{
                          borderColor: '#F3F4F6',
                          backgroundColor: isActive ? '#f5e6e6' : 'transparent',
                        }}
                        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold"
                              style={{ backgroundColor: idx === 0 ? '#FEF3C7' : '#F3F4F6', color: idx === 0 ? '#92400E' : '#374151' }}
                            >
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium flex items-center gap-2" style={{ color: isActive ? '#500000' : '#1F2937' }}>
                                {u.name}
                                {idx === 0 && u.doneWeek > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                                    <TrendingUp size={10} /> Top
                                  </span>
                                )}
                                {isActive && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#500000', color: 'white' }}>
                                    Gefilterd
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center font-semibold" style={{ color: '#10B981' }}>
                          {u.doneWeek}
                        </td>
                        <td className="py-3 px-2 text-center" style={{ color: '#1F2937' }}>
                          {u.doneMonth}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span
                            className="inline-block min-w-[28px] px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor: u.openCount > 5 ? '#FEE2E2' : u.openCount > 0 ? '#FEF3C7' : '#F3F4F6',
                              color: u.openCount > 5 ? '#991B1B' : u.openCount > 0 ? '#92400E' : '#6B7280',
                            }}
                          >
                            {u.openCount}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center" style={{ color: '#6B7280' }}>
                          {formatLeadTime(u.avgLeadTimeHours)}
                        </td>
                        <td className="py-3 pl-2" style={{ color: '#6B7280' }}>
                          {u.totalCompleted}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('active'); // active, completed, all
  const [assignedFilter, setAssignedFilter] = useState(null); // null | user_id
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
    if (filterStatus === 'active' && t.completed) return false;
    if (filterStatus === 'completed' && !t.completed) return false;
    if (assignedFilter && t.assigned_to !== assignedFilter) return false;
    return true;
  });

  const activeAssigneeName = assignedFilter
    ? (tasks.find(t => t.assigned_to === assignedFilter)?.assigned_to_name || assignedFilter)
    : null;

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
          {user?.role === 'admin' && (
            <TeamPerformanceWidget
              tasks={tasks}
              activeUserId={assignedFilter}
              onUserClick={(uid) => setAssignedFilter(prev => (prev === uid ? null : uid))}
            />
          )}
          {assignedFilter && (
            <div
              data-testid="assignee-filter-chip"
              className="flex items-center gap-2 px-4 py-2 rounded-lg"
              style={{ backgroundColor: '#f5e6e6', color: '#500000' }}
            >
              <Filter size={14} />
              <span className="text-sm">
                Gefilterd op <strong>{activeAssigneeName}</strong> ({filtered.length} {filtered.length === 1 ? 'taak' : 'taken'})
              </span>
              <button
                data-testid="clear-assignee-filter"
                onClick={() => setAssignedFilter(null)}
                className="ml-auto text-xs font-semibold hover:underline"
              >
                Wis filter
              </button>
            </div>
          )}
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
