import { AiCostLog, AiFeature } from '../models/AiCostLog';

// USD per million tokens. Add an entry here when a new model is introduced
// elsewhere in the app — unrecognized models are still logged (token counts
// preserved) but priced at $0 rather than guessed.
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'claude-haiku-4-5-20251001': { input: 1.0, output: 5.0 },
};

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const rates = PRICING[model];
  if (!rates) return 0;
  return (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output;
}

export async function recordAiCost(
  model: string,
  feature: AiFeature,
  usage: { input_tokens: number; output_tokens: number }
): Promise<void> {
  try {
    const costUsd = estimateCostUsd(model, usage.input_tokens, usage.output_tokens);
    await AiCostLog.create({
      modelName: model,
      feature,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      costUsd,
    });
  } catch (err) {
    console.error('[aiCost] failed to record cost log', err);
  }
}
