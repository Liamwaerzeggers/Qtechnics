import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Check, Home, Bath, ChefHat, Layers, Wrench, Calendar, User, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const projectTypes = [
  { id: 'totaalrenovatie', label: 'Totaalrenovatie', icon: Layers, description: 'Volledige renovatie van uw woning' },
  { id: 'badkamer', label: 'Badkamer', icon: Bath, description: 'Nieuwe badkamer of renovatie' },
  { id: 'keuken', label: 'Keuken', icon: ChefHat, description: 'Keuken op maat of renovatie' },
  { id: 'technieken', label: 'Technieken', icon: Wrench, description: 'HVAC, sanitair, elektriciteit' },
  { id: 'interieur', label: 'Interieur', icon: Home, description: 'Maatkasten, afwerking, etc.' },
];

const budgetRanges = [
  { id: 'under25k', label: '< €25.000' },
  { id: '25k-50k', label: '€25.000 - €50.000' },
  { id: '50k-100k', label: '€50.000 - €100.000' },
  { id: '100k-200k', label: '€100.000 - €200.000' },
  { id: 'over200k', label: '> €200.000' },
  { id: 'unknown', label: 'Weet ik nog niet' },
];

const timelines = [
  { id: 'asap', label: 'Zo snel mogelijk' },
  { id: '1-3months', label: 'Binnen 1-3 maanden' },
  { id: '3-6months', label: 'Binnen 3-6 maanden' },
  { id: '6-12months', label: 'Binnen 6-12 maanden' },
  { id: 'exploring', label: 'Ik ben nog aan het oriënteren' },
];

const StartPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    projectTypes: [],
    budget: '',
    timeline: '',
    description: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    postalCode: '',
  });

  const totalSteps = 4;

  const handleProjectTypeToggle = (typeId) => {
    setFormData(prev => ({
      ...prev,
      projectTypes: prev.projectTypes.includes(typeId)
        ? prev.projectTypes.filter(t => t !== typeId)
        : [...prev.projectTypes, typeId]
    }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.projectTypes.length > 0;
      case 2:
        return formData.budget && formData.timeline;
      case 3:
        return formData.description.length > 10;
      case 4:
        return formData.firstName && formData.lastName && formData.email && formData.phone && formData.city;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        navigate('/bedankt');
      } else {
        alert('Er is iets misgegaan. Probeer het opnieuw.');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Er is iets misgegaan. Probeer het opnieuw.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <a href="/">
            <img 
              src="https://customer-assets.emergentagent.com/job_maxq-showcase/artifacts/rn05emza_logo%20maxq.png" 
              alt="Max Q" 
              className="h-10"
            />
          </a>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#202020]/70">Stap {currentStep} van {totalSteps}</span>
            <span className="text-sm text-[#202020]/70">{Math.round((currentStep / totalSteps) * 100)}% voltooid</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#3a190b] transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Step 1: Project Type */}
        {currentStep === 1 && (
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#202020] mb-4">
              Wat wilt u laten renoveren?
            </h1>
            <p className="text-[#202020]/70 mb-8">
              Selecteer één of meerdere opties die van toepassing zijn.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projectTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = formData.projectTypes.includes(type.id);
                return (
                  <button
                    key={type.id}
                    onClick={() => handleProjectTypeToggle(type.id)}
                    className={`p-6 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'border-[#3a190b] bg-[#3a190b]/5'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-[#3a190b] text-white' : 'bg-gray-100 text-[#3a190b]'
                      }`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-[#202020] mb-1">{type.label}</h3>
                        <p className="text-sm text-[#202020]/70">{type.description}</p>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 bg-[#3a190b] rounded-full flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Budget & Timeline */}
        {currentStep === 2 && (
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#202020] mb-4">
              Budget & planning
            </h1>
            <p className="text-[#202020]/70 mb-8">
              Dit helpt ons om een passend voorstel voor u te maken.
            </p>
            
            <div className="mb-10">
              <h2 className="text-xl font-bold text-[#202020] mb-4">Wat is uw budget?</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {budgetRanges.map((range) => (
                  <button
                    key={range.id}
                    onClick={() => setFormData({ ...formData, budget: range.id })}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      formData.budget === range.id
                        ? 'border-[#3a190b] bg-[#3a190b]/5'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <span className={`font-medium ${
                      formData.budget === range.id ? 'text-[#3a190b]' : 'text-[#202020]'
                    }`}>
                      {range.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#202020] mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Wanneer wilt u starten?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {timelines.map((timeline) => (
                  <button
                    key={timeline.id}
                    onClick={() => setFormData({ ...formData, timeline: timeline.id })}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      formData.timeline === timeline.id
                        ? 'border-[#3a190b] bg-[#3a190b]/5'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <span className={`font-medium ${
                      formData.timeline === timeline.id ? 'text-[#3a190b]' : 'text-[#202020]'
                    }`}>
                      {timeline.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Description */}
        {currentStep === 3 && (
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#202020] mb-4">
              Vertel ons meer over uw project
            </h1>
            <p className="text-[#202020]/70 mb-8">
              Beschrijf kort wat u in gedachten heeft. Hoe meer details, hoe beter we u kunnen helpen.
            </p>
            
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Bijvoorbeeld: We willen onze badkamer volledig vernieuwen met een inloopdouche, dubbele wastafel en vloerverwarming. De huidige badkamer is ongeveer 8m² en we hebben interesse in moderne, tijdloze materialen..."
              rows={8}
              className="w-full text-base"
            />
            <p className="text-sm text-[#202020]/50 mt-2">
              Minimaal 10 karakters ({formData.description.length} / 10)
            </p>
          </div>
        )}

        {/* Step 4: Contact Details */}
        {currentStep === 4 && (
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#202020] mb-4">
              Uw contactgegevens
            </h1>
            <p className="text-[#202020]/70 mb-8">
              We gebruiken deze gegevens om contact met u op te nemen.
            </p>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" />
                    Voornaam *
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Uw voornaam"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="mb-2 block">Achternaam *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Uw achternaam"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4" />
                    E-mailadres *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="uw@email.be"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="flex items-center gap-2 mb-2">
                    <Phone className="h-4 w-4" />
                    Telefoonnummer *
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+32 ..."
                  />
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4" />
                  Adres (optioneel)
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    placeholder="Straat en huisnummer"
                    className="md:col-span-2"
                  />
                  <Input
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    placeholder="Postcode"
                  />
                </div>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Gemeente *"
                  className="mt-4"
                />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-12">
          <Button
            onClick={handleBack}
            variant="outline"
            className={`${currentStep === 1 ? 'invisible' : ''}`}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Vorige
          </Button>
          
          {currentStep < totalSteps ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="bg-[#3a190b] hover:bg-[#500000] text-white disabled:opacity-50"
            >
              Volgende
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className="bg-[#3a190b] hover:bg-[#500000] text-white disabled:opacity-50"
            >
              {isSubmitting ? 'Verzenden...' : 'Aanvraag versturen'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StartPage;
