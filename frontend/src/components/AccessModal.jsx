import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { BrandMark } from './Brand';

export const AccessModal = ({ open, onOpenChange }) => {
  const changeOpen = value => onOpenChange(value);
  return <Dialog open={open} onOpenChange={changeOpen}><DialogContent className="access-modal" data-testid="access-modal" data-lenis-prevent>
    <BrandMark className="modal-brand" />
    <div className="access-success" data-testid="access-pending"><span className="eyebrow modal-eyebrow">CONOZCAMOS TU NEGOCIO</span><DialogTitle data-testid="access-pending-title">Todavía no estamos<br /><em>tomando solicitudes.</em></DialogTitle><DialogDescription data-testid="access-pending-description">El registro de acceso está en preparación. Volvé pronto para dejar tus datos y que te contactemos sobre VIDERE.</DialogDescription><Button className="action" data-testid="access-pending-close" onClick={() => changeOpen(false)}>Seguir explorando <ArrowUpRight size={16} /></Button><p className="form-note" data-testid="access-note"><ShieldCheck size={13} /> No vamos a pedirte datos hasta que el formulario esté activo.</p></div>
  </DialogContent></Dialog>;
};

export const PrivacyModal = ({ open, onOpenChange }) => <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="access-modal privacy-modal" data-testid="privacy-modal" data-lenis-prevent><BrandMark className="modal-brand" /><DialogTitle data-testid="privacy-title">Tus datos, <em>con claridad.</em></DialogTitle><DialogDescription data-testid="privacy-description">Información sobre esta landing y su demo interactiva.</DialogDescription><div className="privacy-copy" data-testid="privacy-content"><h3>La demo</h3><p>Los datos son ficticios y se procesan en tu navegador, sin enviarlos a una IA. La decisión sobre la unión de registros se guarda localmente. “Reiniciar” elimina esa decisión.</p><h3>Tu solicitud de acceso</h3><p>El registro de solicitudes de acceso todavía no está activo, así que por ahora no pedimos ni guardamos ningún dato tuyo en este formulario.</p><h3>Control y contacto</h3><p>No ingreses información sensible en el formulario. Cuando el equipo te contacte, podés responder para pedir la actualización o eliminación de tus datos.</p><h3>Entorno de vista previa</h3><p>El entorno que aloja esta página puede usar herramientas de analítica y diagnóstico técnico. Esta demo no requiere cookies de publicidad para funcionar.</p></div></DialogContent></Dialog>;