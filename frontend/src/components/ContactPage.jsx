import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock, Send } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import InternalLinks from './InternalLinks';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const leadData = {
        projectTypes: ['contact'],
        budget: 'onbekend',
        timeline: 'onbekend',
        description: (formData.subject ? formData.subject + ': ' : '') + formData.message,
        firstName: formData.name.split(' ')[0] || formData.name,
        lastName: formData.name.split(' ').slice(1).join(' ') || '',
        email: formData.email,
        phone: formData.phone || '',
        street: '',
        city: '',
        postalCode: '',
      };
      const response = await fetch(API_URL + '/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData),
      });
      if (response.ok) {
        navigate('/bedankt');
      } else {
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 3000);
      }
    } catch (error) {
      console.error('Contact submit error:', error);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    }
    setIsSubmitting(false);
  };

  return (
    <div>
      <Helmet>
        <title>Contact ✓ Gratis Plaatsbezoek 48u | Max Q Limburg</title>
        <meta name="description" content="Bel +32 488 15 20 28 of vraag online uw gratis offerte aan. Plaatsbezoek binnen 48 uur in heel Limburg. Antwoord binnen 24u gegarandeerd." />
        <link rel="canonical" href="https://maxq.be/contact" />
        <meta property="og:title" content="Contact ✓ Gratis Plaatsbezoek 48u | Max Q" />
        <meta property="og:description" content="Plan een gratis plaatsbezoek in heel Limburg. Bel +32 488 15 20 28 of vraag online uw offerte aan." />
      </Helmet>
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#202020] mb-6">
            Neem contact op
          </h1>
          <p className="text-lg md:text-xl text-[#202020]/70 max-w-3xl leading-relaxed">
            Heeft u een vraag of wilt u een vrijblijvende offerte? Neem gerust contact met ons op. 
            We staan klaar om u te helpen met uw renovatieproject.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-[#202020] mb-6">Stuur ons een bericht</h2>
              
              {submitted && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                  Bedankt voor uw bericht! We nemen zo snel mogelijk contact met u op.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-[#202020] mb-2 block">Naam *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full"
                      placeholder="Uw naam"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-[#202020] mb-2 block">E-mail *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full"
                      placeholder="uw@email.be"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" className="text-[#202020] mb-2 block">Telefoon</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full"
                      placeholder="+32 ..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="subject" className="text-[#202020] mb-2 block">Onderwerp *</Label>
                    <Input
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full"
                      placeholder="Waar gaat uw vraag over?"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="message" className="text-[#202020] mb-2 block">Bericht *</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full"
                    placeholder="Vertel ons meer over uw project..."
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-[#3a190b] hover:bg-[#500000] text-white px-6 py-3 flex items-center gap-2"
                  data-testid="contact-submit-btn"
                >
                  {isSubmitting ? 'Versturen...' : 'Verstuur bericht'}
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>

            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-bold text-[#202020] mb-6">Contactgegevens</h2>
              
              <div className="space-y-6 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#3a190b] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#202020] mb-1">Telefoon</h3>
                    <a href="tel:+32488152028" className="text-[#202020]/70 hover:text-[#500000] transition-colors">
                      +32 488 15 20 28
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#3a190b] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#202020] mb-1">E-mail</h3>
                    <a href="mailto:info@maxq.be" className="text-[#202020]/70 hover:text-[#500000] transition-colors">
                      info@maxq.be
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#3a190b] rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#202020] mb-1">Adres</h3>
                    <p className="text-[#202020]/70">
                      Gerhees 118<br />
                      3945 Ham, België
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#3a190b] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#202020] mb-1">Openingsuren</h3>
                    <p className="text-[#202020]/70">
                      Maandag - Vrijdag: 8:00 - 17:00<br />
                      Zaterdag: Op afspraak<br />
                      Zondag: Gesloten
                    </p>
                  </div>
                </div>
              </div>

              {/* Map placeholder */}
              <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center">
                <div className="text-center text-[#202020]/50">
                  <MapPin className="h-12 w-12 mx-auto mb-2" />
                  <p>Gerhees 118, 3945 Ham</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-[#3a190b]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Liever persoonlijk contact?
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Plan een gratis en vrijblijvend plaatsbezoek. We komen graag bij u langs om uw project te bespreken.
          </p>
          <Link to="/start">
            <Button className="bg-white text-[#3a190b] hover:bg-gray-100 px-6 py-3 text-base">
              Plan een plaatsbezoek
            </Button>
          </Link>
        </div>
      </section>

      <InternalLinks />
    </div>
  );
};

export default ContactPage;
