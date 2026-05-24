import type { Provider } from "./types";

// ---------------------------------------------------------------------------
// Canonical model IDs
// ---------------------------------------------------------------------------
// Main-chat tier (top-end) — user picks one of these per message.
export const OPENAI_MAIN_MODELS = ["gpt-4.1", "o3"] as const;

// Mid-tier (used for tabular review) — user picks one in account settings.
export const OPENAI_MID_MODELS = ["gpt-4.1-mini"] as const;

// Low-tier (used for title generation, lightweight extractions) — user picks
// one in account settings.
export const OPENAI_LOW_MODELS = ["gpt-4.1-nano"] as const;

export const DEFAULT_MAIN_MODEL = "gpt-4.1";
export const DEFAULT_TITLE_MODEL = "gpt-4.1-nano";
export const DEFAULT_TABULAR_MODEL = "gpt-4.1-mini";

const ALL_MODELS = new Set<string>([
    ...OPENAI_MAIN_MODELS,
    ...OPENAI_MID_MODELS,
    ...OPENAI_LOW_MODELS,
]);

// ---------------------------------------------------------------------------
// Provider inference
// ---------------------------------------------------------------------------

export function providerForModel(model: string): Provider {
    if (
        model.startsWith("gpt-") ||
        model.startsWith("o1") ||
        model.startsWith("o3") ||
        model.startsWith("o4")
    )
        return "openai";
    throw new Error(`Unknown model id: ${model}`);
}

export function resolveModel(id: string | null | undefined, fallback: string): string {
    if (id && ALL_MODELS.has(id)) return id;
    return fallback;
}
