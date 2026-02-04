import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-[#4a3728] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Company Info */}
          <div className="md:col-span-1">
            <div className="flex items-baseline mb-6">
              <span className="text-3xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
                Max
              </span>
              <span className="text-3xl font-bold text-[#c17f24]" style={{ fontFamily: 'Georgia, serif' }}>
                Q
              </span>
              <div className="flex flex-col ml-1 text-[6px] text-white/70 leading-tight">
                <span>interieur</span>
                <span>techniek</span>
                <span>totaalprojecten</span>
              </div>
            </div>
            <p className="text-white/80 text-sm leading-relaxed mb-4">
              Max Q is de nieuwe naam voor premium renovaties en interieurprojecten, powered by de jarenlange technische expertise van Q Technics.
            </p>
            <div className="text-xs text-white/50">
              Powered by <span className="font-medium">emergent</span>
            </div>
          </div>

          {/* Renoveren Links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-white">
              Renoveren
            </h3>
            <ul className="space-y-3">
              <li><Link to="/technieken" className="text-white/80 hover:text-[#c17f24] transition-colors text-sm">Technieken</Link></li>
              <li><Link to="/badkamers" className="text-white/80 hover:text-[#c17f24] transition-colors text-sm">Badkamers</Link></li>
              <li><Link to="/keukens" className="text-white/80 hover:text-[#c17f24] transition-colors text-sm">Keukens</Link></li>
              <li><Link to="/maatkasten" className="text-white/80 hover:text-[#c17f24] transition-colors text-sm">Maatkasten</Link></li>
              <li><Link to="/afwerking" className="text-white/80 hover:text-[#c17f24] transition-colors text-sm">Afwerking</Link></li>
            </ul>
          </div>

          {/* Navigation Links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-white">
              Navigatie
            </h3>
            <ul className="space-y-3">
              <li><Link to="/" className="text-white/80 hover:text-[#c17f24] transition-colors text-sm">Home</Link></li>
              <li><Link to="/renoveren" className="text-white/80 hover:text-[#c17f24] transition-colors text-sm">Renoveren</Link></li>
              <li><Link to="/projecten" className="text-white/80 hover:text-[#c17f24] transition-colors text-sm">Projecten</Link></li>
              <li><Link to="/werkwijze" className="text-white/80 hover:text-[#c17f24] transition-colors text-sm">Werkwijze</Link></li>
              <li><Link to="/contact" className="text-white/80 hover:text-[#c17f24] transition-colors text-sm">Contact</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-white">
              Contact
            </h3>
            <ul className="space-y-4">
              <li>
                <a href="tel:+32494808021" className="flex items-center text-white/80 hover:text-[#c17f24] transition-colors text-sm">
                  <Phone className="h-4 w-4 mr-3" />
                  +32 494 80 80 21
                </a>
              </li>
              <li>
                <a href="mailto:info@maxq.be" className="flex items-center text-white/80 hover:text-[#c17f24] transition-colors text-sm">
                  <Mail className="h-4 w-4 mr-3" />
                  info@maxq.be
                </a>
              </li>
              <li>
                <div className="flex items-start text-white/80 text-sm">
                  <MapPin className="h-4 w-4 mr-3 mt-0.5" />
                  Gerhees 118, 3945 Ham
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-white/60">
            <p>© 2026 Max Q — Powered by <span className="font-medium">emergent</span>. Alle rechten voorbehouden.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="/admin" className="hover:text-white transition-colors">Admin</Link>
              <Link to="/privacybeleid" className="hover:text-white transition-colors">Privacybeleid</Link>
              <Link to="/voorwaarden" className="hover:text-white transition-colors">Algemene voorwaarden</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
