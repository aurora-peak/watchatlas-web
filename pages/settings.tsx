import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Container,
  Heading,
  Stack,
  Text,
} from "@chakra-ui/react";
import { getCountryList, Country } from "../lib/countries";

export default function SettingsPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    setCountries(getCountryList());

    // Load saved favorites from localStorage
    const saved = localStorage.getItem("favoriteCountries");
    if (saved) setSelected(JSON.parse(saved));
  }, []);

  const handleSave = () => {
    localStorage.setItem("favoriteCountries", JSON.stringify(selected));
  };

  return (
    <Container maxW="container.md" py={10}>
      <Heading size="lg" mb={4}>
        Select Favorite Countries
      </Heading>
      <Text fontSize="sm" mb={4}>
        Choose the countries where you want to see streaming availability.
      </Text>
      <CheckboxGroup value={selected} onChange={setSelected}>
        <Stack spacing={2}>
          {countries.map((country) => (
            <Checkbox key={country.code} value={country.code}>
              {country.flag} {country.name}
            </Checkbox>
          ))}
        </Stack>
      </CheckboxGroup>

      <Button colorScheme="blue" mt={6} onClick={handleSave}>
        Save Preferences
      </Button>
    </Container>
  );
}