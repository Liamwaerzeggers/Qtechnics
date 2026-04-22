import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, useAuth } from '../App';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle, UserPlus, ChevronDown, ChevronUp, X } from 'lucide-react';
import { toast } from 'sonner';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const TASK_TYPE_LABELS = {
  nieuwe_lead: 'Nieuwe Lead',
  eerste_bezoek: 'Eerste Bezoek',
  offerte_maken: 'Offerte Maken',
  materiaal_bestellen: 'Materiaal',
  planning: 'Planning',
  opvolging: 'Opvolging',
  administratie: 'Administratie',
  overig: 'Overig'
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

export default function TaskNotificationBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unassignedTasks, setUnassignedTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [assigningTaskId, setAssigningTaskId] = useState(null);

  const fetchTasks = useCallback(async () => {
    try {
      const [unassignedRes, myRes] = await Promise.allSettled([
        axios.get(`${API}/team-tasks/unassigned`, { headers: getAuthHeaders() }),
        axios.get(`${API}/team-tasks/my`, { headers: getAuthHeaders() })
      ]);
      if (unassignedRes.status === 'fulfilled') setUnassignedTasks(unassignedRes.value.data);
      if (myRes.status === 'fulfilled') setMyTasks(myRes.value.data);
    } catch (e) {}
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/team-members`, { headers: getAuthHeaders() });
      setTeamMembers(res.data);
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchMembers();
      const interval = setInterval(fetchTasks, 30000);
      return () => clearInterval(interval);
    }
  }, [user, fetchTasks, fetchMembers]);

  const handleAssign = async (taskId, assigneeId) => {
    try {
      await axios.put(`${API}/team-tasks/${taskId}/assign`, { assigned_to: assigneeId }, { headers: getAuthHeaders() });
      toast.success('Taak toegewezen!');
      setAssigningTaskId(null);
      fetchTasks();
    } catch (e) {
      toast.error('Kon taak niet toewijzen');
    }
  };

  const handleComplete = async (taskId) => {
    try {
      await axios.put(`${API}/team-tasks/${taskId}/complete`, {}, { headers: getAuthHeaders() });
      toast.success('Taak voltooid!');
      fetchTasks();
    } catch (e) {
      toast.error('Kon taak niet voltooien');
    }
  };

  const totalTasks = unassignedTasks.length + myTasks.length;
  if (!user || totalTasks === 0) return null;

  return (
    <div data-testid="task-notification-bar" className="mb-4">
      {/* Compact bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5 rounded-xl cursor-pointer transition-all hover:shadow-md"
        style={{ backgroundColor: unassignedTasks.length > 0 ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${unassignedTasks.length > 0 ? '#FECACA' : '#BBF7D0'}` }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {unassignedTasks.length > 0 ? (
            <AlertTriangle size={18} style={{ color: '#DC2626' }} />
          ) : (
            <CheckCircle size={18} style={{ color: '#16A34A' }} />
          )}
          <span className="text-sm font-semibold" style={{ color: '#1F2937' }}>
            {unassignedTasks.length > 0 && (
              <span style={{ color: '#DC2626' }}>{unassignedTasks.length} onverdeelde {unassignedTasks.length === 1 ? 'taak' : 'taken'}</span>
            )}
            {unassignedTasks.length > 0 && myTasks.length > 0 && ' · '}
            {myTasks.length > 0 && (
              <span style={{ color: '#065F46' }}>{myTasks.length} {myTasks.length === 1 ? 'taak' : 'taken'} voor jou</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ backgroundColor: '#7a1f1f', color: 'white' }}>
            {totalTasks}
          </span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded task list */}
      {expanded && (
        <div className="mt-2 space-y-2 max-h-80 overflow-y-auto" data-testid="task-list-expanded">
          {/* Unassigned tasks */}
          {unassignedTasks.map((task) => {
            const typeColor = TASK_TYPE_COLORS[task.task_type] || TASK_TYPE_COLORS.overig;
            return (
              <div key={task.id} data-testid={`task-${task.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-white border" style={{ borderLeft: `4px solid ${typeColor.dot}` }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: typeColor.bg, color: typeColor.color }}>
                      {TASK_TYPE_LABELS[task.task_type] || 'Overig'}
                    </span>
                    <span className="text-sm font-semibold truncate" style={{ color: '#1F2937' }}>{task.title}</span>
                  </div>
                  {task.project_name && (
                    <button
                      className="text-xs mt-1 hover:underline"
                      style={{ color: '#6B7280' }}
                      onClick={(e) => { e.stopPropagation(); task.project_id && navigate(`/projects/${task.project_id}`); }}
                    >
                      {task.project_name}
                    </button>
                  )}
                </div>
                {user?.role === 'admin' && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {assigningTaskId === task.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Select onValueChange={(val) => handleAssign(task.id, val)}>
                          <SelectTrigger data-testid={`assign-select-${task.id}`} className="h-8 text-xs w-36">
                            <SelectValue placeholder="Kies lid..." />
                          </SelectTrigger>
                          <SelectContent>
                            {teamMembers.map((m) => (
                              <SelectItem key={m.id} value={m.id}>{m.name} ({m.role})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setAssigningTaskId(null)}>
                          <X size={14} />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        data-testid={`assign-btn-${task.id}`}
                        size="sm" variant="outline" className="h-8 text-xs"
                        style={{ borderColor: '#7a1f1f', color: '#7a1f1f' }}
                        onClick={(e) => { e.stopPropagation(); setAssigningTaskId(task.id); }}
                      >
                        <UserPlus size={14} className="mr-1" /> Toewijzen
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* My tasks */}
          {myTasks.map((task) => {
            const typeColor = TASK_TYPE_COLORS[task.task_type] || TASK_TYPE_COLORS.overig;
            return (
              <div key={task.id} data-testid={`my-task-${task.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-white border" style={{ borderLeft: `4px solid ${typeColor.dot}` }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: typeColor.bg, color: typeColor.color }}>
                      {TASK_TYPE_LABELS[task.task_type] || 'Overig'}
                    </span>
                    <span className="text-sm font-semibold truncate" style={{ color: '#1F2937' }}>{task.title}</span>
                  </div>
                  {task.project_name && (
                    <button
                      className="text-xs mt-1 hover:underline"
                      style={{ color: '#6B7280' }}
                      onClick={(e) => { e.stopPropagation(); task.project_id && navigate(`/projects/${task.project_id}`); }}
                    >
                      {task.project_name}
                    </button>
                  )}
                </div>
                <Button
                  data-testid={`complete-btn-${task.id}`}
                  size="sm" className="h-8 text-xs flex-shrink-0"
                  style={{ backgroundColor: '#10B981' }}
                  onClick={() => handleComplete(task.id)}
                >
                  <CheckCircle size={14} className="mr-1" /> Voltooid
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
