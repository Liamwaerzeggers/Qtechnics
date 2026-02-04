import React from 'react';
import { Star } from 'lucide-react';

const Testimonials = () => {
  return (
    <section className="py-16 md:py-24 bg-[#4a3728]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Wat klanten zeggen
          </h2>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Ontdek waarom onze klanten voor Max Q kiezen.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Testimonial 1 */}
          <div className="bg-white rounded-lg p-8 shadow-lg">
            <div className="flex gap-1 mb-4">
              <Star className="h-5 w-5 fill-[#E5A033] text-[#E5A033]" />
              <Star className="h-5 w-5 fill-[#E5A033] text-[#E5A033]" />
              <Star className="h-5 w-5 fill-[#E5A033] text-[#E5A033]" />
              <Star className="h-5 w-5 fill-[#E5A033] text-[#E5A033]" />
              <Star className="h-5 w-5 fill-[#E5A033] text-[#E5A033]" />
            </div>
            <p className="text-[#4a3728] mb-6 leading-relaxed">
              "Max Q heeft onze volledige badkamer getransformeerd. Van ontwerp tot uitvoering: alles verliep vlekkeloos. Aanrader!"
            </p>
            <div>
              <p className="font-bold text-[#4a3728]">Jan & Lies V.</p>
              <p className="text-sm text-[#6a5748]">Hasselt — Badkamerrenovatie</p>
            </div>
          </div>

          {/* Testimonial 2 */}
          <div className="bg-white rounded-lg p-8 shadow-lg">
            <div className="flex gap-1 mb-4">
              <Star className="h-5 w-5 fill-[#E5A033] text-[#E5A033]" />
              <Star className="h-5 w-5 fill-[#E5A033] text-[#E5A033]" />
              <Star className="h-5 w-5 fill-[#E5A033] text-[#E5A033]" />
              <Star className="h-5 w-5 fill-[#E5A033] text-[#E5A033]" />
              <Star className="h-5 w-5 fill-[#E5A033] text-[#E5A033]" />
            </div>
            <p className="text-[#4a3728] mb-6 leading-relaxed">
              "Eindelijk een aannemer die doet wat hij belooft. Onze keuken is precies geworden zoals we hadden gedroomd."
            </p>
            <div>
              <p className="font-bold text-[#4a3728]">Kevin D.</p>
              <p className="text-sm text-[#6a5748]">Genk — Keuken op maat</p>
            </div>
          </div>

          {/* Testimonial 3 */}
          <div className="bg-white rounded-lg p-8 shadow-lg">
            <div className="flex gap-1 mb-4">
              <Star className="h-5 w-5 fill-[#E5A033] text-[#E5A033]" />
              <Star className="h-5 w-5 fill-[#E5A033] text-[#E5A033]" />
              <Star className="h-5 w-5 fill-[#E5A033] text-[#E5A033]" />
              <Star className="h-5 w-5 fill-[#E5A033] text-[#E5A033]" />
              <Star className="h-5 w-5 fill-[#E5A033] text-[#E5A033]" />
            </div>
            <p className="text-[#4a3728] mb-6 leading-relaxed">
              "Totaalrenovatie van ons huis. Het team van Max Q dacht met ons mee en leverde topkwaliteit. De technische kennis via Q Technics is een groot pluspunt."
            </p>
            <div>
              <p className="font-bold text-[#4a3728]">An & Bart M.</p>
              <p className="text-sm text-[#6a5748]">Lommel — Totaalrenovatie</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
