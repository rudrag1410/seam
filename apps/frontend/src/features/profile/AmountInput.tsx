"use client";

import { Input } from "@seam/ui";
import { formatAmount, parseAmount } from "./amount";

interface AmountInputProps {
  id: string;
  value: number | undefined;
  currency: string;
  onChange: (value: number | undefined) => void;
  onBlur?: () => void;
}

export function AmountInput({ id, value, currency, onChange, onBlur }: AmountInputProps) {
  return (
    <Input
      id={id}
      inputMode="numeric"
      autoComplete="off"
      value={formatAmount(value, currency)}
      onChange={(e) => onChange(parseAmount(e.target.value))}
      onBlur={onBlur}
    />
  );
}
