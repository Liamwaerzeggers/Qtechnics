import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';
import { companyInfo, footerLinks } from '../data/mock';

const Footer = () => {
  return (
    <footer className="bg-[#4a3728] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Company Info */}
          <div className="md:col-span-1">
            {/* Logo */}
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
              {companyInfo.description}
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
              {footerLinks.renoveren.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-white/80 hover:text-[#c17f24] transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Navigation Links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-white">
              Navigatie
            </h3>
            <ul className="space-y-3">
              {footerLinks.navigatie.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-white/80 hover:text-[#c17f24] transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-white">
              Contact
            </h3>
            <ul className="space-y-4">
              <li>
                <a
                  href={`tel:${companyInfo.phone.replace(/\s/g, '')}`}
                  className="flex items-center text-white/80 hover:text-[#c17f24] transition-colors text-sm"
                >
                  <Phone className="h-4 w-4 mr-3" />
                  {companyInfo.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${companyInfo.email}`}
                  className="flex items-center text-white/80 hover:text-[#c17f24] transition-colors text-sm"
                >
                  <Mail className="h-4 w-4 mr-3" />
                  {companyInfo.email}
                </a>
              </li>
              <li>
                <div className="flex items-start text-white/80 text-sm">
                  <MapPin className="h-4 w-4 mr-3 mt-0.5" />
                  {companyInfo.address}
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
            <p>
              © 2026 Max Q — Powered by{' '}
              <span className="font-medium">emergent</span>. Alle rechten voorbehouden.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="/admin" className="hover:text-white transition-colors">
                Admin
              </Link>
              <Link to="/privacybeleid" className="hover:text-white transition-colors">
                Privacybeleid
              </Link>
              <Link to="/voorwaarden" className="hover:text-white transition-colors">
                Algemene voorwaarden
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
