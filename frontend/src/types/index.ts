export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Location {
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export type ItemCategory = 'food' | 'activity' | 'attraction';

export interface Reaction {
  emoji: string;
  userIds: string[];
}

export interface Group {
  _id: string;
  title: string;
  day: number;
  position: number;
}

export interface DebateComment {
  _id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface DebateOption {
  _id: string;
  title: string;
  pros: string[];
  cons: string[];
  votes: string[];
}

export interface Debate {
  _id: string;
  title: string;
  day: number;
  position: number;
  options: DebateOption[];
  comments: DebateComment[];
}

export interface ItineraryItem {
  _id: string;
  day: number;
  position: number;
  startTime?: string;
  endTime?: string;
  title: string;
  notes?: string;
  location?: Location;
  imageUrl?: string;
  cost?: number;
  category?: ItemCategory;
  reactions?: Reaction[];
  groupId?: string;
}

export interface CollaboratorUser {
  _id: string;
  name: string;
  email: string;
}

export interface PlaylistTrack {
  _id: string;
  spotifyId: string;
  title: string;
  artist: string;
  albumArt?: string;
  addedBy: string;
}

export interface SpotifySearchResult {
  spotifyId: string;
  title: string;
  artist: string;
  albumArt?: string;
}

export interface LogPhoto {
  _id: string;
  url: string;
  day?: number;
  caption?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ItemRating {
  itemId: string;
  rating: number;
  userId: string;
}

export interface TripLog {
  photos: LogPhoto[];
  ratings: ItemRating[];
}

export interface Trip {
  _id: string;
  owner: CollaboratorUser;
  collaborators: CollaboratorUser[];
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  description?: string;
  items: ItineraryItem[];
  groups: Group[];
  debates: Debate[];
  playlist: PlaylistTrack[];
  budget?: number;
  isCompleted: boolean;
  log: TripLog;
  shareToken: string;
  createdAt: string;
  updatedAt: string;
  hotels: HotelBooking[];
  flights: FlightBooking[];
  expenses: Expense[];
  sidequests: Sidequest[];
}

export type NewTripInput = {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  description?: string;
};

export type NewItemInput = {
  day: number;
  position?: number;
  startTime?: string;
  endTime?: string;
  title: string;
  notes?: string;
  location?: Location;
  imageUrl?: string;
  cost?: number;
  category?: ItemCategory;
};

export type ReorderInput = {
  items: Array<{ itemId: string; day: number; position: number }>;
  groups?: Array<{ groupId: string; day: number; position: number }>;
  debates?: Array<{ debateId: string; day: number; position: number }>;
};

export interface Recommendation {
  title: string;
  description: string;
  suggestedDay: number;
  suggestedStartTime?: string;
  suggestedEndTime?: string;
  location?: { name: string; address?: string };
  category: 'food' | 'activity' | 'attraction';
  estimatedCost?: string;
}

export interface HotelBooking {
  _id: string;
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

export interface FlightBooking {
  _id: string;
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

export interface ExpenseSplit {
  userId: string;
  userName: string;
  amount: number;
  settled: boolean;
}

export interface Expense {
  _id: string;
  title: string;
  amount: number;
  paidBy: { userId: string; userName: string };
  splits: ExpenseSplit[];
  createdAt: string;
}

export interface SidequestComment {
  _id: string;
  userId: string;
  userName: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
}

export interface Sidequest {
  _id: string;
  title: string;
  description?: string;
  assignee?: { userId: string; userName: string };
  assigner?: { userId: string; userName: string };
  comments: SidequestComment[];
  completed: boolean;
  completedBy?: { userId: string; userName: string };
  completedAt?: string;
}

export interface Badge {
  _id: string;
  destination: string;
  countryCode?: string;
  awardedAt: string;
  source: 'auto' | 'manual';
  tripId?: string;
}

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  badges: Badge[];
}
