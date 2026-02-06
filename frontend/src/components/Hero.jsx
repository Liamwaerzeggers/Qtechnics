import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { Link } from 'react-router-dom';

const Hero = () => {
  return (
    <section 
      className="relative min-h-[600px] md:min-h-[700px] flex items-center"
      aria-label="Hero sectie - Max Q Renovaties Limburg"
      itemScope 
      itemType="https://schema.org/WebPageElement"
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1920&q=80)`,
        }}
        role="img"
        aria-label="Moderne woonkamer na renovatie door Max Q"
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/70 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <article className="max-w-2xl text-left">
          {/* Experience Badge for SEO */}
          <p className="inline-block bg-[#3a190b]/10 text-[#3a190b] text-sm font-medium px-4 py-2 rounded-full mb-6">
            35+ jaar ervaring in Limburg
          </p>
          
          <h1 
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#202020] leading-tight mb-6 text-left"
            itemProp="headline"
          >
            Totaalrenovaties & interieurbouw met{' '}
            <span className="text-[#3a190b]">technische expertise</span>
          </h1>
          
          <p 
            className="text-lg md:text-xl text-[#202020]/80 mb-8 leading-relaxed text-left"
            itemProp="description"
          >
            Max Q realiseert badkamers, keukens en totaalprojecten in <strong>Ham, Hasselt, Genk</strong> en heel <strong>Limburg</strong> — technisch onderbouwd dankzij Q Technics.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-start">
            <Link to="/start" aria-label="Start uw renovatie aanvraag - gratis offerte">
              <Button className="bg-[#3a190b] hover:bg-[#500000] text-white px-6 py-3 text-base flex items-center justify-center gap-2 group">
                <span className="inline-flex items-center justify-center w-5 h-5 bg-white/20 rounded">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="2" />
                  </svg>
                </span>
                Gratis plaatsbezoek aanvragen
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Button>
            </Link>
            <Link to="/projecten" aria-label="Bekijk onze gerealiseerde renovatieprojecten">
              <Button
                variant="outline"
                className="border-[#3a190b] text-[#3a190b] hover:bg-[#3a190b] hover:text-white px-6 py-3 text-base"
              >
                Bekijk realisaties
              </Button>
            </Link>
          </div>
          
          {/* Trust indicators for SEO */}
          <div className="mt-8 flex flex-wrap gap-6 text-sm text-[#202020]/60">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Gratis offerte
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Eigen vakmensen
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Kwaliteitsgarantie
            </span>
          </div>
        </article>
      </div>
    </section>
  );
};

export default Hero;
