import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: "Wat kost een totaalrenovatie in Limburg?",
    answer: "De kosten van een totaalrenovatie hangen af van de omvang, materiaalkeuze en specifieke wensen. Gemiddeld variëren budgetten van €25.000 voor kleine projecten tot €200.000+ voor luxe totaalrenovaties. Bij Max Q krijgt u altijd een gratis en vrijblijvende offerte na een plaatsbezoek."
  },
  {
    question: "Hoe lang duurt een renovatieproject?",
    answer: "De doorlooptijd varieert per project: een badkamerrenovatie duurt gemiddeld 2-4 weken, een keukenrenovatie 3-5 weken, en een totaalrenovatie kan 3-6 maanden duren. We maken vooraf een gedetailleerde planning die we met u doorspreken."
  },
  {
    question: "Werken jullie met onderaannemers?",
    answer: "Nee, Max Q werkt uitsluitend met eigen vakmensen voor alle disciplines: elektriciteit, sanitair, schrijnwerk, tegelwerk en afwerking. Dit garandeert optimale kwaliteit, coördinatie en communicatie tijdens uw project."
  },
  {
    question: "In welke regio's zijn jullie actief?",
    answer: "Max Q is actief in heel Limburg met focus op Ham, Hasselt, Genk, Beringen, Lommel, Pelt, Houthalen-Helchteren, Heusden-Zolder, Diepenbeek, Bilzen, Tongeren, Sint-Truiden en Maasmechelen. Neem contact op om te kijken wat we voor u kunnen betekenen."
  },
  {
    question: "Geven jullie garantie op het werk?",
    answer: "Ja, Max Q biedt garantie op al onze werken volgens de wettelijke bepalingen. Daarnaast staan we ook na oplevering klaar voor service en onderhoud. Kwaliteit en klanttevredenheid staan bij ons voorop."
  },
  {
    question: "Hoe vraag ik een offerte aan?",
    answer: "U kunt eenvoudig een gratis plaatsbezoek aanvragen via onze website. Vul het formulier in op de 'Start' pagina, of bel ons direct op +32 494 80 80 21. We nemen binnen 24 uur contact met u op om een afspraak in te plannen."
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
