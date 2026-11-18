import type { Practice } from './usePractice';

export function PracticePanel({ practice }: { practice: Practice }) {
  const { waiting, kind, value, score, feedback } = practice;
  const pct = score.total ? Math.round((score.ok / score.total) * 100) : 0;
  return (
    <section
      className={`panel practice ${waiting ? 'is-waiting' : ''}`}
      aria-labelledby="practice-title"
      aria-live="polite"
    >
      <h2 id="practice-title" className="panel__title">
        Modo práctica
        <span className="tag">
          {score.ok}/{score.total}
          {score.total > 0 && ` · ${pct}%`}
        </span>
      </h2>
      {waiting ? (
        <div className="practice__q">
          <p>
            {kind === 'swap' ? (
              <>
                <b>¿Qué dos posiciones se intercambian ahora?</b> Hacé clic en las dos barras.
              </>
            ) : (
              <>
                <b>Se va a escribir el valor {value}: ¿en qué posición?</b> Hacé clic en la barra.
              </>
            )}
          </p>
          <button type="button" className="btn btn--ghost" onClick={practice.skip}>
            Saltear
          </button>
        </div>
      ) : (
        <p className="muted small">
          Reproducí normalmente: antes de cada intercambio o escritura la animación se detiene para
          que adivines qué va a pasar.
        </p>
      )}
      {feedback && (
        <p className={`practice__fb ${feedback.ok ? 'is-ok' : 'is-bad'}`}>
          {feedback.ok ? '✓ ' : '✗ '}
          {feedback.text}
        </p>
      )}
    </section>
  );
}
