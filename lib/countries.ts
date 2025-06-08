import countryList from './full_country_list_with_flags.json';

export type Country = {
  code: string;
  name: string;
  flag: string;
  continent: string; 
};

export function getCountryList(): Country[] {
  return countryList;
}

export function getCountryMeta(code: string): Country | undefined {
  return countryList.find((c) => c.code === code);
}