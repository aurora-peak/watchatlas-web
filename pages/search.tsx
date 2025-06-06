import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  Box,
  Container,
  Heading,
  Spinner,
  Text,
  Grid,
} from "@chakra-ui/react";
import { searchTMDBAll, TMDBResult } from "../lib/tmdb";
import ShowCard from "../components/ShowCard";
import NextLink from "next/link";

export default function SearchPage() {
  const router = useRouter();
  const { query, country } = router.query;

  const [results, setResults] = useState<TMDBResult[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof query === "string") {
      const fetch = async () => {
        setLoading(true);
        const data = await searchTMDBAll(query);
        setResults(data);
        setLoading(false);
      };
      fetch();
    }
  }, [query]);

  return (
    <Container maxW="container.lg" py={8}>
      <Heading mb={4}>Search Results</Heading>
      <Text mb={6}>
        Showing results for <strong>{query}</strong> in <strong>{country}</strong>
      </Text>

      {loading ? (
        <Spinner size="xl" />
      ) : results && results.length > 0 ? (
        <Grid templateColumns="repeat(auto-fill, minmax(150px, 1fr))" gap={6}>
          {results.map((r) => (
            <NextLink key={r.id} href={`/details/${r.id}?type=${r.media_type}`} passHref>
              <Box as="a">
                <ShowCard result={r} />
              </Box>
            </NextLink>
          ))}
        </Grid>
      ) : (
        <Text>No results found.</Text>
      )}
    </Container>
  );
}