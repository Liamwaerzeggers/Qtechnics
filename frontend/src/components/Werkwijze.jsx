import React from 'react';

const Werkwijze = () => {
  return (
    <section className="py-16 md:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[#202020] mb-4">
            Onze werkwijze
          </h2>
          <p className="text-[#202020]/70 text-lg max-w-2xl mx-auto">
            Van eerste gesprek tot perfecte oplevering: zo werken wij.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Step 1 */}
          <div className="relative">
            <div className="hidden md:block absolute top-10 left-[calc(50%+40px)] w-[calc(100%-40px)] h-0.5 bg-gray-200" />
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-[#3a190b] flex items-center justify-center mb-6 shadow-lg">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-bold text-[#202020] mb-3">Kennismaking</h3>
              <p className="text-[#202020]/70 leading-relaxed">
                We komen langs om uw wensen te bespreken en de ruimte nauwkeurig op te meten.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative">
            <div className="hidden md:block absolute top-10 left-[calc(50%+40px)] w-[calc(100%-40px)] h-0.5 bg-gray-200" />
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-[#3a190b] flex items-center justify-center mb-6 shadow-lg">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-bold text-[#202020] mb-3">Ontwerp & Offerte</h3>
              <p className="text-[#202020]/70 leading-relaxed">
                U ontvangt een gedetailleerd ontwerp en een transparante prijsofferte.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative">
            <div className="hidden md:block absolute top-10 left-[calc(50%+40px)] w-[calc(100%-40px)] h-0.5 bg-gray-200" />
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-[#3a190b] flex items-center justify-center mb-6 shadow-lg">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-bold text-[#202020] mb-3">Uitvoering</h3>
              <p className="text-[#202020]/70 leading-relaxed">
                Onze ervaren vakmensen aan de slag.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-[#3a190b] flex items-center justify-center mb-6 shadow-lg">
                <span className="text-2xl font-bold text-white">4</span>
              </div>
              <h3 className="text-xl font-bold text-[#202020] mb-3">Oplevering</h3>
              <p className="text-[#202020]/70 leading-relaxed">
                We leveren op wanneer u tevreden bent.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Werkwijze;
