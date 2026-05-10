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

export interface Trip {
  _id: string;
  owner: string;
  collaborators: CollaboratorUser[];
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  description?: string;
  items: ItineraryItem[];
  groups: Group[];
  debates: Debate[];
  createdAt: string;
  updatedAt: string;
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
