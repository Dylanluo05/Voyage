import { Schema, model, Document, Types } from 'mongoose';

export interface LocationData {
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export interface ItineraryItemData {
  _id?: Types.ObjectId;
  day: number; // 1-indexed day within the trip
  startTime?: string; // "HH:mm"
  endTime?: string; // "HH:mm"
  title: string;
  notes?: string;
  location?: LocationData;
}

export interface TripDoc extends Document {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  title: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  description?: string;
  items: ItineraryItemData[];
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

const itineraryItemSchema = new Schema<ItineraryItemData>(
  {
    day: { type: Number, required: true, min: 1 },
    startTime: { type: String, trim: true },
    endTime: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    location: { type: locationSchema, default: undefined },
  },
  { _id: true, timestamps: false }
);

const tripSchema = new Schema<TripDoc>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    description: { type: String, trim: true },
    items: { type: [itineraryItemSchema], default: [] },
  },
  { timestamps: true }
);

tripSchema.index({ owner: 1, startDate: 1 });

export const Trip = model<TripDoc>('Trip', tripSchema);
