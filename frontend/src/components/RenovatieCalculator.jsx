import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Calculator, ArrowRight, Phone } from 'lucide-react';
import { Button } from './ui/button';
import Breadcrumbs from './Breadcrumbs';

const ROOM_TYPES = [
  { id: 'badkamer', label: 'Badkamer', min: 8000, max: 25000 },
  { id: 'keuken', label: 'Keuken', min: 10000, max: 35000 },
  { id: 'woonkamer', label: 'Woonkamer', min: 5000, max: 15000 },
  { id: 'slaapkamer', label: 'Slaapkamer', min: 3000, max: 10000 },
  { id: 'hal', label: 'Hal / Inkom', min: 2000, max: 6000 },
  { id: 'zolder', label: 'Zolder', min: 5000, max: 20000 },
];

const EXTRAS = [
  { id: 'vloerverwarming', label: 'Vloerverwarming', cost: 3500 },
  { id: 'elektriciteit', label: 'Elektriciteit vernieuwen', cost: 4000 },
  { id: 'sanitair', label: 'Sanitair vernieuwen', cost: 3000 },
  { id: 'maatkasten', label: 'Maatkasten / dressing', cost: 4500 },
  { id: 'domotica', label: 'Domotica', cost: 2500 },
];

const QUALITY = [
  { id: 'standaard', label: 'Standaard afwerking', factor: 1.0 },
  { id: 'premium', label: 'Premium afwerking', factor: 1.35 },
  { id: 'luxe', label: 'Luxe afwerking', factor: 1.7 },
];

const RenovatieCalculator = () => {
  const [rooms, setRooms] = useState([]);
  const [extras, setExtras] = useState([]);
  const [quality, setQuality] = useState('standaard');
  const [calculated, setCalculated] = useState(false);

  const toggleRoom = (id) => {
    setRooms((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]);
    setCalculated(false);
  };

  const toggleExtra = (id) => {
    setExtras((prev) => prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]);
    setCalculated(false);
  };

  const qualityFactor = QUALITY.find((q) => q.id === quality)?.factor || 1.0;

  const calcMin = () => {
    const roomCost = rooms.reduce((sum, id) => sum + (ROOM_TYPES.find((r) => r.id === id)?.min || 0), 0);
    const extraCost = extras.reduce((sum, id) => sum + (EXTRAS.find((e) => e.id === id)?.cost || 0), 0);
    return Math.round((roomCost + extraCost) * qualityFactor);
  };

  const calcMax = () => {
    const roomCost = rooms.reduce((sum, id) => sum + (ROOM_TYPES.find((r) => r.id === id)?.max || 0), 0);
    const extraCost = extras.reduce((sum, id) => sum + (EXTRAS.find((e) => e.id === id)?.cost || 0), 0);
    return Math.round((roomCost + extraCost) * qualityFactor);
  };

  const handleCalculate = () => setCalculated(true);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "Wat kost een badkamer renovatie in Belgie?", "acceptedAnswer": { "@type": "Answer", "text": "Een badkamerrenovatie in Belgie kost gemiddeld tussen 8.000 en 25.000 euro voor standaard afwerking. Premium afwerking kan oplopen tot 35.000 euro." }},
      { "@type": "Question", "name": "Wat kost een keuken renovatie?", "acceptedAnswer": { "@type": "Answer", "text": "Een keukenrenovatie kost tussen 10.000 en 35.000 euro, afhankelijk van materialen, grootte en of u een kookeiland wilt." }},
      { "@type": "Question", "name": "Wat kost een totaalrenovatie per m2?", "acceptedAnswer": { "@type": "Answer", "text": "Een totaalrenovatie kost gemiddeld 800 tot 1.500 euro per vierkante meter in Belgie, afhankelijk van de staat van de woning en het afwerkingsniveau." }},
    ]
  };

  return (
    <div data-testid="calculator-page">
      <Helmet>
        <title>Renovatie Prijscalculator ✓ Gratis in 30s | Max Q</title>
        <meta name="description" content="Bereken in 30 seconden uw renovatiekost. Direct prijsindicatie voor badkamer, keuken of totaalrenovatie. Gratis, geen e-mail vereist." />
        <link rel="canonical" href="https://maxq.be/calculator" />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Prijscalculator' }]} />

      <section className="bg-gradient-to-br from-[#3a190b] to-[#500000] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Calculator className="h-12 w-12 mx-auto mb-4 opacity-80" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="calculator-title">Renovatie Prijscalculator</h1>
          <p className="text-lg text-white/80">Bereken gratis een indicatie van uw renovatiekosten</p>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <div className="mb-10">
            <h2 className="text-xl font-bold mb-4">1. Welke ruimtes wilt u renoveren?</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ROOM_TYPES.map((room) => {
                const active = rooms.includes(room.id);
                return (
                  <button
                    key={room.id}
                    onClick={() => toggleRoom(room.id)}
                    className={
                      active
                        ? 'bg-[#3a190b] text-white border-2 border-[#3a190b] rounded-lg p-4 text-sm font-medium transition-all'
                        : 'bg-white text-[#202020] border-2 border-gray-200 rounded-lg p-4 text-sm font-medium hover:border-[#3a190b] transition-all'
                    }
                    data-testid={'room-' + room.id}
                  >
                    {room.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-xl font-bold mb-4">2. Extra werkzaamheden?</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {EXTRAS.map((extra) => {
                const active = extras.includes(extra.id);
                return (
                  <button
                    key={extra.id}
                    onClick={() => toggleExtra(extra.id)}
                    className={
                      active
                        ? 'bg-[#3a190b] text-white border-2 border-[#3a190b] rounded-lg p-4 text-sm font-medium transition-all'
                        : 'bg-white text-[#202020] border-2 border-gray-200 rounded-lg p-4 text-sm font-medium hover:border-[#3a190b] transition-all'
                    }
                    data-testid={'extra-' + extra.id}
                  >
                    {extra.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-xl font-bold mb-4">3. Afwerkingsniveau?</h2>
            <div className="grid grid-cols-3 gap-3">
              {QUALITY.map((q) => (
                <button
                  key={q.id}
                  onClick={() => { setQuality(q.id); setCalculated(false); }}
                  className={
                    quality === q.id
                      ? 'bg-[#3a190b] text-white border-2 border-[#3a190b] rounded-lg p-4 text-sm font-medium'
                      : 'bg-white text-[#202020] border-2 border-gray-200 rounded-lg p-4 text-sm font-medium hover:border-[#3a190b]'
                  }
                  data-testid={'quality-' + q.id}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCalculate}
            disabled={rooms.length === 0}
            className="w-full bg-[#3a190b] text-white py-4 rounded-lg font-semibold text-lg hover:bg-[#500000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="calculate-btn"
          >
            Bereken indicatie
          </button>

          {calculated && rooms.length > 0 && (
            <div className="mt-8 bg-gray-50 rounded-xl p-8 text-center" data-testid="calculator-result">
              <p className="text-sm text-gray-500 mb-2">Geschatte kosten (incl. BTW 21%)</p>
              <p className="text-4xl font-bold text-[#3a190b] mb-1">
                {calcMin().toLocaleString('nl-BE')} - {calcMax().toLocaleString('nl-BE')} EUR
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Dit is een indicatie. De exacte prijs hangt af van uw specifieke situatie en materiaalkeuze.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/start">
                  <Button className="bg-[#3a190b] text-white hover:bg-[#500000] px-6 py-3" data-testid="calculator-cta">
                    Gratis exacte offerte aanvragen <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <a href="tel:+32488152028">
                  <Button variant="outline" className="border-[#3a190b] text-[#3a190b] px-6 py-3">
                    <Phone className="h-4 w-4 mr-2" /> Bel ons
                  </Button>
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="py-12 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">Veelgestelde vragen over renovatiekosten</h2>
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold mb-2">Wat kost een badkamer renovatie in Belgie?</h3>
              <p className="text-gray-600 text-sm">Een <Link to="/diensten/badkamer-renoveren" className="text-[#3a190b] underline">badkamerrenovatie</Link> kost gemiddeld tussen 8.000 en 25.000 euro voor standaard afwerking. Met premium materialen en een inloopdouche kan dit oplopen tot 35.000 euro.</p>
            </div>
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold mb-2">Wat kost een keuken renovatie?</h3>
              <p className="text-gray-600 text-sm">Een <Link to="/diensten/keuken-renoveren" className="text-[#3a190b] underline">keukenrenovatie</Link> varieert van 10.000 tot 35.000 euro. Een kookeiland en premium materialen verhogen de prijs.</p>
            </div>
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold mb-2">Wat kost een totaalrenovatie?</h3>
              <p className="text-gray-600 text-sm">Een <Link to="/diensten/totaalrenovatie" className="text-[#3a190b] underline">totaalrenovatie</Link> kost gemiddeld 800 tot 1.500 euro per m2. Voor een woning van 150m2 komt dit neer op 120.000 tot 225.000 euro.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default RenovatieCalculator;
