// pages/settings.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Heading,
  Checkbox,
  CheckboxGroup,
  SimpleGrid,
  Container,
  Stack,
  Text,
  Button,
  Input,
  Switch,
  HStack,
  useToast,
  useColorMode,
} from "@chakra-ui/react";
import fullCountryList from "../lib/full_country_list_with_flags.json";
import {
  saveUserPreferences,
  loadUserPreferences,
  UserPreferences,
} from "../lib/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";

type Country = {
  code: string;
  name: string;
  flag: string;
  continent: string;
};

export default function SettingsPage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [groupedByContinent, setGroupedByContinent] = useState<Record<string, Country[]>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [darkModePref, setDarkModePref] = useState(false);

  const toast = useToast();
  const router = useRouter();
  const { colorMode, setColorMode } = useColorMode();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const prefs = await loadUserPreferences(user.uid);
        if (prefs) {
          setSelected(prefs.favoriteCountries ?? []);
          setDarkModePref(prefs.darkMode ?? false);
          setColorMode(prefs.darkMode ? "dark" : "light");
        }
      }
    });

    const grouped = fullCountryList.reduce((acc: Record<string, Country[]>, country: Country) => {
      if (!acc[country.continent]) acc[country.continent] = [];
      acc[country.continent].push(country);
      return acc;
    }, {});

    for (const continent of Object.keys(grouped)) {
      grouped[continent].sort((a, b) => a.name.localeCompare(b.name));
    }

    setGroupedByContinent(grouped);

    return () => unsubscribe();
  }, [setColorMode]);

  const handleSave = async () => {
    if (userId) {
      await saveUserPreferences(userId, {
        favoriteCountries: selected,
        darkMode: darkModePref,
      });
      toast({
        title: "Preferences saved",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } else {
      console.warn("⚠️ Tried to save but no userId found.");
    }
  };

  return (
    <Container maxW="container.xl" py={10}>
      <Heading size="lg" mb={4}>
        Select Favorite Countries
      </Heading>
      <Text fontSize="sm" mb={6}>
        Choose the countries where you want to see streaming availability.
      </Text>

      <HStack mb={6}>
        <Text>Dark Mode</Text>
        <Switch
          isChecked={darkModePref}
          onChange={(e) => {
            const enabled = e.target.checked;
            setDarkModePref(enabled);
            setColorMode(enabled ? "dark" : "light");
          }}
        />
      </HStack>

      <Input
        placeholder="Search countries..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        mb={6}
        bg="white"
        maxW="400px"
      />

      {Object.keys(groupedByContinent).length === 0 ? (
        <Text color="red.500">Failed to load country list.</Text>
      ) : (
        <CheckboxGroup value={selected} onChange={(val) => setSelected(val as string[])}>
          <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 6 }} spacing={6}>
            {Object.entries(groupedByContinent).map(([continent, countries]) => {
              const filtered = countries.filter((country) =>
                country.name.toLowerCase().includes(searchTerm.toLowerCase())
              );
              if (filtered.length === 0) return null;

              return (
                <Box key={continent}>
                  <Heading size="sm" mb={2}>{continent}</Heading>
                  <Stack spacing={1}>
                    {filtered.map((country) => (
                      <Checkbox key={country.code} value={country.code}>
                        {country.flag} {country.name}
                      </Checkbox>
                    ))}
                  </Stack>
                </Box>
              );
            })}
          </SimpleGrid>
        </CheckboxGroup>
      )}

      <Button
        colorScheme="blue"
        mt={8}
        onClick={handleSave}
        isDisabled={!userId}
      >
        Save Preferences
      </Button>
    </Container>
  );
}