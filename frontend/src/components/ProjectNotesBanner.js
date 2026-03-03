import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronDown, ChevronUp, StickyNote, Plus, User, Check, Trash2, Send, PartyPopper } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
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

export default function ProjectNotesBanner({ project, onUpdate }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [projectNotes, setProjectNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);
  const [assigningNote, setAssigningNote] = useState(null);
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [admins, setAdmins] = useState([]);
  
  useEffect(() => {
    if (project?.id) {
      fetchNotes();
      fetchAdmins();
    }
  }, [project?.id]);
  
  const fetchAdmins = async () => {
    try {
      const response = await axios.get(`${API}/admins`, {
        headers: getAuthHeaders()
      });
      console.log('Fetched admins for dropdown:', response.data);
      setAdmins(response.data || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };
  
  const fetchNotes = async () => {
    try {
      const response = await axios.get(`${API}/projects/${project.id}/notes`, {
        headers: getAuthHeaders()
      });
      setProjectNotes(response.data.project_notes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };
  
  const addNote = async () => {
    if (!newNoteText.trim()) return;
    
    try {
      await axios.post(`${API}/projects/${project.id}/notes`, 
        { text: newNoteText.trim() },
        { headers: getAuthHeaders() }
      );
      setNewNoteText('');
      setShowAddNote(false);
      fetchNotes();
      toast.success('Notitie toegevoegd');
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Kon notitie niet toevoegen');
    }
  };
  
  const deleteNote = async (noteId) => {
    if (!window.confirm('Weet je zeker dat je deze notitie wilt verwijderen?')) return;
    
    try {
      await axios.delete(`${API}/projects/${project.id}/notes/${noteId}`, {
        headers: getAuthHeaders()
      });
      fetchNotes();
      toast.success('Notitie verwijderd');
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Kon notitie niet verwijderen');
    }
  };
  
  const assignNoteToAdmin = async (noteId) => {
    if (!selectedAdmin) {
      toast.error('Selecteer een beheerder');
      return;
    }
    
    try {
      await axios.post(`${API}/projects/${project.id}/notes/${noteId}/assign`,
        { admin_id: selectedAdmin },
        { headers: getAuthHeaders() }
      );
      setAssigningNote(null);
      setSelectedAdmin('');
      fetchNotes();
      toast.success('Taak toegewezen aan beheerder!');
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Kon taak niet toewijzen');
    }
  };
  
  const completeTask = async (noteId, taskId) => {
    try {
      await axios.put(`${API}/worker-tasks/${taskId}/complete`, {}, {
        headers: getAuthHeaders()
      });
      
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.3 }
      });
      
      const randomMessage = COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)];
      toast.success(randomMessage, {
        icon: <PartyPopper className="w-5 h-5 text-yellow-500" />
      });
      
      fetchNotes();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Kon taak niet voltooien');
    }
  };
  
  // Parse first visit notes into bullet points
  const firstVisitNotes = project?.first_visit_notes || '';
  const firstVisitBullets = firstVisitNotes
    .split('\n')
    .filter(line => line.trim())
    .map(line => line.trim().replace(/^[-•*]\s*/, ''));
  
  const hasNotes = firstVisitBullets.length > 0 || projectNotes.length > 0;
  
  if (!hasNotes && !showAddNote) {
    return (
      <div className="mb-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-700">
            <StickyNote className="w-4 h-4" />
            <span className="text-sm font-medium">Nog geen notities</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAddNote(true)}
            className="text-amber-700 hover:bg-amber-100"
          >
            <Plus className="w-4 h-4 mr-1" />
            Notitie toevoegen
          </Button>
        </div>
        
        {showAddNote && (
          <div className="mt-3 flex gap-2">
            <Input
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Nieuwe notitie..."
              onKeyDown={(e) => e.key === 'Enter' && addNote()}
              autoFocus
            />
            <Button size="sm" onClick={addNote}>Toevoegen</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddNote(false)}>Annuleren</Button>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="mb-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-amber-100/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 text-amber-800">
          <StickyNote className="w-5 h-5" />
          <span className="font-semibold">Project Notities</span>
          <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
            {firstVisitBullets.length + projectNotes.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); setShowAddNote(!showAddNote); }}
            className="text-amber-700 hover:bg-amber-200"
          >
            <Plus className="w-4 h-4" />
          </Button>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
        </div>
      </div>
      
      {/* Content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Add new note */}
          {showAddNote && (
            <div className="flex gap-2 mb-3">
              <Input
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Nieuwe notitie..."
                onKeyDown={(e) => e.key === 'Enter' && addNote()}
                autoFocus
                className="flex-1"
              />
              <Button size="sm" onClick={addNote}>Toevoegen</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddNote(false)}>✕</Button>
            </div>
          )}
          
          {/* First visit notes */}
          {firstVisitBullets.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-amber-600 font-medium mb-1">📋 Eerste Bezoek:</p>
              <ul className="space-y-1">
                {firstVisitBullets.map((bullet, idx) => (
                  <li key={`fv-${idx}`} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Project notes */}
          {projectNotes.length > 0 && (
            <div>
              <p className="text-xs text-amber-600 font-medium mb-1">📝 Algemene Notities:</p>
              <ul className="space-y-2">
                {projectNotes.map((note) => (
                  <li key={note.id} className={`flex items-start gap-2 text-sm p-2 rounded-lg ${note.task_completed ? 'bg-green-50 border border-green-200' : note.is_task ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-amber-100'}`}>
                    {note.is_task ? (
                      note.task_completed ? (
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <button
                          onClick={() => completeTask(note.id, note.task_id)}
                          className="w-4 h-4 rounded-full border-2 border-blue-400 hover:bg-blue-100 flex-shrink-0 mt-0.5"
                          title="Markeer als voltooid"
                        />
                      )
                    ) : (
                      <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                    )}
                    <div className="flex-1">
                      <span className={note.task_completed ? 'line-through text-gray-400' : 'text-gray-700'}>{note.text}</span>
                      {note.is_task && note.assigned_to_name && (
                        <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                          <User className="w-3 h-3 inline mr-1" />
                          {note.assigned_to_name}
                        </span>
                      )}
                      {note.task_completed && (
                        <span className="ml-2 text-xs text-green-600">✓ Voltooid</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!note.is_task && (
                        <>
                          {assigningNote === note.id ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <select
                                value={selectedAdmin}
                                onChange={(e) => setSelectedAdmin(e.target.value)}
                                className="text-xs border rounded px-1 py-0.5"
                              >
                                <option value="">Kies beheerder...</option>
                                {admins.map(a => (
                                  <option key={a.id} value={a.id}>{a.name || a.username}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => assignNoteToAdmin(note.id)}
                                className="text-blue-500 hover:text-blue-700"
                                title="Toewijzen"
                              >
                                <Send className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => { setAssigningNote(null); setSelectedAdmin(''); }}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setAssigningNote(note.id); }}
                              className="text-gray-400 hover:text-blue-500"
                              title="Toewijzen aan beheerder"
                            >
                              <User className="w-3 h-3" />
                            </button>
                          )}
                        </>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                        className="text-gray-400 hover:text-red-500"
                        title="Verwijderen"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
