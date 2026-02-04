import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from './ui/button';

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
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#4a3728] leading-tight mb-6">
            Totaalrenovaties & interieurbouw met{' '}
            <span className="text-[#4a3728]">technische expertise</span>
          </h1>
          <p className="text-lg md:text-xl text-[#5a4738] mb-8 leading-relaxed">
            Max Q realiseert badkamers, keukens en totaalprojecten — technisch onderbouwd dankzij Q Technics.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button className="bg-[#4a3728] hover:bg-[#3a2a1e] text-white px-6 py-3 text-base flex items-center justify-center gap-2 group">
              <span className="inline-flex items-center justify-center w-5 h-5 bg-white/20 rounded">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="2" />
                </svg>
              </span>
              Bereken uw renovatie
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              variant="outline"
              className="border-[#4a3728] text-[#4a3728] hover:bg-[#4a3728] hover:text-white px-6 py-3 text-base"
            >
              Bekijk realisaties
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
