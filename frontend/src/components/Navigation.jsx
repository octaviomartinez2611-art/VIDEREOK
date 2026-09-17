import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { Brand, Action } from './Brand';

const links = [['como-funciona', 'Cómo funciona'], ['demo', 'Demo interactiva'], ['confianza', 'Tu control']];

export const Navigation = ({ onAccess }) => {
  const [active, setActive] = useState('como-funciona');
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) setActive(entry.target.id); }), { rootMargin: '-20% 0px -55% 0px' });
    links.forEach(([id]) => { const section = document.getElementById(id); if (section) observer.observe(section); });
    return () => observer.disconnect();
  }, []);
  return <header className="site-header" data-testid="site-header">
    <div className="header-inner">
      <Brand />
      <nav className="nav-pill" aria-label="Navegación principal">
        {links.map(([id, label]) => <a key={id} href={`#${id}`} onClick={() => setActive(id)} data-testid={`nav-${id}`} className={active === id ? 'active' : ''}>
          {active === id && <motion.span layoutId="nav-highlight" className="nav-highlight" transition={{ type: 'spring', bounce: .12, duration: .55 }} />}<span>{label}</span>
        </a>)}
      </nav>
      <div className="header-actions"><Action id="header-access-button" onClick={onAccess}>Solicitar acceso</Action><button data-testid="mobile-menu-toggle" className="mobile-menu-toggle" onClick={() => setOpen(!open)} aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open}>{open ? <X size={21} /> : <Menu size={21} />}</button></div>
    </div>
    <AnimatePresence>{open && <motion.nav className="mobile-nav" aria-label="Navegación móvil" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      {links.map(([id, label]) => <a key={id} href={`#${id}`} data-testid={`mobile-nav-${id}`} onClick={() => { setActive(id); setOpen(false); }}>{label}<ArrowUpRight size={18} /></a>)}
    </motion.nav>}</AnimatePresence>
  </header>;
};