import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

const CONSENT_KEY = 'maxq_cookie_consent';

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      setVisible(true);
    } else if (consent === 'accepted') {
      updateConsent(true);
    }
  }, []);

  const updateConsent = (granted) => {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: granted ? 'granted' : 'denied',
        ad_storage: granted ? 'granted' : 'denied',
        ad_user_data: granted ? 'granted' : 'denied',
        ad_personalization: granted ? 'granted' : 'denied',
      });
    }
  };

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    updateConsent(true);
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem(CONSENT_KEY, 'rejected');
    updateConsent(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4" data-testid="cookie-banner">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl border border-gray-200 p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex w-10 h-10 bg-[#3a190b]/10 rounded-lg items-center justify-center flex-shrink-0 mt-0.5">
            <Shield className="h-5 w-5 text-[#3a190b]" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-[#202020] mb-1">Wij respecteren uw privacy</h3>
            <p className="text-sm text-gray-600 mb-4">
              Wij gebruiken cookies om uw ervaring te verbeteren en ons websiteverkeer te analyseren. 
              U kiest zelf welke cookies u toestaat. 
              Lees meer in ons <Link to="/cookiebeleid" className="text-[#3a190b] underline">cookiebeleid</Link>.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleAccept}
                className="bg-[#3a190b] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#500000] transition-colors"
                data-testid="cookie-accept"
              >
                Alles accepteren
              </button>
              <button
                onClick={handleReject}
                className="bg-gray-100 text-[#202020] px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                data-testid="cookie-reject"
              >
                Enkel noodzakelijke
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
