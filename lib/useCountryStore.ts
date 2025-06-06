// lib/useCountryStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CountryStore {
  selectedCountries: string[];
  setCountries: (codes: string[]) => void;
}

const useCountryStore = create<CountryStore>()(
  persist(
    (set) => ({
      selectedCountries: [],
      setCountries: (codes) => set({ selectedCountries: codes }),
    }),
    {
      name: "watchatlas-countries", // key for localStorage
    }
  )
);

export default useCountryStore;