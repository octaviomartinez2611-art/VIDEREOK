import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowUpRight, Check, LoaderCircle, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { BrandMark } from './Brand';

export const AccessModal = ({ open, onOpenChange }) => {
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/access-requests`, { name: form.get('name').trim(), email: form.get('email').trim(), company: form.get('company').trim(), company_size: form.get('company_size'), consent: form.get('consent') === 'on' }, { timeout: 15000 });
      setSuccess(true); toast.success('Tu solicitud quedó registrada.');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : err.response?.status === 422 ? 'Revisá tus datos. El nombre y el negocio deben tener al menos 2 caracteres.' : 'No pudimos guardar tu solicitud. Intentá nuevamente en un momento.');
    } finally { setBusy(false); }
  };
  const changeOpen = value => { onOpenChange(value); if (!value) { setTimeout(() => { setSuccess(false); setError(''); }, 250); } };
  return <Dialog open={open} onOpenChange={changeOpen}><DialogContent className="access-modal" data-testid="access-modal" data-lenis-prevent>
    <BrandMark className="modal-brand" />
    {success ? <div className="access-success" data-testid="access-success"><span className="success-icon"><Check size={25} /></span><DialogTitle data-testid="access-success-title">Un paso más cerca<br /><em>de la claridad.</em></DialogTitle><DialogDescription data-testid="access-success-description">Tu solicitud quedó registrada. Te contactaremos para conocer tu negocio y contarte los próximos pasos de VIDERE.</DialogDescription><Button className="action" data-testid="access-success-close" onClick={() => changeOpen(false)}>Seguir explorando <ArrowUpRight size={16} /></Button></div> : <><div><span className="eyebrow modal-eyebrow">CONOZCAMOS TU NEGOCIO</span><DialogTitle data-testid="access-modal-title">Empecemos por <em>vos.</em></DialogTitle><DialogDescription data-testid="access-modal-description">Contanos quién sos. Te contactaremos para explorar cómo VIDERE puede ayudarte.</DialogDescription></div><form onSubmit={submit} className="access-form" data-testid="access-form">
      <div className="form-field"><label htmlFor="access-name" data-testid="access-name-label">Tu nombre</label><Input id="access-name" name="name" autoComplete="name" placeholder="¿Cómo te llamás?" minLength={2} maxLength={100} required data-testid="access-name-input" /></div>
      <div className="form-field"><label htmlFor="access-email" data-testid="access-email-label">Email de trabajo</label><Input id="access-email" type="email" name="email" autoComplete="email" placeholder="vos@tunegocio.com" maxLength={254} required data-testid="access-email-input" /></div>
      <div className="form-row"><div className="form-field"><label htmlFor="access-company" data-testid="access-company-label">Tu negocio</label><Input id="access-company" name="company" autoComplete="organization" placeholder="Nombre del negocio" minLength={2} maxLength={150} required data-testid="access-company-input" /></div><div className="form-field"><label htmlFor="access-size" data-testid="access-size-label">Tamaño del equipo</label><select id="access-size" name="company_size" defaultValue="" required data-testid="access-size-select"><option value="" disabled>Seleccioná</option>{['1–10', '11–50', '51–200', 'Más de 200'].map(size => <option value={size} key={size}>{size} personas</option>)}</select></div></div>
      <label className="consent-label" data-testid="access-consent-label"><input type="checkbox" name="consent" required data-testid="access-consent-checkbox" /><span>Acepto que VIDERE guarde estos datos y me contacte sobre el acceso al producto.</span></label>
      <details className="form-privacy"><summary data-testid="access-privacy-toggle">¿Cómo se usan mis datos?</summary><p data-testid="access-privacy-description">Guardamos tu nombre, email, negocio y tamaño de equipo para gestionar la solicitud. Este formulario no conecta tus sistemas ni sube archivos. Podés pedir que eliminemos tus datos al responder al contacto del equipo.</p></details>
      {error && <p className="form-error" role="alert" data-testid="access-error">{error}</p>}
      <Button type="submit" className="action form-submit" disabled={busy} data-testid="access-submit-button">{busy ? <><LoaderCircle className="spin" size={16} /> Guardando solicitud…</> : <>Solicitar acceso <ArrowUpRight size={17} /></>}</Button><p className="form-note" data-testid="access-note"><ShieldCheck size={13} /> Sin compromiso. Una conversación, no una venta a presión.</p>
    </form></>}
  </DialogContent></Dialog>;
};

export const PrivacyModal = ({ open, onOpenChange }) => <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="access-modal privacy-modal" data-testid="privacy-modal" data-lenis-prevent><BrandMark className="modal-brand" /><DialogTitle data-testid="privacy-title">Tus datos, <em>con claridad.</em></DialogTitle><DialogDescription data-testid="privacy-description">Información sobre esta landing y su demo interactiva.</DialogDescription><div className="privacy-copy" data-testid="privacy-content"><h3>La demo</h3><p>Los datos son ficticios y se procesan en tu navegador, sin enviarlos a una IA. La decisión sobre la unión de registros se guarda localmente. “Reiniciar” elimina esa decisión.</p><h3>Tu solicitud de acceso</h3><p>Si completás el formulario, guardamos tu nombre, email, negocio, tamaño del equipo y consentimiento para gestionar tu solicitud y contactarte sobre VIDERE. El envío no crea una cuenta ni conecta tus herramientas.</p><h3>Control y contacto</h3><p>No ingreses información sensible en el formulario. Cuando el equipo te contacte, podés responder para pedir la actualización o eliminación de tus datos.</p><h3>Entorno de vista previa</h3><p>El entorno que aloja esta página puede usar herramientas de analítica y diagnóstico técnico. Esta demo no requiere cookies de publicidad para funcionar.</p></div></DialogContent></Dialog>;