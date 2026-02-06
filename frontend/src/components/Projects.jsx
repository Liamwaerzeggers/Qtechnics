import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Fallback projects when database is empty
const fallbackProjects = [
  {
    id: 'demo-1',
    category: 'totaalproject',
    title: 'Volledige woning renovatie',
    location: 'Hasselt',
    mainImage: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
    featured: true,
  },
  {
    id: 'demo-2',
    category: 'badkamer',
    title: 'Luxe badkamer met inloopdouche',
    location: 'Genk',
    mainImage: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&q=80',
    featured: true,
  },
  {
    id: 'demo-3',
    category: 'keuken',
    title: 'Design keuken met kookeiland',
    location: 'Lommel',
    mainImage: 'https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=600&q=80',
    featured: true,
  },
];

const getCategoryLabel = (category) => {
  const map = {
    'totaalproject': 'TOTAALPROJECT',
    'badkamer': 'BADKAMER',
    'keuken': 'KEUKEN',
    'maatkasten': 'MAATKASTEN',
    'technieken': 'TECHNIEKEN',
  };
  return map[category] || category?.toUpperCase() || 'PROJECT';
};

const getImageUrl = (url) => {
  if (!url) return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads/')) {
    return `${BACKEND_URL}/api${url}`;
  }
  return `${BACKEND_URL}${url}`;
};

const ProjectCard = ({ project }) => {
  const isDemo = project.id.startsWith('demo-');
  const linkTo = isDemo ? '/projecten' : `/projecten/${project.id}`;
  
  return (
    <Link to={linkTo} className="group cursor-pointer block">
      <div className="relative overflow-hidden rounded-lg mb-4">
        <img
          src={getImageUrl(project.mainImage)}
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
      <h3 className="text-xl font-bold text-[#202020] group-hover:text-[#500000] transition-colors">
        {project.title}
      </h3>
    </Link>
  );
};

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/projects`);
        if (response.ok) {
          const data = await response.json();
          // Filter featured projects and take max 3
          const featuredProjects = data
            .filter(p => p.featured === true)
            .slice(0, 3);
          
          if (featuredProjects.length > 0) {
            setProjects(featuredProjects);
          } else if (data.length > 0) {
            // If no featured projects, show first 3 projects
            setProjects(data.slice(0, 3));
          } else {
            // Use fallback if no projects at all
            setProjects(fallbackProjects);
          }
        } else {
          setProjects(fallbackProjects);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        setProjects(fallbackProjects);
      }
      setLoading(false);
    };

    fetchProjects();
  }, []);

  return (
    <section className="py-16 md:py-24 bg-white" aria-labelledby="projects-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Partner Badge */}
        <div className="flex items-center justify-center gap-4 mb-10 pb-8 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <img 
              src="https://customer-assets.emergentagent.com/job_5156f510-8e20-4fea-9392-108b3325c528/artifacts/o1xk0fzg_NEVES%20MOOI%20OP%20MAAT%20CREATIONS%20SUR%20MESURE%20JPEG%20544X420.webp" 
              alt="Neves - Mooi op Maat" 
              className="h-12 w-auto"
            />
            <div className="text-left">
              <p className="text-xs text-[#202020]/50 uppercase tracking-wider">Onze Belgische partner</p>
              <p className="text-sm text-[#3a190b] font-medium">voor maatwerk & schrijnwerk</p>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
          <div>
            <h2 id="projects-heading" className="text-3xl md:text-4xl font-bold text-[#202020] mb-4">
              Recente realisaties
            </h2>
            <p className="text-[#202020]/70 text-lg">
              Ontdek onze meest recente projecten en laat u inspireren.
            </p>
          </div>
          <Link
            to="/projecten"
            className="flex items-center text-[#3a190b] hover:text-[#500000] font-medium mt-4 md:mt-0 transition-colors group"
          >
            Alle projecten bekijken
            <ChevronRight className="h-5 w-5 ml-1 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg h-64 mb-4" />
                <div className="bg-gray-200 h-4 w-24 mb-2 rounded" />
                <div className="bg-gray-200 h-6 w-48 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Projects;
