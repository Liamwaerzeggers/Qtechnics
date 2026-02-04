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

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/renoveren" element={<RenoverenPage />} />
            <Route path="/projecten" element={<Home />} />
            <Route path="/werkwijze" element={<Home />} />
            <Route path="/contact" element={<Home />} />
          </Routes>
        </main>
        <Footer />
      </BrowserRouter>
    </div>
  );
}

export default App;
