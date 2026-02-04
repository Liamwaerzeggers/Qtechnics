import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Phone, Menu, X } from 'lucide-react';
import { Button } from './ui/button';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Renoveren', href: '/renoveren' },
    { name: 'Projecten', href: '/projecten' },
    { name: 'Werkwijze', href: '/werkwijze' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <header className="bg-white sticky top-0 z-50 shadow-sm">
      {/* Powered by bar */}
      <div className="bg-white border-b border-gray-100 py-1 text-center">
        <span className="text-xs text-gray-400">Powered by</span>
        <span className="text-xs text-gray-500 ml-1 font-medium">emergent</span>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-[#4a3728]" style={{ fontFamily: 'Georgia, serif' }}>
                Max
              </span>
              <span className="text-3xl font-bold text-[#c17f24]" style={{ fontFamily: 'Georgia, serif' }}>
                Q
              </span>
              <div className="flex flex-col ml-1 text-[6px] text-[#4a3728] leading-tight">
                <span>interieur</span>
                <span>techniek</span>
                <span>totaalprojecten</span>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className={`text-sm font-medium transition-colors hover:text-[#c17f24] ${
                  location.pathname === link.href
                    ? 'text-[#4a3728] border-b-2 border-[#c17f24]'
                    : 'text-[#4a3728]'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="hidden md:flex items-center space-x-4">
            <a
              href="tel:+32494808021"
              className="flex items-center text-sm text-[#4a3728] hover:text-[#c17f24] transition-colors"
            >
              <Phone className="h-4 w-4 mr-2" />
              +32 494 80 80 21
            </a>
            <Button className="bg-[#4a3728] hover:bg-[#3a2a1e] text-white px-4 py-2 text-sm">
              Gratis plaatsbezoek
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-[#4a3728]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="block text-[#4a3728] hover:text-[#c17f24] font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-4 border-t border-gray-100">
              <a
                href="tel:+32494808021"
                className="flex items-center text-[#4a3728] mb-4"
              >
                <Phone className="h-4 w-4 mr-2" />
                +32 494 80 80 21
              </a>
              <Button className="w-full bg-[#4a3728] hover:bg-[#3a2a1e] text-white">
                Gratis plaatsbezoek
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
