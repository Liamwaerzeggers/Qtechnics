import React from 'react';
import { Helmet } from 'react-helmet';

const PrivacyPolicy = () => {
  return (
    <div data-testid="privacy-page">
      <Helmet>
        <title>Privacybeleid | Max Q Renovaties</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <section className="bg-[#3a190b] text-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold">Privacybeleid</h1>
          <p className="text-white/70 mt-2">Laatst bijgewerkt: april 2026</p>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 prose prose-lg max-w-none prose-headings:text-[#202020]">
          
          <h2>1. Verantwoordelijke</h2>
          <p>
            Max Q, powered by Q Technics<br />
            Gerhees 118, 3945 Ham, Belgie<br />
            Ondernemingsnummer: BE 0891.533.928<br />
            Email: info@maxq.be<br />
            Telefoon: +32 488 15 20 28
          </p>

          <h2>2. Welke gegevens verzamelen wij?</h2>
          <p>Wij verzamelen de volgende persoonsgegevens wanneer u contact opneemt of een offerte aanvraagt via onze website:</p>
          <ul>
            <li>Naam en voornaam</li>
            <li>E-mailadres</li>
            <li>Telefoonnummer</li>
            <li>Adresgegevens (straat, gemeente, postcode)</li>
            <li>Projectbeschrijving en -wensen</li>
          </ul>

          <h2>3. Waarom verzamelen wij deze gegevens?</h2>
          <p>Uw persoonsgegevens worden verwerkt voor de volgende doeleinden:</p>
          <ul>
            <li>Het beantwoorden van uw vraag of aanvraag</li>
            <li>Het opmaken en versturen van een offerte</li>
            <li>Het uitvoeren van een overeenkomst</li>
            <li>Het versturen van relevante informatie over onze diensten</li>
            <li>Wettelijke verplichtingen (boekhouding, facturatie)</li>
          </ul>

          <h2>4. Rechtsgrond</h2>
          <p>
            Wij verwerken uw gegevens op basis van: (a) uw toestemming bij het invullen van het contactformulier, 
            (b) de uitvoering van een overeenkomst, en (c) wettelijke verplichtingen.
          </p>

          <h2>5. Bewaartermijn</h2>
          <p>
            Uw persoonsgegevens worden bewaard zolang als nodig voor het doel waarvoor ze zijn verzameld. 
            Gegevens gekoppeld aan een overeenkomst worden bewaard gedurende de wettelijk verplichte termijn van 7 jaar na het einde van de overeenkomst.
          </p>

          <h2>6. Delen met derden</h2>
          <p>
            Wij delen uw gegevens niet met derden, behalve wanneer dit noodzakelijk is voor de uitvoering van onze diensten 
            (bijv. leveranciers van materialen) of wanneer wij hiertoe wettelijk verplicht zijn. 
            Uw gegevens worden niet verkocht aan derden.
          </p>

          <h2>7. Cookies en tracking</h2>
          <p>
            Onze website maakt gebruik van Google Analytics en Google Tag Manager om het websitegebruik te analyseren 
            en onze dienstverlening te verbeteren. Deze tools kunnen cookies plaatsen op uw apparaat. 
            U kunt cookies uitschakelen via uw browserinstellingen.
          </p>

          <h2>8. Uw rechten</h2>
          <p>Conform de AVG/GDPR hebt u het recht om:</p>
          <ul>
            <li>Inzage te vragen in uw persoonsgegevens</li>
            <li>Uw gegevens te laten corrigeren of verwijderen</li>
            <li>De verwerking van uw gegevens te beperken</li>
            <li>Bezwaar te maken tegen de verwerking</li>
            <li>Uw gegevens over te dragen (dataportabiliteit)</li>
            <li>Uw toestemming in te trekken</li>
          </ul>
          <p>
            Om uw rechten uit te oefenen, kunt u contact opnemen via info@maxq.be of +32 488 15 20 28. 
            U hebt ook het recht om een klacht in te dienen bij de Gegevensbeschermingsautoriteit 
            (www.gegevensbeschermingsautoriteit.be).
          </p>

          <h2>9. Beveiliging</h2>
          <p>
            Wij nemen passende technische en organisatorische maatregelen om uw persoonsgegevens te beschermen 
            tegen ongeoorloofde toegang, verlies of misbruik.
          </p>

          <h2>10. Wijzigingen</h2>
          <p>
            Wij behouden ons het recht voor dit privacybeleid te wijzigen. De meest recente versie is steeds 
            beschikbaar op onze website. Bij significante wijzigingen informeren wij u hierover.
          </p>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
