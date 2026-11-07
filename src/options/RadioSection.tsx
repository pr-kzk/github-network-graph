export type RadioOption<V extends string> = {
  value: V;
  label: string;
  description: string;
};

type RadioSectionProps<V extends string> = {
  name: string;
  heading: string;
  description: string;
  legend: string;
  options: ReadonlyArray<RadioOption<V>>;
  value: V;
  onChange: (next: V) => void;
};

export function RadioSection<V extends string>({
  name,
  heading,
  description,
  legend,
  options,
  value,
  onChange,
}: RadioSectionProps<V>) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold">{heading}</h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">{legend}</legend>
        {options.map((opt) => (
          <label
            key={opt.value}
            className={[
              'grid cursor-pointer grid-cols-[auto_1fr] items-start gap-x-3 gap-y-0.5 rounded-lg border p-3 transition',
              value === opt.value
                ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40'
                : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600',
            ].join(' ')}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="mt-0.5 row-span-2 h-4 w-4 accent-indigo-600"
            />
            <span className="text-sm font-medium">{opt.label}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{opt.description}</span>
          </label>
        ))}
      </fieldset>
    </section>
  );
}
