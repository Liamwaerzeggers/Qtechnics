import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Users, 
  MapPin, 
  Clock,
  Edit2,
  Trash2,
  GripVertical,
  X
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

// Predefined team colors
const TEAM_COLORS = [
  { name: 'Blauw', bg: 'bg-blue-500', border: 'border-blue-600', light: 'bg-blue-50' },
  { name: 'Groen', bg: 'bg-green-500', border: 'border-green-600', light: 'bg-green-50' },
  { name: 'Oranje', bg: 'bg-orange-500', border: 'border-orange-600', light: 'bg-orange-50' },
  { name: 'Paars', bg: 'bg-purple-500', border: 'border-purple-600', light: 'bg-purple-50' },
  { name: 'Rood', bg: 'bg-red-500', border: 'border-red-600', light: 'bg-red-50' },
  { name: 'Geel', bg: 'bg-yellow-500', border: 'border-yellow-600', light: 'bg-yellow-50' },
  { name: 'Roze', bg: 'bg-pink-500', border: 'border-pink-600', light: 'bg-pink-50' },
  { name: 'Cyaan', bg: 'bg-cyan-500', border: 'border-cyan-600', light: 'bg-cyan-50' },
];

// Get color for team based on team name hash
const getTeamColor = (teamName) => {
  if (!teamName) return TEAM_COLORS[0];
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TEAM_COLORS[Math.abs(hash) % TEAM_COLORS.length];
};

// Format date for display
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' });
};

// Get week dates
const getWeekDates = (date) => {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay() + 1); // Monday
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
};

// Check if date is in range
const isDateInRange = (date, startDate, endDate) => {
  const d = new Date(date).setHours(0, 0, 0, 0);
  const s = new Date(startDate).setHours(0, 0, 0, 0);
  const e = new Date(endDate).setHours(0, 0, 0, 0);
  return d >= s && d <= e;
};

export default function CalendarPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [teams, setTeams] = useState(['Team 1', 'Team 2', 'Team 3']);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [editingBlock, setEditingBlock] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const navigate = useNavigate();

  const weekDates = useMemo(() => getWeekDates(currentWeek), [currentWeek]);

  useEffect(() => {
    fetchProjects();
    loadTeams();
  }, []);

  const loadTeams = () => {
    const savedTeams = localStorage.getItem('planning_teams');
    if (savedTeams) {
      setTeams(JSON.parse(savedTeams));
    }
  };

  const saveTeams = (newTeams) => {
    localStorage.setItem('planning_teams', JSON.stringify(newTeams));
    setTeams(newTeams);
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/projects`, { withCredentials: true });
      
      // Also fetch leads for addresses
      const leadsResponse = await axios.get(`${API}/leads`, { withCredentials: true });
      const leadsMap = {};
      leadsResponse.data.forEach(lead => {
        leadsMap[lead.id] = lead;
      });
      
      // Enrich projects with lead info
      const enrichedProjects = response.data.map(project => ({
        ...project,
        lead: leadsMap[project.lead_id] || null
      }));
      
      setProjects(enrichedProjects);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      toast.error('Kon projecten niet laden');
    } finally {
      setLoading(false);
    }
  };

  const addTeam = () => {
    if (!newTeamName.trim()) return;
    const newTeams = [...teams, newTeamName.trim()];
    saveTeams(newTeams);
    setNewTeamName('');
    setShowAddTeam(false);
    toast.success(`Team "${newTeamName}" toegevoegd`);
  };

  const removeTeam = (teamName) => {
    if (!window.confirm(`Weet u zeker dat u "${teamName}" wilt verwijderen?`)) return;
    const newTeams = teams.filter(t => t !== teamName);
    saveTeams(newTeams);
    toast.success(`Team "${teamName}" verwijderd`);
  };

  const updateScheduledWork = async (projectId, updatedScheduledDays) => {
    try {
      await axios.put(
        `${API}/projects/${projectId}`,
        { scheduled_days: updatedScheduledDays },
        { withCredentials: true }
      );
      fetchProjects();
    } catch (error) {
      console.error('Failed to update schedule:', error);
      toast.error('Kon planning niet bijwerken');
    }
  };

  const handleDragStart = (e, project, period) => {
    setDraggedItem({ project, period });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e, targetTeam, targetDate) => {
    e.preventDefault();
    if (!draggedItem) return;

    const { project, period } = draggedItem;
    
    // Update the team name for this period
    const updatedScheduledDays = project.scheduled_days.map(p => 
      p.id === period.id 
        ? { ...p, team_name: targetTeam }
        : p
    );

    await updateScheduledWork(project.id, updatedScheduledDays);
    setDraggedItem(null);
    toast.success(`Werk toegewezen aan ${targetTeam}`);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Get all scheduled work periods grouped by team
  const getWorkByTeam = (teamName) => {
    const work = [];
    projects.forEach(project => {
      (project.scheduled_days || []).forEach(period => {
        if (period.team_name === teamName) {
          // Check if period overlaps with current week
          const periodStart = new Date(period.start_date);
          const periodEnd = new Date(period.end_date);
          const weekStart = weekDates[0];
          const weekEnd = weekDates[6];
          
          if (periodEnd >= weekStart && periodStart <= weekEnd) {
            work.push({
              ...period,
              project,
              projectName: project.name,
              address: project.lead?.address || ''
            });
          }
        }
      });
    });
    return work.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  };

  // Get unassigned work (no team)
  const getUnassignedWork = () => {
    const work = [];
    projects.forEach(project => {
      (project.scheduled_days || []).forEach(period => {
        if (!period.team_name) {
          work.push({
            ...period,
            project,
            projectName: project.name,
            address: project.lead?.address || ''
          });
        }
      });
    });
    return work;
  };

  const prevWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeek(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeek(newDate);
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  const getWeekLabel = () => {
    const start = weekDates[0];
    const end = weekDates[6];
    const startMonth = start.toLocaleDateString('nl-BE', { month: 'long' });
    const endMonth = end.toLocaleDateString('nl-BE', { month: 'long' });
    const year = end.getFullYear();
    
    if (startMonth === endMonth) {
      return `${start.getDate()} - ${end.getDate()} ${startMonth} ${year}`;
    }
    return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth} ${year}`;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const unassignedWork = getUnassignedWork();

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="w-7 h-7 text-blue-600" />
              Team Planning
            </h1>
            <p className="text-gray-500 text-sm mt-1">Plan en wijs werk toe aan teams</p>
          </div>
          
          {/* Week Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={prevWeek}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Vandaag
            </Button>
            <Button variant="outline" size="sm" onClick={nextWeek}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Week Label */}
        <div className="text-center mb-4">
          <h2 className="text-lg font-semibold text-gray-700">{getWeekLabel()}</h2>
        </div>

        {/* Unassigned Work */}
        {unassignedWork.length > 0 && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2 text-orange-700">
                <Clock className="w-5 h-5" />
                Niet toegewezen werk ({unassignedWork.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="flex flex-wrap gap-2">
                {unassignedWork.map((item, idx) => (
                  <div
                    key={idx}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.project, item)}
                    className="bg-white border border-orange-300 rounded-lg p-2 cursor-move hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-sm">{item.projectName}</p>
                        <p className="text-xs text-gray-500">{item.description}</p>
                        <p className="text-xs text-gray-400">{formatDate(item.start_date)} - {formatDate(item.end_date)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {teams.map((teamName) => {
            const teamColor = getTeamColor(teamName);
            const teamWork = getWorkByTeam(teamName);
            
            return (
              <Card 
                key={teamName} 
                className={`${teamColor.light} border-2 ${teamColor.border} min-h-[300px]`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, teamName, null)}
              >
                <CardHeader className={`${teamColor.bg} text-white py-3 rounded-t-lg`}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      {teamName}
                    </CardTitle>
                    <button
                      onClick={() => removeTeam(teamName)}
                      className="text-white/70 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-white/80 mt-1">
                    {teamWork.length} {teamWork.length === 1 ? 'taak' : 'taken'} deze week
                  </p>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {teamWork.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      Sleep werk hierheen
                    </div>
                  ) : (
                    teamWork.map((item, idx) => (
                      <div
                        key={idx}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.project, item)}
                        onClick={() => navigate(`/projects/${item.project.id}`)}
                        className="bg-white rounded-lg p-3 shadow-sm border cursor-pointer hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-800 truncate">
                              {item.projectName}
                            </p>
                            {item.description && (
                              <p className="text-xs text-blue-600 font-medium mt-0.5">
                                {item.description}
                              </p>
                            )}
                            {item.address && (
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{item.address}</span>
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              📅 {formatDate(item.start_date)} → {formatDate(item.end_date)}
                            </p>
                          </div>
                          <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0 cursor-move" />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Add Team Card */}
          <Card className="border-2 border-dashed border-gray-300 bg-gray-50 min-h-[300px] flex items-center justify-center">
            {showAddTeam ? (
              <div className="p-4 w-full">
                <Input
                  placeholder="Team naam..."
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTeam()}
                  className="mb-2"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={addTeam} className="flex-1">
                    Toevoegen
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddTeam(false)}>
                    Annuleren
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddTeam(true)}
                className="text-gray-400 hover:text-gray-600 transition-colors flex flex-col items-center gap-2"
              >
                <Plus className="w-10 h-10" />
                <span className="text-sm font-medium">Team toevoegen</span>
              </button>
            )}
          </Card>
        </div>

        {/* Legend / Help */}
        <Card className="mt-6">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span className="font-medium">💡 Tip:</span>
              <span>Sleep werkblokken naar een team om toe te wijzen</span>
              <span>•</span>
              <span>Klik op een blok om naar het project te gaan</span>
              <span>•</span>
              <span>Teams worden lokaal opgeslagen</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
