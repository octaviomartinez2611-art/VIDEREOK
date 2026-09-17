import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';

export const BrandMark = ({ className = '' }) => (
  <svg className={className} width="32" height="29" viewBox="0 0 40 34" fill="none" aria-hidden="true">
    <path d="M2 5L15 29H25L38 5M9 5L20 25L31 5" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
    <circle cx="20" cy="6" r="2.5" fill="currentColor" />
  </svg>
);

export const Brand = ({ footer = false }) => (
  <a href="#inicio" className="brand" aria-label="VIDERE — inicio" data-testid={footer ? 'footer-brand-link' : 'header-brand-link'}>
    <BrandMark /><span>videre</span><sup>®</sup>
  </a>
);

export const Action = ({ children, onClick, href, secondary = false, id, arrow = 'up', className = '', ...props }) => (
  <Button asChild={Boolean(href)} onClick={onClick} variant={secondary ? 'outline' : 'default'} className={`action ${secondary ? 'action-secondary' : ''} ${className}`} data-testid={id} {...props}>
    {href ? <a href={href}>{children}{arrow === 'up' ? <ArrowUpRight size={17} /> : <ArrowRight size={17} />}</a> : <>{children}{arrow === 'up' ? <ArrowUpRight size={17} /> : <ArrowRight size={17} />}</>}
  </Button>
);

export const Reveal = ({ children, className = '', delay = 0, ...props }) => {
  const reduce = useReducedMotion();
  return <motion.div className={className} initial={reduce ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-35px' }} transition={{ duration: .75, delay, ease: [.22, 1, .36, 1] }} {...props}>{children}</motion.div>;
};

export const Chapter = ({ number, children, id }) => <div className="chapter-label" data-testid={id}><span>{number} /</span>{children}</div>;