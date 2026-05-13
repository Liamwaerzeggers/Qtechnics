import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { MapPin, Phone, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import Breadcrumbs from './Breadcrumbs';
import InternalLinks from './InternalLinks';

// All locations within 30km of Oostham (Tessenderlo-Ham area)
export const LOCATIONS = [
  // Limburg - Core area
  { slug: 'tessenderlo', name: 'Tessenderlo', province: 'Limburg' },
  { slug: 'ham', name: 'Ham', province: 'Limburg' },
  { slug: 'leopoldsburg', name: 'Leopoldsburg', province: 'Limburg' },
  { slug: 'beringen', name: 'Beringen', province: 'Limburg' },
  { slug: 'heusden-zolder', name: 'Heusden-Zolder', province: 'Limburg' },
  { slug: 'houthalen-helchteren', name: 'Houthalen-Helchteren', province: 'Limburg' },
  { slug: 'lummen', name: 'Lummen', province: 'Limburg' },
  { slug: 'halen', name: 'Halen', province: 'Limburg' },
  { slug: 'zonhoven', name: 'Zonhoven', province: 'Limburg' },
  { slug: 'hasselt', name: 'Hasselt', province: 'Limburg' },
  { slug: 'genk', name: 'Genk', province: 'Limburg' },
  { slug: 'diepenbeek', name: 'Diepenbeek', province: 'Limburg' },
  { slug: 'peer', name: 'Peer', province: 'Limburg' },
  { slug: 'pelt', name: 'Pelt', province: 'Limburg' },
  { slug: 'lommel', name: 'Lommel', province: 'Limburg' },
  { slug: 'bocholt', name: 'Bocholt', province: 'Limburg' },
  { slug: 'hamont-achel', name: 'Hamont-Achel', province: 'Limburg' },
  { slug: 'bree', name: 'Bree', province: 'Limburg' },
  { slug: 'kinrooi', name: 'Kinrooi', province: 'Limburg' },
  { slug: 'maaseik', name: 'Maaseik', province: 'Limburg' },
  { slug: 'dilsen-stokkem', name: 'Dilsen-Stokkem', province: 'Limburg' },
  { slug: 'as', name: 'As', province: 'Limburg' },
  { slug: 'opglabbeek', name: 'Opglabbeek', province: 'Limburg' },
  { slug: 'zutendaal', name: 'Zutendaal', province: 'Limburg' },
  { slug: 'lanaken', name: 'Lanaken', province: 'Limburg' },
  { slug: 'bilzen', name: 'Bilzen', province: 'Limburg' },
  { slug: 'hoeselt', name: 'Hoeselt', province: 'Limburg' },
  { slug: 'riemst', name: 'Riemst', province: 'Limburg' },
  { slug: 'tongeren', name: 'Tongeren', province: 'Limburg' },
  { slug: 'borgloon', name: 'Borgloon', province: 'Limburg' },
  { slug: 'sint-truiden', name: 'Sint-Truiden', province: 'Limburg' },
  { slug: 'nieuwerkerken', name: 'Nieuwerkerken', province: 'Limburg' },
  { slug: 'gingelom', name: 'Gingelom', province: 'Limburg' },
  { slug: 'kortenaken', name: 'Kortenaken', province: 'Limburg' },
  { slug: 'alken', name: 'Alken', province: 'Limburg' },
  { slug: 'wellen', name: 'Wellen', province: 'Limburg' },
  { slug: 'kortessem', name: 'Kortessem', province: 'Limburg' },
  { slug: 'herstappe', name: 'Herstappe', province: 'Limburg' },
  { slug: 'voeren', name: 'Voeren', province: 'Limburg' },
  { slug: 'maasmechelen', name: 'Maasmechelen', province: 'Limburg' },
  
  // Antwerpen Province - nearby
  { slug: 'meerhout', name: 'Meerhout', province: 'Antwerpen' },
  { slug: 'geel', name: 'Geel', province: 'Antwerpen' },
  { slug: 'mol', name: 'Mol', province: 'Antwerpen' },
  { slug: 'balen', name: 'Balen', province: 'Antwerpen' },
  { slug: 'dessel', name: 'Dessel', province: 'Antwerpen' },
  { slug: 'retie', name: 'Retie', province: 'Antwerpen' },
  { slug: 'laakdal', name: 'Laakdal', province: 'Antwerpen' },
  { slug: 'westerlo', name: 'Westerlo', province: 'Antwerpen' },
  { slug: 'herselt', name: 'Herselt', province: 'Antwerpen' },
  { slug: 'hulshout', name: 'Hulshout', province: 'Antwerpen' },
  { slug: 'herentals', name: 'Herentals', province: 'Antwerpen' },
  { slug: 'olen', name: 'Olen', province: 'Antwerpen' },
  { slug: 'herenthout', name: 'Herenthout', province: 'Antwerpen' },
  { slug: 'vorselaar', name: 'Vorselaar', province: 'Antwerpen' },
  { slug: 'lille', name: 'Lille', province: 'Antwerpen' },
  { slug: 'kasterlee', name: 'Kasterlee', province: 'Antwerpen' },
  { slug: 'turnhout', name: 'Turnhout', province: 'Antwerpen' },
  { slug: 'arendonk', name: 'Arendonk', province: 'Antwerpen' },
  { slug: 'ravels', name: 'Ravels', province: 'Antwerpen' },
  
  // Vlaams-Brabant - nearby
  { slug: 'diest', name: 'Diest', province: 'Vlaams-Brabant' },
  { slug: 'scherpenheuvel-zichem', name: 'Scherpenheuvel-Zichem', province: 'Vlaams-Brabant' },
  { slug: 'bekkevoort', name: 'Bekkevoort', province: 'Vlaams-Brabant' },
  { slug: 'aarschot', name: 'Aarschot', province: 'Vlaams-Brabant' },
  { slug: 'begijnendijk', name: 'Begijnendijk', province: 'Vlaams-Brabant' },
  { slug: 'rotselaar', name: 'Rotselaar', province: 'Vlaams-Brabant' },
  { slug: 'tremelo', name: 'Tremelo', province: 'Vlaams-Brabant' },
  { slug: 'keerbergen', name: 'Keerbergen', province: 'Vlaams-Brabant' },
  { slug: 'haacht', name: 'Haacht', province: 'Vlaams-Brabant' },
  { slug: 'boortmeerbeek', name: 'Boortmeerbeek', province: 'Vlaams-Brabant' },
  { slug: 'tielt-winge', name: 'Tielt-Winge', province: 'Vlaams-Brabant' },
  { slug: 'lubbeek', name: 'Lubbeek', province: 'Vlaams-Brabant' },
  { slug: 'holsbeek', name: 'Holsbeek', province: 'Vlaams-Brabant' },
  { slug: 'tienen', name: 'Tienen', province: 'Vlaams-Brabant' },
  { slug: 'linter', name: 'Linter', province: 'Vlaams-Brabant' },
  { slug: 'zoutleeuw', name: 'Zoutleeuw', province: 'Vlaams-Brabant' },
  { slug: 'geetbets', name: 'Geetbets', province: 'Vlaams-Brabant' },
  { slug: 'leuven', name: 'Leuven', province: 'Vlaams-Brabant' },
];

// Service types
export const SERVICE_TYPES = {
  algemeen: {
    title: 'Renovaties',
    titleFull: 'Renovaties & Verbouwingen',
    description: 'totaalrenovaties, verbouwingen en interieurprojecten',
    keywords: 'renovatie, verbouwing, totaalrenovatie, interieur, aannemer',
  },
  badkamer: {
    title: 'Badkamerrenovatie',
    titleFull: 'Badkamer Renoveren',
    description: 'badkamerrenovaties met inloopdouche, vrijstaand bad en modern sanitair',
    keywords: 'badkamer renovatie, badkamer verbouwen, inloopdouche, sanitair, badkamer op maat',
  },
  keuken: {
    title: 'Keukenrenovatie', 
    titleFull: 'Keuken Renoveren',
    description: 'keukenrenovaties met kookeiland, maatwerk en moderne apparatuur',
    keywords: 'keuken renovatie, keuken verbouwen, kookeiland, keuken op maat, moderne keuken',
  },
};

const LocationPage = () => {
  const { location, service } = useParams();
  
  // Find location data
  const locationData = LOCATIONS.find(l => l.slug === location);
  const serviceData = SERVICE_TYPES[service] || SERVICE_TYPES.algemeen;
  
  // Scroll to top on load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location, service]);

  if (!locationData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Locatie niet gevonden</h1>
          <Link to="/">
            <Button className="bg-[#3a190b] text-white">Terug naar home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const pageTitle = `${serviceData.title} ${locationData.name} | Max Q Renovaties`;
  const metaDescription = `Zoekt u een specialist voor ${serviceData.description} in ${locationData.name}? Max Q uit Tessenderlo-Ham helpt u! 35+ jaar ervaring, gratis offerte.`;
  const canonicalUrl = `https://maxq.be/renovatie/${location}${service !== 'algemeen' ? `/${service}` : ''}`;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta name="keywords" content={`${serviceData.keywords}, ${locationData.name}, ${locationData.province}`} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta name="robots" content="index, follow" />
      </Helmet>

      {/* Hero Section */}
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Renovatie regio', href: '/renoveren' },
        { label: locationData.name + (service !== 'algemeen' ? ' - ' + serviceData.title : '') }
      ]} />
      <section className="bg-gradient-to-br from-[#3a190b] to-[#500000] text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-white/70 mb-4">
            <MapPin className="h-4 w-4" />
            <span>{locationData.name}, {locationData.province}</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {serviceData.titleFull} in {locationData.name}
          </h1>
          
          <p className="text-xl text-white/90 mb-8 max-w-3xl">
            Max Q is uw lokale partner voor {serviceData.description} in {locationData.name} en omgeving. 
            Vanuit Tessenderlo-Ham bedienen wij heel {locationData.province} met vakmanschap en persoonlijke service.
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

      {/* Services Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#202020] mb-8">
            Onze {serviceData.title.toLowerCase()} diensten in {locationData.name}
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div>
              <p className="text-lg text-[#202020]/80 mb-6">
                Als ervaren renovatiebedrijf uit Tessenderlo-Ham zijn wij al meer dan 35 jaar actief in {locationData.name} 
                en de rest van {locationData.province}. Ons team van eigen vakmensen staat garant voor kwaliteit en een 
                persoonlijke aanpak bij elke {serviceData.title.toLowerCase()}.
              </p>
              
              <ul className="space-y-3">
                {[
                  'Gratis en vrijblijvend plaatsbezoek',
                  'Gedetailleerde offerte op maat',
                  'Eigen vakmensen - geen onderaannemers',
                  'Persoonlijk aanspreekpunt tijdens het project',
                  'Kwaliteitsgarantie op alle werken',
                  'Correcte en transparante prijzen',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-[#202020]/80">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-bold text-[#202020] mb-4">Wat wij doen in {locationData.name}</h3>
              
              {service === 'badkamer' ? (
                <ul className="space-y-2 text-[#202020]/80">
                  <li>• Complete badkamerrenovaties</li>
                  <li>• Inloopdouches en regendouches</li>
                  <li>• Vrijstaande baden</li>
                  <li>• Dubbele wastafels en meubels op maat</li>
                  <li>• Vloerverwarming</li>
                  <li>• LED-verlichting en spiegels</li>
                  <li>• Tegelwerk en afwerking</li>
                  <li>• Sanitair en leidingen</li>
                </ul>
              ) : service === 'keuken' ? (
                <ul className="space-y-2 text-[#202020]/80">
                  <li>• Complete keukenrenovaties</li>
                  <li>• Keukens met kookeiland</li>
                  <li>• Maatwerk keukens</li>
                  <li>• Inbouwapparatuur</li>
                  <li>• Werkbladen in quartz of natuursteen</li>
                  <li>• Elektriciteit en verlichting</li>
                  <li>• Vloer- en wandafwerking</li>
                  <li>• Optimale opbergruimte</li>
                </ul>
              ) : (
                <ul className="space-y-2 text-[#202020]/80">
                  <li>• Totaalrenovaties van A tot Z</li>
                  <li>• Badkamerrenovaties</li>
                  <li>• Keukenrenovaties</li>
                  <li>• Maatkasten en interieur</li>
                  <li>• Elektriciteit en domotica</li>
                  <li>• Sanitair en verwarming</li>
                  <li>• Vloeren en tegelwerk</li>
                  <li>• Schilderwerken en afwerking</li>
                </ul>
              )}
            </div>
          </div>
          
          {/* Other services in this location */}
          {service !== 'algemeen' && (
            <div className="border-t pt-8">
              <h3 className="font-bold text-[#202020] mb-4">Andere diensten in {locationData.name}</h3>
              <div className="flex flex-wrap gap-3">
                {service !== 'algemeen' && (
                  <Link to={`/renovatie/${location}`}>
                    <Button variant="outline" className="border-[#3a190b] text-[#3a190b]">
                      Alle renovaties
                    </Button>
                  </Link>
                )}
                {service !== 'badkamer' && (
                  <Link to={`/renovatie/${location}/badkamer`}>
                    <Button variant="outline" className="border-[#3a190b] text-[#3a190b]">
                      Badkamerrenovatie
                    </Button>
                  </Link>
                )}
                {service !== 'keuken' && (
                  <Link to={`/renovatie/${location}/keuken`}>
                    <Button variant="outline" className="border-[#3a190b] text-[#3a190b]">
                      Keukenrenovatie
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[#3a190b]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Start uw renovatieproject in {locationData.name}
          </h2>
          <p className="text-white/80 mb-8">
            Vraag vandaag nog een gratis plaatsbezoek aan. Wij komen graag langs om uw wensen te bespreken.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/start">
              <Button className="bg-white text-[#3a190b] hover:bg-gray-100 px-8 py-3">
                Gratis plaatsbezoek aanvragen
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

      {/* Nearby locations */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="font-bold text-[#202020] mb-4">
            {serviceData.title} in de buurt van {locationData.name}
          </h3>
          <div className="flex flex-wrap gap-2">
            {LOCATIONS
              .filter(l => l.slug !== location && l.province === locationData.province)
              .slice(0, 12)
              .map(l => (
                <Link 
                  key={l.slug}
                  to={`/renovatie/${l.slug}${service !== 'algemeen' ? `/${service}` : ''}`}
                  className="text-sm text-[#3a190b] hover:underline"
                >
                  {l.name}
                </Link>
              ))}
          </div>
        </div>
      </section>

      <InternalLinks />
    </>
  );
};

export default LocationPage;
