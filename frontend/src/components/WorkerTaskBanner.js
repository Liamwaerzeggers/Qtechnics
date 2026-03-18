import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, ChevronDown, ChevronUp, ClipboardList, PartyPopper, ExternalLink, Clock, User, Building } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Encouraging messages for completing tasks
const COMPLETION_MESSAGES = [
  "Goed gedaan! 💪",
  "Top werk! ⭐",
  "Lekker bezig! 🔥",
  "Weer eentje afgevinkt! ✅",
  "Geweldig! Blijf zo doorgaan! 🚀",
  "Mooi! Op naar de volgende! 🎯",
  "Yes! Taak voltooid! 🎉",
  "Sterk werk! 💯"
];

export default function WorkerTaskBanner({ user }) {
  const [tasks, setTasks] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const isWorker = user?.role === 'worker';
  
  useEffect(() => {
    if (user) {
      fetchTasks();
      // Poll every 30 seconds for new tasks
      const interval = setInterval(fetchTasks, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);
  
  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API}/worker-tasks/pending`, {
        headers: getAuthHeaders()
      });
      
      const newTasks = response.data || [];
      
      // Show toast for new tasks
      if (tasks.length > 0 && newTasks.length > tasks.length) {
        const diff = newTasks.length - tasks.length;
        toast.info(`🔔 ${diff} nieuwe ta${diff > 1 ? 'ken' : 'ak'} toegewezen!`, {
          duration: 5000
        });
      }
      
      setTasks(newTasks);
    } catch (error) {
      console.error('Error fetching worker tasks:', error);
    }
  };
  
  const completeTask = async (taskId) => {
    try {
      await axios.put(`${API}/worker-tasks/${taskId}/complete`, {}, {
        headers: getAuthHeaders()
      });
      
      // Trigger confetti celebration
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.2 },
        colors: ['#22c55e', '#16a34a', '#4ade80', '#86efac', '#fbbf24']
      });
      
      // Show random encouraging message
      const randomMessage = COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)];
      toast.success(randomMessage, {
        icon: <PartyPopper className="w-5 h-5 text-yellow-500" />,
        duration: 4000
      });
      
      fetchTasks();
    } catch (error) {
      toast.error('Kon taak niet voltooien');
    }
  };
  
  const goToProject = (projectId) => {
    navigate(`/projects/${projectId}`);
  };
  
  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('nl-BE', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // No tasks, don't show banner
  if (tasks.length === 0) {
    return null;
  }
  
  const unseenTasks = tasks.filter(t => !t.seen);
  
  return (
    <div className="bg-blue-600 text-white">
      {/* Header bar - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <ClipboardList size={20} />
            {unseenTasks.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold animate-pulse">
                !
              </span>
            )}
          </div>
          <span className="font-semibold">
            {isWorker 
              ? `📋 ${tasks.length} openstaande ta${tasks.length > 1 ? 'ken' : 'ak'} / ${tasks.length} відкритих завдань`
              : `📋 ${tasks.length} openstaande ta${tasks.length > 1 ? 'ken' : 'ak'} uit notities`
            }
          </span>
          {unseenTasks.length > 0 && (
            <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
              {unseenTasks.length} {isWorker ? 'nieuw / нових' : 'nieuw'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm opacity-80">{isWorker ? 'Klik om te bekijken / Натисніть щоб переглянути' : 'Klik om te bekijken'}</span>
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* Expanded list */}
      {expanded && (
        <div className="bg-blue-50 text-gray-800 p-4 max-h-96 overflow-y-auto">
          <div className="space-y-3">
            {tasks.map((task) => (
              <div 
                key={task.id} 
                className={`p-4 rounded-lg border-2 bg-white ${
                  task.seen ? 'border-blue-200' : 'border-blue-400 shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Task Info */}
                  <div className="flex-1">
                    {/* Task text - the note content */}
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg mb-3">
                      <p className="text-gray-800 font-medium">{task.text}</p>
                    </div>
                    
                    {/* Meta info */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      {/* Project */}
                      <button
                        onClick={() => goToProject(task.project_id)}
                        className="flex items-center gap-1 hover:text-blue-600 hover:underline"
                      >
                        <Building size={14} />
                        <span>{task.project_name}</span>
                        <ExternalLink size={12} />
                      </button>
                      
                      {/* Assigned by */}
                      <div className="flex items-center gap-1">
                        <User size={14} />
                        <span>{isWorker ? 'Toegewezen door / Призначено' : 'Toegewezen door'}: <strong>{task.assigned_by_name}</strong></span>
                      </div>
                      
                      {/* Date */}
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{formatDate(task.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Complete button */}
                  <Button
                    onClick={() => completeTask(task.id)}
                    className="bg-green-500 hover:bg-green-600 text-white shrink-0"
                    size="sm"
                  >
                    <Check size={16} className="mr-1" />
                    {isWorker ? 'Voltooid / Готово' : 'Voltooid'}
                  </Button>
                </div>
                
                {/* Unseen indicator */}
                {!task.seen && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <span className="text-blue-600 text-xs font-medium flex items-center gap-1">
                      <Bell size={12} />
                      {isWorker ? '✨ Nieuwe taak! / Нове завдання!' : '✨ Nieuwe taak!'}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
