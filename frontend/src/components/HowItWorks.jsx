import { ScanLine, Combine, MessageSquareText } from 'lucide-react';

const steps = [
  {
    title: 'Traé lo que ya tenés.',
    text: 'Tu CRM, tu web, tus pedidos. No importa si cada sistema habla un idioma distinto.',
    icon: ScanLine,
  },
  {
    title: 'Encontrá las conexiones.',
    text: 'VIDERE reconoce qué datos hablan de lo mismo. Si algo no está claro, te pregunta. No adivina.',
    icon: Combine,
  },
  {
    title: 'Preguntá. Entendé. Actuá.',
    text: 'Hacé preguntas como las harías en una conversación. Recibí respuestas que podés comprobar.',
    icon: MessageSquareText,
  },
];

export const HowItWorks = () => (
  <section className="how-section page-width" id="como-funciona" data-testid="how-section">
    <h2 className="section-heading" data-testid="how-title">
      No te faltan datos.<br />
      <span className="gold">Te falta conectarlos.</span>
    </h2>
    <p className="section-sub" data-testid="how-description">
      Un cliente en tu CRM. Un usuario en tu web. Una compra en tu planilla.
      La misma persona. Es hora de ver la imagen completa.
    </p>
    <div className="steps-grid">
      {steps.map(({ title, text, icon: Icon }, i) => (
        <div className="step-card" key={title}>
          <div className="step-icon">
            <Icon size={22} strokeWidth={1.4} />
          </div>
          <h3 data-testid={`how-step-title-${i}`}>{title}</h3>
          <p data-testid={`how-step-description-${i}`}>{text}</p>
        </div>
      ))}
    </div>
  </section>
);
