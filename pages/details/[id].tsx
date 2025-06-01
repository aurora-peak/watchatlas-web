import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  Box,
  Container,
  Heading,
  Spinner,
  Stack,
  Text,
  Image,
  Badge,
  VStack,
  Divider,
} from "@chakra-ui/react";
import { getPosterUrl } from "../../lib/tmdb";
import { getCountryMeta } from "../../lib/countries";

type Provider = {
  provider_name: string;
  logo_path: string;
};

type Availability = {
  flatrate?: Provider[];
  rent?: Provider[];
  buy?: Provider[];
};

type CountryProviders = {
  [countryCode: string]: Availability;
};

export default function DetailsPage() {
  const router = useRouter();
  const { id, type } = router.query;
  const [title, setTitle] = useState("");
  const [poster, setPoster] = useState<string | null>(null);
  const [providers, setProviders] = useState<CountryProviders>({});
  const [loading, setLoading] = useState(true);

  const favoriteCountries =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("favoriteCountries") || "[]")
      : [];

  useEffect(() => {
    if (!id || !type) return;

    const apiKey = process.env.TMDB_API_KEY;
    const fetchDetails = async () => {
      setLoading(true);

      // 1. Get metadata
      const metaRes = await fetch(
        `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}`
      );
      const meta = await metaRes.json();
      setTitle(meta.name || meta.title || "Untitled");
      setPoster(meta.poster_path);

      // 2. Get watch providers
      const provRes = await fetch(
        `https://api.themoviedb.org/3/${type}/${id}/watch/providers?api_key=${apiKey}`
      );
      const provData = await provRes.json();
      setProviders(provData.results || {});
      setLoading(false);
    };

    fetchDetails();
  }, [id, type]);

  const section = (label: string, data?: Provider[]) => {
    if (!data?.length) return null;
    return (
      <Box mt={2}>
        <Text fontSize="sm" fontWeight="bold" mb={1}>
          {label}
        </Text>
        <Stack direction="row" spacing={3}>
          {data.map((provider) => (
            <VStack key={provider.provider_name} spacing={1}>
              <Image
                src={getPosterUrl(provider.logo_path, "w92")}
                alt={provider.provider_name}
                boxSize="50px"
                borderRadius="md"
                boxShadow="sm"
              />
              <Badge fontSize="0.7em">{provider.provider_name}</Badge>
            </VStack>
          ))}
        </Stack>
      </Box>
    );
  };

  return (
    <Container maxW="container.md" py={10}>
      {loading ? (
        <Spinner />
      ) : (
        <>
          <Stack direction="row" spacing={6} align="start" mb={6}>
            {poster && (
              <Image
                src={getPosterUrl(poster)}
                alt={title}
                borderRadius="md"
                w="150px"
              />
            )}
            <Box>
              <Heading>{title}</Heading>
              <Text fontSize="sm" color="gray.500">
                Streaming availability in your favorite countries:
              </Text>
            </Box>
          </Stack>

          <VStack align="start" spacing={6}>
            {favoriteCountries.map((code: string) => {
              const countryData = providers[code];
              const countryMeta = getCountryMeta(code);

              return (
                <Box key={code}>
                  <Heading size="sm" mb={2}>
                    {countryMeta?.flag} {countryMeta?.name || code}
                  </Heading>

                  {!countryData ? (
                    <Text fontSize="sm" color="gray.500">
                      No availability found.
                    </Text>
                  ) : (
                    <>
                      {section("Flatrate", countryData.flatrate)}
                      {section("Rent", countryData.rent)}
                      {section("Buy", countryData.buy)}
                    </>
                  )}

                  <Divider mt={4} />
                </Box>
              );
            })}
          </VStack>
        </>
      )}
    </Container>
  );
}