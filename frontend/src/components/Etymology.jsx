import { FadeImage } from './FadeImage';

const EMPEROR_URL = 'https://images.unsplash.com/photo-1760026247363-8e688740c676?auto=format&fit=crop&w=900&q=85';
const INSCRIPTION_URL = 'https://images.unsplash.com/photo-1708547451794-3dcad64451bd?auto=format&fit=crop&w=900&q=85';
const BUST_URL = 'https://images.unsplash.com/photo-1775639796838-17bc26858529?auto=format&fit=crop&w=800&q=85';

export const Etymology = () => (
  <section className="etym-section" id="etimologia" data-testid="etymology-section">
    <div className="etym-hero">
      <div className="etym-hero-img-wrap">
        <FadeImage
          src={EMPEROR_URL}
          alt="Estatua de emperador romano en nicho de mármol"
          className="etym-hero-img"
          loading="lazy"
        />
        <div className="etym-hero-img-fade" />
      </div>
      <div className="etym-hero-text page-width">
        <div className="etym-word" data-testid="etymology-word">
          <span className="etym-v">V</span>IDĒRE
        </div>
        <p className="etym-phonetic" data-testid="etymology-phonetic">/vi.ˈdeː.re/</p>
        <p className="etym-def" data-testid="etymology-definition">
          Verbo latino, segunda conjugación.<br />
          <span className="gold">"Ver con claridad. Comprender lo que está frente a vos."</span>
        </p>
      </div>
    </div>

    <div className="etym-grid page-width">
      <div className="etym-card etym-card--words" data-testid="etymology-derivatives">
        <h3>Misma raíz, misma claridad.</h3>
        <div className="etym-words-list">
          <div className="etym-word-item">
            <span className="etym-word-latin">visiō</span>
            <span className="etym-word-arrow">→</span>
            <span className="etym-word-modern">visión</span>
          </div>
          <div className="etym-word-item">
            <span className="etym-word-latin">ēvidēns</span>
            <span className="etym-word-arrow">→</span>
            <span className="etym-word-modern">evidencia</span>
          </div>
          <div className="etym-word-item">
            <span className="etym-word-latin">prōvidēre</span>
            <span className="etym-word-arrow">→</span>
            <span className="etym-word-modern">proveer</span>
          </div>
          <div className="etym-word-item">
            <span className="etym-word-latin">prūdēns</span>
            <span className="etym-word-arrow">→</span>
            <span className="etym-word-modern">prudencia</span>
          </div>
        </div>
        <p className="etym-words-note">
          Las palabras que usamos para entender el mundo nacieron en la misma raíz.
        </p>
      </div>
      <div className="etym-card etym-card--image">
        <FadeImage
          src={INSCRIPTION_URL}
          alt="Inscripción latina tallada en piedra antigua"
          loading="lazy"
          className="etym-inscription"
          data-testid="etymology-inscription-image"
        />
        <div className="etym-inscription-overlay" />
      </div>
      <div className="etym-card etym-card--bust">
        <FadeImage
          src={BUST_URL}
          alt="Busto romano de joven con cabello rizado en museo"
          loading="lazy"
          className="etym-bust-img"
          data-testid="etymology-bust-image"
        />
        <div className="etym-bust-overlay" />
        <span className="etym-bust-caption">Scientia potentia est.</span>
      </div>
      <div className="etym-card etym-card--quote" data-testid="etymology-quote">
        <blockquote>
          "Non scholae, sed vitae discimus."
        </blockquote>
        <p>No aprendemos para la escuela, sino para la vida.</p>
        <span>— Séneca</span>
      </div>
    </div>
  </section>
);
