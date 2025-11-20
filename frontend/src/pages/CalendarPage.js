import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';

// Custom CSS for better event display
const calendarStyles = `
  .rbc-event {
    padding: 2px 5px !important;
    border-radius: 4px !important;
    font-size: 11px !important;
    line-height: 1.3 !important;
  }
  
  .rbc-event:hover {
    opacity: 0.8 !important;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
  }
  
  .rbc-event-content {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .rbc-day-slot .rbc-event {
    border: none !important;
  }
  
  .rbc-selected {
    background-color: inherit !important;
  }
`;

// Configure moment for Dutch locale
moment.locale('nl', {
  months: 'januari_februari_maart_april_mei_juni_juli_augustus_september_oktober_november_december'.split('_'),
  monthsShort: 'jan_feb_mrt_apr_mei_jun_jul_aug_sep_okt_nov_dec'.split('_'),
  weekdays: 'zondag_maandag_dinsdag_woensdag_donderdag_vrijdag_zaterdag'.split('_'),
  weekdaysShort: 'zo_ma_di_wo_do_vr_za'.split('_'),
  weekdaysMin: 'Zo_Ma_Di_Wo_Do_Vr_Za'.split('_'),
});

const localizer = momentLocalizer(moment);

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/calendar/events`,
        { withCredentials: true }
      );
      
      // Transform events for react-big-calendar
      const calendarEvents = response.data.map(event => ({
        id: event.id,
        title: event.title,
        start: new Date(event.start),
        end: event.end ? new Date(event.end) : new Date(event.start),
        resource: event,
      }));
      
      setEvents(calendarEvents);
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Color palette for different projects
  const projectColors = [
    '#1E40AF', // Blue
    '#7C3AED', // Purple
    '#DC2626', // Red
    '#EA580C', // Orange
    '#CA8A04', // Yellow
    '#16A34A', // Green
    '#0891B2', // Cyan
    '#DB2777', // Pink
    '#9333EA', // Violet
    '#0D9488', // Teal
  ];

  // Get consistent color for each project
  const getProjectColor = (projectId, status) => {
    // Special colors for status
    if (status === 'voltooid') return '#10B981'; // Green for completed
    if (status === 'geannuleerd') return '#6B7280'; // Gray for cancelled
    
    // Hash project ID to get consistent color
    let hash = 0;
    for (let i = 0; i < projectId.length; i++) {
      hash = projectId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % projectColors.length;
    return projectColors[colorIndex];
  };

  const handleSelectEvent = (event) => {
    // Navigate to project detail page
    navigate(`/projects/${event.resource.project_id}`);
  };

  const eventStyleGetter = (event) => {
    const backgroundColor = getProjectColor(event.resource.project_id, event.resource.status);
    
    const style = {
      backgroundColor: backgroundColor,
      borderRadius: '6px',
      opacity: 0.9,
      color: 'white',
      border: '0px',
      display: 'block',
      fontSize: '12px',
      padding: '2px 6px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
    };
    
    return { style };
  };

  return (
    <DashboardLayout>
      <style>{calendarStyles}</style>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 sm:p-3 rounded-xl" style={{ backgroundColor: '#DBEAFE' }}>
              <CalendarIcon size={24} className="sm:w-7 sm:h-7" style={{ color: '#1E40AF' }} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1E3A8A' }}>
                Kalender
              </h1>
              <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
                Overzicht van alle geplande projecten
              </p>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin" size={32} style={{ color: '#1E40AF' }} />
            </div>
          ) : (
            <div style={{ height: '500px' }} className="sm:h-[600px] lg:h-[700px]">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                date={currentDate}
                onNavigate={(newDate) => setCurrentDate(newDate)}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventStyleGetter}
                views={['month', 'week', 'day', 'agenda']}
                defaultView="month"
                messages={{
                  today: 'Vandaag',
                  previous: 'Vorige',
                  next: 'Volgende',
                  month: 'Maand',
                  week: 'Week',
                  day: 'Dag',
                  agenda: 'Agenda',
                  date: 'Datum',
                  time: 'Tijd',
                  event: 'Project',
                  noEventsInRange: 'Geen projecten in deze periode.',
                  showMore: (total) => `+ ${total} meer`,
                }}
              />
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold mb-3" style={{ color: '#1E3A8A' }}>Legenda & Info</h3>
          <div className="space-y-4">
            {/* Status Colors */}
            <div>
              <h4 className="text-sm font-medium mb-2" style={{ color: '#64748B' }}>Status</h4>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }}></div>
                  <span className="text-sm" style={{ color: '#64748B' }}>Voltooid</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#6B7280' }}></div>
                  <span className="text-sm" style={{ color: '#64748B' }}>Geannuleerd</span>
                </div>
              </div>
            </div>
            
            {/* Project Colors Info */}
            <div>
              <h4 className="text-sm font-medium mb-2" style={{ color: '#64748B' }}>Projecten</h4>
              <div className="flex flex-wrap gap-2">
                {projectColors.map((color, idx) => (
                  <div key={idx} className="w-6 h-6 rounded shadow-sm" style={{ backgroundColor: color }}></div>
                ))}
              </div>
              <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>
                Elk actief project krijgt automatisch een unieke kleur. Overlappende projecten zijn zo makkelijk te onderscheiden.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
