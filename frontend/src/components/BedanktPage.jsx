import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { CheckCircle, Phone, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import InternalLinks from './InternalLinks';

const BedanktPage = () => {
  return (
    <div data-testid="bedankt-page">
      <Helmet>
        <title>Bedankt voor uw aanvraag | Max Q</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <section className="min-h-[70vh] flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-[#202020] mb-4" data-testid="bedankt-title">
            Bedankt voor uw aanvraag!
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            We hebben uw bericht goed ontvangen.
          </p>
          <p className="text-gray-600 mb-8">
            Een van onze experts neemt binnen 24 uur contact met u op om uw project te bespreken.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/">
              <Button className="bg-[#3a190b] text-white hover:bg-[#500000] px-6 py-3" data-testid="bedankt-home-btn">
                Terug naar home <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <a href="tel:+32488152028">
              <Button variant="outline" className="border-[#3a190b] text-[#3a190b] hover:bg-[#3a190b]/5 px-6 py-3" data-testid="bedankt-phone-btn">
                <Phone className="h-4 w-4 mr-2" /> Bel ons direct
              </Button>
            </a>
          </div>
        </div>
      </section>

      <InternalLinks />
    </div>
  );
};

export default BedanktPage;
