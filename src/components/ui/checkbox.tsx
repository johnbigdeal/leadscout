"use client";

import { useId } from "react";

export function Checkbox({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
}) {
  const id = useId();
  return (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
      aria-label={label}
    />
  );
}
