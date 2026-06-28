"use client";

import type { ReactNode } from "react";

type Props = {
  confirmText: string;
  className?: string;
  children: ReactNode;
};

/** Submit button that asks for confirmation before submitting its form. */
export function ConfirmButton({ confirmText, className, children }: Props) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
