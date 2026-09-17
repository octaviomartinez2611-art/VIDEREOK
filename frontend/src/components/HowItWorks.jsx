import { ArrowUpRight, ScanLine, Combine, MessageSquareText } from 'lucide-react';
import { Reveal, Chapter } from './Brand';

const steps = [
  { title: 'Traé lo que ya tenés.', text: 'Tu CRM, tu web, tus pedidos. No importa si cada sistema habla un idioma distinto.', icon: ScanLine, note: 'TUS HERRAMIENTAS, TAL CUAL SON' },
  { title: 'Encontrá las conexiones.', text: 'VIDERE reconoce qué datos hablan de lo mismo. Si algo no está claro, te pregunta. No adivina.', icon: Combine, note: 'UNA VISIÓN, NO MÁS DUPLICADOS' },
  { title: 'Preguntá. Entendé. Actuá.', text: 'Hacé preguntas como las harías en una conversación. Recibí respuestas que podés comprobar.', icon: MessageSquareText, note: 'RESPUESTAS CON FUNDAMENTO' },
];

export const HowItWorks = () => <section className="how-section page-width section-space" id="como-funciona" data-testid="how-section">
  <Reveal><Chapter number="01" id="how-chapter">DEL DESORDEN A LA CLARIDAD</Chapter></Reveal>
  <div className="section-intro"><Reveal><h2 className="section-title" data-testid="how-title">No te faltan datos.<br /><em>Te falta conectarlos.</em></h2></Reveal><Reveal delay={.12}><p className="section-description" data-testid="how-description">Un cliente en tu CRM. Un usuario en tu web.<br />Una compra en tu planilla. La misma persona.<br /><span>Es hora de ver la imagen completa.</span></p></Reveal></div>
  <div className="steps-grid">{steps.map(({ title, text, icon: Icon, note }, i) => <Reveal key={title} delay={i * .1} className="step-card"><div className="step-card-top"><span className="step-index">0{i + 1}</span><Icon size={22} strokeWidth={1.2} /></div><h3 data-testid={`how-step-title-${i}`}>{title}</h3><p data-testid={`how-step-description-${i}`}>{text}</p><span className="step-note" data-testid={`how-step-note-${i}`}>{note}<ArrowUpRight size={13} /></span></Reveal>)}</div>
</section>;