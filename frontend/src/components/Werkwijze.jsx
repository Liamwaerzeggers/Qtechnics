import React from 'react';
import { werkwijzeSteps } from '../data/mock';

const Werkwijze = () => {
  return (
    <section className="py-16 md:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[#4a3728] mb-4">
            Onze werkwijze
          </h2>
          <p className="text-[#6a5748] text-lg max-w-2xl mx-auto">
            Van eerste gesprek tot perfecte oplevering: zo werken wij.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {werkwijzeSteps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line */}
              {index < werkwijzeSteps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[calc(50%+40px)] w-[calc(100%-40px)] h-0.5 bg-gray-200" />
              )}
              
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-[#4a3728] flex items-center justify-center mb-6 shadow-lg">
                  <span className="text-2xl font-bold text-white">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[#4a3728] mb-3">
                  {step.title}
                </h3>
                <p className="text-[#6a5748] leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Werkwijze;
