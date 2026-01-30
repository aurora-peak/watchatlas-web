import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import fullCountryList from "@/lib/full_country_list_with_flags.json";
import {
  saveUserPreferences,
  loadUserPreferences,
  UserPreferences,
} from "@/lib/firestore";

import {
  Button,
  Card,
  CardBody,
  Checkbox,
  Divider,
  Input,
  Switch,
} from "@nextui-org/react";

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
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const prefs = await loadUserPreferences(user.uid);
        if (prefs) {
          setSelected(prefs.favoriteCountries ?? []);
          setDarkModePref(prefs.darkMode ?? false);
          document.documentElement.classList.toggle("dark", prefs.darkMode ?? false);
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
  }, []);

  const toggleDarkMode = (enabled: boolean) => {
    setDarkModePref(enabled);
    document.documentElement.classList.toggle("dark", enabled);
  };

  const handleSave = async () => {
    if (userId) {
      await saveUserPreferences(userId, {
        favoriteCountries: selected,
        darkMode: darkModePref,
      });
      alert("✅ Preferences saved");
      setTimeout(() => {
        router.push("/");
      }, 1000);
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Select Favorite Countries</h1>
      <p style={{ color: "#888", marginBottom: "1.5rem" }}>
        Choose the countries where you want to see streaming availability.
      </p>

      <div style={{ marginBottom: "1.5rem" }}>
        <Switch
          isSelected={darkModePref}
          onValueChange={toggleDarkMode}
          color="primary"
        >
          Enable Dark Mode
        </Switch>
      </div>

      <Input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        label="Search countries..."
        placeholder="e.g., Canada"
        className="max-w-md mb-6"
        variant="bordered"
      />

      {Object.keys(groupedByContinent).length === 0 ? (
        <p style={{ color: "red" }}>Failed to load country list.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: "1rem",
          }}
        >
          {Object.entries(groupedByContinent).map(([continent, countries]) => {
            const filtered = countries.filter((country) =>
              country.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            if (filtered.length === 0) return null;

            return (
              <Card key={continent} shadow="sm">
                <CardBody>
                  <h2 style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                    {continent}
                  </h2>
                  <Divider />
                  <div style={{ marginTop: "0.5rem" }}>
                    {filtered.map((country) => (
                      <Checkbox
                        key={country.code}
                        isSelected={selected.includes(country.code)}
                        onValueChange={(checked) => {
                          setSelected((prev) =>
                            checked
                              ? [...prev, country.code]
                              : prev.filter((c) => c !== country.code)
                          );
                        }}
                        size="sm"
                        className="mb-1"
                      >
                        {country.flag} {country.name}
                      </Checkbox>
                    ))}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: "2rem" }}>
        <Button color="primary" onClick={handleSave} isDisabled={!userId}>
          Save Preferences
        </Button>
      </div>
    </div>
  );
}