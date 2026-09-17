import { useEffect, useState } from 'react';
import { MotionConfig, useReducedMotion } from 'framer-motion';
import Lenis from 'lenis';
import { Toaster } from 'sonner';
import { Navigation } from './components/Navigation';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { Demo } from './components/Demo';
import { Trust } from './components/Trust';
import { EditorialMarquee, FAQ, Closing } from './components/Closing';
import { AccessModal, PrivacyModal } from './components/AccessModal';
import './App.css';

function App() {
  const [access, setAccess] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({ duration: 1.05, smoothWheel: true, anchors: { offset: -100 }, autoRaf: true });
    return () => lenis.destroy();
  }, [reduce]);
  const onAccess = () => setAccess(true);
  return <MotionConfig reducedMotion="user"><a className="skip-link" href="#contenido" data-testid="skip-content-link">Saltar al contenido</a><Navigation onAccess={onAccess} /><main id="contenido"><Hero onAccess={onAccess} /><HowItWorks /><Demo onAccess={onAccess} /><Trust /><EditorialMarquee /><FAQ /></main><Closing onAccess={onAccess} onPrivacy={() => setPrivacy(true)} /><AccessModal open={access} onOpenChange={setAccess} /><PrivacyModal open={privacy} onOpenChange={setPrivacy} /><Toaster position="bottom-right" toastOptions={{ style: { background: '#f5f4ed', color: '#282c25', border: '1px solid #d5d7c8', fontFamily: 'DM Sans, sans-serif' } }} /></MotionConfig>;
}

export default App;