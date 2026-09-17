import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { Table2, Globe2, ShoppingBag, Check } from 'lucide-react';
import { BrandMark } from './Brand';

// A projected torus: the same continuous structure, seen from many perspectives.
const ringPaths = Array.from({ length: 70 }, (_, i) => {
  const u = i / 70 * Math.PI * 2;
  return Array.from({ length: 121 }, (_, j) => {
    const v = j / 120 * Math.PI * 2;
    const radius = 124 + 63 * Math.cos(v);
    const x = radius * Math.cos(u);
    const y = radius * Math.sin(u);
    const z = 63 * Math.sin(v);
    const yy = y * .54 - z * .84;
    const xx = x * .84 - yy * .54;
    const ry = x * .54 + yy * .84;
    return `${j ? 'L' : 'M'}${(xx + 280).toFixed(2)},${(ry + 265).toFixed(2)}`;
  }).join(' ');
});

export const LensVisual = () => {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0), y = useMotionValue(0);
  const rotateY = useSpring(x, { stiffness: 60, damping: 25 });
  const rotateX = useSpring(y, { stiffness: 60, damping: 25 });
  const move = event => {
    if (reduce) return;
    const box = ref.current.getBoundingClientRect();
    x.set(((event.clientX - box.left) / box.width - .5) * 9);
    y.set(-((event.clientY - box.top) / box.height - .5) * 9);
  };
  return <motion.div ref={ref} className="lens-scene" onMouseMove={move} onMouseLeave={() => { x.set(0); y.set(0); }} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5, delay: .4 }} data-testid="hero-data-visual" aria-label="Clientes, web y pedidos conectados en una sola visión del negocio">
    <div className="lens-corner corner-tl" /><div className="lens-corner corner-br" />
    <span className="figure-label figure-label-top">FIG. 01 — DE DATOS A DECISIONES</span>
    <motion.div className="lens-object" style={{ rotateX, rotateY }}>
      <svg viewBox="0 0 560 520" className="lens-svg" fill="none" aria-hidden="true">
        <defs><radialGradient id="sphere-shadow"><stop stopColor="#383b2e" stopOpacity=".12" /><stop offset="1" stopColor="#383b2e" stopOpacity="0" /></radialGradient></defs>
        <ellipse cx="286" cy="420" rx="153" ry="28" fill="url(#sphere-shadow)" />
        <ellipse cx="280" cy="265" rx="244" ry="151" transform="rotate(-25 280 265)" stroke="#b5b6a6" strokeWidth=".6" strokeDasharray="2 7" />
        <path d="M86 146L183 221M446 162L373 230M450 360L368 307" stroke="#aaa99b" strokeWidth=".75" strokeDasharray="3 4" />
        {ringPaths.map((d, i) => <path d={d} key={i} stroke="#444a38" strokeWidth=".65" opacity={.46 + (i % 5) * .09} />)}
        <circle cx="280" cy="265" r="26" fill="#f5f4ed" stroke="#c4c5b5" strokeWidth=".6" />
        <circle cx="280" cy="265" r="4" fill="#74834c" />
        <circle cx="80" cy="140" r="3" fill="#75814d" /><circle cx="452" cy="156" r="3" fill="#75814d" /><circle cx="456" cy="366" r="3" fill="#75814d" />
      </svg>
      <div className="source-tag source-crm"><Table2 size={15} /><div><strong>Tu CRM</strong><span>clientes.csv</span></div><span className="source-dot" /></div>
      <div className="source-tag source-web"><Globe2 size={15} /><div><strong>Tu web</strong><span>usuarios.csv</span></div><span className="source-dot" /></div>
      <div className="source-tag source-orders"><ShoppingBag size={15} /><div><strong>Tus ventas</strong><span>pedidos.csv</span></div><span className="source-dot" /></div>
    </motion.div>
    <div className="lens-result"><span className="result-brand"><BrandMark /></span><div><strong>Una sola fuente de verdad.</strong><span>Todo conectado. Todo tiene sentido.</span></div><span className="result-check"><Check size={13} /></span></div>
    <span className="figure-label figure-label-bottom"><span className="tiny-cross">+</span> SISTEMAS DISTINTOS. UNA MISMA REALIDAD.</span>
  </motion.div>;
};