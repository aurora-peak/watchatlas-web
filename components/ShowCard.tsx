import { VStack, Image, Text, LinkBox, LinkOverlay } from "@chakra-ui/react";
import { TMDBResult, getPosterUrl } from "../lib/tmdb";
import NextLink from "next/link";

type Props = {
  result: TMDBResult;
};

export default function ShowCard({ result }: Props) {
  return (
    <LinkBox as="article" maxW="150px">
      <VStack spacing={2} align="start">
        <Image
          src={getPosterUrl(result.poster_path)}
          alt={result.name || result.title || "Untitled"}
          borderRadius="md"
          w="150px"
          h="225px"
          objectFit="cover"
        />
        <LinkOverlay as={NextLink} href={`/details/${result.id}?type=${result.media_type}`}>
          <Text fontSize="sm" fontWeight="medium" noOfLines={2}>
            {result.name || result.title}
          </Text>
        </LinkOverlay>
      </VStack>
    </LinkBox>
  );
}