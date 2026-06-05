import { create } from 'zustand';
import { Id } from '../convex/_generated/dataModel';

export interface Trip {
  _id: Id<"trips">;
  userId: Id<"users">;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  status: "planning" | "confirmed" | "ongoing" | "completed" | "cancelled";
  itinerary: any[];
  participants: string[];
  isShared: boolean;
  shareLink?: string;
  createdAt: number;
  updatedAt: number;
}

interface TripState {
  trips: Trip[];
  currentTrip: Trip | null;
  setTrips: (trips: Trip[]) => void;
  setCurrentTrip: (trip: Trip | null) => void;
  addTrip: (trip: Trip) => void;
  updateTrip: (tripId: Id<"trips">, updates: Partial<Trip>) => void;
}

export const useTripStore = create<TripState>((set) => ({
  trips: [],
  currentTrip: null,
  setTrips: (trips) => set({ trips }),
  setCurrentTrip: (trip) => set({ currentTrip: trip }),
  addTrip: (trip) => set((state) => ({ trips: [trip, ...state.trips] })),
  updateTrip: (tripId, updates) => set((state) => ({
    trips: state.trips.map(trip => 
      trip._id === tripId ? { ...trip, ...updates } : trip
    ),
    currentTrip: state.currentTrip?._id === tripId 
      ? { ...state.currentTrip, ...updates } 
      : state.currentTrip
  })),
}));
