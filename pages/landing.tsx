import { useEffect, useState } from "react";
import NextLink from "next/link";
import {
  Box,
  Heading,
  Text,
  Image,
  Spinner,
  VStack,
  Container,
  Flex,
  Spacer,
  Select,
  Input,
  IconButton,
  HStack,
  Button,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../lib/firebase";
import { getTMDBCategoryResults, TMDBResult, getPosterUrl } from "../lib/tmdb";

const CATEGORY_LABELS = [
  { title: "🔥 Trending Today", endpoint: "trending/all/day" },
  { title: "🎥 Popular Movies", endpoint: "movie/popular" },
  { title: "📺 Popular TV Shows", endpoint: "tv/popular" },
  { title: "🍿 Now Playing", endpoint: "movie/now_playing" },
  { title: "📡 Currently Airing", endpoint: "tv/on_the_air" },
];

export default function LandingPage() {
  const [sections, setSections] = useState<{ [title: string]: TMDBResult[] }>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [country, setCountry] = useState("US");

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      console.log("Logged in as:", result.user.displayName);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      window.location.href = `/search?query=${encodeURIComponent(searchQuery)}&country=${country}`;
    }
  };

  useEffect(() => {
    const fetchSections = async () => {
      setLoading(true);
      const results: { [title: string]: TMDBResult[] } = {};
      for (const { title, endpoint } of CATEGORY_LABELS) {
        try {
          const data = await getTMDBCategoryResults(endpoint);
          results[title] = data;
        } catch (err) {
          console.error(`Failed to fetch ${title}:`, err);
        }
      }
      setSections(results);
      setLoading(false);
    };
    fetchSections();
  }, []);

  return (
    <Container maxW="7xl" py={6}>
      <Flex align="center" mb={4}>
      </Flex>


      {loading ? (
        <VStack py={20}>
          <Spinner size="xl" />
          <Text>Loading recommendations...</Text>
        </VStack>
      ) : (
        Object.entries(sections).map(([title, items]) => (
          <Box key={title} mb={10}>
            <Heading size="md" mb={2}>{title}</Heading>
            <Box overflowX="auto" whiteSpace="nowrap">
              {items.map((item) => (
                <Box
                  as={NextLink}
                  key={`${item.media_type}-${item.id}`}
                  href={`/details/${item.id}?type=${item.media_type || "tv"}`}
                  display="inline-block"
                  w="150px"
                  mx={2}
                  borderRadius="md"
                  overflow="hidden"
                  bg="gray.700"
                  textDecoration="none"
                >
                  <Image
                    src={getPosterUrl(item.poster_path) || "/no-image.png"}
                    alt={item.title || item.name || "Untitled"}
                    w="100%"
                    h="225px"
                    objectFit="cover"
                  />
                  <Text p={2} fontSize="sm" noOfLines={2}>
                    {item.title || item.name || "Untitled"}
                  </Text>
                </Box>
              ))}
            </Box>
          </Box>
        ))
      )}
    </Container>
  );
}