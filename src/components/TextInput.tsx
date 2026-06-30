import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface BaseProps {
  label: string;
  error?: string;
}

type TextInputProps =
  | (BaseProps & InputHTMLAttributes<HTMLInputElement> & { multiline?: false })
  | (BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement> & { multiline: true });

export function TextInput(props: TextInputProps) {
  const { label, error, multiline, className, ...fieldProps } = props;
  const inputClass = `w-full rounded-input border border-sos-border bg-sos-background px-4 py-3 text-[16px] font-semibold text-sos-ink outline-none transition focus:border-sos-orange ${className ?? ""}`;

  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[14px] font-extrabold text-sos-muted">{label}</span>}
      {multiline ? (
        <textarea {...(fieldProps as TextareaHTMLAttributes<HTMLTextAreaElement>)} className={inputClass} />
      ) : (
        <input {...(fieldProps as InputHTMLAttributes<HTMLInputElement>)} className={`min-h-12 ${inputClass}`} />
      )}
      {error && <span className="mt-1.5 block text-[13px] font-bold text-sos-pending">{error}</span>}
    </label>
  );
}
