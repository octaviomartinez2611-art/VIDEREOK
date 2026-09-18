import { useEffect } from 'react';
import Lenis from 'lenis';
import { Toaster } from 'sonner';
import { Navigation } from './components/Navigation';
import { Hero } from './components/Hero';
import { Etymology } from './components/Etymology';
import { HowItWorks } from './components/HowItWorks';
import { Demo } from './components/Demo';
import { Trust } from './components/Trust';
import { FAQ, Footer } from './components/Closing';
import './App.css';

function App() {
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.05, smoothWheel: true, anchors: { offset: -100 }, autoRaf: true });
    return () => lenis.destroy();
  }, []);

  return (
    <>
      <a className="skip-link" href="#contenido" data-testid="skip-content-link">Saltar al contenido</a>
      <Navigation />
      <main id="contenido">
        <Hero />
        <Etymology />
        <HowItWorks />
        <Demo />
        <Trust />
        <FAQ />
      </main>
      <Footer />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0F1117',
            color: '#E8E4DD',
            border: '1px solid rgba(255,255,255,0.08)',
            fontFamily: "'JetBrains Mono', monospace",
          },
        }}
      />
    </>
  );
}

export default App;
