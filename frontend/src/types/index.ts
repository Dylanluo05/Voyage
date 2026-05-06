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

export interface ItineraryItem {
  _id: string;
  day: number;
  startTime?: string;
  endTime?: string;
  title: string;
  notes?: string;
  location?: Location;
}

export interface Trip {
  _id: string;
  owner: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  description?: string;
  items: ItineraryItem[];
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
  startTime?: string;
  endTime?: string;
  title: string;
  notes?: string;
  location?: Location;
};
