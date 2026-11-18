import { useEffect, useState } from 'react';
import type { Field, Input } from '../algorithms/recursion/types';

/**
 * Formulario de entrada de un problema. Los campos de texto se aplican al confirmar (Enter o
 * "Aplicar") para no regenerar la traza con cada tecla; números y checkboxes, al instante.
 */
export function ProblemFields({
  fields,
  value,
  onChange,
}: {
  fields: readonly Field[];
  value: Input;
  onChange: (next: Record<string, string>) => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({ ...value });
  useEffect(() => setDraft({ ...value }), [value]);
  const hasText = fields.some((f) => f.type === 'text');
  return (
    <form
      className="toolbar-row"
      onSubmit={(e) => {
        e.preventDefault();
        onChange(draft);
      }}
    >
      {fields.map((f) => (
        <label
          key={f.key}
          className={f.type === 'checkbox' ? 'check' : 'field field--inline'}
          title={f.help}
        >
          {f.type === 'checkbox' ? (
            <>
              <input
                type="checkbox"
                checked={draft[f.key] === 'true'}
                onChange={(e) => onChange({ ...draft, [f.key]: String(e.target.checked) })}
              />
              {f.label}
            </>
          ) : (
            <>
              <span>{f.label}</span>
              <input
                className={`mono ${f.type === 'number' ? 'narrow' : ''}`}
                type={f.type}
                min={f.min}
                max={f.max}
                value={draft[f.key] ?? ''}
                onChange={(e) => {
                  const next = { ...draft, [f.key]: e.target.value };
                  setDraft(next);
                  if (f.type === 'number' && e.target.value !== '') onChange(next);
                }}
              />
            </>
          )}
        </label>
      ))}
      {hasText && (
        <button type="submit" className="btn">
          Aplicar
        </button>
      )}
      {fields
        .filter((f) => f.help)
        .map((f) => (
          <span key={f.key} className="muted small">
            {f.help}
          </span>
        ))}
    </form>
  );
}
