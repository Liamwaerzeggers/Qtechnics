import React, { useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import Services from './components/Services';
import Projects from './components/Projects';
import Werkwijze from './components/Werkwijze';
import Testimonials from './components/Testimonials';
import FAQ from './components/FAQ';
import CTA from './components/CTA';
import InternalLinks from './components/InternalLinks';
import Footer from './components/Footer';
import RenoverenPage from './components/RenoverenPage';
import ProjectenPage from './components/ProjectenPage';
import ProjectDetail from './components/ProjectDetail';
import ContactPage from './components/ContactPage';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import StartPage from './components/StartPage';
import LocationPage from './components/LocationPage';
import ServicePage from './components/ServicePage';
import BlogPage from './components/BlogPage';
import BlogDetail from './components/BlogDetail';
import BedanktPage from './components/BedanktPage';
import PrivacyPolicy from './components/PrivacyPolicy';
import AlgemeneVoorwaarden from './components/AlgemeneVoorwaarden';
import CookieBanner from './components/CookieBanner';
import CookiePolicy from './components/CookiePolicy';
import RenovatieCalculator from './components/RenovatieCalculator';
import PremiePage from './components/PremiePage';
import { Helmet } from 'react-helmet';
import { GOOGLE_REVIEWS, GOOGLE_RATING } from './data/googleReviews';

const reviewSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': 'https://maxq.be/#reviews',
  name: 'Max Q - powered by QTechnics',
  url: 'https://maxq.be',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: GOOGLE_RATING.aggregate,
    reviewCount: GOOGLE_RATING.total,
    bestRating: 5,
    worstRating: 1,
  },
  review: GOOGLE_REVIEWS.map((r) => ({
    '@type': 'Review',
    author: { '@type': 'Person', name: r.name },
    datePublished: r.date,
    reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
    reviewBody: r.text,
  })),
};

// Component to scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
};

const Home = () => {
  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(reviewSchema)}</script>
      </Helmet>
      <Hero />
      <Services />
      <Projects />
      <Werkwijze />
      <InternalLinks />
      <Testimonials />
      <FAQ />
      <CTA />
    </>
  );
};

// Layout with Header and Footer
const MainLayout = ({ children }) => (
  <>
    <Header />
    <main>{children}</main>
    <Footer />
  </>
);

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <ScrollToTop />
        <CookieBanner />
        <Routes>
          {/* Public pages with header/footer */}
          <Route path="/" element={<MainLayout><Home /></MainLayout>} />
          <Route path="/renoveren" element={<MainLayout><RenoverenPage /></MainLayout>} />
          <Route path="/projecten" element={<MainLayout><ProjectenPage /></MainLayout>} />
          <Route path="/projecten/:id" element={<MainLayout><ProjectDetail /></MainLayout>} />
          <Route path="/contact" element={<MainLayout><ContactPage /></MainLayout>} />
          
          {/* SEO Location pages - not in menu */}
          <Route path="/renovatie/:location" element={<MainLayout><LocationPage /></MainLayout>} />
          <Route path="/renovatie/:location/:service" element={<MainLayout><LocationPage /></MainLayout>} />
          
          {/* SEO Service pages - not in menu */}
          <Route path="/diensten/:service" element={<MainLayout><ServicePage /></MainLayout>} />
          <Route path="/diensten/:service/:location" element={<MainLayout><ServicePage /></MainLayout>} />
          
          {/* Blog pages */}
          <Route path="/blog" element={<MainLayout><BlogPage /></MainLayout>} />
          <Route path="/blog/:slug" element={<MainLayout><BlogDetail /></MainLayout>} />
          
          {/* Admin pages without header/footer */}
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          
          {/* Lead funnel page without header/footer */}
          <Route path="/start" element={<StartPage />} />
          
          {/* Thank you / conversion page */}
          <Route path="/bedankt" element={<MainLayout><BedanktPage /></MainLayout>} />
          <Route path="/privacybeleid" element={<MainLayout><PrivacyPolicy /></MainLayout>} />
          <Route path="/algemene-voorwaarden" element={<MainLayout><AlgemeneVoorwaarden /></MainLayout>} />
          <Route path="/cookiebeleid" element={<MainLayout><CookiePolicy /></MainLayout>} />
          <Route path="/calculator" element={<MainLayout><RenovatieCalculator /></MainLayout>} />
          <Route path="/renovatie-prijscalculator" element={<MainLayout><RenovatieCalculator /></MainLayout>} />
          <Route path="/premies-en-renovatieplicht-2026" element={<MainLayout><PremiePage /></MainLayout>} />
          <Route path="/mijn-verbouwpremie-2026" element={<MainLayout><PremiePage /></MainLayout>} />
          <Route path="/renovatiepremies-vlaanderen" element={<MainLayout><PremiePage /></MainLayout>} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
