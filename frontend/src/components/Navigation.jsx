import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { Brand } from './Brand';

const links = [
  ['como-funciona', 'Cómo funciona'],
  ['demo', 'Demo'],
  ['confianza', 'Confianza'],
];

export const Navigation = () => {
  const [active, setActive] = useState('como-funciona');
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y > 120 && y > lastY.current + 4) {
        setCompact(true);
      } else if (y < lastY.current - 4 || y < 60) {
        setCompact(false);
      }
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(entry => {
        if (entry.isIntersecting) setActive(entry.target.id);
      }),
      { rootMargin: '-20% 0px -55% 0px' }
    );
    links.forEach(([id]) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <header className={`island ${compact ? 'island--compact' : ''}`} data-testid="site-header">
      <div className="island-inner">
        <Brand />
        <nav className="island-links" aria-label="Navegación principal">
          {links.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={() => setActive(id)}
              data-testid={`nav-${id}`}
              className={active === id ? 'active' : ''}
            >
              {label}
            </a>
          ))}
        </nav>
        <a href="#demo" className="island-cta" data-testid="header-demo-button">
          Ver demo <ArrowUpRight size={13} />
        </a>
        <button
          data-testid="mobile-menu-toggle"
          className="mobile-menu-toggle"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            className="mobile-nav"
            aria-label="Navegación móvil"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            {links.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                data-testid={`mobile-nav-${id}`}
                onClick={() => { setActive(id); setOpen(false); }}
              >
                {label}
                <ArrowUpRight size={14} />
              </a>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
};
