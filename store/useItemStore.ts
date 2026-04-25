import { create } from 'zustand';

export type ItemType = 'hotel' | 'flight' | 'attraction' | 'restaurant' | 'transport';

export interface SearchItem {
  id: string;
  name: string;
  type: ItemType;
  location: string;
  price?: number;
  rating?: number;
  reviews?: number;
  image?: string;
  description?: string;
  metadata?: any;
}

interface ItemState {
  selectedItem: SearchItem | null;
  setSelectedItem: (item: SearchItem | null) => void;
}

export const useItemStore = create<ItemState>((set) => ({
  selectedItem: null,
  setSelectedItem: (item) => set({ selectedItem: item }),
}));
