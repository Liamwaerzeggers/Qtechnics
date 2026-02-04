import React from 'react';
import { ChevronRight } from 'lucide-react';
import { projects } from '../data/mock';

const Projects = () => {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#4a3728] mb-4">
              Recente realisaties
            </h2>
            <p className="text-[#6a5748] text-lg">
              Ontdek onze meest recente projecten en laat u inspireren.
            </p>
          </div>
          <a
            href="/projecten"
            className="flex items-center text-[#4a3728] hover:text-[#c17f24] font-medium mt-4 md:mt-0 transition-colors group"
          >
            Alle projecten bekijken
            <ChevronRight className="h-5 w-5 ml-1 transition-transform group-hover:translate-x-1" />
          </a>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group cursor-pointer"
            >
              <div className="relative overflow-hidden rounded-lg mb-4">
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
              </div>
              <div className="flex items-center text-sm text-[#6a5748] mb-2">
                <span className="font-semibold text-[#4a3728] uppercase tracking-wider text-xs">
                  {project.category}
                </span>
                <span className="mx-2">•</span>
                <span>{project.location}</span>
              </div>
              <h3 className="text-xl font-bold text-[#4a3728] group-hover:text-[#c17f24] transition-colors">
                {project.title}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Projects;
