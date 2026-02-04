import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { Link } from 'react-router-dom';

const projects = [
  {
    id: 1,
    category: 'totaalproject',
    title: 'Volledige woning renovatie',
    location: 'Hasselt',
    description: 'Complete renovatie van een jaren \'60 woning tot moderne gezinswoning.',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80',
    featured: true,
  },
  {
    id: 2,
    category: 'badkamer',
    title: 'Luxe badkamer met inloopdouche',
    location: 'Genk',
    description: 'Transformatie van een klassieke badkamer naar een moderne wellness-oase.',
    image: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&q=80',
    featured: true,
  },
  {
    id: 3,
    category: 'keuken',
    title: 'Design keuken met kookeiland',
    location: 'Lommel',
    description: 'Strakke keuken met groot kookeiland en hoogwaardige afwerking.',
    image: 'https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=600&q=80',
    featured: true,
  },
  {
    id: 4,
    category: 'maatkasten',
    title: 'Inloopkast op maat',
    location: 'Beringen',
    description: 'Luxe inloopkast met slimme indeling en geïntegreerde verlichting.',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    featured: false,
  },
  {
    id: 5,
    category: 'badkamer',
    title: 'Moderne badkamer renovatie',
    location: 'Ham',
    description: 'Compacte badkamer getransformeerd tot functionele ruimte met stijlvolle afwerking.',
    image: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=600&q=80',
    featured: false,
  },
  {
    id: 6,
    category: 'technieken',
    title: 'Warmtepomp installatie',
    location: 'Tessenderlo',
    description: 'Vervanging oude gasketel door moderne lucht-water warmtepomp.',
    image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80',
    featured: false,
  },
];

const categories = [
  { id: 'alle', label: 'Alle' },
  { id: 'totaalproject', label: 'Totaalproject' },
  { id: 'badkamer', label: 'Badkamer' },
  { id: 'keuken', label: 'Keuken' },
  { id: 'maatkasten', label: 'Maatkasten' },
  { id: 'technieken', label: 'Technieken' },
];

const ProjectenPage = () => {
  const [activeCategory, setActiveCategory] = useState('alle');

  const filteredProjects = activeCategory === 'alle' 
    ? projects 
    : projects.filter(p => p.category === activeCategory);

  return (
    <div>
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#202020] mb-6">
            Onze realisaties
          </h1>
          <p className="text-lg md:text-xl text-[#202020]/70 max-w-3xl leading-relaxed">
            Ontdek onze projecten en laat u inspireren. Van badkamerrenovaties tot complete woningtransformaties.
          </p>
        </div>
      </section>

      {/* Filter Buttons */}
      <section className="pb-8 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-[#3a190b] text-white'
                    : 'bg-gray-100 text-[#202020] hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProjects.map((project) => (
              <div key={project.id} className="group cursor-pointer">
                <div className="relative overflow-hidden rounded-lg mb-4">
                  {project.featured && (
                    <span className="absolute top-4 left-4 bg-[#3a190b] text-white text-xs font-semibold px-3 py-1 rounded z-10">
                      Uitgelicht
                    </span>
                  )}
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                </div>
                <div className="flex items-center text-sm text-[#202020]/70 mb-2">
                  <span className="font-semibold text-[#3a190b] uppercase tracking-wider text-xs">
                    {project.category}
                  </span>
                  <span className="mx-2">•</span>
                  <span>{project.location}</span>
                </div>
                <h3 className="text-xl font-bold text-[#202020] group-hover:text-[#500000] transition-colors mb-2">
                  {project.title}
                </h3>
                <p className="text-[#202020]/70 text-sm leading-relaxed">
                  {project.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-[#3a190b]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Uw project hier?
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Laat u inspireren door onze realisaties en ontdek wat Max Q voor u kan betekenen.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button className="bg-white text-[#3a190b] hover:bg-gray-100 px-6 py-3 text-base flex items-center gap-2 group">
              Gratis plaatsbezoek aanvragen
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-[#3a190b] px-6 py-3 text-base"
            >
              Neem contact op
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProjectenPage;
