import React from 'react';
import { ChevronRight } from 'lucide-react';

const Projects = () => {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#202020] mb-4">
              Recente realisaties
            </h2>
            <p className="text-[#202020]/70 text-lg">
              Ontdek onze meest recente projecten en laat u inspireren.
            </p>
          </div>
          <a
            href="/projecten"
            className="flex items-center text-[#3a190b] hover:text-[#500000] font-medium mt-4 md:mt-0 transition-colors group"
          >
            Alle projecten bekijken
            <ChevronRight className="h-5 w-5 ml-1 transition-transform group-hover:translate-x-1" />
          </a>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Project 1 */}
          <div className="group cursor-pointer">
            <div className="relative overflow-hidden rounded-lg mb-4">
              <img
                src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80"
                alt="Volledige woning renovatie"
                className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            </div>
            <div className="flex items-center text-sm text-[#202020]/70 mb-2">
              <span className="font-semibold text-[#3a190b] uppercase tracking-wider text-xs">TOTAALPROJECT</span>
              <span className="mx-2">•</span>
              <span>Hasselt</span>
            </div>
            <h3 className="text-xl font-bold text-[#202020] group-hover:text-[#500000] transition-colors">
              Volledige woning renovatie
            </h3>
          </div>

          {/* Project 2 */}
          <div className="group cursor-pointer">
            <div className="relative overflow-hidden rounded-lg mb-4">
              <img
                src="https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&q=80"
                alt="Luxe badkamer met inloopdouche"
                className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            </div>
            <div className="flex items-center text-sm text-[#202020]/70 mb-2">
              <span className="font-semibold text-[#3a190b] uppercase tracking-wider text-xs">BADKAMER</span>
              <span className="mx-2">•</span>
              <span>Genk</span>
            </div>
            <h3 className="text-xl font-bold text-[#202020] group-hover:text-[#500000] transition-colors">
              Luxe badkamer met inloopdouche
            </h3>
          </div>

          {/* Project 3 */}
          <div className="group cursor-pointer">
            <div className="relative overflow-hidden rounded-lg mb-4">
              <img
                src="https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=600&q=80"
                alt="Design keuken met kookeiland"
                className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            </div>
            <div className="flex items-center text-sm text-[#202020]/70 mb-2">
              <span className="font-semibold text-[#3a190b] uppercase tracking-wider text-xs">KEUKEN</span>
              <span className="mx-2">•</span>
              <span>Lommel</span>
            </div>
            <h3 className="text-xl font-bold text-[#202020] group-hover:text-[#500000] transition-colors">
              Design keuken met kookeiland
            </h3>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Projects;
