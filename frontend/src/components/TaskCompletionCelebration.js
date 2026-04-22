import React from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Sparkles, PartyPopper, Star, Award, Medal, Rocket, Flame } from 'lucide-react';

const MESSAGES = [
  // Serieus
  { tone: 'serious', text: 'Sterke prestatie.', sub: 'Klaar en klassiek uitgevoerd.' },
  { tone: 'serious', text: 'Taak voltooid.', sub: 'Op naar de volgende.' },
  { tone: 'serious', text: 'Solide werk.', sub: 'Hou dit tempo vast.' },
  { tone: 'serious', text: 'Goed gedaan!', sub: 'Een stap dichter bij de deadline.' },
  { tone: 'serious', text: 'Impact geleverd.', sub: 'Klant en team merken het.' },
  { tone: 'serious', text: 'Mission accomplished.', sub: 'Doorpakken loont.' },
  { tone: 'serious', text: 'Afgevinkt.', sub: 'Professioneel zoals we het kennen.' },
  // Grappig
  { tone: 'fun', text: 'Boem. Taak geveld.', sub: 'De wereld is iets rustiger geworden.' },
  { tone: 'fun', text: 'Koffie verdiend.', sub: 'Ga maar bestellen, wij wachten wel.' },
  { tone: 'fun', text: 'De concurrentie huilt.', sub: 'Jij vinkt af terwijl zij nog nadenken.' },
  { tone: 'fun', text: 'Productiviteit: over 9000.', sub: 'Saitama-niveau unlocked.' },
  { tone: 'fun', text: 'Taken haten je nu.', sub: 'Dat doe je dan ook lekker.' },
  { tone: 'fun', text: 'De to-do lijst huivert.', sub: 'Eentje minder om je mee te kwellen.' },
  { tone: 'fun', text: 'Nog eentje en je bent legendarisch.', sub: 'Spoiler: je bent er al bijna.' },
  { tone: 'fun', text: 'Je baas glimlacht stiekem.', sub: 'Ook al laat hij het niet merken.' },
  { tone: 'fun', text: 'Checkmate, taak.', sub: 'Jij = schaakkampioen van MaxQ.' },
  { tone: 'fun', text: 'Fijn dat je bestaat.', sub: 'Het team zou zonder jou stuk zijn.' },
  { tone: 'fun', text: 'Alweer? Je showt nu gewoon.', sub: 'Maar we klagen niet.' },
];

const ICON_POOL = [Trophy, Sparkles, PartyPopper, Star, Award, Medal, Rocket, Flame];

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function fireConfetti() {
  const duration = 900;
  const end = Date.now() + duration;
  const colors = ['#500000', '#F59E0B', '#10B981', '#3B82F6', '#EC4899'];
  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export default function TaskCompletionCelebration({ show, onDone }) {
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    if (!show) return;
    const msg = pickRandom(MESSAGES);
    const Icon = pickRandom(ICON_POOL);
    setData({ msg, Icon });
    fireConfetti();
    const t = setTimeout(() => {
      setData(null);
      onDone && onDone();
    }, 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  if (!show || !data) return null;
  const { msg, Icon } = data;
  const bg = msg.tone === 'fun' ? '#FEF3C7' : '#f5e6e6';
  const accent = msg.tone === 'fun' ? '#B45309' : '#500000';

  return (
    <div
      data-testid="task-celebration"
      className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
      style={{ animation: 'celebFade 2.2s ease-out forwards' }}
    >
      <style>{`
        @keyframes celebFade {
          0% { opacity: 0; transform: scale(0.85); }
          12% { opacity: 1; transform: scale(1.04); }
          22% { transform: scale(1); }
          80% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.96); }
        }
        @keyframes iconBounce {
          0%, 100% { transform: translateY(0) rotate(0); }
          25% { transform: translateY(-8px) rotate(-6deg); }
          50% { transform: translateY(0) rotate(0); }
          75% { transform: translateY(-5px) rotate(6deg); }
        }
      `}</style>
      <div
        className="px-10 py-8 rounded-2xl shadow-2xl max-w-md text-center"
        style={{
          backgroundColor: 'white',
          border: `2px solid ${accent}`,
          boxShadow: `0 25px 80px -10px ${accent}55`,
        }}
      >
        <div
          className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: bg, animation: 'iconBounce 1.2s ease-in-out infinite' }}
        >
          <Icon size={40} style={{ color: accent }} strokeWidth={2} />
        </div>
        <h2
          className="text-2xl font-bold mb-1"
          style={{ color: accent, fontFamily: 'Space Grotesk, sans-serif' }}
        >
          {msg.text}
        </h2>
        <p className="text-sm" style={{ color: '#6B7280' }}>{msg.sub}</p>
      </div>
    </div>
  );
}
