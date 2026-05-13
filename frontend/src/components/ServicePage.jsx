import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Phone, ArrowRight, CheckCircle, Award, Wrench, Clock, Users } from 'lucide-react';
import { Button } from './ui/button';
import { LOCATIONS } from './LocationPage';
import Breadcrumbs from './Breadcrumbs';
import InternalLinks from './InternalLinks';

// All service/search term variations for SEO
export const SERVICES = {
  'interieur-renoveren': { title: 'Interieur Renoveren', h1: 'Interieur Renoveren met 35 Jaar Vakmanschap', description: 'Uw interieur volledig renoveren? Max Q combineert 35 jaar technische expertise met design.', keywords: 'interieur renoveren, interieur verbouwen', category: 'interieur' },
  'interieur-verbouwen': { title: 'Interieur Verbouwen', h1: 'Interieur Verbouwen door Ervaren Vakmensen', description: 'Professioneel interieur verbouwen met oog voor detail. 35+ jaar ervaring.', keywords: 'interieur verbouwen, binnenhuisrenovatie', category: 'interieur' },
  'interieurafwerking': { title: 'Interieurafwerking', h1: 'Professionele Interieurafwerking', description: 'Hoogwaardige interieurafwerking door vakmensen met 35 jaar ervaring.', keywords: 'interieurafwerking, pleisterwerk, schilderwerk', category: 'interieur' },
  'badkamer-renoveren': { title: 'Badkamer Renoveren', h1: 'Badkamer Renoveren met 35 Jaar Expertise', description: 'Uw badkamer renoveren door specialisten met 35+ jaar ervaring in sanitair.', keywords: 'badkamer renoveren, badkamerrenovatie', category: 'badkamer' },
  'badkamer-verbouwen': { title: 'Badkamer Verbouwen', h1: 'Badkamer Verbouwen met Vakmanschap', description: 'Badkamer verbouwen met aandacht voor sanitair en waterdichting.', keywords: 'badkamer verbouwen, sanitair renovatie', category: 'badkamer' },
  'nieuwe-badkamer': { title: 'Nieuwe Badkamer', h1: 'Nieuwe Badkamer Laten Plaatsen', description: 'Een nieuwe badkamer laten plaatsen door experts met 35+ jaar ervaring.', keywords: 'nieuwe badkamer, badkamer installeren', category: 'badkamer' },
  'badkamer-op-maat': { title: 'Badkamer op Maat', h1: 'Badkamer op Maat met Jarenlange Ervaring', description: 'Uw dromen badkamer op maat gemaakt met 35 jaar technische kennis.', keywords: 'badkamer op maat, maatwerk badkamer', category: 'badkamer' },
  'inloopdouche-plaatsen': { title: 'Inloopdouche Plaatsen', h1: 'Inloopdouche Laten Plaatsen', description: 'Inloopdouche plaatsen met perfecte waterdichting door vakspecialisten.', keywords: 'inloopdouche plaatsen, walk-in douche', category: 'badkamer' },
  'keuken-renoveren': { title: 'Keuken Renoveren', h1: 'Keuken Renoveren met 35 Jaar Vakmanschap', description: 'Uw keuken renoveren door experts met 35+ jaar ervaring.', keywords: 'keuken renoveren, keukenrenovatie', category: 'keuken' },
  'keuken-verbouwen': { title: 'Keuken Verbouwen', h1: 'Keuken Verbouwen door Specialisten', description: 'Keuken verbouwen met aandacht voor elektriciteit en veiligheid.', keywords: 'keuken verbouwen, keuken aanpassen', category: 'keuken' },
  'keuken-vernieuwen': { title: 'Keuken Vernieuwen', h1: 'Keuken Vernieuwen met Ervaren Vakmensen', description: 'Uw keuken vernieuwen? Onze vakmensen met 35 jaar ervaring helpen u.', keywords: 'keuken vernieuwen, nieuwe keuken', category: 'keuken' },
  'nieuwe-keuken': { title: 'Nieuwe Keuken', h1: 'Nieuwe Keuken Laten Plaatsen', description: 'Een nieuwe keuken laten plaatsen inclusief alle technieken.', keywords: 'nieuwe keuken, keuken installeren', category: 'keuken' },
  'keuken-op-maat': { title: 'Keuken op Maat', h1: 'Keuken op Maat met Technische Perfectie', description: 'Maatwerk keuken door vakmensen met 35 jaar ervaring.', keywords: 'keuken op maat, maatwerk keuken', category: 'keuken' },
  'kookeiland-plaatsen': { title: 'Kookeiland Plaatsen', h1: 'Kookeiland Laten Plaatsen', description: 'Kookeiland plaatsen met correcte aansluitingen door specialisten.', keywords: 'kookeiland plaatsen, keukeneiland', category: 'keuken' },
  'totaalrenovatie': { title: 'Totaalrenovatie', h1: 'Totaalrenovatie met 35 Jaar Expertise', description: 'Complete totaalrenovatie van uw woning door experts.', keywords: 'totaalrenovatie, volledige renovatie', category: 'totaal' },
  'huis-renoveren': { title: 'Huis Renoveren', h1: 'Huis Renoveren door Ervaren Vakmensen', description: 'Uw huis renoveren van A tot Z met 35 jaar ervaring.', keywords: 'huis renoveren, woning renoveren', category: 'totaal' },
  'woning-renoveren': { title: 'Woning Renoveren', h1: 'Woning Renoveren met Vakmanschap', description: 'Professionele woningrenovatie met focus op technieken.', keywords: 'woning renoveren, woningrenovatie', category: 'totaal' },
  'verbouwing': { title: 'Verbouwing', h1: 'Verbouwing door Experts', description: 'Professionele verbouwing met 35+ jaar ervaring.', keywords: 'verbouwing, verbouwen', category: 'totaal' },
  'elektriciteit-renovatie': { title: 'Elektriciteit Renovatie', h1: 'Elektriciteit Renoveren met Expertise', description: 'Elektrische installatie renoveren conform alle normen.', keywords: 'elektriciteit renovatie, elektrische installatie', category: 'technieken' },
  'sanitair-renovatie': { title: 'Sanitair Renovatie', h1: 'Sanitair Renoveren door Specialisten', description: 'Sanitair renoveren met perfecte leidingen en aansluitingen.', keywords: 'sanitair renovatie, leidingen renoveren', category: 'technieken' },
  'vloerverwarming-installeren': { title: 'Vloerverwarming Installeren', h1: 'Vloerverwarming Laten Installeren', description: 'Vloerverwarming installeren met jarenlange ervaring.', keywords: 'vloerverwarming installeren, vloerverwarming plaatsen', category: 'technieken' },
  'maatkasten': { title: 'Maatkasten', h1: 'Maatkasten op Maat', description: 'Maatkasten perfect afgestemd op uw ruimte.', keywords: 'maatkasten, kasten op maat', category: 'maatwerk' },
  'inbouwkasten': { title: 'Inbouwkasten', h1: 'Inbouwkasten op Maat', description: 'Inbouwkasten die perfect passen met oog voor detail.', keywords: 'inbouwkasten, wandkast', category: 'maatwerk' },
  'dressing-op-maat': { title: 'Dressing op Maat', h1: 'Dressing op Maat', description: 'Luxe dressing op maat door ervaren vakmensen.', keywords: 'dressing op maat, inloopkast', category: 'maatwerk' },
};

const CATEGORY_IMAGES = {
  interieur: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800',
  badkamer: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800',
  keuken: 'https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=800',
  totaal: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
  technieken: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800',
  maatwerk: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
};

const CATEGORY_SERVICES = {
  interieur: ['Volledige interieurafwerking', 'Pleister- en schilderwerken', 'Vloeren en wandbekleding', 'Plafonds en verlichting'],
  badkamer: ['Complete badkamerrenovatie', 'Inloopdouches', 'Vrijstaande baden', 'Sanitair en leidingen', 'Vloerverwarming', 'Tegelwerk'],
  keuken: ['Complete keukenrenovatie', 'Kookeilanden', 'Maatwerk keukens', 'Elektriciteit', 'Werkbladen', 'Inbouwapparatuur'],
  totaal: ['Totaalrenovaties', 'Elektriciteit en domotica', 'Sanitair en verwarming', 'Badkamers en keukens', 'Vloeren', 'Schilderwerken'],
  technieken: ['Elektriciteitswerken', 'Sanitair', 'Centrale verwarming', 'Vloerverwarming', 'Ventilatie', 'Domotica'],
  maatwerk: ['Maatkasten', 'Inbouwkasten', 'Wandmeubels', 'Dressings', 'Schuifdeuren', 'Opbergsystemen'],
};

const ServicePage = () => {
  const params = useParams();
  const service = params.service;
  const location = params.location;
  
  const serviceData = SERVICES[service];
  const locationData = location ? LOCATIONS.find(l => l.slug === location) : null;
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [service, location]);

  if (!serviceData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-2xl font-bold">Pagina niet gevonden</h1>
      </div>
    );
  }

  const cat = serviceData.category;
  const catImage = CATEGORY_IMAGES[cat] || CATEGORY_IMAGES.totaal;
  const catServices = CATEGORY_SERVICES[cat] || CATEGORY_SERVICES.totaal;
  const locName = locationData ? locationData.name : '';
  const locSuffix = locName ? ` in ${locName}` : '';
  
  const pageTitle = serviceData.title + locSuffix + ' | 35 Jaar Ervaring | Max Q';
  const metaDesc = serviceData.description + locSuffix + ' Vraag gratis offerte aan!';
  const canonicalUrl = 'https://maxq.be/diensten/' + service + (location ? '/' + location : '');
  
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": serviceData.title + locSuffix,
    "description": metaDesc,
    "provider": {
      "@type": "LocalBusiness",
      "name": "Max Q",
      "address": { "@type": "PostalAddress", "streetAddress": "Gerhees 118", "addressLocality": "Ham", "postalCode": "3945", "addressCountry": "BE" },
      "telephone": "+32488152028",
      "url": "https://maxq.be"
    },
    ...(locationData ? { "areaServed": { "@type": "City", "name": locationData.name } } : { "areaServed": { "@type": "State", "name": "Limburg, Antwerpen, Vlaams-Brabant" } })
  };

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Diensten', href: '/diensten/' + service },
  ];
  if (locationData) {
    breadcrumbItems.push({ label: serviceData.title, href: '/diensten/' + service });
    breadcrumbItems.push({ label: locName });
  } else {
    breadcrumbItems.push({ label: serviceData.title });
  }

  return (
    <div>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={metaDesc} />
        <meta name="keywords" content={serviceData.keywords + (locName ? ', ' + locName : '')} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
      </Helmet>

      <Breadcrumbs items={breadcrumbItems} />

      <section className="bg-gradient-to-br from-[#3a190b] to-[#500000] text-white py-20" data-testid="service-hero">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap gap-4 mb-6">
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm">
              <Award className="h-4 w-4" />35+ Jaar Ervaring
            </span>
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm">
              <Wrench className="h-4 w-4" />Technische Expertise
            </span>
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm">
              <Users className="h-4 w-4" />Eigen Vakmensen
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6" data-testid="service-h1">{serviceData.h1}{locSuffix}</h1>
          <p className="text-xl text-white/90 mb-8 max-w-3xl">{locationData ? `Zoekt u een specialist voor ${serviceData.title.toLowerCase()} in ${locName}? Max Q uit Tessenderlo-Ham helpt u met 35+ jaar vakmanschap.` : serviceData.description}</p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/start" data-testid="service-cta-offerte">
              <Button className="bg-white text-[#3a190b] hover:bg-gray-100 px-6 py-3">
                Gratis offerte aanvragen<ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <a href="tel:+32488152028" data-testid="service-cta-phone">
              <Button variant="outline" className="border-white text-white hover:bg-white/10 px-6 py-3">
                <Phone className="h-4 w-4 mr-2" />+32 488 15 20 28
              </Button>
            </a>
          </div>
        </div>
      </section>

      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <Award className="h-8 w-8 text-[#3a190b] mx-auto mb-3" />
              <h3 className="font-bold mb-2">35+ Jaar Ervaring</h3>
              <p className="text-sm text-gray-600">Decennia aan vakmanschap</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <Wrench className="h-8 w-8 text-[#3a190b] mx-auto mb-3" />
              <h3 className="font-bold mb-2">Technische Basis</h3>
              <p className="text-sm text-gray-600">Sterke expertise in technieken</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <Users className="h-8 w-8 text-[#3a190b] mx-auto mb-3" />
              <h3 className="font-bold mb-2">Eigen Vakmensen</h3>
              <p className="text-sm text-gray-600">Geen onderaannemers</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <Clock className="h-8 w-8 text-[#3a190b] mx-auto mb-3" />
              <h3 className="font-bold mb-2">Stipte Planning</h3>
              <p className="text-sm text-gray-600">Transparante communicatie</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white" data-testid="service-why-section">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold mb-6">Waarom kiezen voor Max Q{locSuffix}?</h2>
              {locationData ? (
                <p className="text-lg text-gray-700 mb-6">
                  Vanuit ons atelier in Tessenderlo-Ham bedienen wij al meer dan 35 jaar klanten in {locName} en de rest van {locationData.province}. 
                  Onze sterke technische achtergrond in elektriciteit, sanitair en verwarming maakt het verschil bij elke {serviceData.title.toLowerCase()}.
                </p>
              ) : (
                <p className="text-lg text-gray-700 mb-6">
                  Met meer dan 35 jaar ervaring in de bouwsector hebben wij een stevige basis opgebouwd in techniek. 
                  Deze expertise maakt het verschil bij elke renovatie.
                </p>
              )}
              <ul className="space-y-3">
                {['Gratis adviesgesprek', 'Gedetailleerde offerte', 'Alle technieken in eigen beheer', 'Persoonlijke begeleiding', 'Kwaliteitsgarantie'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="font-bold mb-4">Onze diensten</h3>
                <ul className="space-y-2">
                  {catServices.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-700">
                      <span className="w-1.5 h-1.5 bg-[#3a190b] rounded-full"></span>{item}
                    </li>
                  ))}
                </ul>
              </div>
              <img src={catImage} alt={serviceData.title} className="w-full h-64 object-cover rounded-lg" />
            </div>
          </div>
        </div>
      </section>

      {!locationData && (
        <section className="py-12 bg-gray-50" data-testid="service-locations-section">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-2">{serviceData.title} in uw regio</h2>
            <p className="text-gray-600 mb-8">Wij zijn actief in heel Limburg, Antwerpen en Vlaams-Brabant. Kies uw gemeente:</p>
            
            {['Limburg', 'Antwerpen', 'Vlaams-Brabant'].map(province => {
              const locs = LOCATIONS.filter(l => l.province === province);
              if (locs.length === 0) return null;
              return (
                <div key={province} className="mb-6">
                  <h3 className="font-semibold text-[#3a190b] mb-3">{province}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {locs.map(loc => (
                      <Link
                        key={loc.slug}
                        to={'/diensten/' + service + '/' + loc.slug}
                        className="text-sm text-[#3a190b] hover:underline bg-white px-3 py-2 rounded shadow-sm hover:shadow-md transition-shadow"
                        data-testid={'service-location-' + loc.slug}
                      >
                        {loc.name}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {locationData && (
        <section className="py-12 bg-gray-50" data-testid="other-services-section">
          <div className="max-w-7xl mx-auto px-4">
            <h3 className="font-bold mb-4">Andere diensten in {locName}</h3>
            <div className="flex flex-wrap gap-2 mb-8">
              {Object.entries(SERVICES)
                .filter(([slug]) => slug !== service)
                .filter(([slug]) => ['badkamer-renoveren', 'keuken-renoveren', 'interieur-renoveren', 'totaalrenovatie', 'huis-renoveren', 'keuken-vernieuwen'].includes(slug))
                .map(([slug, data]) => (
                  <Link key={slug} to={'/diensten/' + slug + '/' + location} className="text-sm bg-white text-[#3a190b] border border-[#3a190b]/20 hover:border-[#3a190b] px-4 py-2 rounded-full transition-colors">
                    {data.title}
                  </Link>
                ))}
            </div>
            <h3 className="font-bold mb-4">{serviceData.title} in de buurt</h3>
            <div className="flex flex-wrap gap-2">
              {LOCATIONS
                .filter(l => l.slug !== location && l.province === locationData.province)
                .slice(0, 15)
                .map(l => (
                  <Link key={l.slug} to={'/diensten/' + service + '/' + l.slug} className="text-sm text-[#3a190b] hover:underline">
                    {l.name}
                  </Link>
                ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-16 bg-[#3a190b]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Klaar om te starten?</h2>
          <p className="text-white/80 mb-8">Vraag een gratis adviesgesprek aan. Onze experts komen graag bij u langs.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/start">
              <Button className="bg-white text-[#3a190b] hover:bg-gray-100 px-8 py-3">Gratis adviesgesprek</Button>
            </Link>
            <Link to="/projecten">
              <Button variant="outline" className="border-white text-white hover:bg-white/10 px-8 py-3">Bekijk realisaties</Button>
            </Link>
          </div>
        </div>
      </section>

      <InternalLinks />
    </div>
  );
};

export default ServicePage;
