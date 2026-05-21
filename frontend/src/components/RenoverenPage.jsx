import React from 'react';
import { ArrowRight, Zap, Droplets, Wind, Plug, Bath, ChefHat, Paintbrush, Grid3X3, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import InternalLinks from './InternalLinks';
import { useProjectImages } from '../hooks/useProjectImages';

const RenoverenPage = () => {
  const { pickHero, pick } = useProjectImages();
  return (
    <div>
      <Helmet>
        <title>Renoveren in Limburg ✓ 35j Ervaring | Max Q</title>
        <meta name="description" content="Renovatiebedrijf uit Ham voor uw badkamer, keuken of totaalrenovatie in heel Limburg. Eigen vakmensen, premies geregeld en vaste prijs vooraf. Gratis plaatsbezoek." />
        <link rel="canonical" href="https://maxq.be/renoveren" />
        <meta property="og:title" content="Renoveren in Limburg ✓ 35j Ervaring | Max Q" />
        <meta property="og:description" content="Eigen vakmensen voor badkamer, keuken en totaalrenovatie. Premies geregeld. Plaatsbezoek binnen 48u." />
      </Helmet>
      {/* Hero Section */}
      <section className="relative min-h-[500px] md:min-h-[550px] flex items-center">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${pickHero()})`,
          }}
        >
          <div className="absolute inset-0 bg-[#3a190b]/60" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Renoveren vanuit het hart van uw woning
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8 leading-relaxed">
              Bij Max Q beginnen we waar anderen stoppen. We vertrekken vanuit de{' '}
              <strong>technieken</strong> — het onzichtbare fundament — en bouwen van daaruit aan een{' '}
              <strong>prachtig interieur</strong> met perfecte afwerking.
            </p>
            <Link to="/start">
              <Button className="bg-white text-[#3a190b] hover:bg-gray-100 px-6 py-3 text-base flex items-center gap-2 group">
                Start uw renovatie
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Filosofie Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs uppercase tracking-widest text-[#500000] font-semibold mb-4">
            ONZE FILOSOFIE
          </p>
          <p className="text-lg md:text-xl text-[#202020]/80 leading-relaxed mb-8">
            De meeste renovatiebedrijven focussen op wat u ziet: een mooie keuken, een strakke badkamer. 
            Maar wat zit daarachter? Leidingen die lekken, elektriciteit die niet voldoet aan de normen, 
            ventilatie die ontbreekt.
          </p>
          <p className="text-lg md:text-xl text-[#202020] leading-relaxed mb-8">
            <strong className="text-[#3a190b]">Max Q denkt anders.</strong> Wij starten bij het hart van uw woning: de technieken. 
            Want een perfecte badkamer begint bij correcte sanitaire leidingen. Een droomkeuken 
            functioneert pas echt met de juiste elektrische aansluiting.
          </p>
          <p className="text-lg md:text-xl text-[#202020]/80 leading-relaxed">
            Dankzij onze band met <strong className="text-[#500000]">Q Technics</strong> — dezelfde mensen, dezelfde expertise — bieden 
            wij wat anderen niet kunnen: een totaaloplossing van fundering tot afwerking, van 
            onzichtbaar tot prachtig zichtbaar.
          </p>
        </div>
      </section>

      {/* Het Fundament - Technieken Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left Content */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-full bg-[#3a190b] text-white flex items-center justify-center text-sm font-bold">1</span>
                <p className="text-xs uppercase tracking-widest text-[#500000] font-semibold">HET FUNDAMENT</p>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-[#202020] mb-6">
                Technieken: het hart van uw woning
              </h2>
              <p className="text-[#202020]/80 text-lg leading-relaxed mb-6">
                Met de technische expertise van Q Technics installeren we energiezuinige warmtepompen, 
                moderne ventilatiesystemen en veilige elektrische installaties. Zo bespaart u energie 
                én geniet u van jarenlang zorgeloos wooncomfort.
              </p>
            </div>

            {/* Right - Service Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-[#3a190b]" />
                </div>
                <h3 className="font-bold text-[#202020] mb-2">Verwarming & Warmtepompen</h3>
                <p className="text-sm text-[#202020]/70">Energiezuinige verwarmingsoplossingen</p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <Droplets className="h-6 w-6 text-[#3a190b]" />
                </div>
                <h3 className="font-bold text-[#202020] mb-2">Sanitair</h3>
                <p className="text-sm text-[#202020]/70">Professionele leidingen en installaties</p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <Wind className="h-6 w-6 text-[#3a190b]" />
                </div>
                <h3 className="font-bold text-[#202020] mb-2">Ventilatie</h3>
                <p className="text-sm text-[#202020]/70">Gezond binnenklimaat met systeem C of D</p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <Plug className="h-6 w-6 text-[#3a190b]" />
                </div>
                <h3 className="font-bold text-[#202020] mb-2">Elektriciteit</h3>
                <p className="text-sm text-[#202020]/70">Veilige en moderne elektrische installaties</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* De Transformatie - Interieur Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left - Service Cards */}
            <div className="grid grid-cols-2 gap-4 order-2 lg:order-1">
              <div className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-4 shadow-sm">
                  <Bath className="h-6 w-6 text-[#3a190b]" />
                </div>
                <h3 className="font-bold text-[#202020] mb-2">Badkamers</h3>
                <p className="text-sm text-[#202020]/70">Van functioneel tot luxe wellness-oase</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-4 shadow-sm">
                  <ChefHat className="h-6 w-6 text-[#3a190b]" />
                </div>
                <h3 className="font-bold text-[#202020] mb-2">Keukens</h3>
                <p className="text-sm text-[#202020]/70">Het hart van uw woning, op maat ontworpen</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-4 shadow-sm">
                  <Grid3X3 className="h-6 w-6 text-[#3a190b]" />
                </div>
                <h3 className="font-bold text-[#202020] mb-2">Maatkasten</h3>
                <p className="text-sm text-[#202020]/70">Slimme opbergoplossingen op maat</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-4 shadow-sm">
                  <Paintbrush className="h-6 w-6 text-[#3a190b]" />
                </div>
                <h3 className="font-bold text-[#202020] mb-2">Afwerking</h3>
                <p className="text-sm text-[#202020]/70">Vloeren, wanden en plafonds tot in de puntjes</p>
              </div>
            </div>

            {/* Right Content */}
            <div className="order-1 lg:order-2">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-full bg-[#3a190b] text-white flex items-center justify-center text-sm font-bold">2</span>
                <p className="text-xs uppercase tracking-widest text-[#500000] font-semibold">DE TRANSFORMATIE</p>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-[#202020] mb-6">
                Interieur & afwerking: waar u van droomt
              </h2>
              <p className="text-[#202020]/80 text-lg leading-relaxed">
                Met het technische fundament op orde, creëren we de ruimtes waar u elke dag van geniet. 
                Een badkamer die aanvoelt als een spa. Een keuken waar koken een feest wordt. 
                Maatkasten die elke centimeter benutten.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Eén Partner Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div>
              <p className="text-xs uppercase tracking-widest text-[#500000] font-semibold mb-4">
                WAAROM MAX Q
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-[#202020] mb-6">
                Eén partner voor uw volledige renovatie
              </h2>
              <p className="text-[#202020]/80 text-lg leading-relaxed mb-8">
                Geen aparte aannemers voor elektriciteit, sanitair en afwerking. Geen miscommunicatie 
                tussen verschillende partijen. Eén team, één visie, één perfecte uitvoering.
              </p>

              {/* Benefits List */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#3a190b] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#202020]">Technische expertise inbegrepen</h4>
                    <p className="text-sm text-[#202020]/70">Via Q Technics krijgt u de beste technische installaties</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#3a190b] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#202020]">Één aanspreekpunt</h4>
                    <p className="text-sm text-[#202020]/70">Duidelijke communicatie en planning van A tot Z</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#3a190b] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#202020]">Perfecte integratie</h4>
                    <p className="text-sm text-[#202020]/70">Technieken en interieur naadloos op elkaar afgestemd</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#3a190b] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#202020]">Garantie op alles</h4>
                    <p className="text-sm text-[#202020]/70">Volledige garantie op zowel technieken als afwerking</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Image */}
            <div className="relative">
              <img
                src={pick('technieken')}
                alt="Renovatie werkzaamheden"
                className="rounded-lg shadow-lg w-full h-[500px] object-cover"
              />
              <div className="absolute -bottom-6 -left-6 bg-[#3a190b] text-white p-6 rounded-lg shadow-lg max-w-xs">
                <p className="text-3xl font-bold mb-1">35+</p>
                <p className="text-white/80 text-sm">jaar ervaring in renovaties en technische installaties</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-[#3a190b]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Klaar om te renoveren?
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Ontdek hoe Max Q uw renovatieproject van A tot Z begeleidt.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/start">
              <Button className="bg-white text-[#3a190b] hover:bg-gray-100 px-6 py-3 text-base flex items-center gap-2 group">
                Gratis plaatsbezoek aanvragen
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/projecten">
              <Button
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-[#3a190b] px-6 py-3 text-base"
              >
                Bekijk onze projecten
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <InternalLinks />
    </div>
  );
};

export default RenoverenPage;
