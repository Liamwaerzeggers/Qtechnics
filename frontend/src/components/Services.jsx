import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Wrench, Layers } from 'lucide-react';

const Services = () => {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Link to="/diensten/interieur-renoveren" className="bg-gray-50 rounded-lg p-8 hover:shadow-lg transition-all duration-300 group" data-testid="service-card-interieur">
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center mb-6 shadow-sm group-hover:shadow-md transition-shadow">
              <Home className="h-8 w-8 text-[#3a190b]" />
            </div>
            <h3 className="text-xl font-bold text-[#202020] mb-3">Interieur</h3>
            <p className="text-[#202020]/70">Badkamers, keukens en maatkasten op maat</p>
          </Link>

          <Link to="/diensten/elektriciteit-renovatie" className="bg-gray-50 rounded-lg p-8 hover:shadow-lg transition-all duration-300 group" data-testid="service-card-technieken">
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center mb-6 shadow-sm group-hover:shadow-md transition-shadow">
              <Wrench className="h-8 w-8 text-[#3a190b]" />
            </div>
            <h3 className="text-xl font-bold text-[#202020] mb-3">Technieken</h3>
            <p className="text-[#202020]/70">HVAC, sanitair, ventilatie en elektriciteit</p>
          </Link>

          <Link to="/diensten/totaalrenovatie" className="bg-gray-50 rounded-lg p-8 hover:shadow-lg transition-all duration-300 group" data-testid="service-card-totaal">
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center mb-6 shadow-sm group-hover:shadow-md transition-shadow">
              <Layers className="h-8 w-8 text-[#3a190b]" />
            </div>
            <h3 className="text-xl font-bold text-[#202020] mb-3">Totaalprojecten</h3>
            <p className="text-[#202020]/70">Volledige renovaties van A tot Z</p>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Services;
