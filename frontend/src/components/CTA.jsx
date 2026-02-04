import React from 'react';
import { ArrowRight, Phone } from 'lucide-react';
import { Button } from './ui/button';
import { ctaContent, companyInfo } from '../data/mock';

const CTA = () => {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gray-50 rounded-2xl p-8 md:p-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#4a3728] mb-4">
            {ctaContent.title}
          </h2>
          <p className="text-[#6a5748] text-lg max-w-2xl mx-auto mb-8">
            {ctaContent.description}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Button className="bg-[#4a3728] hover:bg-[#3a2a1e] text-white px-6 py-3 text-base flex items-center gap-2 group">
              {ctaContent.primaryButton}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              variant="outline"
              className="border-[#4a3728] text-[#4a3728] hover:bg-[#4a3728] hover:text-white px-6 py-3 text-base"
            >
              {ctaContent.secondaryButton}
            </Button>
          </div>
          
          <a
            href={`tel:${companyInfo.phone.replace(/\s/g, '')}`}
            className="inline-flex items-center text-[#4a3728] hover:text-[#c17f24] font-medium transition-colors"
          >
            <Phone className="h-5 w-5 mr-2" />
            {companyInfo.phone}
          </a>
        </div>
      </div>
    </section>
  );
};

export default CTA;
