import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';

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

  const handleSelectEvent = (event) => {
    // Navigate to project detail page
    navigate(`/projects/${event.resource.project_id}`);
  };

  const eventStyleGetter = (event) => {
    const style = {
      backgroundColor: '#1E40AF',
      borderRadius: '6px',
      opacity: 0.8,
      color: 'white',
      border: '0px',
      display: 'block',
      fontSize: '13px',
      padding: '4px 8px',
    };
    
    // Different color for completed projects
    if (event.resource.status === 'voltooid') {
      style.backgroundColor = '#10B981';
    } else if (event.resource.status === 'geannuleerd') {
      style.backgroundColor = '#6B7280';
    }
    
    return { style };
  };

  return (
    <DashboardLayout>
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
          <h3 className="font-semibold mb-3" style={{ color: '#1E3A8A' }}>Legenda</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#1E40AF' }}></div>
              <span style={{ color: '#64748B' }}>Actief</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }}></div>
              <span style={{ color: '#64748B' }}>Voltooid</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#6B7280' }}></div>
              <span style={{ color: '#64748B' }}>Geannuleerd</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
