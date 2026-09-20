import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const [open, setOpen] = useState(false);

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
    <header className="island" data-testid="site-header">
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
        <Link to="/app" className="island-cta" data-testid="header-app-button">
          Empezar <ArrowUpRight size={13} />
        </Link>
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
            <Link to="/app" data-testid="mobile-nav-app" onClick={() => setOpen(false)}>
              Empezar
              <ArrowUpRight size={14} />
            </Link>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
};
