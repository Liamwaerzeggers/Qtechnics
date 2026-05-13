import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MapPin } from 'lucide-react';
import Breadcrumbs from './Breadcrumbs';
import { Button } from './ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const BeforeAfterPair = ({ pair, getUrl }) => (
  <div className="flex items-center gap-3 md:gap-6">
    <div className="flex-1 relative">
      <img
        src={getUrl(pair.before)}
        alt="Voor"
        className="w-full aspect-[4/3] object-cover rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.15)]"
      />
      <span className="absolute top-3 left-3 bg-[#3a190b]/85 text-white text-xs font-bold px-3 py-1 rounded-full tracking-wide">
        VOOR
      </span>
    </div>
    <div className="flex-shrink-0">
      <ArrowRight className="h-6 w-6 md:h-8 md:w-8 text-[#3a190b]" />
    </div>
    <div className="flex-1 relative">
      <img
        src={getUrl(pair.after)}
        alt="Na"
        className="w-full aspect-[4/3] object-cover rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.15)]"
      />
      <span className="absolute top-3 left-3 bg-green-700/85 text-white text-xs font-bold px-3 py-1 rounded-full tracking-wide">
        NA
      </span>
    </div>
  </div>
);

const BeforeAfterSection = ({ pairs, getUrl }) => {
  if (!pairs || pairs.length === 0) return null;
  const validPairs = pairs.filter(p => p.before && p.after);
  if (validPairs.length === 0) return null;

  return (
    <div className="mt-12" data-testid="before-after-section">
      <h2 className="text-2xl font-bold mb-6">Voor & Na</h2>
      <div className="space-y-8">
        {validPairs.map((pair, i) => (
          <BeforeAfterPair key={i} pair={pair} getUrl={getUrl} />
        ))}
      </div>
    </div>
  );
};

const GalleryGrid = ({ images, getUrl }) => {
  if (!images || images.length === 0) return null;
  
  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-6">Foto's</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((img, i) => (
          <img 
            key={i} 
            src={getUrl(img)} 
            alt={`Project foto ${i + 1}`}
            className="aspect-square object-cover rounded-lg hover:opacity-90 transition-opacity cursor-pointer" 
          />
        ))}
      </div>
    </div>
  );
};

const ProjectSidebar = ({ project }) => (
  <div className="bg-gray-50 rounded-lg p-6 sticky top-24">
    <h3 className="font-bold mb-4">Details</h3>
    <p className="text-sm text-gray-500">Categorie</p>
    <p className="font-medium mb-4 capitalize">{project.category}</p>
    <p className="text-sm text-gray-500">Locatie</p>
    <p className="font-medium mb-6">{project.location}</p>
    <Link to="/start">
      <Button className="w-full bg-[#3a190b] text-white hover:bg-[#500000]">Start uw project</Button>
    </Link>
  </div>
);

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3a190b]"></div>
  </div>
);

const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center">
    <h1 className="text-2xl font-bold mb-4">Project niet gevonden</h1>
    <Link to="/projecten">
      <Button className="bg-[#3a190b] text-white">Terug naar projecten</Button>
    </Link>
  </div>
);

const ProjectDetail = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/projects/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProject(data);
        }
      } catch (e) {
        console.error('Error loading project:', e);
      }
      setLoading(false);
    };
    loadData();
  }, [id]);

  const getUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    // Support all upload paths
    if (url.startsWith('/uploads/') || url.startsWith('/api/uploads/') || url.startsWith('/api/images/')) {
      const cleanUrl = url.startsWith('/uploads/') ? `/api${url}` : url;
      return `${BACKEND_URL}${cleanUrl}`;
    }
    return `${BACKEND_URL}${url}`;
  };

  if (loading) return <LoadingSpinner />;
  if (!project) return <NotFound />;

  const heroImageUrl = getUrl(project.mainImage);

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Projecten', href: '/projecten' },
        { label: project.title }
      ]} />

      <div 
        className="relative h-96 bg-cover bg-center" 
        style={{ backgroundImage: `url(${heroImageUrl})` }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/70">
          <div className="max-w-7xl mx-auto">
            <span className="inline-block bg-[#3a190b] text-white text-xs px-3 py-1 rounded mb-4 capitalize">
              {project.category}
            </span>
            <h1 className="text-4xl font-bold text-white mb-2">{project.title}</h1>
            <div className="flex items-center text-white/90">
              <MapPin className="h-4 w-4 mr-2" />
              {project.location}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">Over dit project</h2>
            <p className="text-lg text-gray-700 mb-6">{project.shortDescription}</p>
            {project.fullDescription && (
              <div className="prose max-w-none">
                <p className="text-gray-600 whitespace-pre-line">{project.fullDescription}</p>
              </div>
            )}
            
            <BeforeAfterSection pairs={project.beforeAfterImages} getUrl={getUrl} />
            <GalleryGrid images={project.galleryImages} getUrl={getUrl} />
          </div>

          <div>
            <ProjectSidebar project={project} />
          </div>
        </div>
      </div>

      <section className="py-16 bg-[#3a190b]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Uw project hier?</h2>
          <p className="text-white/80 mb-8">Ontdek wat Max Q voor u kan betekenen.</p>
          <Link to="/start">
            <Button className="bg-white text-[#3a190b] hover:bg-gray-100">Gratis plaatsbezoek aanvragen</Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default ProjectDetail;
