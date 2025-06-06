// lib/getDisplayCountries.ts

type ProviderEntry = {
    flatrate?: any[];
    rent?: any[];
    buy?: any[];
  };
  
  export function getDisplayCountries(
    providerData: Record<string, ProviderEntry>,
    favoriteCountries?: string[] // e.g. ["US", "CA", "IN"]
  ): string[] {
    const allAvailable = Object.entries(providerData)
      .filter(([_, v]) => v.flatrate?.length || v.rent?.length || v.buy?.length)
      .map(([code]) => code);
  
    if (!favoriteCountries || favoriteCountries.length === 0) {
      return allAvailable; // Show all if not logged in or no favorites
    }
  
    // Show only favorite countries that have availability
    return allAvailable.filter((code) => favoriteCountries.includes(code));
  }