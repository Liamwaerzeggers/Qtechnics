import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator } from 'lucide-react';

const POPULAR_SERVICES = [
  { title: 'Badkamer renoveren', slug: 'badkamer-renoveren', desc: 'Inloopdouche, vrijstaand bad, vloerverwarming' },
  { title: 'Keuken renoveren', slug: 'keuken-renoveren', desc: 'Maatwerk keukens, kookeiland, werkbladen' },
  { title: 'Totaalrenovatie', slug: 'totaalrenovatie', desc: 'Complete woningrenovatie van A tot Z' },
  { title: 'Interieur renoveren', slug: 'interieur-renoveren', desc: 'Pleisterwerk, vloeren, afwerking' },
  { title: 'Maatkasten', slug: 'maatkasten', desc: 'Inbouwkasten en dressings op maat' },
  { title: 'Vloerverwarming', slug: 'vloerverwarming-installeren', desc: 'Comfortabel en energiezuinig' },
];

const POPULAR_LOCATIONS = [
  { name: 'Ham', slug: 'ham' },
  { name: 'Tessenderlo', slug: 'tessenderlo' },
  { name: 'Hasselt', slug: 'hasselt' },
  { name: 'Genk', slug: 'genk' },
  { name: 'Beringen', slug: 'beringen' },
  { name: 'Geel', slug: 'geel' },
  { name: 'Mol', slug: 'mol' },
  { name: 'Diest', slug: 'diest' },
  { name: 'Turnhout', slug: 'turnhout' },
  { name: 'Leuven', slug: 'leuven' },
  { name: 'Lommel', slug: 'lommel' },
  { name: 'Heusden-Zolder', slug: 'heusden-zolder' },
];

const InternalLinks = () => {
  return (
    <section className="py-16 bg-gray-50" data-testid="internal-links-section">
      <div className="max-w-7xl mx-auto px-4">
        {/* Featured tool: Renovation Price Calculator (backlink magnet) */}
        <Link
          to="/calculator"
          className="block mb-12 rounded-2xl bg-gradient-to-br from-[#3a190b] to-[#500000] text-white p-8 sm:p-10 hover:shadow-xl transition-shadow group"
          data-testid="featured-calculator-cta"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="bg-white/10 rounded-xl p-4 flex-shrink-0">
              <Calculator className="h-10 w-10" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-widest text-white/70 mb-2">Gratis tool</p>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">Bereken uw renovatiekosten</h2>
              <p className="text-white/80 max-w-2xl">Krijg in 30 seconden een indicatie voor uw badkamer, keuken of totaalrenovatie. Geen verplichtingen, geen gegevens vereist.</p>
            </div>
            <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform hidden sm:block" />
          </div>
        </Link>

        <h2 className="text-2xl font-bold text-[#202020] mb-8">Onze diensten</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {POPULAR_SERVICES.map((svc) => (
            <Link
              key={svc.slug}
              to={'/diensten/' + svc.slug}
              className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow group"
              data-testid={'internal-link-' + svc.slug}
            >
              <div>
                <h3 className="font-semibold text-[#202020] group-hover:text-[#3a190b] transition-colors">{svc.title}</h3>
                <p className="text-sm text-gray-500">{svc.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-[#3a190b] transition-colors flex-shrink-0 ml-3" />
            </Link>
          ))}
        </div>

        <h2 className="text-2xl font-bold text-[#202020] mb-4">Renovatie in uw regio</h2>
        <p className="text-gray-600 mb-6">Wij zijn actief in meer dan 75 gemeenten in Limburg, Kempen en Vlaams-Brabant</p>
        <div className="flex flex-wrap gap-2">
          {POPULAR_LOCATIONS.map((loc) => (
            <Link
              key={loc.slug}
              to={'/renovatie/' + loc.slug}
              className="bg-white px-4 py-2 rounded-full text-sm text-[#3a190b] border border-[#3a190b]/15 hover:border-[#3a190b] hover:bg-[#3a190b]/5 transition-colors"
              data-testid={'location-link-' + loc.slug}
            >
              Renovatie {loc.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InternalLinks;
