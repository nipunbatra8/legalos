import OpenAI from "openai";
import type {
    StreamChatParams,
    StreamChatResult,
    NormalizedToolCall,
} from "./types";

const MAX_TOKENS = 16384;

function client(override?: string | null): OpenAI {
    const apiKey = override?.trim() || process.env.OPENAI_API_KEY || "";
    return new OpenAI({ apiKey });
}

export async function streamOpenAI(
    params: StreamChatParams,
): Promise<StreamChatResult> {
    const { model, systemPrompt, tools = [], callbacks = {}, runTools, apiKeys } = params;
    const maxIter = params.maxIterations ?? 10;
    const openai = client(apiKeys?.openai);

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...params.messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
        })),
    ];

    let fullText = "";

    for (let iter = 0; iter < maxIter; iter++) {
        const stream = await openai.chat.completions.create({
            model,
            messages,
            tools: tools.length
                ? (tools as OpenAI.Chat.ChatCompletionTool[])
                : undefined,
            tool_choice: tools.length ? "auto" : undefined,
            max_tokens: MAX_TOKENS,
            stream: true,
        });

        let iterText = "";
        const toolCallAccumulators: Record<
            number,
            { id: string; name: string; arguments: string }
        > = {};
        let finishReason: string | null = null;

        for await (const chunk of stream) {
            const choice = chunk.choices[0];
            if (!choice) continue;

            finishReason = choice.finish_reason ?? finishReason;
            const delta = choice.delta;

            if (delta.content) {
                iterText += delta.content;
                callbacks.onContentDelta?.(delta.content);
            }

            if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                    const idx = tc.index;
                    if (!toolCallAccumulators[idx]) {
                        toolCallAccumulators[idx] = {
                            id: tc.id ?? "",
                            name: tc.function?.name ?? "",
                            arguments: "",
                        };
                    }
                    if (tc.id) toolCallAccumulators[idx].id = tc.id;
                    if (tc.function?.name)
                        toolCallAccumulators[idx].name = tc.function.name;
                    if (tc.function?.arguments)
                        toolCallAccumulators[idx].arguments +=
                            tc.function.arguments;
                }
            }
        }

        fullText += iterText;

        const toolCalls: NormalizedToolCall[] = Object.values(
            toolCallAccumulators,
        ).map((acc) => {
            let input: Record<string, unknown> = {};
            try {
                input = JSON.parse(acc.arguments);
            } catch {
                // leave empty if unparseable
            }
            const call: NormalizedToolCall = {
                id: acc.id,
                name: acc.name,
                input,
            };
            callbacks.onToolCallStart?.(call);
            return call;
        });

        if (finishReason !== "tool_calls" || !toolCalls.length || !runTools) {
            break;
        }

        const results = await runTools(toolCalls);

        // Append the assistant turn with tool_calls and then the tool results.
        messages.push({
            role: "assistant",
            content: iterText || null,
            tool_calls: toolCalls.map((tc) => ({
                id: tc.id,
                type: "function" as const,
                function: {
                    name: tc.name,
                    arguments: JSON.stringify(tc.input),
                },
            })),
        });

        for (const r of results) {
            messages.push({
                role: "tool",
                tool_call_id: r.tool_use_id,
                content: r.content,
            });
        }
    }

    return { fullText };
}

export async function completeOpenAIText(params: {
    model: string;
    systemPrompt?: string;
    user: string;
    maxTokens?: number;
    apiKeys?: { openai?: string | null };
}): Promise<string> {
    const openai = client(params.apiKeys?.openai);
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (params.systemPrompt) {
        messages.push({ role: "system", content: params.systemPrompt });
    }
    messages.push({ role: "user", content: params.user });

    const resp = await openai.chat.completions.create({
        model: params.model,
        messages,
        max_tokens: params.maxTokens ?? 512,
    });
    return resp.choices[0]?.message?.content ?? "";
}
