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
    { name: 'Contact', href: '/contact' },
  ];

  const handleNavClick = () => {
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
  };

  return (
    <header className="bg-white sticky top-0 z-50 shadow-sm">
      {/* Powered by bar */}
      <div className="bg-white border-b border-gray-100 py-1 text-center">
        <a href="https://qtechnicsrenovaties.be" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
          <span className="text-xs text-gray-400">Powered by</span>
          <span className="text-xs text-[#3a190b] ml-1 font-medium">Qtechnics</span>
        </a>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0" onClick={() => window.scrollTo(0, 0)}>
            <img 
              src="https://customer-assets.emergentagent.com/job_maxq-showcase/artifacts/rn05emza_logo%20maxq.png" 
              alt="Max Q" 
              className="h-14 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                onClick={() => window.scrollTo(0, 0)}
                className={`text-sm font-medium transition-colors hover:text-[#500000] ${
                  location.pathname === link.href
                    ? 'text-[#3a190b] border-b-2 border-[#500000]'
                    : 'text-[#3a190b]'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="hidden md:flex items-center space-x-4">
            <a
              href="tel:+32488152028"
              className="flex items-center text-sm text-[#3a190b] hover:text-[#500000] transition-colors"
            >
              <Phone className="h-4 w-4 mr-2" />
              +32 488 15 20 28
            </a>
            <Link to="/start" onClick={() => window.scrollTo(0, 0)}>
              <Button className="bg-[#3a190b] hover:bg-[#500000] text-white px-4 py-2 text-sm">
                Gratis plaatsbezoek
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-[#3a190b]"
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
                className="block text-[#3a190b] hover:text-[#500000] font-medium"
                onClick={handleNavClick}
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-4 border-t border-gray-100">
              <a
                href="tel:+32488152028"
                className="flex items-center text-[#3a190b] mb-4"
              >
                <Phone className="h-4 w-4 mr-2" />
                +32 488 15 20 28
              </a>
              <Link to="/start" onClick={handleNavClick}>
                <Button className="w-full bg-[#3a190b] hover:bg-[#500000] text-white">
                  Gratis plaatsbezoek
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
