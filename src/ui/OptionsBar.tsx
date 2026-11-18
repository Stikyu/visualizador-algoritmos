import type { AlgorithmOption } from '../algorithms/types';

/** Renderiza las opciones declaradas en los metadatos del algoritmo como selects. */
export function OptionsBar({
  options,
  values,
  onChange,
}: {
  options: readonly AlgorithmOption[];
  values: Readonly<Record<string, string>>;
  onChange: (next: Record<string, string>) => void;
}) {
  if (options.length === 0) return null;
  return (
    <>
      {options.map((o) => (
        <label key={o.key} className="field field--inline">
          <span>{o.label}</span>
          <select
            value={values[o.key] ?? o.default}
            onChange={(e) => onChange({ ...values, [o.key]: e.target.value })}
          >
            {o.choices.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </>
  );
}
