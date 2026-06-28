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
        tripId?: Types.ObjectId,
    }[],
    completions: {
        userId: Types.ObjectId,
        userName: string,
        photoUrl: string,
        completedAt: Date,
        isPublic: boolean,
    }[],
    comments: {
        _id?: Types.ObjectId,
        userId: Types.ObjectId,
        userName: string,
        avatarUrl?: string,
        text: string,
        createdAt: Date,
    }[],
    cardSuit: 'spades' | 'hearts' | 'diamonds' | 'clubs',
    cardRank: 'J' | 'Q' | 'K' | 'A',
    event?: {
        date: Date,
        maxParticipants?: number,
        enrollments: {
            userId: Types.ObjectId,
            userName: string,
            enrolledAt: Date,
        }[],
    }
    xpReward: number,
    tripId?: Types.ObjectId,
}

const publicSidequestSchema = new Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    location: { type: String, trim: true },
    createdBy: { userId: { type: Schema.Types.ObjectId, required: true, index: true }, userName: { type: String, required: true, trim: true } },
    claims: [{ userId: { type: Schema.Types.ObjectId, required: true, index: true }, userName: { type: String, required: true, trim: true }, claimedAt: { type: Date }, tripId: { type: Schema.Types.ObjectId, default: undefined } }],
    completions: [{ userId: { type: Schema.Types.ObjectId, required: true, index: true }, userName: { type: String, required: true, trim: true }, photoUrl: { type: String, required: true, trim: true }, completedAt: { type: Date }, isPublic: { type: Boolean, default: false } }],
    comments: [{ userId: { type: Schema.Types.ObjectId, required: true }, userName: { type: String, required: true, trim: true }, avatarUrl: { type: String, trim: true }, text: { type: String, required: true, trim: true }, createdAt: { type: Date, default: Date.now } }],
    cardSuit: { type: String, enum: ['spades', 'hearts', 'diamonds', 'clubs'], required: true },
    cardRank: { type: String, enum: ['J', 'Q', 'K', 'A'], required: true },
    event: { type: new Schema({ date: { type: Date, required: true }, maxParticipants: { type: Number, min: 1 }, enrollments: [{ userId: { type: Schema.Types.ObjectId, required: true }, userName: { type: String, required: true, trim: true }, enrolledAt: { type: Date, required: true } }] }) },
    xpReward: { type: Number, required: true },
    tripId: { type: Schema.Types.ObjectId },
}, { timestamps: true });

export const PublicSidequest = model<PublicSidequestDoc>('PublicSidequest', publicSidequestSchema);