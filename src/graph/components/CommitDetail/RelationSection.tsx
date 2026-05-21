export type RelationSectionProps = {
  title: string;
  shas: string[];
  emptyLabel: string;
  onClick: (sha: string) => void;
};

export function RelationSection({ title, shas, emptyLabel, onClick }: RelationSectionProps) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      {shas.length === 0 ? (
        <p className="text-xs text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="space-y-1">
          {shas.map((p) => (
            <li key={p}>
              <button
                type="button"
                onClick={() => onClick(p)}
                className="font-mono text-xs text-indigo-600 hover:text-indigo-500 hover:underline dark:text-indigo-300 dark:hover:text-indigo-200"
              >
                {p.slice(0, 7)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
