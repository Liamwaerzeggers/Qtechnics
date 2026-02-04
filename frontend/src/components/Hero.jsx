import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { Link } from 'react-router-dom';

const Hero = () => {
  return (
    <section className="relative min-h-[600px] md:min-h-[700px] flex items-center">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1920&q=80)`,
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/70 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl text-left">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#202020] leading-tight mb-6 text-left">
            Totaalrenovaties & interieurbouw met{' '}
            <span className="text-[#3a190b]">technische expertise</span>
          </h1>
          <p className="text-lg md:text-xl text-[#202020]/80 mb-8 leading-relaxed text-left">
            Max Q realiseert badkamers, keukens en totaalprojecten — technisch onderbouwd dankzij Q Technics.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-start">
            <Link to="/start">
              <Button className="bg-[#3a190b] hover:bg-[#500000] text-white px-6 py-3 text-base flex items-center justify-center gap-2 group">
                <span className="inline-flex items-center justify-center w-5 h-5 bg-white/20 rounded">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="2" />
                  </svg>
                </span>
                Bereken uw renovatie
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/projecten">
              <Button
                variant="outline"
                className="border-[#3a190b] text-[#3a190b] hover:bg-[#3a190b] hover:text-white px-6 py-3 text-base"
              >
                Bekijk realisaties
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
