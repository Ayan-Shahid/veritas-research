import type { FieldError, UseFormRegisterReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TextFieldProps {
    id: string;
    label: string;
    type?: string;
    autoComplete?: string;
    inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
    error?: FieldError;
    registration: UseFormRegisterReturn;
}

export function TextField({ id, label, type = "text", autoComplete, inputMode, error, registration }: TextFieldProps) {
    const errorId = `${id}-error`;
    return (
        <div className="flex flex-col gap-2">
            <Label htmlFor={id}>{label}</Label>
            <Input
                id={id}
                type={type}
                autoComplete={autoComplete}
                inputMode={inputMode}
                aria-invalid={!!error}
                aria-describedby={error ? errorId : undefined}
                {...registration}
            />
            {/* Rendered as text by React; error.message only ever comes from our own schemas. */}
            {error && (
                <p id={errorId} role="alert" className="text-sm text-destructive">
                    {error.message}
                </p>
            )}
        </div>
    );
}