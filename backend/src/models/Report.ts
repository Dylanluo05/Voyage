import { Schema, model, Document, Types } from 'mongoose';

export type ReportTargetType = 'trip' | 'sidequest' | 'sidequestCompletion' | 'sidequestComment';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface ReportDoc extends Document {
  targetType: ReportTargetType;
  targetId: Types.ObjectId;
  subTargetId?: Types.ObjectId;
  reporterId: Types.ObjectId;
  reporterName: string;
  reason: string;
  status: ReportStatus;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<ReportDoc>(
  {
    targetType: { type: String, enum: ['trip', 'sidequest', 'sidequestCompletion', 'sidequestComment'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    subTargetId: { type: Schema.Types.ObjectId },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reporterName: { type: String, required: true, trim: true },
    reason: { type: String, required: true, trim: true, maxlength: 300 },
    status: { type: String, enum: ['pending', 'resolved', 'dismissed'], default: 'pending' },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });

export const Report = model<ReportDoc>('Report', reportSchema);
