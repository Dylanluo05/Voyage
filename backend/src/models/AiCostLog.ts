import { Schema, model, Document } from 'mongoose';

export type AiFeature = 'chat' | 'vibe' | 'import' | 'sidequest';

export interface AiCostLogDoc extends Document {
  modelName: string;
  feature: AiFeature;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  createdAt: Date;
}

const aiCostLogSchema = new Schema<AiCostLogDoc>(
  {
    modelName: { type: String, required: true },
    feature: { type: String, enum: ['chat', 'vibe', 'import', 'sidequest'], required: true },
    inputTokens: { type: Number, required: true },
    outputTokens: { type: Number, required: true },
    costUsd: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

aiCostLogSchema.index({ createdAt: -1 });

export const AiCostLog = model<AiCostLogDoc>('AiCostLog', aiCostLogSchema);
