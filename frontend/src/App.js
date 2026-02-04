import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import Services from './components/Services';
import Projects from './components/Projects';
import Werkwijze from './components/Werkwijze';
import Testimonials from './components/Testimonials';
import CTA from './components/CTA';
import Footer from './components/Footer';
import RenoverenPage from './components/RenoverenPage';
import ProjectenPage from './components/ProjectenPage';
import ContactPage from './components/ContactPage';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';

const Home = () => {
  return (
    <>
      <Hero />
      <Services />
      <Projects />
      <Werkwijze />
      <Testimonials />
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
        <Routes>
          {/* Public pages with header/footer */}
          <Route path="/" element={<MainLayout><Home /></MainLayout>} />
          <Route path="/renoveren" element={<MainLayout><RenoverenPage /></MainLayout>} />
          <Route path="/projecten" element={<MainLayout><ProjectenPage /></MainLayout>} />
          <Route path="/contact" element={<MainLayout><ContactPage /></MainLayout>} />
          
          {/* Admin pages without header/footer */}
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
