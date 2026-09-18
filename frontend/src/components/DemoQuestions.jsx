import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Check, ChevronDown, FileCheck2, Info } from 'lucide-react';
import { questions, orders, buildModel, answerQuestion } from '../data/demo';

export const DemoQuestions = ({ merge }) => {
  const [index, setIndex] = useState(0);
  const [showSource, setShowSource] = useState(false);
  const model = useMemo(() => buildModel(merge), [merge]);
  const answer = useMemo(() => answerQuestion(index, model), [index, model]);
  const connectedOrders = orders.filter(order =>
    model.filter(person => !person.ambiguous && person.email === order.cliente_email).length === 1
  ).length;
  const pendingOrders = orders.length - connectedOrders;

  return (
    <div className="demo-questions" data-testid="demo-questions-panel">
      <div className="demo-panel-heading">
        <div>
          <h3 data-testid="demo-ready-title">Ahora sí. Preguntale a tu negocio.</h3>
          <p data-testid="demo-ready-description">
            {model.length} clientes únicos. {connectedOrders} pedidos conectados.{' '}
            {pendingOrders ? `${pendingOrders} pedido por revisar.` : 'Una imagen más clara.'}
          </p>
        </div>
        <span className="demo-ready-tag" data-testid="demo-model-status">
          <Check size={13} /> {pendingOrders ? 'Modelo por revisar' : 'Modelo listo'}
        </span>
      </div>

      {!merge && (
        <p className="ambiguity-warning" data-testid="demo-unmerged-warning">
          <Info size={15} /> Hay dos Pedros con el mismo correo. Su pedido queda sin asignar
          y ambos se excluyen del análisis de inactividad. El total de ventas sí incluye todos los pedidos.
        </p>
      )}

      <div className="question-layout">
        <div className="question-list" role="group" aria-label="Preguntas de negocio">
          <span className="question-list-label">¿QUÉ QUERÉS SABER?</span>
          {questions.map((q, i) => (
            <button
              key={q}
              className={index === i ? 'selected' : ''}
              onClick={() => { setIndex(i); setShowSource(false); }}
              aria-pressed={index === i}
              data-testid={`demo-question-${i}`}
            >
              {q}
              <ArrowUpRight size={16} />
            </button>
          ))}
        </div>

        <div className="answer-area" aria-live="polite">
          <motion.div key={index} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2 }}>
            <div className="answer-label">ESTO DICEN TUS DATOS</div>
            <div className={`answer-value ${index === 3 ? 'answer-name' : ''}`} data-testid="demo-answer-value">
              {answer.value}
            </div>
            <h4 className="answer-unit" data-testid="demo-answer-unit">{answer.unit}</h4>
            <p className="answer-explanation" data-testid="demo-answer-explanation">{answer.text}</p>
            <button
              className="answer-source-button"
              onClick={() => setShowSource(!showSource)}
              aria-expanded={showSource}
              data-testid="demo-source-toggle"
            >
              <FileCheck2 size={14} /> Ver de dónde sale{' '}
              <ChevronDown size={14} style={{ transform: showSource ? 'rotate(180deg)' : 'none' }} />
            </button>
            {showSource && (
              <div className="answer-source-detail" data-testid="demo-source-detail">
                <strong>{answer.source}</strong>
                <p>{answer.method}</p>
                <p>{answer.detail}</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <div className="demo-panel-footer">
        <span data-testid="demo-calculation-note">
          <Check size={13} /> Calculado sobre los datos de ejemplo. No generado por IA.
        </span>
      </div>
    </div>
  );
};
