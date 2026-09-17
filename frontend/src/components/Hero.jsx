import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, Check, Database, FileSpreadsheet, Globe2, ShoppingBag } from 'lucide-react';
import { Action } from './Brand';
import { LensVisual } from './LensVisual';

export const Hero = ({ onAccess }) => {
  const reduce = useReducedMotion();
  return <section id="inicio" className="hero-section" data-testid="hero-section">
    <div className="hero-grid page-width">
      <div className="hero-copy">
        <motion.div className="eyebrow" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .8 }} data-testid="hero-eyebrow"><span className="status-dot" /> INTELIGENCIA PARA TU NEGOCIO</motion.div>
        <h1 className="hero-title" data-testid="hero-title">{['Menos ruido.', 'Más claridad.'].map((line, i) => <span className="line-mask" key={line}><motion.span initial={reduce ? false : { y: '110%' }} animate={{ y: 0 }} transition={{ delay: .1 + i * .14, duration: 1.1, ease: [.22, 1, .36, 1] }} className={i ? 'serif-italic' : ''}>{line}</motion.span></span>)}</h1>
        <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .55, duration: .8 }}>
          <p className="hero-description" data-testid="hero-description">Tu negocio ya tiene las respuestas.<br />VIDERE conecta tus datos para que puedas verlas.</p>
          <div className="hero-ctas"><Action href="#demo" id="hero-demo-button" arrow="right">Explorar la demo</Action><button className="text-link" onClick={onAccess} data-testid="hero-access-button">Solicitar acceso <span>↗</span></button></div>
          <div className="hero-note" data-testid="hero-note"><Check size={13} /> Sin instalaciones. Sin jerga. Sin perder el control.</div>
        </motion.div>
      </div>
      <LensVisual />
    </div>
    <div className="hero-bottom page-width"><a className="discover-link" href="#como-funciona" data-testid="discover-link"><span className="circle-arrow"><ArrowDown size={14} /></span> Una nueva forma de entender tu negocio</a><span className="hero-bottom-note" data-testid="hero-audience">PENSADO PARA PYMES. CONSTRUIDO PARA VOS.</span></div>
    <div className="source-strip"><div className="page-width source-strip-inner"><span data-testid="source-strip-label">No cambies tus herramientas.<br /><strong>Hacé que se entiendan.</strong></span><div className="source-tools" data-testid="supported-data-sources"><span><Database />Tu CRM</span><span><FileSpreadsheet />Tus planillas</span><span><Globe2 />Tu tienda online</span><span><ShoppingBag />Tus pedidos</span></div><span className="source-strip-end">UN SOLO LUGAR <span>↗</span></span></div></div>
  </section>;
};