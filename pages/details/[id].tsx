import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  Box,
  Heading,
  Spinner,
  Text,
  Image,
  Badge,
  VStack,
  Flex,
  Wrap,
  WrapItem,
  Stack,
  Grid,
  Divider,
  HStack,
  Link,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { getPosterUrl } from "../../lib/tmdb";
import { getCountryMeta } from "../../lib/countries";
import { getDisplayCountries } from "../../lib/getDisplayCountries";
import { useColorModeValue } from "@chakra-ui/react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { loadUserPreferences } from "../../lib/firestore";

export default function DetailsPage() {
  const router = useRouter();
  const { id, type } = router.query;

  const [user, setUser] = useState<any>(null);
  const [favoriteCountries, setFavoriteCountries] = useState<string[] | null>(null);

  const [title, setTitle] = useState("");
  const [poster, setPoster] = useState<string | null>(null);
  const [backdrop, setBackdrop] = useState<string | null>(null);
  const [overview, setOverview] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [homepage, setHomepage] = useState<string>("");
  const [tagline, setTagline] = useState("");
  const [providers, setProviders] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const prefs = await loadUserPreferences(firebaseUser.uid);
        setFavoriteCountries(prefs?.favoriteCountries ?? []);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!id || !type) return;

    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    const fetchDetails = async () => {
      setLoading(true);

      const metaRes = await fetch(
        `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}`
      );
      const meta = await metaRes.json();
      setTitle(meta.name || meta.title || "Untitled");
      setPoster(meta.poster_path);
      setBackdrop(meta.backdrop_path);
      setOverview(meta.overview || "");
      setReleaseDate(meta.first_air_date || meta.release_date || "");
      setRating(meta.vote_average || null);
      setGenres(meta.genres?.map((g: any) => g.name) || []);
      setHomepage(meta.homepage || "");
      setTagline(meta.tagline || "");

      const provRes = await fetch(
        `https://api.themoviedb.org/3/${type}/${id}/watch/providers?api_key=${apiKey}`
      );
      const provData = await provRes.json();
      setProviders(provData.results || {});
      setLoading(false);
    };

    fetchDetails();
  }, [id, type]);

  const section = (label: string, data?: any[]) => {
    if (!data?.length) return null;
    return (
      <Flex align="center" pt={3}>
        <Box minW="100px" textAlign="right" pr={4}>
          <Text fontWeight="bold" fontSize="sm">
            {label.toUpperCase()}
          </Text>
        </Box>
        <Wrap spacing={4}>
          {data.map((provider) => (
            <WrapItem key={provider.provider_name}>
              <VStack spacing={1}>
                <Image
                  src={getPosterUrl(provider.logo_path, "w92")}
                  alt={provider.provider_name}
                  boxSize="50px"
                  borderRadius="md"
                  boxShadow="sm"
                />
                <Badge
                  fontSize="0.7em"
                  textAlign="center"
                  color={useColorModeValue("gray.800", "white")}
                  bg="transparent"
                >
                  {provider.provider_name}
                </Badge>
              </VStack>
            </WrapItem>
          ))}
        </Wrap>
      </Flex>
    );
  };

  const countriesToShow = favoriteCountries
    ? getDisplayCountries(providers, favoriteCountries)
    : Object.keys(providers);

  const groupedByContinent: Record<string, string[]> = {};
  countriesToShow.forEach((code) => {
    const meta = getCountryMeta(code);
    const continent = meta?.continent || "Other";
    if (!groupedByContinent[continent]) groupedByContinent[continent] = [];
    groupedByContinent[continent].push(code);
  });

  return (
    <Box position="relative" minH="100vh" w="100vw" overflowX="hidden" m={0} p={0}>
      {backdrop && (
        <Box position="fixed" top={0} left={0} right={0} bottom={0} zIndex={-2}>
          <Box
            bgImage={`url(${getPosterUrl(backdrop, "w1280")})`}
            bgSize="cover"
            bgPosition="center"
            filter="blur(6px) brightness(0.4)"
            height="100%"
            width="100%"
          />
        </Box>
      )}

      <Box px={{ base: 4, md: 8 }} pt={8}>
        {loading ? (
          <Spinner />
        ) : (
          <Grid templateColumns={{ base: "1fr", md: "2fr 1fr" }} gap={8}>
            <Box overflowY="auto" maxH="80vh" pr={2}>
              <VStack align="start" spacing={6}>
                {Object.entries(groupedByContinent).map(([continent, codes]) => (
                  <Box key={continent}>
                    <Heading size="md" mb={4} color="gray.100">
                      {continent}
                    </Heading>
                    {codes.map((code) => {
                      const countryData = providers[code];
                      const countryMeta = getCountryMeta(code);

                      const sections = [];
                      if (countryData?.flatrate?.length) {
                        sections.push(section("Streaming", countryData.flatrate));
                      }
                      if (countryData?.rent?.length) {
                        sections.push(section("Rent", countryData.rent));
                      }
                      if (countryData?.buy?.length) {
                        sections.push(section("Buy", countryData.buy));
                      }

                      return (
                        <Box
                          key={code}
                          p={5}
                          mb={6}
                          borderWidth="1px"
                          borderRadius="lg"
                          bg={useColorModeValue("white", "gray.700")}
                          borderColor={useColorModeValue("gray.300", "gray.600")}
                          boxShadow="md"
                        >
                          <Heading size="sm" mb={2}>
                            {countryMeta?.flag} {countryMeta?.name || code}
                          </Heading>
                          <Divider mb={2} />
                          {sections.length === 0 ? (
                            <Text fontSize="sm" color="gray.500">
                              No availability found.
                            </Text>
                          ) : (
                            <Stack spacing={4}>
                              {sections.map((sec, index) => (
                                <Box key={index}>
                                  {index !== 0 && <Divider mb={2} />}
                                  {sec}
                                </Box>
                              ))}
                            </Stack>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                ))}
              </VStack>
            </Box>

            <Box position="sticky" top="80px" alignSelf="start" color="white">
              <VStack align="start" spacing={4}>
                {poster && (
                  <Image
                    src={getPosterUrl(poster)}
                    alt={title}
                    borderRadius="md"
                    w="100%"
                    maxW="200px"
                    boxShadow="lg"
                  />
                )}
                <Heading size="lg">{title}</Heading>
                {tagline && (
                  <Text fontStyle="italic" color="gray.300">
                    {tagline}
                  </Text>
                )}
                {releaseDate && (
                  <Text fontSize="sm" color="gray.300">
                    Release Date: {releaseDate}
                  </Text>
                )}
                {rating !== null && (
                  <Text fontSize="sm" color="gray.300">
                    Rating: {rating}/10
                  </Text>
                )}
                {genres.length > 0 && (
                  <HStack spacing={2} wrap="wrap">
                    {genres.map((genre) => (
                      <Badge key={genre} colorScheme="purple">
                        {genre}
                      </Badge>
                    ))}
                  </HStack>
                )}
                {overview && (
                  <Text fontSize="sm" color="gray.100">
                    {overview}
                  </Text>
                )}
                {homepage && (
                  <Link href={homepage} isExternal color="blue.300">
                    Official Website <ExternalLinkIcon mx="2px" />
                  </Link>
                )}
              </VStack>
            </Box>
          </Grid>
        )}
      </Box>
    </Box>
  );
}