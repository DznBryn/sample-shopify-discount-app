import { create } from "zustand";

export const useDiscountVariants = create((set) => ({}));
export const useProductWithPurchase = create((set) => ({
  selection: {
    selectionId: "",
    selection: [],
    setSelection: (resource) => {
      set((state) => {
        return {
          ...state,
          selection: {
            ...state.selection,
            ...resource,
          },
        };
      });
    },
  },
  rewardSelection: {
    selectionId: "",
    selection: [],
    setSelection: (resource) => {
      set((state) => {
        return {
          ...state,
          rewardSelection: {
            ...state.selection,
            ...resource,
          },
        };
      });
    },
  },
  rewards: {
    list: [],
    loading: false,
    setList: (resource = []) => {
      set((state) => {
        return {
          ...state,
          rewards: {
            ...state.rewards,
            ...resource,
          },
        };
      });
    },
  }
}));
export const useSharedStore = create((set) => ({
  products: [],
  setProducts: (products) => set({ products }),
}));
