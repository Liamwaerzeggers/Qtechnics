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
import Footer from './components/Footer';
import RenoverenPage from './components/RenoverenPage';
import ProjectenPage from './components/ProjectenPage';
import ProjectDetail from './components/ProjectDetail';
import ContactPage from './components/ContactPage';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import StartPage from './components/StartPage';
import LocationPage from './components/LocationPage';

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
      <Hero />
      <Services />
      <Projects />
      <Werkwijze />
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
          
          {/* Admin pages without header/footer */}
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          
          {/* Lead funnel page without header/footer */}
          <Route path="/start" element={<StartPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
