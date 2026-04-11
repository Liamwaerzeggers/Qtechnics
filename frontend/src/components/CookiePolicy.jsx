import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';

const CookiePolicy = () => {
  return (
    <div data-testid="cookie-page">
      <Helmet>
        <title>Cookiebeleid | Max Q Renovaties</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <section className="bg-[#3a190b] text-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold">Cookiebeleid</h1>
          <p className="text-white/70 mt-2">Laatst bijgewerkt: april 2026</p>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 prose prose-lg max-w-none prose-headings:text-[#202020]">

          <h2>1. Wat zijn cookies?</h2>
          <p>
            Cookies zijn kleine tekstbestanden die op uw computer, tablet of smartphone worden opgeslagen 
            wanneer u een website bezoekt. Ze worden veelvuldig gebruikt om websites goed te laten werken, 
            om uw voorkeuren te onthouden en om het websitegebruik te analyseren.
          </p>

          <h2>2. Verantwoordelijke</h2>
          <p>
            Max Q, powered by Q Technics<br />
            Gerhees 118, 3945 Ham, Belgie<br />
            Ondernemingsnummer: BE 0891.533.928<br />
            Email: info@maxq.be
          </p>

          <h2>3. Welke cookies gebruiken wij?</h2>

          <h3>3.1 Noodzakelijke cookies</h3>
          <p>
            Deze cookies zijn essentieel voor het functioneren van de website. Ze worden altijd geplaatst 
            en vereisen geen toestemming.
          </p>
          <table>
            <thead>
              <tr><th>Cookie</th><th>Doel</th><th>Bewaartermijn</th></tr>
            </thead>
            <tbody>
              <tr><td>maxq_cookie_consent</td><td>Onthoudt uw cookievoorkeuren</td><td>1 jaar</td></tr>
            </tbody>
          </table>

          <h3>3.2 Analytische cookies (Google Analytics)</h3>
          <p>
            Deze cookies helpen ons te begrijpen hoe bezoekers onze website gebruiken. 
            Ze verzamelen geanonimiseerde informatie over paginabezoeken, verkeersbronnen en gebruikersgedrag. 
            Deze cookies worden pas geplaatst na uw toestemming.
          </p>
          <table>
            <thead>
              <tr><th>Cookie</th><th>Doel</th><th>Bewaartermijn</th></tr>
            </thead>
            <tbody>
              <tr><td>_ga</td><td>Uniek ID voor Google Analytics bezoekersregistratie</td><td>2 jaar</td></tr>
              <tr><td>_ga_*</td><td>Sessiegegevens voor Google Analytics 4</td><td>2 jaar</td></tr>
              <tr><td>_gid</td><td>Onderscheid tussen bezoekers</td><td>24 uur</td></tr>
            </tbody>
          </table>

          <h3>3.3 Marketing- en advertentiecookies (Google Ads)</h3>
          <p>
            Deze cookies worden gebruikt om advertenties relevanter te maken voor u en om de effectiviteit 
            van onze advertentiecampagnes te meten. Ze worden pas geplaatst na uw toestemming.
          </p>
          <table>
            <thead>
              <tr><th>Cookie</th><th>Doel</th><th>Bewaartermijn</th></tr>
            </thead>
            <tbody>
              <tr><td>_gcl_au</td><td>Google Ads conversie-tracking</td><td>3 maanden</td></tr>
              <tr><td>_gcl_aw</td><td>Google Ads click-tracking</td><td>3 maanden</td></tr>
              <tr><td>IDE</td><td>Google DoubleClick advertentietracking</td><td>1 jaar</td></tr>
            </tbody>
          </table>

          <h3>3.4 Google Tag Manager</h3>
          <p>
            Google Tag Manager is een beheersysteem waarmee wij bovenstaande tags en cookies 
            centraal beheren. GTM zelf plaatst geen cookies, maar stuurt andere diensten aan 
            op basis van uw toestemming.
          </p>

          <h2>4. Google Consent Mode v2</h2>
          <p>
            Onze website maakt gebruik van Google Consent Mode v2. Dit betekent dat:
          </p>
          <ul>
            <li>Standaard worden <strong>geen analytische of marketing cookies</strong> geplaatst</li>
            <li>Pas na uw uitdrukkelijke toestemming ("Alles accepteren") worden deze cookies geactiveerd</li>
            <li>Als u "Enkel noodzakelijke" kiest, worden er geen tracking-cookies geplaatst</li>
            <li>Google ontvangt in dat geval enkel geanonimiseerde, cookieloze signalen (pings)</li>
          </ul>

          <h2>5. Uw toestemming beheren</h2>
          <p>
            Bij uw eerste bezoek aan onze website wordt u gevraagd om uw cookievoorkeuren in te stellen 
            via de cookiebanner. U kunt uw keuze op elk moment wijzigen door uw browsergegevens te wissen 
            en de website opnieuw te bezoeken. De cookiebanner verschijnt dan opnieuw.
          </p>
          <p>
            U kunt cookies ook beheren of verwijderen via uw browserinstellingen:
          </p>
          <ul>
            <li><strong>Chrome:</strong> Instellingen &gt; Privacy en beveiliging &gt; Cookies</li>
            <li><strong>Firefox:</strong> Instellingen &gt; Privacy en beveiliging &gt; Cookies en sitegegevens</li>
            <li><strong>Safari:</strong> Voorkeuren &gt; Privacy &gt; Cookies en websitegegevens</li>
            <li><strong>Edge:</strong> Instellingen &gt; Cookies en sitemachtigingen</li>
          </ul>

          <h2>6. Derden</h2>
          <p>
            De analytische en marketingcookies op onze website worden geplaatst door Google 
            (Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043, VS). 
            Google kan de verzamelde gegevens verwerken in landen buiten de Europese Economische Ruimte. 
            Google heeft zich verbonden aan het EU-US Data Privacy Framework.
          </p>
          <p>
            Meer informatie over hoe Google met gegevens omgaat: 
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
              Google Privacybeleid
            </a>
          </p>

          <h2>7. Uw rechten</h2>
          <p>
            Op grond van de AVG/GDPR hebt u het recht om uw toestemming op elk moment in te trekken, 
            inzage te vragen in uw gegevens, en correctie of verwijdering te verzoeken. 
            Meer informatie vindt u in ons <Link to="/privacybeleid">privacybeleid</Link>.
          </p>

          <h2>8. Contact</h2>
          <p>
            Hebt u vragen over ons cookiebeleid? Neem contact op:<br />
            Email: info@maxq.be<br />
            Telefoon: +32 488 15 20 28
          </p>

          <h2>9. Wijzigingen</h2>
          <p>
            Wij behouden ons het recht voor dit cookiebeleid te wijzigen. De meest recente versie is steeds 
            beschikbaar op deze pagina.
          </p>
        </div>
      </section>
    </div>
  );
};

export default CookiePolicy;
