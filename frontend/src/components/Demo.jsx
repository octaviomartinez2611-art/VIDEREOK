import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw, ArrowUpRight, Check } from 'lucide-react';
import { Reveal, Chapter } from './Brand';
import { DemoSources } from './DemoSources';
import { DemoConnect } from './DemoConnect';
import { DemoQuestions } from './DemoQuestions';

const memoryKey = 'videre-demo-decision-v1';
function readMemory() { try { const raw = localStorage.getItem(memoryKey); return raw === 'true' ? true : raw === 'false' ? false : null; } catch { return null; } }

export const Demo = ({ onAccess }) => {
  const [step, setStep] = useState(0);
  const [highest, setHighest] = useState(0);
  const [choice, setChoice] = useState(readMemory);
  const [remembered, setRemembered] = useState(() => readMemory() !== null);
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const connect = () => { setBusy(true); timer.current = setTimeout(() => { setStep(1); setHighest(h => Math.max(1, h)); setBusy(false); }, 850); };
  const build = () => { if (choice === null) return; try { localStorage.setItem(memoryKey, String(choice)); } catch {} setStep(2); setHighest(2); };
  const reset = () => { clearTimeout(timer.current); setStep(0); setHighest(0); setChoice(null); setRemembered(false); setBusy(false); try { localStorage.removeItem(memoryKey); } catch {} };
  return <section className="demo-section" id="demo" data-testid="demo-section"><div className="page-width">
    <Reveal><Chapter number="02" id="demo-chapter">MENOS PROMESAS. MÁS PRUEBAS.</Chapter></Reveal><div className="demo-section-heading"><Reveal><h2 className="section-title" data-testid="demo-heading">La claridad se entiende<br /><em>cuando la ves.</em></h2></Reveal><Reveal delay={.1}><p data-testid="demo-section-description">No hace falta que nos creas.<br />Probalo con un pequeño negocio de ejemplo.</p><span className="demo-time">3 archivos. 3 pasos. Sin registro. <ArrowUpRight size={16} /></span></Reveal></div>
    <Reveal className="demo-workspace"><div className="demo-toolbar"><div className="demo-tabs" role="tablist" aria-label="Pasos de la demo">{['Conectar', 'Entender', 'Preguntar'].map((label, i) => <button key={label} role="tab" id={`demo-tab-${i}`} aria-controls="demo-stage" aria-selected={step === i} disabled={i > highest || busy} data-testid={`demo-tab-${i}`} onClick={() => setStep(i)} className={step === i ? 'active' : ''}>{step === i && <motion.span className="demo-tab-highlight" layoutId="demo-tab" transition={{ type: 'spring', bounce: .1, duration: .5 }} />}<span>{i < highest ? <Check size={12} /> : `0${i + 1}`}</span><strong>{label}</strong></button>)}</div><button onClick={reset} data-testid="demo-reset-button" className="demo-reset" aria-label="Reiniciar demo"><RotateCcw size={13} /><span>Reiniciar</span></button></div>
      <div className="demo-stage" id="demo-stage" role="tabpanel" aria-labelledby={`demo-tab-${step}`}><AnimatePresence mode="wait"><motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .25 }}>{step === 0 ? <DemoSources busy={busy} onConnect={connect} /> : step === 1 ? <DemoConnect choice={choice} setChoice={setChoice} onBuild={build} remembered={remembered} /> : <DemoQuestions merge={choice} onAccess={onAccess} />}</motion.div></AnimatePresence></div>
    </Reveal><div className="demo-caption" data-testid="demo-disclosure"><span><span className="status-dot" /> DEMO INTERACTIVA · DATOS FICTICIOS</span><span>Sin subir archivos. Sin conectar IA. Solo ver cómo funciona.</span></div>
  </div></section>;
};