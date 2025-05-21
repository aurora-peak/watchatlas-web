import { Box, Container, Heading, Input } from "@chakra-ui/react";

export default function Home() {
  return (
    <Container maxW="container.md" py={10}>
      <Heading mb={4}>WatchAtlas</Heading>
      <Input placeholder="Search for a movie or show..." />
    </Container>
  );
}