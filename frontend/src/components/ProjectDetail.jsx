import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MapPin, X } from 'lucide-react';
import { Button } from './ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ProjectDetail = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const loadProject = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/projects/${id}`);
        if (response.ok) {
          const data = await response.json();
          setProject(data);
        }
      } catch (error) {
        console.error('Error fetching project:', error);
      }
      setLoading(false);
    };
    loadProject();
  }, [id]);

  const allImages = project ? [project.mainImage, ...project.galleryImages].filter(Boolean) : [];

  const openLightbox = (index) => {
    setCurrentImageIndex(index);
    setSelectedImage(allImages[index]);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const nextImage = () => {
    const newIndex = (currentImageIndex + 1) % allImages.length;
    setCurrentImageIndex(newIndex);
    setSelectedImage(allImages[newIndex]);
  };

  const prevImage = () => {
    const newIndex = (currentImageIndex - 1 + allImages.length) % allImages.length;
    setCurrentImageIndex(newIndex);
    setSelectedImage(allImages[newIndex]);
  };

  const getCategoryLabel = (category) => {
    const labels = {
      totaalproject: 'Totaalproject',
      badkamer: 'Badkamer',
      keuken: 'Keuken',
      maatkasten: 'Maatkasten',
      technieken: 'Technieken',
    };
    return labels[category] || category;
  };

  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3a190b]"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-[#202020] mb-4">Project niet gevonden</h1>
        <Link to="/projecten">
          <Button variant="outline">Terug naar projecten</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Back Button */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            to="/projecten" 
            className="inline-flex items-center text-[#3a190b] hover:text-[#500000] transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug naar projecten
          </Link>
        </div>
      </div>

      {/* Hero Image */}
      {project.mainImage && (
        <div 
          className="relative h-[400px] md:h-[500px] bg-cover bg-center cursor-pointer"
          style={{ backgroundImage: `url(${getImageUrl(project.mainImage)})` }}
          onClick={() => openLightbox(0)}
        >
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/70 to-transparent">
            <div className="max-w-7xl mx-auto">
              <span className="inline-block bg-[#3a190b] text-white text-xs font-semibold px-3 py-1 rounded mb-4">
                {getCategoryLabel(project.category)}
              </span>
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{project.title}</h1>
              <div className="flex items-center text-white/90">
                <MapPin className="h-4 w-4 mr-2" />
                {project.location}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-[#202020] mb-6">Over dit project</h2>
            <div className="prose prose-lg max-w-none text-[#202020]/80">
              <p className="text-lg leading-relaxed mb-6">{project.shortDescription}</p>
              {project.fullDescription && (
                <div 
                  className="leading-relaxed whitespace-pre-line"
                  dangerouslySetInnerHTML={{ __html: project.fullDescription.replace(/\n/g, '<br/>') }}
                />
              )}
            </div>

            {/* Gallery */}
            {project.galleryImages && project.galleryImages.length > 0 && (
              <div className="mt-12">
                <h2 className="text-2xl font-bold text-[#202020] mb-6">Foto's</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {project.galleryImages.map((image, index) => (
                    <div 
                      key={index}
                      className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => openLightbox(index + 1)}
                    >
                      <img 
                        src={getImageUrl(image)} 
                        alt={`${project.title} foto ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-lg p-6 sticky top-24">
              <h3 className="text-lg font-bold text-[#202020] mb-4">Project details</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-[#202020]/60">Categorie</span>
                  <p className="font-medium text-[#202020]">{getCategoryLabel(project.category)}</p>
                </div>
                <div>
                  <span className="text-sm text-[#202020]/60">Locatie</span>
                  <p className="font-medium text-[#202020]">{project.location}</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-sm text-[#202020]/70 mb-4">
                  Geïnspireerd door dit project? Neem contact met ons op voor een vrijblijvend gesprek.
                </p>
                <Link to="/start" className="block">
                  <Button className="w-full bg-[#3a190b] hover:bg-[#500000] text-white">
                    Start uw project
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <section className="py-16 bg-[#3a190b]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Uw project hier?</h2>
          <p className="text-white/80 mb-8">
            Laat u inspireren en ontdek wat Max Q voor u kan betekenen.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/start">
              <Button className="bg-white text-[#3a190b] hover:bg-gray-100">
                Gratis plaatsbezoek aanvragen
              </Button>
            </Link>
            <Link to="/projecten">
              <Button variant="outline" className="border-white text-white hover:bg-white hover:text-[#3a190b]">
                Bekijk meer projecten
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button 
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={closeLightbox}
          >
            <X className="h-8 w-8" />
          </button>
          
          {allImages.length > 1 && (
            <>
              <button 
                className="absolute left-4 text-white hover:text-gray-300 p-2"
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
              >
                <ArrowLeft className="h-8 w-8" />
              </button>
              <button 
                className="absolute right-4 text-white hover:text-gray-300 p-2"
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
              >
                <ArrowRight className="h-8 w-8" />
              </button>
            </>
          )}
          
          <img 
            src={getImageUrl(selectedImage)} 
            alt="Project foto"
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          
          <div className="absolute bottom-4 text-white text-sm">
            {currentImageIndex + 1} / {allImages.length}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
