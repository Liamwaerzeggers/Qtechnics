import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { Link } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const categories = [
  { id: 'alle', label: 'Alle' },
  { id: 'totaalproject', label: 'Totaalproject' },
  { id: 'badkamer', label: 'Badkamer' },
  { id: 'keuken', label: 'Keuken' },
  { id: 'maatkasten', label: 'Maatkasten' },
  { id: 'technieken', label: 'Technieken' },
];

// Fallback projects for when database is empty
const fallbackProjects = [
  {
    id: 'demo-1',
    category: 'totaalproject',
    title: 'Volledige woning renovatie',
    location: 'Hasselt',
    shortDescription: 'Complete renovatie van een jaren \'60 woning tot moderne gezinswoning.',
    mainImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80',
    featured: true,
  },
  {
    id: 'demo-2',
    category: 'badkamer',
    title: 'Luxe badkamer met inloopdouche',
    location: 'Genk',
    shortDescription: 'Transformatie van een klassieke badkamer naar een moderne wellness-oase.',
    mainImage: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&q=80',
    featured: true,
  },
  {
    id: 'demo-3',
    category: 'keuken',
    title: 'Design keuken met kookeiland',
    location: 'Lommel',
    shortDescription: 'Strakke keuken met groot kookeiland en hoogwaardige afwerking.',
    mainImage: 'https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=600&q=80',
    featured: true,
  },
  {
    id: 'demo-4',
    category: 'maatkasten',
    title: 'Inloopkast op maat',
    location: 'Beringen',
    shortDescription: 'Luxe inloopkast met slimme indeling en geïntegreerde verlichting.',
    mainImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    featured: false,
  },
  {
    id: 'demo-5',
    category: 'badkamer',
    title: 'Moderne badkamer renovatie',
    location: 'Ham',
    shortDescription: 'Compacte badkamer getransformeerd tot functionele ruimte met stijlvolle afwerking.',
    mainImage: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=600&q=80',
    featured: false,
  },
  {
    id: 'demo-6',
    category: 'technieken',
    title: 'Warmtepomp installatie',
    location: 'Tessenderlo',
    shortDescription: 'Vervanging oude gasketel door moderne lucht-water warmtepomp.',
    mainImage: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80',
    featured: false,
  },
];

const ProjectenPage = () => {
  const [activeCategory, setActiveCategory] = useState('alle');
  const [projects, setProjects] = useState(fallbackProjects);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/projects`);
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          setProjects(data);
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
    setLoading(false);
  };

  const filteredProjects = activeCategory === 'alle' 
    ? projects 
    : projects.filter(p => p.category === activeCategory);

  const getImageUrl = (url) => {
    if (!url) return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80';
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  };

  const getCategoryLabel = (category) => {
    const cat = categories.find(c => c.id === category);
    return cat ? cat.label : category;
  };

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
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3a190b]"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProjects.map((project) => (
                <Link 
                  key={project.id} 
                  to={project.id.startsWith('demo-') ? '#' : `/projecten/${project.id}`}
                  className="group cursor-pointer block"
                  onClick={(e) => {
                    if (project.id.startsWith('demo-')) {
                      e.preventDefault();
                    }
                  }}
                >
                  <div className="relative overflow-hidden rounded-lg mb-4">
                    {project.featured && (
                      <span className="absolute top-4 left-4 bg-[#3a190b] text-white text-xs font-semibold px-3 py-1 rounded z-10">
                        Uitgelicht
                      </span>
                    )}
                    <img
                      src={getImageUrl(project.mainImage || project.image)}
                      alt={project.title}
                      className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                  </div>
                  <div className="flex items-center text-sm text-[#202020]/70 mb-2">
                    <span className="font-semibold text-[#3a190b] uppercase tracking-wider text-xs">
                      {getCategoryLabel(project.category)}
                    </span>
                    <span className="mx-2">•</span>
                    <span>{project.location}</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#202020] group-hover:text-[#500000] transition-colors mb-2">
                    {project.title}
                  </h3>
                  <p className="text-[#202020]/70 text-sm leading-relaxed">
                    {project.shortDescription || project.description}
                  </p>
                </Link>
              ))}
            </div>
          )}
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
            <Link to="/start">
              <Button className="bg-white text-[#3a190b] hover:bg-gray-100 px-6 py-3 text-base flex items-center gap-2 group">
                Gratis plaatsbezoek aanvragen
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-[#3a190b] px-6 py-3 text-base"
              >
                Neem contact op
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProjectenPage;
