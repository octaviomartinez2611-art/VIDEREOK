import { Fingerprint, ScanEye } from 'lucide-react';
import { FadeImage } from './FadeImage';

const COLUMNS_URL = 'https://images.unsplash.com/photo-1569258592171-357ea26da4df?auto=format&fit=crop&w=1000&q=85';

const principles = [
  {
    icon: ScanEye,
    title: 'Si hay una duda, la ves.',
    text: 'Una coincidencia no siempre es una certeza. Los datos que se contradicen se señalan, no se esconden.',
  },
  {
    icon: Fingerprint,
    title: 'Cada respuesta deja una huella.',
    text: 'No alcanza con tener un número. Tenés que poder entender de dónde salió y qué datos lo sostienen.',
  },
];

export const Trust = () => (
  <section className="trust-section page-width" id="confianza" data-testid="trust-section">
    <div className="trust-grid">
      <div className="trust-image-wrap">
        <FadeImage
          src={COLUMNS_URL}
          alt="Estructura geométrica de columnas de hormigón iluminada por luz natural"
          loading="lazy"
          className="trust-image"
          data-testid="trust-columns-image"
        />
        <div className="trust-image-overlay" />
      </div>
      <div className="trust-copy">
        <h2 className="section-heading" data-testid="trust-title">
          Inteligencia, sí.<br />
          <span className="gold">A ciegas, nunca.</span>
        </h2>
        <p className="trust-intro" data-testid="trust-description">
          Porque tomar una decisión importante no debería ser un acto de fe.
        </p>
        <div className="trust-principles">
          {principles.map(({ title, text, icon: Icon }, i) => (
            <div className="trust-principle" key={i}>
              <Icon size={20} strokeWidth={1.3} />
              <div>
                <h3 data-testid={`trust-principle-title-${i}`}>{title}</h3>
                <p data-testid={`trust-principle-description-${i}`}>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
