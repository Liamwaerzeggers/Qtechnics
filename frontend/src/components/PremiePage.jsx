import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { CheckCircle, AlertCircle, Euro, FileText, Calendar, ArrowRight, Phone } from 'lucide-react';
import { Button } from './ui/button';
import Breadcrumbs from './Breadcrumbs';
import InternalLinks from './InternalLinks';

const LAST_UPDATED = '2026-05-13';

const PREMIES = [
  { title: 'Dak isoleren', cat1: '€8/m²', cat3: '€16/m²', cat4: '€22/m²', notes: 'Min. R-waarde 4,5 m²K/W' },
  { title: 'Muurisolatie buitenzijde', cat1: '€20/m²', cat3: '€40/m²', cat4: '€55/m²', notes: 'Met EPB-verslaggever' },
  { title: 'Glasvervanging hoogrendementsglas', cat1: '€10/m²', cat3: '€25/m²', cat4: '€35/m²', notes: 'U-waarde max 1,0 W/m²K' },
  { title: 'Warmtepomp (lucht-water)', cat1: '€1.500', cat3: '€3.000', cat4: '€4.000', notes: 'SCOP ≥ 3,8 vereist' },
  { title: 'Warmtepompboiler', cat1: '€450', cat3: '€900', cat4: '€1.200', notes: 'Sanitair warm water' },
  { title: 'Zonneboiler', cat1: '€1.000', cat3: '€1.750', cat4: '€2.750', notes: 'Min. 2 m² collector' },
  { title: 'Asbestverwijdering', cat1: '€8/m²', cat3: '€16/m²', cat4: '€22/m²', notes: 'Door erkende verwijderaar' },
];

const FAQS = [
  { q: 'Wat verandert er met de Mijn VerbouwPremie in 2026?',
    a: 'Vanaf 1 maart 2026 krijgen inkomenscategorie 1 en 2 enkel nog premie voor warmtepomp en warmtepompboiler. Voor categorie 3 en 4 blijven veel andere renovatiepremies behouden. Niet-woongebouwen krijgen geen Mijn VerbouwPremie meer.' },
  { q: 'Heb ik een renovatieplicht na aankoop van een woning?',
    a: 'Ja. Koopt u een woning of appartement in Vlaanderen met EPC-label E of F, dan moet u binnen 6 jaar renoveren naar minimum label D. Voor appartementen geldt: van E/F/C naar minimum label B.' },
  { q: 'Hoeveel premie krijg ik voor een warmtepomp in 2026?',
    a: 'De warmtepomppremie via Mijn VerbouwPremie loopt van €1.500 (categorie 1) tot €4.000 (categorie 4). Combinaties met andere premies en btw-voordeel (6% bij renovatie ouder dan 10 jaar) maken het extra interessant.' },
  { q: 'Wat is het verschil tussen inkomenscategorie 1, 2, 3 en 4?',
    a: 'Categorie 1: hoogste inkomen, krijgt max. 20% premie. Categorie 2: max. 25%. Categorie 3: max. 35%. Categorie 4 (laagste inkomen): max. 50%. De inkomensgrens wordt jaarlijks aangepast — Max Q helpt u bepalen tot welke categorie u behoort.' },
  { q: 'Kan ik renoveren zonder breekwerk?',
    a: 'Ja, in veel gevallen wel. Voor badkamers bieden wij overlay-technieken (tegelen op tegelen), prefab inloopdouches en sanitair-renovatie zonder hak- en breekwerk. Resultaat: 30-50% minder tijd én minder stof. Vraag ons advies voor uw situatie.' },
  { q: 'Wat kost een totaalrenovatie in Limburg?',
    a: 'Een totaalrenovatie kost gemiddeld €800 tot €1.500 per m² inclusief btw. Voor een woning van 150 m² komt dit neer op €120.000 tot €225.000. Premies kunnen tot €15.000+ van de kostprijs aftrekken. Vraag een exacte offerte aan.' },
  { q: 'Hoe vraag ik de Mijn VerbouwPremie aan?',
    a: 'Online via mijnverbouwpremie.be of mijnverbouwlening.be. U logt in met itsme of eID, voegt uw facturen toe (max 2 jaar oud) en kiest de werken. Max Q helpt klanten gratis met het dossier en levert alle EPB-attesten aan.' },
  { q: 'Wat is de renovatiepremie voor 60+ ers?',
    a: 'Senioren (60+) krijgen via Mijn VerbouwPremie vaak een verhoogd bedrag of vallen in een lagere inkomenscategorie. Daarnaast bestaat een aparte aanpassingspremie voor seniorenwoningen (drempelloze douche, beugels, brede deuren).' },
  { q: 'Welke premies zijn er voor zonnepanelen in 2026?',
    a: 'De zonnepanelenpremie via Fluvius werd in 2024 afgebouwd, maar zonnepanelen blijven aftrekbaar via het terugdraaiend telwerk (digitale meter) en btw 6% bij installatie. Combineer met thuisbatterij voor extra rendement.' },
  { q: 'Geldt de renovatieplicht ook voor schenkingen?',
    a: 'Ja. De renovatieplicht geldt bij elke notariële overdracht: aankoop, schenking, erfenis of langdurige erfpacht. Max Q maakt graag een renovatieplan op maat zodat u tijdig in orde bent.' },
];

const PremiePage = () => {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': FAQS.map((f) => ({
      '@type': 'Question',
      'name': f.q,
      'acceptedAnswer': { '@type': 'Answer', 'text': f.a },
    })),
  };

  return (
    <div data-testid="premie-page">
      <Helmet>
        <title>Mijn VerbouwPremie & Renovatieplicht 2026 | Volledige Gids | Max Q</title>
        <meta name="description" content="Alles over de Mijn VerbouwPremie 2026 en renovatieplicht in Vlaanderen. Bedragen, voorwaarden, EPC-eisen en hoe u tot €15.000 premie krijgt voor uw renovatie." />
        <meta name="keywords" content="Mijn VerbouwPremie 2026, renovatiepremie Vlaanderen, EPC renovatieplicht, warmtepomp premie, premies renovatie België" />
        <link rel="canonical" href="https://maxq.be/premies-en-renovatieplicht-2026" />
        <meta property="og:title" content="Mijn VerbouwPremie & Renovatieplicht 2026 | Max Q" />
        <meta property="og:description" content="Volledige gids voor renovatiepremies in Vlaanderen 2026. Bedragen, EPC-eisen en hoe Max Q u helpt om de maximale premie te krijgen." />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Premies & Renovatieplicht 2026' }]} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#3a190b] to-[#500000] text-white py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-1.5 mb-6 text-xs uppercase tracking-widest">
            <Calendar className="h-3 w-3" /> Laatst bijgewerkt: {LAST_UPDATED}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="premie-title">
            Mijn VerbouwPremie & Renovatieplicht 2026
          </h1>
          <p className="text-lg text-white/80 mb-6 max-w-2xl">
            Alles wat u moet weten over renovatiepremies in Vlaanderen, de nieuwe EPC-verplichtingen
            en hoe u tot <strong className="text-white">€15.000+ premie</strong> krijgt voor uw renovatieproject.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/start">
              <Button className="bg-white text-[#3a190b] hover:bg-gray-100 px-6 py-3" data-testid="premie-cta-start">
                Gratis premie-advies <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <a href="tel:+32488152028">
              <Button variant="outline" className="border-white text-white hover:bg-white/10 px-6 py-3">
                <Phone className="h-4 w-4 mr-2" /> +32 488 15 20 28
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* TL;DR */}
      <section className="py-12 bg-amber-50 border-b border-amber-100">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-amber-700 flex-shrink-0 mt-1" />
            <div>
              <h2 className="font-bold text-[#202020] mb-2">TL;DR — De 5 belangrijkste wijzigingen voor 2026</h2>
              <ul className="text-sm text-[#202020]/80 space-y-1.5">
                <li>• <strong>Vanaf 1 maart 2026</strong>: categorie 1 & 2 krijgen enkel nog warmtepomp/warmtepompboiler premie.</li>
                <li>• <strong>Renovatieplicht</strong>: woning met EPC E/F → label D binnen 6 jaar na aankoop. Appartement E/F/C → label B.</li>
                <li>• <strong>Warmtepomppremie</strong> blijft tot €4.000 (cat. 4).</li>
                <li>• <strong>Niet-woongebouwen</strong>: geen Mijn VerbouwPremie meer.</li>
                <li>• <strong>EPC-labelpremie</strong> wordt afgebouwd; aanvragen mogelijk tot 30 juni 2026 in overgangsgevallen.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Premies tabel */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-[#202020] mb-3 flex items-center gap-3">
            <Euro className="h-7 w-7 text-[#3a190b]" /> Premiebedragen 2026 per categorie
          </h2>
          <p className="text-[#202020]/70 mb-8 max-w-3xl">
            De premie hangt af van uw inkomenscategorie. Hieronder de richtbedragen voor de meest aangevraagde werken.
            <strong> Max Q helpt u gratis</strong> bij het indienen van uw dossier.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="premies-table">
              <thead>
                <tr className="bg-[#3a190b] text-white">
                  <th className="p-3 text-left">Werk</th>
                  <th className="p-3 text-center">Cat. 1 (hoogste inkomen)</th>
                  <th className="p-3 text-center">Cat. 3</th>
                  <th className="p-3 text-center">Cat. 4 (laagste inkomen)</th>
                  <th className="p-3 text-left">Voorwaarde</th>
                </tr>
              </thead>
              <tbody>
                {PREMIES.map((p) => (
                  <tr key={p.title} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-medium text-[#202020]">{p.title}</td>
                    <td className="p-3 text-center text-gray-600">{p.cat1}</td>
                    <td className="p-3 text-center text-[#3a190b] font-medium">{p.cat3}</td>
                    <td className="p-3 text-center text-[#3a190b] font-bold">{p.cat4}</td>
                    <td className="p-3 text-xs text-gray-500">{p.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            * Richtbedragen — exacte premie afhankelijk van factuur en EPB-attest. Categorieën 2 en 3 vallen tussen de getoonde waarden.
          </p>
        </div>
      </section>

      {/* Renovatieplicht uitleg */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-[#202020] mb-6 flex items-center gap-3">
            <FileText className="h-7 w-7 text-[#3a190b]" /> Renovatieplicht na aankoop
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold mb-3 text-[#202020]">Woning kopen</h3>
              <p className="text-sm text-gray-600 mb-3">
                Bij aankoop van een woning met EPC-label <strong>E of F</strong> bent u verplicht
                om binnen <strong>6 jaar</strong> te renoveren naar minimum label D.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />Geldt voor aankoop, schenking en erfenis</li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />Niet voldoen = boete tot €200.000</li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />Combineer met Mijn VerbouwPremie</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold mb-3 text-[#202020]">Appartement kopen</h3>
              <p className="text-sm text-gray-600 mb-3">
                Voor appartementen geldt: vanaf label <strong>E, F of C</strong> renoveren naar
                minimum label <strong>B</strong> binnen 6 jaar.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />Strenger dan voor huizen</li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />Vaak collectief met VME mogelijk</li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />Aparte premie voor collectieve werken</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-[#202020] mb-8">Veelgestelde vragen over premies in 2026</h2>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <details key={i} className="bg-gray-50 rounded-lg p-5 group" data-testid={'premie-faq-' + i}>
                <summary className="font-semibold text-[#202020] cursor-pointer flex items-center justify-between">
                  {f.q}
                  <span className="text-[#3a190b] group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="text-sm text-gray-600 mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#3a190b]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Wij helpen u gratis met uw premiedossier
          </h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">
            Max Q levert alle EPB-attesten, facturen en documenten aan om de maximale premie
            te krijgen. Geen administratieve rompslomp — wij regelen het.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/start">
              <Button className="bg-white text-[#3a190b] hover:bg-gray-100 px-8 py-3" data-testid="premie-cta-bottom">
                Vraag gratis advies <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link to="/calculator">
              <Button variant="outline" className="border-white text-white hover:bg-white/10 px-8 py-3">
                Bereken uw renovatiekost
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <InternalLinks />
    </div>
  );
};

export default PremiePage;
