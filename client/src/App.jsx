import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import AmbientBubbles from './components/AmbientBubbles.jsx';
import BackToTop from './components/BackToTop.jsx';
import TvScreen from './components/TvScreen.jsx';
import Home from './pages/Home.jsx';
import Watch from './pages/Watch.jsx';
import Queue from './pages/Queue.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  // TV mode: opening the app with ?tv=CODE renders the lean-back big-screen
  // view INSTEAD of the normal shell — no header, no footer, no nav.
  const tvCode = new URLSearchParams(window.location.search).get('tv');
  if (tvCode) {
    return <TvScreen code={tvCode.toUpperCase()} />;
  }

  return (
    <div className="app-shell">
      <AmbientBubbles />
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/christmas" element={<Home christmasOnly />} />
          <Route path="/watch/:id" element={<Watch />} />
          <Route path="/queue" element={<Queue />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
}

function NotFound() {
  return (
    <div className="narrow">
      <h1>Lost in the bubbles</h1>
      <p>That page doesn't exist. Let's head back home.</p>
    </div>
  );
}
