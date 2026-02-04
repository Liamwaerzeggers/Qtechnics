import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { Button } from './ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function ProjectDetail() {
  const params = useParams();
  const [project, setProject] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(BACKEND_URL + '/api/projects/' + params.id)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setProject(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  const getUrl = (url) => url && url.startsWith('http') ? url : BACKEND_URL + url;

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3a190b]"></div></div>;
  
  if (!project) return <div className="min-h-screen flex flex-col items-center justify-center"><h1 className="text-2xl font-bold mb-4">Project niet gevonden</h1><Link to="/projecten"><Button>Terug</Button></Link></div>;

  return (
    <div>
      <div className="bg-gray-50 border-b py-4">
        <div className="max-w-7xl mx-auto px-4">
          <Link to="/projecten" className="inline-flex items-center text-[#3a190b]"><ArrowLeft className="h-4 w-4 mr-2" />Terug</Link>
        </div>
      </div>

      <div className="relative h-96 bg-cover bg-center" style={{backgroundImage: `url(${getUrl(project.mainImage)})`}}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/70">
          <div className="max-w-7xl mx-auto">
            <span className="inline-block bg-[#3a190b] text-white text-xs px-3 py-1 rounded mb-4">{project.category}</span>
            <h1 className="text-4xl font-bold text-white mb-2">{project.title}</h1>
            <div className="flex items-center text-white/90"><MapPin className="h-4 w-4 mr-2" />{project.location}</div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">Over dit project</h2>
            <p className="text-lg text-gray-700 mb-6">{project.shortDescription}</p>
            {project.fullDescription && <p className="text-gray-600 whitespace-pre-line">{project.fullDescription}</p>}
            
            {project.galleryImages && project.galleryImages.length > 0 && (
              <div className="mt-12">
                <h2 className="text-2xl font-bold mb-6">Foto's</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {project.galleryImages.map((img, i) => (
                    <img key={i} src={getUrl(img)} alt="" className="aspect-square object-cover rounded-lg" />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="bg-gray-50 rounded-lg p-6 sticky top-24">
              <h3 className="font-bold mb-4">Details</h3>
              <p className="text-sm text-gray-500">Categorie</p>
              <p className="font-medium mb-4">{project.category}</p>
              <p className="text-sm text-gray-500">Locatie</p>
              <p className="font-medium mb-6">{project.location}</p>
              <Link to="/start"><Button className="w-full bg-[#3a190b] text-white">Start uw project</Button></Link>
            </div>
          </div>
        </div>
      </div>

      <section className="py-16 bg-[#3a190b]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Uw project hier?</h2>
          <p className="text-white/80 mb-8">Ontdek wat Max Q voor u kan betekenen.</p>
          <Link to="/start"><Button className="bg-white text-[#3a190b]">Gratis plaatsbezoek</Button></Link>
        </div>
      </section>
    </div>
  );
}

export default ProjectDetail;
