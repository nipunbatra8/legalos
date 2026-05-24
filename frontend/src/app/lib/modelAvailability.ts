import { MODELS, type ModelOption } from "../components/assistant/ModelToggle";

export type ModelProvider = "openai";

export function getModelProvider(modelId: string): ModelProvider | null {
    const model = MODELS.find((m) => m.id === modelId);
    if (!model) return null;
    return "openai";
}

export function isModelAvailable(modelId: string): boolean {
    return !!MODELS.find((m) => m.id === modelId);
}

export function isProviderAvailable(provider: ModelProvider): boolean {
    return true;
}

export function providerLabel(provider: ModelProvider): string {
    return "OpenAI (ChatGPT)";
}

export function modelGroupToProvider(
    group: ModelOption["group"],
): ModelProvider {
    return "openai";
}
