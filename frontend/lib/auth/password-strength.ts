export const MIN_PASSWORD_LENGTH = 12;

export type StrengthScore = 0 | 1 | 2 | 3 | 4;

export interface PasswordRule {
    id: "length" | "case" | "number" | "symbol";
    label: string;
    required: boolean;
    passed: boolean;
}

export interface PasswordStrength {
    score: StrengthScore;
    label: string;
    rules: PasswordRule[];
    weakPattern: boolean;
}

const COMMON_FRAGMENTS = ["password", "qwerty", "letmein", "welcome", "iloveyou", "admin", "abcdef", "123456", "111111"];
const LABELS = ["", "Too short", "Fair", "Good", "Strong"] as const;

function hasWeakPattern(pw: string): boolean {
    if (new Set(pw).size < 5) return true; // e.g. "aaaaaaaaaaaaaaaa", "abababababab"
    if (/(.)\1{4,}/.test(pw)) return true; // five-in-a-row of the same character
    const lower = pw.toLowerCase();
    return COMMON_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

export function evaluatePassword(pw: string): PasswordStrength {
    const hasLower = /[a-z]/.test(pw);
    const hasUpper = /[A-Z]/.test(pw);
    const hasNumber = /\d/.test(pw);
    const hasSymbol = /[^A-Za-z0-9]/.test(pw);
    const classes = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;
    const weakPattern = pw.length > 0 && hasWeakPattern(pw);

    const rules: PasswordRule[] = [
        { id: "length", label: `${MIN_PASSWORD_LENGTH}+ characters`, required: true, passed: pw.length >= MIN_PASSWORD_LENGTH },
        { id: "case", label: "Upper & lower case", required: false, passed: hasLower && hasUpper },
        { id: "number", label: "A number", required: false, passed: hasNumber },
        { id: "symbol", label: "A symbol", required: false, passed: hasSymbol },
    ];

    let score: StrengthScore;
    if (pw.length === 0) {
        score = 0;
    } else if (pw.length < MIN_PASSWORD_LENGTH) {
        score = 1;
    } else {
        let s = 2;
        if (pw.length >= 16) s += 1;
        if (classes >= 3) s += 1;
        if (weakPattern) s = Math.min(s, 2);
        score = Math.min(s, 4) as StrengthScore;
    }

    return { score, label: LABELS[score], rules, weakPattern };
}