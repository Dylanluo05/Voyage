import { Schema, model, Document, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { notifyTripUpdate } from '../lib/tripEvents';

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

export interface PlaylistTrackData {
  _id?: Types.ObjectId;
  spotifyId: string;
  title: string;
  artist: string;
  albumArt?: string;
  addedBy: Types.ObjectId;
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

export interface LogPhotoData {
  _id?: Types.ObjectId;
  url: string;
  day?: number;
  caption?: string;
  uploadedBy?: Types.ObjectId;
  uploadedAt: Date;
}

export interface ItemRatingData {
  itemId: Types.ObjectId;
  rating: number;
  userId: Types.ObjectId;
}

export interface TripLogData {
  photos: LogPhotoData[];
  ratings: ItemRatingData[];
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
  playlist: PlaylistTrackData[];
  isCompleted: boolean;
  log: TripLogData;
  shareToken: string;
  createdAt: Date;
  updatedAt: Date;
  budget?: number;
  hotels: HotelBookingData[];
  flights: FlightBookingData[];
  expenses: ExpenseData[];
  dayAnchors: DayAnchorData[];
  isPublic: boolean;
}

export interface DayAnchorData {
  _id?: Types.ObjectId;
  day: number;
  startAddress?: string;
  endAddress?: string;
}

export interface HotelBookingData {
  _id?: Types.ObjectId;
  name: string;
  type: 'hotel' | 'airbnb' | 'hostel' | 'other';
  location: string;
  checkIn: string;
  checkOut: string;
  pricePerNight: number;
  guests: number;
  confirmationNumber?: string;
  notes?: string;
}

export interface FlightBookingData {
  _id?: Types.ObjectId;
  tripType: 'one-way' | 'round-trip';
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  returnDepartureTime?: string;
  returnArrivalTime?: string;
  passengers: number;
  cabinClass: 'economy' | 'premium-economy' | 'business' | 'first-class';
  price: number;
  confirmationNumber: string;
  notes?: string;
}

export interface ExpenseSplitData {
  userId: Types.ObjectId;
  userName: string;
  amount: number;
  settled: boolean;
}

export interface ExpenseData {
  _id?: Types.ObjectId;
  title: string;
  amount: number;
  paidBy: { userId: Types.ObjectId; userName: string };
  splits: ExpenseSplitData[];
  createdAt?: Date;
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

const playlistTrackSchema = new Schema<PlaylistTrackData>(
  {
    spotifyId: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    artist: { type: String, required: true, trim: true },
    albumArt: { type: String },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: true }
);

const logPhotoSchema = new Schema<LogPhotoData>(
  {
    url: { type: String, required: true },
    day: { type: Number, min: 1 },
    caption: { type: String, trim: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const itemRatingSchema = new Schema<ItemRatingData>(
  {
    itemId: { type: Schema.Types.ObjectId, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
);

const tripLogSchema = new Schema<TripLogData>(
  {
    photos: { type: [logPhotoSchema], default: [] },
    ratings: { type: [itemRatingSchema], default: [] },
  },
  { _id: false }
);

const hotelSchema = new Schema<HotelBookingData>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: ['hotel', 'airbnb', 'hostel', 'other'] },
    location: { type: String, required: true, trim: true },
    checkIn: { type: String, required: true, trim: true },
    checkOut: { type: String, required: true, trim: true },
    pricePerNight: { type: Number, required: true, min: 0 },
    guests: { type: Number, required: true, min: 1 },
    confirmationNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: true }
);

const flightSchema = new Schema<FlightBookingData>(
  {
    tripType: { type: String, required: true, enum: ['one-way', 'round-trip'] },
    airline: { type: String, required: true, trim: true },
    flightNumber: { type: String, required: true, trim: true },
    departureAirport: { type: String, required: true, trim: true },
    arrivalAirport: { type: String, required: true, trim: true },
    departureTime: { type: String, required: true, trim: true },
    arrivalTime: { type: String, required: true, trim: true },
    returnDepartureTime: { type: String, trim: true },
    returnArrivalTime: { type: String, trim: true },
    passengers: { type: Number, required: true, min: 1 },
    cabinClass: { type: String, required: true, enum: ['economy', 'premium-economy', 'business', 'first-class'] },
    price: { type: Number, required: true, min: 0 },
    confirmationNumber: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: true }
);

const expenseSplitSchema = new Schema<ExpenseSplitData>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    settled: { type: Boolean, required: true, default: false },
  },
  { _id: false }
);

const expenseSchema = new Schema<ExpenseData>(
  {
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    paidBy: { type: { userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, userName: { type: String, required: true, trim: true } } },
    splits: { type: [expenseSplitSchema], default: [], required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const dayAnchorSchema = new Schema<DayAnchorData>(
  {
    day: { type: Number, required: true },
    startAddress: { type: String, trim: true },
    endAddress: { type: String, trim: true },
  },
  { _id: true }
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
    playlist: { type: [playlistTrackSchema], default: [] },
    budget: { type: Number, min: 0 },
    isCompleted: { type: Boolean, default: false },
    log: { type: tripLogSchema, default: () => ({ photos: [], ratings: [] }) },
    shareToken: {
      type: String,
      unique: true,
      default: () => randomBytes(20).toString('hex'),
      index: true,
    },
    hotels: { type: [hotelSchema], default: [] },
    flights: { type: [flightSchema], default: [] },
    expenses: { type: [expenseSchema], default: [] },
    dayAnchors: { type: [dayAnchorSchema], default: [] },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

tripSchema.index({ owner: 1, startDate: 1 });
tripSchema.index({ collaborators: 1 });
tripSchema.index({ isPublic: 1 });

tripSchema.post('save', function (doc) {
  notifyTripUpdate(doc._id.toString());
});

export const Trip = model<TripDoc>('Trip', tripSchema);
