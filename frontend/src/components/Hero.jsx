import { ArrowRight } from 'lucide-react';

const STATUE_URL = 'https://images.unsplash.com/photo-1574359587026-daf1bfd26baa?auto=format&fit=crop&w=1200&q=85';

export const Hero = () => (
  <section id="inicio" className="hero-section" data-testid="hero-section">
    <div className="hero-grid page-width">
      <div className="hero-copy">
        <h1 className="hero-title" data-testid="hero-title">
          Menos ruido.<br />
          <span className="gold">Más claridad.</span>
        </h1>
        <p className="hero-description" data-testid="hero-description">
          Tu negocio ya tiene las respuestas.
          VIDERE conecta tus datos para que puedas verlas.
        </p>
        <div className="hero-ctas">
          <a href="#demo" className="hero-btn" data-testid="hero-demo-button">
            Explorar la demo <ArrowRight size={18} />
          </a>
        </div>
      </div>
      <div className="hero-statue-wrap" data-testid="hero-statue">
        <img
          src={STATUE_URL}
          alt="Escultura clásica romana iluminada dramáticamente"
          className="hero-statue"
          loading="eager"
        />
        <div className="statue-glow" />
      </div>
    </div>
    <div className="hero-line" />
  </section>
);
