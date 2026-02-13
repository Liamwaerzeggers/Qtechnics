import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, X, PartyPopper, ClipboardList } from 'lucide-react';
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
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const navigate = useNavigate();
  
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
      setTasks(response.data || []);
    } catch (error) {
      console.error('Error fetching worker tasks:', error);
    }
  };
  
  const markAsSeen = async (taskId) => {
    try {
      await axios.put(`${API}/worker-tasks/${taskId}/seen`, {}, {
        headers: getAuthHeaders()
      });
      fetchTasks();
    } catch (error) {
      console.error('Error marking task as seen:', error);
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
  
  // No tasks, don't show banner
  if (tasks.length === 0) {
    return null;
  }
  
  const currentTask = tasks[currentTaskIndex] || tasks[0];
  const unseenTasks = tasks.filter(t => !t.seen);
  
  if (isMinimized) {
    return (
      <div 
        className="fixed top-4 right-4 z-50 bg-blue-600 text-white rounded-full p-3 cursor-pointer shadow-lg hover:bg-blue-700 transition-all animate-bounce"
        onClick={() => setIsMinimized(false)}
      >
        <div className="relative">
          <ClipboardList className="w-6 h-6" />
          {tasks.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {tasks.length}
            </span>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Task indicator */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className={`w-6 h-6 ${unseenTasks.length > 0 ? 'animate-pulse' : ''}`} />
              {unseenTasks.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {unseenTasks.length}
                </span>
              )}
            </div>
            <div>
              <p className="text-xs text-blue-200">Openstaande taak {currentTaskIndex + 1} van {tasks.length}</p>
              <p className="font-semibold">{currentTask?.text}</p>
            </div>
          </div>
          
          {/* Project info */}
          <div className="hidden md:block text-center">
            <p className="text-xs text-blue-200">Project</p>
            <button 
              onClick={() => goToProject(currentTask?.project_id)}
              className="font-medium hover:underline"
            >
              {currentTask?.project_name}
            </button>
          </div>
          
          {/* Assigned by */}
          <div className="hidden lg:block text-right">
            <p className="text-xs text-blue-200">Toegewezen door</p>
            <p className="font-medium">{currentTask?.assigned_by_name}</p>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Navigation for multiple tasks */}
            {tasks.length > 1 && (
              <div className="flex items-center gap-1 mr-2">
                <button
                  onClick={() => setCurrentTaskIndex(Math.max(0, currentTaskIndex - 1))}
                  disabled={currentTaskIndex === 0}
                  className="p-1 rounded hover:bg-blue-500 disabled:opacity-50"
                >
                  ◀
                </button>
                <button
                  onClick={() => setCurrentTaskIndex(Math.min(tasks.length - 1, currentTaskIndex + 1))}
                  disabled={currentTaskIndex === tasks.length - 1}
                  className="p-1 rounded hover:bg-blue-500 disabled:opacity-50"
                >
                  ▶
                </button>
              </div>
            )}
            
            {/* Complete button */}
            <Button
              onClick={() => completeTask(currentTask?.id)}
              className="bg-green-500 hover:bg-green-600 text-white"
              size="sm"
            >
              <Check className="w-4 h-4 mr-1" />
              Voltooid
            </Button>
            
            {/* Minimize button */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 hover:bg-blue-500 rounded"
              title="Minimaliseren"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
