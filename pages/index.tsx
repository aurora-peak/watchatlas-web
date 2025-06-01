import { useState } from "react";
import NextLink from "next/link";
import {
  Box,
  Button,
  Container,
  Grid,
  Heading,
  Input,
  Stack,
  useToast,
} from "@chakra-ui/react";
import { searchTMDBAll, TMDBResult } from "../lib/tmdb";
import ShowCard from "../components/ShowCard";

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TMDBResult[]>([]);
  const toast = useToast();

  const handleSearch = async () => {
    try {
      const res = await searchTMDBAll(query);
      setResults(res);
    } catch (err) {
      toast({
        title: "Search failed",
        description: (err as Error).message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Container maxW="container.lg" py={10}>
      <Heading mb={4}>WatchAtlas</Heading>

      <Stack direction="row" spacing={3} mb={6}>
        <Input
          placeholder="Search for a show or movie..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button colorScheme="blue" onClick={handleSearch}>
          Search
        </Button>
      </Stack>

      <Grid templateColumns="repeat(auto-fill, minmax(150px, 1fr))" gap={6}>
        {results.map((r) => (
          <NextLink key={r.id} href={`/details/${r.id}?type=${r.media_type}`} passHref>
            <Box as="a">
              <ShowCard result={r} />
            </Box>
          </NextLink>
        ))}
      </Grid>
    </Container>
  );
}