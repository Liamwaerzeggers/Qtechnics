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

// Color palette for teams - each new team gets a different color based on index
const COLOR_PALETTE = [
  { bg: 'bg-orange-500', light: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-700' },
  { bg: 'bg-green-500', light: 'bg-green-100', border: 'border-green-300', text: 'text-green-700' },
  { bg: 'bg-blue-500', light: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700' },
  { bg: 'bg-purple-500', light: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-700' },
  { bg: 'bg-pink-500', light: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-700' },
  { bg: 'bg-cyan-500', light: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-700' },
  { bg: 'bg-amber-500', light: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700' },
  { bg: 'bg-teal-500', light: 'bg-teal-100', border: 'border-teal-300', text: 'text-teal-700' },
  { bg: 'bg-indigo-500', light: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-700' },
  { bg: 'bg-rose-500', light: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-700' },
  { bg: 'bg-lime-500', light: 'bg-lime-100', border: 'border-lime-300', text: 'text-lime-700' },
  { bg: 'bg-sky-500', light: 'bg-sky-100', border: 'border-sky-300', text: 'text-sky-700' },
];

// Get team color based on index in the teams array
const getTeamColorByIndex = (index) => {
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
};

// Create a function to get team color by name using the teams array
const createGetTeamColor = (teams) => (teamName) => {
  const index = teams.indexOf(teamName);
  if (index === -1) {
    // If team not found, use hash of team name for consistent color
    const hash = teamName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return COLOR_PALETTE[hash % COLOR_PALETTE.length];
  }
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
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
  
  const buildMonthWeeks = (year, monthIndex) => {
    const weeks = [];
    const firstOfMonth = new Date(year, monthIndex, 1);
    // Get the first Monday of the calendar grid (may be in previous month)
    const firstDay = new Date(firstOfMonth);
    const dayOfWeek = firstDay.getDay();
    // Adjust to Monday (day 1), Sunday becomes 6 days back
    const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    firstDay.setDate(firstDay.getDate() - daysBack);
    
    // Build 6 weeks of days
    let currentWeek = [];
    const tempD = new Date(firstDay);
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      currentWeek.push(new Date(tempD));
      if (currentWeek.length === 7) {
        // Only include week if at least one day is in the target month
        if (currentWeek.some(wd => wd.getMonth() === monthIndex)) {
          weeks.push([...currentWeek]);
        }
        currentWeek = [];
      }
      tempD.setDate(tempD.getDate() + 1);
    }
    return weeks;
  };
  
  if (viewMode === VIEW_MODES.MONTH) {
    const weeks = buildMonthWeeks(d.getFullYear(), d.getMonth());
    months.push({ month: d.getMonth(), year: d.getFullYear(), weeks });
  } else if (viewMode === VIEW_MODES.QUARTER) {
    const quarterStart = Math.floor(d.getMonth() / 3) * 3;
    for (let m = quarterStart; m < quarterStart + 3; m++) {
      const weeks = buildMonthWeeks(d.getFullYear(), m);
      months.push({ month: m, year: d.getFullYear(), weeks });
    }
  } else if (viewMode === VIEW_MODES.YEAR) {
    for (let m = 0; m < 12; m++) {
      const weeks = buildMonthWeeks(d.getFullYear(), m);
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

  // Create getTeamColor function that uses current teams array
  const getTeamColor = useMemo(() => createGetTeamColor(teams), [teams]);

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

  // Navigate to period containing a date
  const goToDate = (dateStr) => {
    const date = new Date(dateStr);
    setCurrentDate(date);
  };

  const getViewLabel = () => {
    const d = new Date(currentDate);
    switch (viewMode) {
      case VIEW_MODES.DAY:
        return d.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      case VIEW_MODES.WEEK:
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay() + 1);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.getDate()} ${weekStart.toLocaleDateString('nl-BE', { month: 'short' })} - ${weekEnd.getDate()} ${weekEnd.toLocaleDateString('nl-BE', { month: 'short', year: 'numeric' })}`;
      case VIEW_MODES.MONTH:
        return d.toLocaleDateString('nl-BE', { month: 'long', year: 'numeric' });
      case VIEW_MODES.QUARTER:
        const quarter = Math.floor(d.getMonth() / 3) + 1;
        return `Q${quarter} ${d.getFullYear()}`;
      case VIEW_MODES.YEAR:
        return d.getFullYear().toString();
      default:
        return '';
    }
  };

  const getWeekLabel = getViewLabel;

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
  const viewWork = getWorkForView();

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
          {teams.map((teamName, teamIndex) => {
            const teamColor = getTeamColorByIndex(teamIndex);
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
                Agenda
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {/* View Mode Selector */}
                <div className="flex rounded-lg border overflow-hidden">
                  {[
                    { mode: VIEW_MODES.DAY, label: 'Dag' },
                    { mode: VIEW_MODES.WEEK, label: 'Week' },
                    { mode: VIEW_MODES.MONTH, label: 'Maand' },
                    { mode: VIEW_MODES.QUARTER, label: 'Kwartaal' },
                    { mode: VIEW_MODES.YEAR, label: 'Jaar' }
                  ].map(({ mode, label }) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-2 sm:px-3 py-1 text-xs font-medium transition-colors ${
                        viewMode === mode 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {/* Navigation */}
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={prevPeriod}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToToday} className="text-xs px-2">
                    Vandaag
                  </Button>
                  <Button variant="outline" size="sm" onClick={nextPeriod}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <span className="text-sm font-medium min-w-[120px] text-center">{getViewLabel()}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Day View */}
            {viewMode === VIEW_MODES.DAY && (
              <div className="min-h-[300px]">
                <div className={`p-3 text-center border-b ${isToday(viewDates[0]) ? 'bg-blue-100' : 'bg-gray-50'}`}>
                  <p className="text-sm text-gray-500">
                    {viewDates[0].toLocaleDateString('nl-BE', { weekday: 'long' })}
                  </p>
                  <p className={`text-2xl font-bold ${isToday(viewDates[0]) ? 'text-blue-600' : 'text-gray-800'}`}>
                    {viewDates[0].getDate()}
                  </p>
                  <p className="text-sm text-gray-400">
                    {viewDates[0].toLocaleDateString('nl-BE', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div 
                  className={`p-3 min-h-[200px] ${dragOverDate === formatDateForInput(viewDates[0]) ? 'bg-blue-100' : ''}`}
                  onDragOver={(e) => handleDragOverDate(e, viewDates[0])}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDropOnDate(e, viewDates[0])}
                >
                  {getWorkForView()
                    .filter(item => isDateInRange(viewDates[0], item.start_date, item.end_date))
                    .map((item, idx) => {
                      const teamColor = getTeamColor(item.team_name);
                      return (
                        <div
                          key={idx}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item.project, item)}
                          onClick={() => navigate(`/projects/${item.project.id}`)}
                          className={`${teamColor.bg} text-white p-3 mb-2 rounded-lg cursor-grab hover:opacity-90`}
                        >
                          <p className="font-semibold">{item.projectName}</p>
                          {item.description && <p className="text-sm opacity-90">{item.description}</p>}
                          {item.address && <p className="text-xs opacity-75 flex items-center gap-1"><MapPin className="w-3 h-3" />{item.address}</p>}
                          <p className="text-xs opacity-75 mt-1">{formatDate(item.start_date)} - {formatDate(item.end_date)}</p>
                        </div>
                      );
                    })}
                  {getWorkForView().filter(item => isDateInRange(viewDates[0], item.start_date, item.end_date)).length === 0 && (
                    <p className="text-center text-gray-400 py-8">Geen werk gepland voor deze dag</p>
                  )}
                </div>
              </div>
            )}

            {/* Week View */}
            {viewMode === VIEW_MODES.WEEK && (
              <>
                <div className="grid grid-cols-7 border-b bg-gray-50">
                  {viewDates.map((date, idx) => (
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
                <div className="grid grid-cols-7 min-h-[200px]">
                  {viewDates.map((date, idx) => {
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
                        {getWorkForView()
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
                                title={`${item.projectName} - ${item.description}\n${item.address}\n${formatDate(item.start_date)} - ${formatDate(item.end_date)}`}
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
              </>
            )}

            {/* Month View */}
            {viewMode === VIEW_MODES.MONTH && monthsData.length > 0 && (
              <div className="p-2">
                <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
                  {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((day) => (
                    <div key={day} className="bg-gray-50 p-2 text-center text-xs font-semibold text-gray-600">
                      {day}
                    </div>
                  ))}
                  {monthsData[0].weeks.flat().map((date, idx) => {
                    const dateStr = formatDateForInput(date);
                    const isCurrentMonth = date.getMonth() === monthsData[0].month;
                    const isDropTarget = dragOverDate === dateStr;
                    const dayWork = getWorkForView().filter(item => isDateInRange(date, item.start_date, item.end_date));
                    
                    return (
                      <div
                        key={idx}
                        className={`min-h-[80px] p-1 transition-colors ${
                          isDropTarget ? 'bg-blue-100' : isToday(date) ? 'bg-blue-50' : isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                        }`}
                        onDragOver={(e) => handleDragOverDate(e, date)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDropOnDate(e, date)}
                      >
                        <p className={`text-xs font-medium ${isToday(date) ? 'text-blue-600' : isCurrentMonth ? 'text-gray-800' : 'text-gray-400'}`}>
                          {date.getDate()}
                        </p>
                        <div className="space-y-px mt-1">
                          {dayWork.slice(0, 3).map((item, workIdx) => {
                            const teamColor = getTeamColor(item.team_name);
                            return (
                              <div
                                key={workIdx}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item.project, item)}
                                onClick={() => navigate(`/projects/${item.project.id}`)}
                                className={`${teamColor.bg} text-white text-[8px] px-1 rounded truncate cursor-pointer hover:opacity-90`}
                                title={`${item.projectName} - ${item.description}`}
                              >
                                {item.projectName}
                              </div>
                            );
                          })}
                          {dayWork.length > 3 && (
                            <p className="text-[8px] text-gray-500">+{dayWork.length - 3} meer</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quarter View */}
            {viewMode === VIEW_MODES.QUARTER && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                {monthsData.map((monthData, mIdx) => (
                  <div key={mIdx} className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-100 p-2 text-center font-semibold text-sm">
                      {new Date(monthData.year, monthData.month).toLocaleDateString('nl-BE', { month: 'long' })}
                    </div>
                    <div className="grid grid-cols-7 gap-px bg-gray-200">
                      {['M', 'D', 'W', 'D', 'V', 'Z', 'Z'].map((day, i) => (
                        <div key={i} className="bg-gray-50 p-1 text-center text-[10px] text-gray-500">{day}</div>
                      ))}
                      {monthData.weeks.flat().map((date, idx) => {
                        const isCurrentMonth = date.getMonth() === monthData.month;
                        const dayWork = getWorkForView().filter(item => isDateInRange(date, item.start_date, item.end_date));
                        const hasWork = dayWork.length > 0;
                        const teamColor = hasWork ? getTeamColor(dayWork[0].team_name) : null;
                        
                        return (
                          <div
                            key={idx}
                            onClick={() => hasWork && navigate(`/projects/${dayWork[0].project.id}`)}
                            className={`p-1 text-center text-[10px] ${
                              isToday(date) ? 'bg-blue-100 font-bold' : isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'
                            } ${hasWork ? `${teamColor.light} cursor-pointer hover:opacity-80` : ''}`}
                            title={hasWork ? dayWork.map(w => w.projectName).join(', ') : ''}
                          >
                            {date.getDate()}
                            {hasWork && <div className={`w-1 h-1 ${teamColor.bg} rounded-full mx-auto mt-px`}></div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Year View */}
            {viewMode === VIEW_MODES.YEAR && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
                {monthsData.map((monthData, mIdx) => (
                  <div 
                    key={mIdx} 
                    className="border rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setCurrentDate(new Date(monthData.year, monthData.month, 1));
                      setViewMode(VIEW_MODES.MONTH);
                    }}
                  >
                    <div className="bg-gray-100 p-1 text-center font-semibold text-xs">
                      {new Date(monthData.year, monthData.month).toLocaleDateString('nl-BE', { month: 'short' })}
                    </div>
                    <div className="grid grid-cols-7 gap-px text-[8px] p-1">
                      {monthData.weeks.flat().slice(0, 35).map((date, idx) => {
                        const isCurrentMonth = date.getMonth() === monthData.month;
                        const dayWork = getWorkForView().filter(item => isDateInRange(date, item.start_date, item.end_date));
                        const hasWork = dayWork.length > 0;
                        const teamColor = hasWork ? getTeamColor(dayWork[0].team_name) : null;
                        
                        return (
                          <div
                            key={idx}
                            className={`w-4 h-4 flex items-center justify-center rounded-sm ${
                              isToday(date) ? 'bg-blue-600 text-white' : 
                              hasWork ? teamColor.bg + ' text-white' : 
                              isCurrentMonth ? '' : 'text-gray-300'
                            }`}
                          >
                            {date.getDate()}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
