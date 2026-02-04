import React from 'react';
import { Star } from 'lucide-react';
import { testimonials } from '../data/mock';

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
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="bg-white rounded-lg p-8 shadow-lg"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 fill-[#E5A033] text-[#E5A033]"
                  />
                ))}
              </div>
              
              {/* Quote */}
              <p className="text-[#4a3728] mb-6 leading-relaxed">
                {testimonial.text}
              </p>
              
              {/* Author */}
              <div>
                <p className="font-bold text-[#4a3728]">{testimonial.author}</p>
                <p className="text-sm text-[#6a5748]">
                  {testimonial.location} — {testimonial.project}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
