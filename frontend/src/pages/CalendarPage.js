import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import { Calendar as CalendarIcon, Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
  const [selectedEvent, setSelectedEvent] = useState(null);
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

  // Get project color (use custom color or status-based)
  const getProjectColor = (event) => {
    const type = event.resource.type;
    const status = event.resource.status;
    const customColor = event.resource.color;
    
    // Scheduled work gets its own color
    if (type === 'scheduled_work') {
      return '#F59E0B'; // Orange for scheduled work
    }
    
    // Special colors for status
    if (status === 'voltooid') return '#10B981'; // Green for completed
    if (status === 'geannuleerd') return '#6B7280'; // Gray for cancelled
    
    // Use custom project color
    return customColor || '#1E40AF'; // Default blue
  };

  const handleSelectEvent = (event) => {
    // Show popup with scheduled work details if project has them
    if (event.resource.type === 'project' && event.resource.scheduled_work?.length > 0) {
      setSelectedEvent(event);
    } else if (event.resource.type === 'workslip') {
      navigate(`/projects/${event.resource.project_id}/work-slips`);
    } else {
      navigate(`/projects/${event.resource.project_id}`);
    }
  };

  const handleNavigateToProject = () => {
    if (selectedEvent) {
      navigate(`/projects/${selectedEvent.resource.project_id}`);
      setSelectedEvent(null);
    }
  };

  const eventStyleGetter = (event) => {
    const backgroundColor = getProjectColor(event);
    const isWorkSlip = event.resource.type === 'workslip';
    const isScheduledWork = event.resource.type === 'scheduled_work';
    
    const style = {
      backgroundColor: backgroundColor,
      borderRadius: '6px',
      opacity: isWorkSlip ? 0.85 : isScheduledWork ? 0.95 : 0.9,
      color: 'white',
      border: isWorkSlip ? '2px solid rgba(255,255,255,0.5)' : isScheduledWork ? '2px dashed rgba(255,255,255,0.7)' : '0px',
      display: 'block',
      fontSize: isScheduledWork ? '10px' : '12px',
      padding: '2px 6px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      boxShadow: isWorkSlip ? '0 2px 4px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.12)',
      marginLeft: isScheduledWork ? '10px' : '0px', // Indent scheduled work
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
            {/* Event Types */}
            <div>
              <h4 className="text-sm font-medium mb-2" style={{ color: '#64748B' }}>Event Types</h4>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#1E40AF' }}></div>
                  <span className="text-sm" style={{ color: '#64748B' }}>Project periode</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded border-2 border-dashed" style={{ backgroundColor: '#F59E0B', borderColor: 'white' }}></div>
                  <span className="text-sm" style={{ color: '#64748B' }}>🔧 Gepland werk</span>
                </div>
              </div>
            </div>
            
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
              <h4 className="text-sm font-medium mb-2" style={{ color: '#64748B' }}>Geplande Werken</h4>
              <p className="text-xs" style={{ color: '#94A3B8' }}>
                Klik op een project met 🔧 om de geplande werkperiodes te zien. Elk project kan een eigen kleur krijgen via de project detail pagina.
              </p>
            </div>
          </div>
        </div>

        {/* Scheduled Work Popup Dialog */}
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2" style={{color: '#1E40AF'}}>
                📅 {selectedEvent?.title?.replace(/\s*\(\d+\s*🔧\)$/, '')}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Project Period */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium" style={{color: '#1E40AF'}}>Projectperiode</p>
                <p className="text-sm" style={{color: '#64748B'}}>
                  {selectedEvent?.start?.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  {' '} t/m {' '}
                  {selectedEvent?.end?.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* Scheduled Work Periods */}
              <div>
                <h4 className="font-semibold mb-3" style={{color: '#1E293B'}}>
                  🔧 Geplande Werken ({selectedEvent?.resource?.scheduled_work?.length || 0})
                </h4>
                <div className="space-y-2">
                  {selectedEvent?.resource?.scheduled_work?.map((work, index) => (
                    <div key={index} className="p-3 rounded-lg border" style={{backgroundColor: '#FEF3C7', borderColor: '#F59E0B'}}>
                      <div className="font-medium" style={{color: '#92400E'}}>{work.description}</div>
                      <div className="text-sm mt-1" style={{color: '#78716C'}}>
                        {new Date(work.start).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {' '} t/m {' '}
                        {new Date(work.end).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                  Sluiten
                </Button>
                <Button onClick={handleNavigateToProject} style={{backgroundColor: '#1E40AF'}}>
                  Naar Project
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
