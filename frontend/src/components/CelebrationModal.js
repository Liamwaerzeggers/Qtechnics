import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import confetti from 'canvas-confetti';
import { Trophy, X, PartyPopper } from 'lucide-react';
import { Button } from './ui/button';

export default function CelebrationModal() {
  const [celebrations, setCelebrations] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    checkCelebrations();
  }, []);

  const checkCelebrations = async () => {
    try {
      const response = await axios.get(`${API}/celebrations/pending`, { withCredentials: true });
      if (response.data && response.data.length > 0) {
        setCelebrations(response.data);
        setIsVisible(true);
        triggerConfetti();
      }
    } catch (error) {
      console.error('Failed to check celebrations:', error);
    }
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // Shoot confetti from both sides
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#FFD700', '#10B981', '#7a1f1f', '#EF4444', '#8B5CF6']
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#FFD700', '#10B981', '#7a1f1f', '#EF4444', '#8B5CF6']
      });
    }, 250);
  };

  const handleDismiss = async () => {
    const current = celebrations[currentIndex];
    if (current) {
      try {
        await axios.post(`${API}/celebrations/${current.id}/mark-seen`, {}, { withCredentials: true });
      } catch (error) {
        console.error('Failed to mark celebration as seen:', error);
      }
    }

    if (currentIndex < celebrations.length - 1) {
      setCurrentIndex(currentIndex + 1);
      triggerConfetti();
    } else {
      setIsVisible(false);
    }
  };

  if (!isVisible || celebrations.length === 0) return null;

  const current = celebrations[currentIndex];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center animate-bounce-in"
        style={{
          animation: 'bounceIn 0.5s ease-out'
        }}
      >
        {/* Close button */}
        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100"
        >
          <X size={20} style={{color: '#94A3B8'}} />
        </button>

        {/* Trophy icon */}
        <div className="mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{backgroundColor: '#FEF3C7'}}>
          <Trophy size={48} style={{color: '#F59E0B'}} />
        </div>

        {/* Main text */}
        <h2 className="text-3xl font-bold mb-2" style={{color: '#3a190b'}}>
          🎉 Gefeliciteerd!
        </h2>
        
        <p className="text-xl mb-4" style={{color: '#1E293B'}}>
          Project <span className="font-bold" style={{color: '#10B981'}}>{current.project_name}</span> is verkocht!
        </p>

        {/* Amount */}
        {current.amount > 0 && (
          <div className="py-4 px-6 rounded-xl mb-6" style={{backgroundColor: '#ECFDF5'}}>
            <p className="text-sm" style={{color: '#059669'}}>Verkoopbedrag</p>
            <p className="text-3xl font-bold" style={{color: '#047857'}}>
              €{current.amount.toLocaleString('nl-NL', {minimumFractionDigits: 2})}
            </p>
          </div>
        )}

        {/* Quote/Document info */}
        <p className="text-sm mb-6" style={{color: '#64748B'}}>
          {current.quote_number && `Offerte: ${current.quote_number}`}
          {current.document_name && `Document: ${current.document_name}`}
        </p>

        {/* Progress indicator */}
        {celebrations.length > 1 && (
          <p className="text-xs mb-4" style={{color: '#94A3B8'}}>
            {currentIndex + 1} van {celebrations.length} nieuwe verkopen
          </p>
        )}

        {/* Action button */}
        <Button 
          onClick={handleDismiss}
          className="w-full py-6 text-lg font-semibold"
          style={{backgroundColor: '#10B981'}}
        >
          <PartyPopper className="mr-2" size={20} />
          {currentIndex < celebrations.length - 1 ? 'Volgende Viering!' : 'Geweldig! Aan het werk!'}
        </Button>
      </div>

      <style>{`
        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
