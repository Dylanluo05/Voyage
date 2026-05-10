import { Schema, model, Document, Types } from 'mongoose';

export interface LocationData {
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export interface GroupData {
  _id?: Types.ObjectId;
  title: string;
  day: number;
  position: number;
}

export interface ReactionData {
  emoji: string;
  userIds: Types.ObjectId[];
}

export interface DebateCommentData {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  userName: string;
  text: string;
  createdAt: Date;
}

export interface DebateOptionData {
  _id?: Types.ObjectId;
  title: string;
  pros: string[];
  cons: string[];
  votes: Types.ObjectId[];
}

export interface DebateData {
  _id?: Types.ObjectId;
  title: string;
  day: number;
  position: number;
  options: DebateOptionData[];
  comments: DebateCommentData[];
}

export interface ItineraryItemData {
  _id?: Types.ObjectId;
  day: number;
  position: number;
  startTime?: string;
  endTime?: string;
  title: string;
  notes?: string;
  location?: LocationData;
  imageUrl?: string;
  cost?: number;
  category?: 'food' | 'activity' | 'attraction';
  reactions?: ReactionData[];
  groupId?: string;
}

export interface TripDoc extends Document {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  collaborators: Types.ObjectId[];
  title: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  description?: string;
  items: ItineraryItemData[];
  groups: GroupData[];
  debates: DebateData[];
  createdAt: Date;
  updatedAt: Date;
}

const locationSchema = new Schema<LocationData>(
  {
    name: { type: String, trim: true },
    address: { type: String, trim: true },
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 },
  },
  { _id: false }
);

const groupSchema = new Schema<GroupData>(
  {
    title: { type: String, required: true, trim: true },
    day: { type: Number, required: true, min: 1 },
    position: { type: Number, required: true, default: 0, min: 0 },
  },
  { _id: true }
);

const reactionSchema = new Schema<ReactionData>(
  {
    emoji: { type: String, required: true },
    userIds: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
  },
  { _id: false }
);

const debateOptionSchema = new Schema<DebateOptionData>(
  {
    title: { type: String, required: true, trim: true },
    pros: { type: [String], default: [] },
    cons: { type: [String], default: [] },
    votes: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
  },
  { _id: true }
);

const debateCommentSchema = new Schema<DebateCommentData>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    text: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const debateSchema = new Schema<DebateData>(
  {
    title: { type: String, required: true, trim: true },
    day: { type: Number, required: true, min: 1 },
    position: { type: Number, required: true, default: 0, min: 0 },
    options: { type: [debateOptionSchema], default: [] },
    comments: { type: [debateCommentSchema], default: [] },
  },
  { _id: true }
);

const itineraryItemSchema = new Schema<ItineraryItemData>(
  {
    day: { type: Number, required: true, min: 1 },
    position: { type: Number, required: true, default: 0, min: 0 },
    startTime: { type: String, trim: true },
    endTime: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    location: { type: locationSchema, default: undefined },
    imageUrl: { type: String },
    cost: { type: Number, min: 0 },
    category: { type: String, enum: ['food', 'activity', 'attraction'] },
    reactions: { type: [reactionSchema], default: [] },
    groupId: { type: String },
  },
  { _id: true, timestamps: false }
);

const tripSchema = new Schema<TripDoc>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    collaborators: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
    title: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    description: { type: String, trim: true },
    items: { type: [itineraryItemSchema], default: [] },
    groups: { type: [groupSchema], default: [] },
    debates: { type: [debateSchema], default: [] },
  },
  { timestamps: true }
);

tripSchema.index({ owner: 1, startDate: 1 });

export const Trip = model<TripDoc>('Trip', tripSchema);
