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
  X,
  GripVertical
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

// Team colors
const TEAM_COLORS = {
  'Team 1': { bg: 'bg-orange-500', light: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-700' },
  'Team 2': { bg: 'bg-green-500', light: 'bg-green-100', border: 'border-green-300', text: 'text-green-700' },
  'Team 3': { bg: 'bg-blue-500', light: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700' },
  'default': { bg: 'bg-purple-500', light: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-700' },
};

const getTeamColor = (teamName) => {
  return TEAM_COLORS[teamName] || TEAM_COLORS['default'];
};

// Format date
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

// Format date for input
const formatDateForInput = (date) => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

// View modes
const VIEW_MODES = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  QUARTER: 'quarter',
  YEAR: 'year'
};

// Get dates for different view modes
const getDatesForView = (date, viewMode) => {
  const dates = [];
  const d = new Date(date);
  
  switch (viewMode) {
    case VIEW_MODES.DAY:
      dates.push(new Date(d));
      break;
    case VIEW_MODES.WEEK:
      d.setDate(d.getDate() - d.getDay() + 1); // Monday
      for (let i = 0; i < 7; i++) {
        const newD = new Date(d);
        newD.setDate(d.getDate() + i);
        dates.push(newD);
      }
      break;
    case VIEW_MODES.MONTH:
      d.setDate(1);
      const month = d.getMonth();
      while (d.getMonth() === month) {
        dates.push(new Date(d));
        d.setDate(d.getDate() + 1);
      }
      break;
    case VIEW_MODES.QUARTER:
      const quarterStart = Math.floor(d.getMonth() / 3) * 3;
      d.setMonth(quarterStart, 1);
      const quarterEnd = quarterStart + 3;
      while (d.getMonth() < quarterEnd && d.getMonth() >= quarterStart) {
        dates.push(new Date(d));
        d.setDate(d.getDate() + 1);
      }
      break;
    case VIEW_MODES.YEAR:
      d.setMonth(0, 1);
      const year = d.getFullYear();
      while (d.getFullYear() === year) {
        dates.push(new Date(d));
        d.setDate(d.getDate() + 1);
      }
      break;
    default:
      d.setDate(d.getDate() - d.getDay() + 1);
      for (let i = 0; i < 7; i++) {
        const newD = new Date(d);
        newD.setDate(d.getDate() + i);
        dates.push(newD);
      }
  }
  return dates;
};

// Get month data for month/quarter/year views
const getMonthsData = (date, viewMode) => {
  const months = [];
  const d = new Date(date);
  
  if (viewMode === VIEW_MODES.MONTH) {
    d.setDate(1);
    const weeks = [];
    const month = d.getMonth();
    // Get the first day of the week containing the 1st of the month
    const firstDay = new Date(d);
    firstDay.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7));
    
    let currentWeek = [];
    const tempD = new Date(firstDay);
    while (tempD.getMonth() === month || currentWeek.length > 0) {
      currentWeek.push(new Date(tempD));
      if (currentWeek.length === 7) {
        if (currentWeek.some(wd => wd.getMonth() === month)) {
          weeks.push([...currentWeek]);
        }
        currentWeek = [];
      }
      tempD.setDate(tempD.getDate() + 1);
      if (tempD.getMonth() !== month && currentWeek.length === 0) break;
    }
    months.push({ month: d.getMonth(), year: d.getFullYear(), weeks });
  } else if (viewMode === VIEW_MODES.QUARTER) {
    const quarterStart = Math.floor(d.getMonth() / 3) * 3;
    for (let m = quarterStart; m < quarterStart + 3; m++) {
      const monthDate = new Date(d.getFullYear(), m, 1);
      const weeks = [];
      const firstDay = new Date(monthDate);
      firstDay.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7));
      
      let currentWeek = [];
      const tempD = new Date(firstDay);
      while (tempD.getMonth() === m || currentWeek.length > 0) {
        currentWeek.push(new Date(tempD));
        if (currentWeek.length === 7) {
          if (currentWeek.some(wd => wd.getMonth() === m)) {
            weeks.push([...currentWeek]);
          }
          currentWeek = [];
        }
        tempD.setDate(tempD.getDate() + 1);
        if (tempD.getMonth() !== m && currentWeek.length === 0) break;
      }
      months.push({ month: m, year: d.getFullYear(), weeks });
    }
  } else if (viewMode === VIEW_MODES.YEAR) {
    for (let m = 0; m < 12; m++) {
      const monthDate = new Date(d.getFullYear(), m, 1);
      const weeks = [];
      const firstDay = new Date(monthDate);
      firstDay.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7));
      
      let currentWeek = [];
      const tempD = new Date(firstDay);
      while (tempD.getMonth() === m || currentWeek.length > 0) {
        currentWeek.push(new Date(tempD));
        if (currentWeek.length === 7) {
          if (currentWeek.some(wd => wd.getMonth() === m)) {
            weeks.push([...currentWeek]);
          }
          currentWeek = [];
        }
        tempD.setDate(tempD.getDate() + 1);
        if (tempD.getMonth() !== m && currentWeek.length === 0) break;
      }
      months.push({ month: m, year: d.getFullYear(), weeks });
    }
  }
  return months;
};

export default function CalendarPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState(VIEW_MODES.WEEK);
  const [teams, setTeams] = useState(['Team 1', 'Team 2', 'Team 3']);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const navigate = useNavigate();

  const viewDates = useMemo(() => getDatesForView(currentDate, viewMode), [currentDate, viewMode]);
  const monthsData = useMemo(() => getMonthsData(currentDate, viewMode), [currentDate, viewMode]);
  // Keep weekDates for backwards compatibility
  const weekDates = useMemo(() => getDatesForView(currentDate, VIEW_MODES.WEEK), [currentDate]);

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
      const leadsResponse = await axios.get(`${API}/leads`, { withCredentials: true });
      const leadsMap = {};
      leadsResponse.data.forEach(lead => {
        leadsMap[lead.id] = lead;
      });
      
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
    if (!window.confirm(`Weet u zeker dat u "${teamName}" wilt verwijderen? Toegewezen werk wordt niet-toegewezen.`)) return;
    
    // Unassign all work from this team
    projects.forEach(async (project) => {
      const hasTeamWork = project.scheduled_days?.some(p => p.team_name === teamName);
      if (hasTeamWork) {
        const updatedScheduledDays = project.scheduled_days.map(p => 
          p.team_name === teamName ? { ...p, team_name: null } : p
        );
        await updateScheduledWork(project.id, updatedScheduledDays, false);
      }
    });
    
    const newTeams = teams.filter(t => t !== teamName);
    saveTeams(newTeams);
    toast.success(`Team "${teamName}" verwijderd`);
    fetchProjects();
  };

  const updateScheduledWork = async (projectId, updatedScheduledDays, showToast = true) => {
    try {
      await axios.put(
        `${API}/projects/${projectId}`,
        { scheduled_days: updatedScheduledDays },
        { withCredentials: true }
      );
      if (showToast) {
        fetchProjects();
      }
    } catch (error) {
      console.error('Failed to update schedule:', error);
      toast.error('Kon planning niet bijwerken');
    }
  };

  // Drag handlers for team assignment
  const handleDragStart = (e, project, period) => {
    setDraggedItem({ project, period });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnTeam = async (e, targetTeam) => {
    e.preventDefault();
    if (!draggedItem) return;

    const { project, period } = draggedItem;
    
    const updatedScheduledDays = project.scheduled_days.map(p => 
      p.id === period.id ? { ...p, team_name: targetTeam } : p
    );

    await updateScheduledWork(project.id, updatedScheduledDays);
    setDraggedItem(null);
    toast.success(`Werk toegewezen aan ${targetTeam}`);
    fetchProjects();
  };

  // Drag handlers for date adjustment in calendar
  const handleDropOnDate = async (e, targetDate) => {
    e.preventDefault();
    if (!draggedItem) return;

    const { project, period } = draggedItem;
    
    // Calculate the difference in days
    const oldStart = new Date(period.start_date);
    const newStart = new Date(targetDate);
    const diffDays = Math.round((newStart - oldStart) / (1000 * 60 * 60 * 24));
    
    // Calculate new end date
    const oldEnd = new Date(period.end_date);
    const newEnd = new Date(oldEnd);
    newEnd.setDate(newEnd.getDate() + diffDays);
    
    const updatedScheduledDays = project.scheduled_days.map(p => 
      p.id === period.id 
        ? { 
            ...p, 
            start_date: formatDateForInput(newStart),
            end_date: formatDateForInput(newEnd)
          } 
        : p
    );

    await updateScheduledWork(project.id, updatedScheduledDays);
    setDraggedItem(null);
    setDragOverDate(null);
    toast.success(`Planning aangepast naar ${formatDate(newStart)} - ${formatDate(newEnd)}`);
    fetchProjects();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragOverDate = (e, date) => {
    e.preventDefault();
    setDragOverDate(formatDateForInput(date));
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  // Get ALL work for a team (not filtered by week)
  const getWorkByTeam = (teamName) => {
    const work = [];
    projects.forEach(project => {
      (project.scheduled_days || []).forEach(period => {
        if (period.team_name === teamName) {
          work.push({
            ...period,
            project,
            projectName: project.name,
            address: project.lead?.address || ''
          });
        }
      });
    });
    return work.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  };

  // Get work for calendar view (current view dates)
  const getWorkForView = () => {
    const work = [];
    if (viewDates.length === 0) return work;
    
    const viewStart = viewDates[0];
    const viewEnd = viewDates[viewDates.length - 1];
    
    projects.forEach(project => {
      (project.scheduled_days || []).forEach(period => {
        if (period.team_name) {
          const periodStart = new Date(period.start_date);
          const periodEnd = new Date(period.end_date);
          
          if (periodEnd >= viewStart && periodStart <= viewEnd) {
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
    return work;
  };

  // Legacy function kept for compatibility
  const getWorkForWeek = () => getWorkForView();

  // Get unassigned work
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

  const prevPeriod = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case VIEW_MODES.DAY:
        newDate.setDate(newDate.getDate() - 1);
        break;
      case VIEW_MODES.WEEK:
        newDate.setDate(newDate.getDate() - 7);
        break;
      case VIEW_MODES.MONTH:
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case VIEW_MODES.QUARTER:
        newDate.setMonth(newDate.getMonth() - 3);
        break;
      case VIEW_MODES.YEAR:
        newDate.setFullYear(newDate.getFullYear() - 1);
        break;
      default:
        newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const nextPeriod = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case VIEW_MODES.DAY:
        newDate.setDate(newDate.getDate() + 1);
        break;
      case VIEW_MODES.WEEK:
        newDate.setDate(newDate.getDate() + 7);
        break;
      case VIEW_MODES.MONTH:
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case VIEW_MODES.QUARTER:
        newDate.setMonth(newDate.getMonth() + 3);
        break;
      case VIEW_MODES.YEAR:
        newDate.setFullYear(newDate.getFullYear() + 1);
        break;
      default:
        newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  // Navigate to week containing a date
  const goToDate = (dateStr) => {
    const date = new Date(dateStr);
    setCurrentWeek(date);
  };

  const getWeekLabel = () => {
    const start = weekDates[0];
    const end = weekDates[6];
    return `${start.getDate()} ${start.toLocaleDateString('nl-BE', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('nl-BE', { month: 'short', year: 'numeric' })}`;
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
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
  const weekWork = getWorkForWeek();

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="w-7 h-7 text-blue-600" />
              Team Planning
            </h1>
            <p className="text-gray-500 text-sm mt-1">Sleep werk naar teams en pas datums aan in de agenda</p>
          </div>
        </div>

        {/* Unassigned Work */}
        {unassignedWork.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2 text-orange-700">
                <Clock className="w-5 h-5" />
                Niet toegewezen ({unassignedWork.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="flex flex-wrap gap-2">
                {unassignedWork.map((item, idx) => (
                  <div
                    key={idx}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.project, item)}
                    className="bg-white border border-orange-300 rounded-lg p-2 cursor-grab hover:shadow-md transition-shadow active:cursor-grabbing"
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-sm">{item.projectName}</p>
                        <p className="text-xs text-blue-600">{item.description}</p>
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
                className={`${teamColor.light} border-2 ${teamColor.border} min-h-[200px]`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnTeam(e, teamName)}
              >
                <CardHeader className={`${teamColor.bg} text-white py-2 rounded-t-lg`}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {teamName}
                    </CardTitle>
                    <button onClick={() => removeTeam(teamName)} className="text-white/70 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="p-2 space-y-2 max-h-[300px] overflow-y-auto">
                  {teamWork.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-xs">
                      <Users className="w-6 h-6 mx-auto mb-1 opacity-50" />
                      Sleep werk hierheen
                    </div>
                  ) : (
                    teamWork.map((item, idx) => (
                      <div
                        key={idx}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.project, item)}
                        className="bg-white rounded-lg p-2 shadow-sm border cursor-grab hover:shadow-md transition-all active:cursor-grabbing"
                      >
                        <p className="font-semibold text-xs text-gray-800 truncate">{item.projectName}</p>
                        {item.description && (
                          <p className="text-xs text-blue-600 font-medium truncate">{item.description}</p>
                        )}
                        {item.address && (
                          <p className="text-[10px] text-gray-500 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {item.address}
                          </p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1">
                          📅 {formatDate(item.start_date)} → {formatDate(item.end_date)}
                        </p>
                        <button 
                          onClick={() => goToDate(item.start_date)}
                          className="text-[10px] text-blue-500 hover:underline mt-1"
                        >
                          Toon in agenda ↓
                        </button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Add Team */}
          <Card className="border-2 border-dashed border-gray-300 bg-gray-50 min-h-[200px] flex items-center justify-center">
            {showAddTeam ? (
              <div className="p-3 w-full">
                <Input
                  placeholder="Team naam..."
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTeam()}
                  className="mb-2 text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={addTeam} className="flex-1 text-xs">Toevoegen</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddTeam(false)} className="text-xs">Annuleer</Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddTeam(true)}
                className="text-gray-400 hover:text-gray-600 transition-colors flex flex-col items-center gap-1"
              >
                <Plus className="w-8 h-8" />
                <span className="text-xs font-medium">Team toevoegen</span>
              </button>
            )}
          </Card>
        </div>

        {/* Calendar Agenda */}
        <Card>
          <CardHeader className="py-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Weekagenda
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={prevWeek}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToToday} className="text-xs px-3">
                  Vandaag
                </Button>
                <span className="text-sm font-medium min-w-[180px] text-center">{getWeekLabel()}</span>
                <Button variant="outline" size="sm" onClick={nextWeek}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Calendar Header */}
            <div className="grid grid-cols-7 border-b bg-gray-50">
              {weekDates.map((date, idx) => (
                <div 
                  key={idx} 
                  className={`p-2 text-center border-r last:border-r-0 ${isToday(date) ? 'bg-blue-100' : ''}`}
                >
                  <p className="text-xs text-gray-500">
                    {date.toLocaleDateString('nl-BE', { weekday: 'short' })}
                  </p>
                  <p className={`text-lg font-bold ${isToday(date) ? 'text-blue-600' : 'text-gray-800'}`}>
                    {date.getDate()}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {date.toLocaleDateString('nl-BE', { month: 'short' })}
                  </p>
                </div>
              ))}
            </div>

            {/* Calendar Body - Drop zones */}
            <div className="grid grid-cols-7 min-h-[200px]">
              {weekDates.map((date, idx) => {
                const dateStr = formatDateForInput(date);
                const isDropTarget = dragOverDate === dateStr;
                
                return (
                  <div 
                    key={idx}
                    className={`border-r last:border-r-0 p-1 min-h-[200px] transition-colors ${
                      isDropTarget ? 'bg-blue-100' : isToday(date) ? 'bg-blue-50/50' : 'bg-white'
                    }`}
                    onDragOver={(e) => handleDragOverDate(e, date)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDropOnDate(e, date)}
                  >
                    {/* Work blocks for this day */}
                    {weekWork
                      .filter(item => isDateInRange(date, item.start_date, item.end_date))
                      .map((item, workIdx) => {
                        const teamColor = getTeamColor(item.team_name);
                        const isStart = formatDateForInput(new Date(item.start_date)) === dateStr;
                        
                        return (
                          <div
                            key={workIdx}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item.project, item)}
                            onClick={() => navigate(`/projects/${item.project.id}`)}
                            className={`${teamColor.bg} text-white text-[10px] p-1 mb-1 rounded cursor-grab hover:opacity-90 active:cursor-grabbing ${
                              isStart ? 'rounded-l-lg' : ''
                            }`}
                            title={`${item.projectName} - ${item.description}\n${item.address}\n${formatDate(item.start_date)} - ${formatDate(item.end_date)}\nSleep om datum aan te passen`}
                          >
                            <p className="font-semibold truncate">{item.projectName}</p>
                            {isStart && item.description && (
                              <p className="truncate opacity-90">{item.description}</p>
                            )}
                          </div>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Help */}
        <Card className="bg-gray-50">
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
              <span className="font-medium">💡 Tips:</span>
              <span>• Sleep werk naar een team om toe te wijzen</span>
              <span>• Sleep blokken in de agenda om datums aan te passen</span>
              <span>• Klik op een blok om naar het project te gaan</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
