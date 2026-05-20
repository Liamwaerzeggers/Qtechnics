import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';

const scrollToTop = () => window.scrollTo(0, 0);

const Footer = () => {
  return (
    <footer className="bg-[#3a190b] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Company Info */}
          <div className="md:col-span-1">
            <img 
              src="https://customer-assets.emergentagent.com/job_maxq-showcase/artifacts/rn05emza_logo%20maxq.png" 
              alt="Max Q" 
              className="h-14 w-auto mb-6"
            />
            <p className="text-white/80 text-sm leading-relaxed mb-4">
              Max Q is de nieuwe naam voor premium renovaties en interieurprojecten, powered by de jarenlange technische expertise van Q Technics.
            </p>
            <a href="https://qtechnicsrenovaties.be" target="_blank" rel="noopener noreferrer" className="text-xs text-white/50 hover:text-white/70 transition-colors">
              Powered by <span className="font-medium">Qtechnics</span>
            </a>
          </div>

          {/* Renoveren Links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-white">
              Renoveren
            </h3>
            <ul className="space-y-3">
              <li><Link to="/renoveren" onClick={scrollToTop} className="text-white/80 hover:text-white transition-colors text-sm">Technieken</Link></li>
              <li><Link to="/renoveren" onClick={scrollToTop} className="text-white/80 hover:text-white transition-colors text-sm">Badkamers</Link></li>
              <li><Link to="/renoveren" onClick={scrollToTop} className="text-white/80 hover:text-white transition-colors text-sm">Keukens</Link></li>
              <li><Link to="/renoveren" onClick={scrollToTop} className="text-white/80 hover:text-white transition-colors text-sm">Maatkasten</Link></li>
              <li><Link to="/renoveren" onClick={scrollToTop} className="text-white/80 hover:text-white transition-colors text-sm">Afwerking</Link></li>
            </ul>
          </div>

          {/* Navigation Links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-white">
              Navigatie
            </h3>
            <ul className="space-y-3">
              <li><Link to="/" onClick={scrollToTop} className="text-white/80 hover:text-white transition-colors text-sm">Home</Link></li>
              <li><Link to="/renoveren" onClick={scrollToTop} className="text-white/80 hover:text-white transition-colors text-sm">Renoveren</Link></li>
              <li><Link to="/projecten" onClick={scrollToTop} className="text-white/80 hover:text-white transition-colors text-sm">Projecten</Link></li>
              <li><Link to="/calculator" onClick={scrollToTop} className="text-white/80 hover:text-white transition-colors text-sm">Prijscalculator</Link></li>
              <li><Link to="/premies-en-renovatieplicht-2026" onClick={scrollToTop} className="text-white/80 hover:text-white transition-colors text-sm">Premies 2026</Link></li>
              <li><Link to="/blog" onClick={scrollToTop} className="text-white/80 hover:text-white transition-colors text-sm">Blog</Link></li>
              <li><Link to="/contact" onClick={scrollToTop} className="text-white/80 hover:text-white transition-colors text-sm">Contact</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-white">
              Contact
            </h3>
            <ul className="space-y-4">
              <li>
                <a href="tel:+32488152028" className="flex items-center text-white/80 hover:text-white transition-colors text-sm">
                  <Phone className="h-4 w-4 mr-3" />
                  +32 488 15 20 28
                </a>
              </li>
              <li>
                <a href="mailto:info@maxq.be" className="flex items-center text-white/80 hover:text-white transition-colors text-sm">
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
            <p>© 2026 Max Q — Powered by <a href="https://qtechnicsrenovaties.be" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-white transition-colors">Qtechnics</a>. Alle rechten voorbehouden.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="/admin" onClick={scrollToTop} className="hover:text-white transition-colors">Admin</Link>
              <Link to="/privacybeleid" onClick={scrollToTop} className="hover:text-white transition-colors">Privacybeleid</Link>
              <Link to="/cookiebeleid" onClick={scrollToTop} className="hover:text-white transition-colors">Cookiebeleid</Link>
              <Link to="/algemene-voorwaarden" onClick={scrollToTop} className="hover:text-white transition-colors">Algemene voorwaarden</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
