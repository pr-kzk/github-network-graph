import type React from 'react';

export type IconButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
};

export function IconButton({ label, onClick, disabled, children }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
