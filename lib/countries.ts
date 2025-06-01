export type Country = {
    code: string;
    name: string;
    flag: string;
  };
  
  export function getCountryList(): Country[] {
    return [
      { code: "US", name: "United States", flag: "🇺🇸" },
      { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
      { code: "CA", name: "Canada", flag: "🇨🇦" },
      { code: "IN", name: "India", flag: "🇮🇳" },
      { code: "FR", name: "France", flag: "🇫🇷" },
      { code: "DE", name: "Germany", flag: "🇩🇪" },
      { code: "IT", name: "Italy", flag: "🇮🇹" },
      { code: "AU", name: "Australia", flag: "🇦🇺" },
      { code: "JP", name: "Japan", flag: "🇯🇵" },
      { code: "BR", name: "Brazil", flag: "🇧🇷" },
    ];
  }
  
  export function getCountryMeta(code: string): Country | undefined {
    return getCountryList().find((c) => c.code === code);
  }