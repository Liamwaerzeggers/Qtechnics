import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: "Wat kost een totaalrenovatie in Limburg?",
    answer: "De kosten van een totaalrenovatie hangen af van de omvang, materiaalkeuze en specifieke wensen. Gemiddeld variëren budgetten van €25.000 voor kleine projecten tot €200.000+ voor luxe totaalrenovaties. Bij Max Q krijgt u altijd een gratis en vrijblijvende offerte na een plaatsbezoek."
  },
  {
    question: "Welke premies krijg ik voor renovatie in Vlaanderen in 2026?",
    answer: "Via Mijn VerbouwPremie krijgt u in 2026 tot €4.000 voor een warmtepomp, €2.750 voor een zonneboiler en premies voor isolatie, ramen en sanitair. Vanaf 1 maart 2026 wijzigen de regels voor inkomenscategorie 1 en 2. Max Q helpt u gratis bij het indienen van uw dossier. Lees onze volledige gids op /premies-en-renovatieplicht-2026."
  },
  {
    question: "Wat is de renovatieplicht na aankoop van een woning?",
    answer: "Koopt u in Vlaanderen een woning met EPC-label E of F, dan moet u binnen 6 jaar renoveren naar minstens label D. Voor appartementen geldt: van E/F/C naar minimum label B. Niet voldoen kan een boete tot €200.000 opleveren. Max Q maakt een renovatieplan op maat."
  },
  {
    question: "Hoe lang duurt een renovatieproject?",
    answer: "De doorlooptijd varieert per project: een badkamerrenovatie duurt gemiddeld 2-4 weken, een keukenrenovatie 3-5 weken, en een totaalrenovatie kan 3-6 maanden duren. We maken vooraf een gedetailleerde planning die we met u doorspreken."
  },
  {
    question: "Kan ik mijn badkamer of keuken renoveren zonder breekwerk?",
    answer: "Ja, in veel gevallen wel. Voor badkamers passen wij overlay-technieken toe (tegelen op tegelen), prefab inloopdouches en sanitair-vervanging zonder hak- en breekwerk. Voor keukens kunnen we vaak de bestaande indeling behouden. Resultaat: 30-50% sneller en aanzienlijk minder stof."
  },
  {
    question: "Werken jullie met onderaannemers?",
    answer: "Nee, Max Q werkt uitsluitend met eigen vakmensen voor alle disciplines: elektriciteit, sanitair, schrijnwerk, tegelwerk en afwerking. Dit garandeert optimale kwaliteit, coördinatie en communicatie tijdens uw project."
  },
  {
    question: "In welke regio's zijn jullie actief?",
    answer: "Max Q is actief in heel Limburg met focus op Ham, Hasselt, Genk, Beringen, Lommel, Pelt, Houthalen-Helchteren, Heusden-Zolder, Diepenbeek, Bilzen, Tongeren, Sint-Truiden en Maasmechelen. Daarnaast bedienen we ook Vlaams-Brabant en de Kempen."
  },
  {
    question: "Geven jullie garantie op het werk?",
    answer: "Ja, Max Q biedt garantie op al onze werken volgens de wettelijke bepalingen. Daarnaast staan we ook na oplevering klaar voor service en onderhoud. Kwaliteit en klanttevredenheid staan bij ons voorop."
  },
  {
    question: "Hoe vraag ik een offerte aan?",
    answer: "U kunt eenvoudig een gratis plaatsbezoek aanvragen via onze website. Vul het formulier in op de 'Start' pagina, of bel ons direct op +32 488 15 20 28. We nemen binnen 24 uur contact met u op om een afspraak in te plannen."
  }
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // Generate FAQ structured data
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <section className="py-20 bg-gray-50" aria-labelledby="faq-heading">
      {/* Structured Data for SEO */}
      <script 
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 
            id="faq-heading"
            className="text-3xl md:text-4xl font-bold text-[#202020] mb-4"
          >
            Veelgestelde vragen
          </h2>
          <p className="text-lg text-[#202020]/70">
            Antwoorden op de meest gestelde vragen over renovaties in Limburg
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index}
              className="bg-white rounded-lg shadow-sm overflow-hidden"
              itemScope
              itemType="https://schema.org/Question"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                aria-expanded={openIndex === index}
                aria-controls={`faq-answer-${index}`}
              >
                <h3 
                  className="font-semibold text-[#202020] pr-4"
                  itemProp="name"
                >
                  {faq.question}
                </h3>
                <ChevronDown 
                  className={`h-5 w-5 text-[#3a190b] transition-transform flex-shrink-0 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>
              
              <div 
                id={`faq-answer-${index}`}
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'max-h-96' : 'max-h-0'
                }`}
                itemScope
                itemType="https://schema.org/Answer"
                itemProp="acceptedAnswer"
              >
                <p 
                  className="px-6 pb-4 text-[#202020]/70 leading-relaxed"
                  itemProp="text"
                >
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-[#202020]/70 mb-4">
            Heeft u een andere vraag? Neem gerust contact met ons op.
          </p>
          <a 
            href="/contact"
            className="inline-flex items-center text-[#3a190b] font-semibold hover:underline"
          >
            Contacteer ons
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
