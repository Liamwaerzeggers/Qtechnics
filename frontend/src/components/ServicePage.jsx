import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Phone, ArrowRight, CheckCircle, Award, Wrench, Clock, Users } from 'lucide-react';
import { Button } from './ui/button';
import { LOCATIONS } from './LocationPage';

// All service/search term variations for SEO
export const SERVICES = {
  // Interieur
  'interieur-renoveren': {
    title: 'Interieur Renoveren',
    h1: 'Interieur Renoveren met 35 Jaar Vakmanschap',
    description: 'Uw interieur volledig renoveren? Max Q combineert 35 jaar technische expertise met design. Van vloeren tot plafonds, wij transformeren uw woning.',
    keywords: 'interieur renoveren, interieur verbouwen, woning renoveren, huis verbouwen, interieurafwerking',
    category: 'interieur',
  },
  'interieur-verbouwen': {
    title: 'Interieur Verbouwen',
    h1: 'Interieur Verbouwen door Ervaren Vakmensen',
    description: 'Professioneel interieur verbouwen met oog voor detail. 35+ jaar ervaring in totaalrenovaties. Gratis adviesgesprek.',
    keywords: 'interieur verbouwen, binnenhuisrenovatie, woning verbouwen, interieur op maat',
    category: 'interieur',
  },
  'interieurafwerking': {
    title: 'Interieurafwerking',
    h1: 'Professionele Interieurafwerking met Technische Precisie',
    description: 'Hoogwaardige interieurafwerking door vakmensen met 35 jaar ervaring. Pleisterwerk, schilderwerk, vloeren en meer.',
    keywords: 'interieurafwerking, afwerking interieur, pleisterwerk, schilderwerk, wandafwerking',
    category: 'interieur',
  },
  
  // Badkamer
  'badkamer-renoveren': {
    title: 'Badkamer Renoveren',
    h1: 'Badkamer Renoveren met 35 Jaar Technische Expertise',
    description: 'Uw badkamer renoveren door specialisten met 35+ jaar ervaring in sanitair en technieken. Van inloopdouche tot vrijstaand bad.',
    keywords: 'badkamer renoveren, badkamer verbouwen, badkamerrenovatie, nieuwe badkamer, badkamer op maat',
    category: 'badkamer',
  },
  'badkamer-verbouwen': {
    title: 'Badkamer Verbouwen',
    h1: 'Badkamer Verbouwen met Technisch Vakmanschap',
    description: 'Badkamer verbouwen met aandacht voor sanitair, elektriciteit en waterdichting. 35 jaar ervaring garandeert kwaliteit.',
    keywords: 'badkamer verbouwen, badkamer vernieuwen, sanitair renovatie, badkamer maken',
    category: 'badkamer',
  },
  'nieuwe-badkamer': {
    title: 'Nieuwe Badkamer',
    h1: 'Nieuwe Badkamer Laten Plaatsen door Experts',
    description: 'Een nieuwe badkamer laten plaatsen? Onze technici met 35+ jaar ervaring zorgen voor perfecte installatie van sanitair tot afwerking.',
    keywords: 'nieuwe badkamer, badkamer laten plaatsen, badkamer installeren, moderne badkamer',
    category: 'badkamer',
  },
  'badkamer-op-maat': {
    title: 'Badkamer op Maat',
    h1: 'Badkamer op Maat met Jarenlange Ervaring',
    description: 'Uw dromen badkamer op maat gemaakt. Van ontwerp tot realisatie, met 35 jaar technische kennis als fundament.',
    keywords: 'badkamer op maat, maatwerk badkamer, badkamer ontwerp, luxe badkamer',
    category: 'badkamer',
  },
  'inloopdouche-plaatsen': {
    title: 'Inloopdouche Plaatsen',
    h1: 'Inloopdouche Laten Plaatsen door Vakspecialisten',
    description: 'Inloopdouche plaatsen met perfecte waterdichting en afvoer. Technische expertise van 35 jaar voor een zorgeloze installatie.',
    keywords: 'inloopdouche plaatsen, inloopdouche installeren, walk-in douche, douche renovatie',
    category: 'badkamer',
  },
  
  // Keuken
  'keuken-renoveren': {
    title: 'Keuken Renoveren',
    h1: 'Keuken Renoveren met 35 Jaar Vakmanschap',
    description: 'Uw keuken renoveren door experts met 35+ jaar ervaring. Van elektriciteit tot maatwerk kasten, alles uit één hand.',
    keywords: 'keuken renoveren, keuken verbouwen, keukenrenovatie, keuken vernieuwen',
    category: 'keuken',
  },
  'keuken-verbouwen': {
    title: 'Keuken Verbouwen',
    h1: 'Keuken Verbouwen door Technische Specialisten',
    description: 'Keuken verbouwen met aandacht voor elektriciteit, water en gas. 35 jaar technische expertise voor een veilige en mooie keuken.',
    keywords: 'keuken verbouwen, keuken aanpassen, keuken uitbreiden, keuken moderniseren',
    category: 'keuken',
  },
  'keuken-vernieuwen': {
    title: 'Keuken Vernieuwen',
    h1: 'Keuken Vernieuwen met Ervaren Vakmensen',
    description: 'Uw keuken vernieuwen? Van klassiek naar modern, onze vakmensen met 35 jaar ervaring realiseren uw droomkeuken.',
    keywords: 'keuken vernieuwen, nieuwe keuken, keuken opknappen, keuken moderniseren',
    category: 'keuken',
  },
  'nieuwe-keuken': {
    title: 'Nieuwe Keuken',
    h1: 'Nieuwe Keuken Laten Plaatsen door Experts',
    description: 'Een nieuwe keuken laten plaatsen? Volledige installatie inclusief elektriciteit, water en afwerking door ervaren technici.',
    keywords: 'nieuwe keuken, keuken laten plaatsen, keuken installeren, keuken kopen',
    category: 'keuken',
  },
  'keuken-op-maat': {
    title: 'Keuken op Maat',
    h1: 'Keuken op Maat met Technische Perfectie',
    description: 'Maatwerk keuken ontworpen en geïnstalleerd door vakmensen. 35 jaar ervaring in techniek en afwerking.',
    keywords: 'keuken op maat, maatwerk keuken, keuken ontwerp, design keuken',
    category: 'keuken',
  },
  'kookeiland-plaatsen': {
    title: 'Kookeiland Plaatsen',
    h1: 'Kookeiland Laten Plaatsen door Specialisten',
    description: 'Kookeiland plaatsen met correcte aansluitingen voor elektriciteit, water en afzuiging. Technisch vakwerk gegarandeerd.',
    keywords: 'kookeiland plaatsen, kookeiland installeren, keukeneiland, open keuken',
    category: 'keuken',
  },
  
  // Totaalrenovatie
  'totaalrenovatie': {
    title: 'Totaalrenovatie',
    h1: 'Totaalrenovatie met 35 Jaar Technische Expertise',
    description: 'Complete totaalrenovatie van uw woning. Van technieken tot afwerking, 35+ jaar ervaring voor een zorgeloos project.',
    keywords: 'totaalrenovatie, volledige renovatie, huis renoveren, woning renoveren, complete verbouwing',
    category: 'totaal',
  },
  'huis-renoveren': {
    title: 'Huis Renoveren',
    h1: 'Huis Renoveren door Ervaren Vakmensen',
    description: 'Uw huis renoveren van A tot Z. Elektriciteit, sanitair, verwarming en afwerking door technici met 35 jaar ervaring.',
    keywords: 'huis renoveren, woning renoveren, huis verbouwen, woning verbouwen',
    category: 'totaal',
  },
  'woning-renoveren': {
    title: 'Woning Renoveren',
    h1: 'Woning Renoveren met Technisch Vakmanschap',
    description: 'Professionele woningrenovatie met focus op technieken en kwaliteit. 35+ jaar ervaring voor een duurzaam resultaat.',
    keywords: 'woning renoveren, woning verbouwen, woningrenovatie, huis opknappen',
    category: 'totaal',
  },
  'verbouwing': {
    title: 'Verbouwing',
    h1: 'Verbouwing door Experts met 35 Jaar Ervaring',
    description: 'Professionele verbouwing van uw woning. Van kleine aanpassingen tot grote projecten, technisch onderbouwd.',
    keywords: 'verbouwing, verbouwen, aannemer verbouwing, huis verbouwen',
    category: 'totaal',
  },
  
  // Technieken
  'elektriciteit-renovatie': {
    title: 'Elektriciteit Renovatie',
    h1: 'Elektriciteit Renoveren met 35 Jaar Expertise',
    description: 'Elektrische installatie renoveren of vernieuwen. Conform alle normen dankzij 35+ jaar technische kennis.',
    keywords: 'elektriciteit renovatie, elektrische installatie, bedrading vernieuwen, zekeringkast',
    category: 'technieken',
  },
  'sanitair-renovatie': {
    title: 'Sanitair Renovatie',
    h1: 'Sanitair Renoveren door Technische Specialisten',
    description: 'Sanitair renoveren met perfecte leidingen en aansluitingen. 35 jaar ervaring voor een waterdicht resultaat.',
    keywords: 'sanitair renovatie, leidingen renoveren, sanitair vernieuwen, waterleiding',
    category: 'technieken',
  },
  'vloerverwarming-installeren': {
    title: 'Vloerverwarming Installeren',
    h1: 'Vloerverwarming Laten Installeren door Experts',
    description: 'Vloerverwarming installeren met jarenlange technische ervaring. Optimaal comfort en energiezuinig.',
    keywords: 'vloerverwarming installeren, vloerverwarming plaatsen, vloerverwarming leggen',
    category: 'technieken',
  },
  
  // Maatwerk
  'maatkasten': {
    title: 'Maatkasten',
    h1: 'Maatkasten op Maat door Vakbekwame Schrijnwerkers',
    description: 'Maatkasten perfect afgestemd op uw ruimte. Combinatie van design en technische precisie met 35 jaar ervaring.',
    keywords: 'maatkasten, kasten op maat, inbouwkasten, dressing op maat',
    category: 'maatwerk',
  },
  'inbouwkasten': {
    title: 'Inbouwkasten',
    h1: 'Inbouwkasten op Maat met Jarenlange Ervaring',
    description: 'Inbouwkasten die perfect passen. Van ontwerp tot plaatsing door vakmensen met oog voor detail.',
    keywords: 'inbouwkasten, kasten inbouwen, inbouwkast op maat, wandkast',
    category: 'maatwerk',
  },
  'dressing-op-maat': {
    title: 'Dressing op Maat',
    h1: 'Dressing op Maat met Technische Perfectie',
    description: 'Luxe dressing op maat gemaakt. Optimale indeling en kwaliteitsafwerking door ervaren vakmensen.',
    keywords: 'dressing op maat, inloopkast, walk-in closet, kleedkamer',
    category: 'maatwerk',
  },
};

// Get category specific content
const getCategoryContent = (category) => {
  const content = {
    interieur: {
      services: [
        'Volledige interieurafwerking',
        'Pleister- en schilderwerken',
        'Vloeren en wandbekleding',
        'Plafonds en verlichting',
        'Maatwerk schrijnwerk',
        'Decoratieve afwerking',
      ],
      image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800',
    },
    badkamer: {
      services: [
        'Complete badkamerrenovatie',
        'Inloopdouches en regendouches',
        'Vrijstaande baden',
        'Sanitair en leidingen',
        'Vloerverwarming',
        'Tegelwerk en afwerking',
        'LED-verlichting',
        'Ventilatie',
      ],
      image: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800',
    },
    keuken: {
      services: [
        'Complete keukenrenovatie',
        'Kookeilanden',
        'Maatwerk keukens',
        'Elektriciteit en verlichting',
        'Water en afvoer',
        'Werkbladen',
        'Inbouwapparatuur',
        'Afzuigsystemen',
      ],
      image: 'https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=800',
    },
    totaal: {
      services: [
        'Totaalrenovaties van A tot Z',
        'Elektriciteit en domotica',
        'Sanitair en verwarming',
        'Badkamers en keukens',
        'Vloeren en plafonds',
        'Binnenschrijnwerk',
        'Schilderwerken',
        'Isolatie',
      ],
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
    },
    technieken: {
      services: [
        'Elektriciteitswerken',
        'Sanitair en leidingen',
        'Centrale verwarming',
        'Vloerverwarming',
        'Ventilatie',
        'Domotica',
        'Zonnepanelen aansluiting',
        'Keuring en conformiteit',
      ],
      image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800',
    },
    maatwerk: {
      services: [
        'Maatkasten en dressings',
        'Inbouwkasten',
        'Wandmeubels',
        'Bureau op maat',
        'Schuifdeuren',
        'Boekenkasten',
        'TV-meubels',
        'Opbergsystemen',
      ],
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    },
  };
  return content[category] || content.totaal;
};

const ServicePage = () => {
  const { service, location } = useParams();
  
  // Find service data
  const serviceData = SERVICES[service];
  const locationData = location ? LOCATIONS.find(l => l.slug === location) : null;
  const categoryContent = serviceData ? getCategoryContent(serviceData.category) : getCategoryContent('totaal');
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [service, location]);

  if (!serviceData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Pagina niet gevonden</h1>
          <Link to="/">
            <Button className="bg-[#3a190b] text-white">Terug naar home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const locationSuffix = locationData ? ` in ${locationData.name}` : '';
  const locationProvince = locationData ? ` (${locationData.province})` : ' in Limburg en Antwerpen';
  
  const pageTitle = `${serviceData.title}${locationSuffix} | 35 Jaar Ervaring | Max Q`;
  const metaDescription = locationData 
    ? `${serviceData.description.replace('.', '')} in ${locationData.name}${locationProvince}. Vraag gratis offerte aan!`
    : `${serviceData.description} Vraag gratis offerte aan!`;
  const canonicalUrl = location 
    ? `https://maxq.be/diensten/${service}/${location}`
    : `https://maxq.be/diensten/${service}`;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta name="keywords" content={`${serviceData.keywords}, ${locationData ? locationData.name + ', ' : ''}35 jaar ervaring, technische expertise`} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta name="robots" content="index, follow" />
      </Helmet>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#3a190b] to-[#500000] text-white py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img src={categoryContent.image} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Trust badges */}
          <div className="flex flex-wrap gap-4 mb-6">
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm">
              <Award className="h-4 w-4" />
              35+ Jaar Ervaring
            </span>
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm">
              <Wrench className="h-4 w-4" />
              Technische Expertise
            </span>
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm">
              <Users className="h-4 w-4" />
              Eigen Vakmensen
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {serviceData.h1}{locationSuffix}
          </h1>
          
          <p className="text-xl text-white/90 mb-8 max-w-3xl">
            {serviceData.description}
            {locationData && ` Wij zijn actief in ${locationData.name} en omgeving.`}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/start">
              <Button className="bg-white text-[#3a190b] hover:bg-gray-100 px-6 py-3 text-base">
                Gratis offerte aanvragen
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <a href="tel:+32488152028">
              <Button variant="outline" className="border-white text-white hover:bg-white/10 px-6 py-3 text-base">
                <Phone className="h-4 w-4 mr-2" />
                +32 488 15 20 28
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* USP Section */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="w-12 h-12 bg-[#3a190b]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-6 w-6 text-[#3a190b]" />
              </div>
              <h3 className="font-bold text-[#202020] mb-2">35+ Jaar Ervaring</h3>
              <p className="text-sm text-[#202020]/70">Decennia aan technische kennis en vakmanschap</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="w-12 h-12 bg-[#3a190b]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wrench className="h-6 w-6 text-[#3a190b]" />
              </div>
              <h3 className="font-bold text-[#202020] mb-2">Technische Basis</h3>
              <p className="text-sm text-[#202020]/70">Sterke expertise in elektriciteit, sanitair en verwarming</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="w-12 h-12 bg-[#3a190b]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-[#3a190b]" />
              </div>
              <h3 className="font-bold text-[#202020] mb-2">Eigen Vakmensen</h3>
              <p className="text-sm text-[#202020]/70">Geen onderaannemers, directe communicatie</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="w-12 h-12 bg-[#3a190b]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-[#3a190b]" />
              </div>
              <h3 className="font-bold text-[#202020] mb-2">Stipte Planning</h3>
              <p className="text-sm text-[#202020]/70">Duidelijke timing en transparante communicatie</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold text-[#202020] mb-6">
                Waarom kiezen voor Max Q?
              </h2>
              
              <p className="text-lg text-[#202020]/80 mb-6">
                Met meer dan <strong>35 jaar ervaring</strong> in de bouwsector hebben wij een stevige basis opgebouwd in techniek. 
                Deze expertise maakt het verschil bij elke renovatie: van de onzichtbare leidingen tot de zichtbare afwerking, 
                alles wordt vakkundig uitgevoerd.
              </p>
              
              <p className="text-lg text-[#202020]/80 mb-6">
                Onze <strong>sterke technische achtergrond</strong> betekent dat wij niet alleen mooi werk leveren, maar ook 
                duurzaam en veilig. Elektriciteit, sanitair, verwarming en ventilatie worden door onze eigen specialisten 
                geïnstalleerd volgens alle normen.
              </p>
              
              <ul className="space-y-3">
                {[
                  'Gratis en vrijblijvend adviesgesprek',
                  'Gedetailleerde offerte zonder verrassingen',
                  'Alle technieken in eigen beheer',
                  'Persoonlijke begeleiding van A tot Z',
                  'Kwaliteitsgarantie op alle werken',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-[#202020]/80">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="font-bold text-[#202020] mb-4">Onze diensten</h3>
                <ul className="space-y-2">
                  {categoryContent.services.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-[#202020]/80">
                      <span className="w-1.5 h-1.5 bg-[#3a190b] rounded-full"></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="rounded-lg overflow-hidden">
                <img 
                  src={categoryContent.image} 
                  alt={serviceData.title}
                  className="w-full h-64 object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Location variants */}
      {!locationData && (
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="font-bold text-[#202020] mb-6">{serviceData.title} in uw regio</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {LOCATIONS.slice(0, 24).map(loc => (
                <Link 
                  key={loc.slug}
                  to={`/diensten/${service}/${loc.slug}`}
                  className="text-sm text-[#3a190b] hover:underline bg-white px-3 py-2 rounded shadow-sm"
                >
                  {loc.name}
                </Link>
              ))}
            </div>
            <p className="text-sm text-[#202020]/50 mt-4">En nog veel meer gemeenten in Limburg, Antwerpen en Vlaams-Brabant...</p>
          </div>
        </section>
      )}

      {/* Related services */}
      <section className="py-12 bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="font-bold text-[#202020] mb-6">Gerelateerde diensten</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(SERVICES)
              .filter(([key]) => key !== service)
              .slice(0, 8)
              .map(([key, data]) => (
                <Link 
                  key={key}
                  to={`/diensten/${key}${location ? `/${location}` : ''}`}
                  className="text-sm bg-gray-100 hover:bg-[#3a190b] hover:text-white px-4 py-2 rounded transition-colors"
                >
                  {data.title}
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[#3a190b]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Klaar om te starten met uw project?
          </h2>
          <p className="text-white/80 mb-8">
            Vraag vandaag nog een gratis en vrijblijvend adviesgesprek aan. 
            Onze experts met 35 jaar ervaring komen graag bij u langs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/start">
              <Button className="bg-white text-[#3a190b] hover:bg-gray-100 px-8 py-3">
                Gratis adviesgesprek aanvragen
              </Button>
            </Link>
            <Link to="/projecten">
              <Button variant="outline" className="border-white text-white hover:bg-white/10 px-8 py-3">
                Bekijk onze realisaties
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default ServicePage;
