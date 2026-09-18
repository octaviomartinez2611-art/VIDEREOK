import { ArrowUp } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Brand, BrandMark } from './Brand';

const faqs = [
  ['¿Tengo que cambiar las herramientas que ya uso?', 'No. La idea de VIDERE es partir de los datos que ya tenés: las exportaciones de tu CRM, los usuarios de tu web y tus pedidos. En esta demo usamos tres archivos de ejemplo para mostrarte cómo funciona, sin conectar tus sistemas reales.'],
  ['¿La demo está usando inteligencia artificial?', 'No. Esta demo corre completamente en tu navegador y usa coincidencias entre correos para conectar datos ficticios. Las cuatro respuestas se calculan sobre esos datos. El motor del proyecto contempla Claude para razonar sobre casos ambiguos y traducir preguntas a cálculos verificables.'],
  ['¿Necesito saber programar?', 'Para explorar la demo, no. Está hecha para quien conoce su negocio, no para un equipo técnico.'],
  ['¿Qué pasa con mis datos?', 'La demo no sube archivos ni envía los datos de ejemplo a una IA. Solo recuerda tu decisión de unión en este navegador; podés borrarla con "Reiniciar".'],
];

export const FAQ = () => (
  <section className="faq-section page-width" id="faq" data-testid="faq-section">
    <h2 className="section-heading" data-testid="faq-title">
      Preguntas frecuentes.
    </h2>
    <div className="faq-list" data-testid="faq-list">
      <Accordion type="single" collapsible>
        {faqs.map(([question, answer], i) => (
          <AccordionItem value={`faq-${i}`} key={question}>
            <AccordionTrigger data-testid={`faq-question-${i}`}>{question}</AccordionTrigger>
            <AccordionContent data-testid={`faq-answer-${i}`}>{answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);

export const Footer = () => (
  <footer className="footer" data-testid="site-footer">
    <div className="page-width">
      <div className="footer-top">
        <Brand footer />
        <span className="footer-definition" data-testid="footer-definition">
          Del latín <em>vidēre</em>. Ver, comprender.
        </span>
        <div className="footer-links-row">
          <a data-testid="footer-demo-link" href="#demo">Demo</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#confianza">Confianza</a>
          <a href="#faq">FAQ</a>
        </div>
      </div>
      <div className="footer-wordmark" aria-hidden="true">
        <span>videre</span>
        <BrandMark />
      </div>
      <div className="footer-bottom">
        <span data-testid="copyright">© {new Date().getFullYear()} VIDERE</span>
        <a href="#inicio" data-testid="back-to-top-link">
          Volver arriba <ArrowUp size={13} />
        </a>
      </div>
    </div>
  </footer>
);
