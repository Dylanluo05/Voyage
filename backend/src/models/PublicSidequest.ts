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
    completions: {
        userId: Types.ObjectId,
        userName: string,
        photoUrl: string,
        completedAt: Date,
    }[],
    tripId?: Types.ObjectId,
}

const publicSidequestSchema = new Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    location: { type: String, trim: true },
    createdBy: { userId: { type: Schema.Types.ObjectId, required: true, index: true }, userName: { type: String, required: true, trim: true } },
    completions: [{ userId: { type: Schema.Types.ObjectId, required: true, index: true }, userName: { type: String, required: true, trim: true }, photoUrl: { type: String, required: true, trim: true }, completedAt: { type: Date } }],
    tripId: { type: Schema.Types.ObjectId },
}, { timestamps: true });

export const PublicSidequest = model<PublicSidequestDoc>('PublicSidequest', publicSidequestSchema);