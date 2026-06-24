import { Document, model, Schema, Types } from "mongoose"

export interface PublicSidequestDoc extends Document {
    _id: Types.ObjectId,
    title: string,
    description?: string,
    location?: string,
    createdBy: {
        userId: Types.ObjectId,
        userName: string,
    },
    claims: {
        userId: Types.ObjectId,
        userName: string,
        claimedAt: Date,
    }[],
    completions: {
        userId: Types.ObjectId,
        userName: string,
        photoUrl: string,
        completedAt: Date,
    }[],
    difficulty: 'easy' | 'medium' | 'hard' | 'legendary',
    xpReward: number,
    tripId?: Types.ObjectId,
}

const publicSidequestSchema = new Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    location: { type: String, trim: true },
    createdBy: { userId: { type: Schema.Types.ObjectId, required: true, index: true }, userName: { type: String, required: true, trim: true } },
    claims: [{ userId: { type: Schema.Types.ObjectId, required: true, index: true }, userName: { type: String, required: true, trim: true }, claimedAt: { type: Date } }],
    completions: [{ userId: { type: Schema.Types.ObjectId, required: true, index: true }, userName: { type: String, required: true, trim: true }, photoUrl: { type: String, required: true, trim: true }, completedAt: { type: Date } }],
    difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'legendary'], required: true },
    xpReward: { type: Number, required: true },
    tripId: { type: Schema.Types.ObjectId },
}, { timestamps: true });

export const PublicSidequest = model<PublicSidequestDoc>('PublicSidequest', publicSidequestSchema);