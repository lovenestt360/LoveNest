export function generateInitials(name1?: string | null, name2?: string | null, fallback: string = "LoveNest"): string {
    if (!name1 && !name2) return fallback;

    const first = name1 ? name1.charAt(0).toUpperCase() : "";
    const second = name2 ? name2.charAt(0).toUpperCase() : "";

    if (first && second) {
        return `${first} & ${second}`;
    }

    return first || second || fallback;
}
