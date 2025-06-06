import { Box, Text, IconButton, Flex } from "@chakra-ui/react";
import { CloseIcon } from "@chakra-ui/icons";
import { useState, useEffect } from "react";
import NavBar from "./NavBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    const onStorageChange = () => {
      const updatedUser = localStorage.getItem("user");
      setUser(updatedUser ? JSON.parse(updatedUser) : null);
    };

    window.addEventListener("storage", onStorageChange);
    return () => window.removeEventListener("storage", onStorageChange);
  }, []);

  return (
    <Box minH="100vh" position="relative" pb={!user && !dismissed ? "60px" : "0"}>
      <NavBar />

      <Box>{children}</Box>

      {!user && !dismissed && (
        <Flex
          position="fixed"
          bottom="0"
          left="0"
          right="0"
          zIndex="1000"
          bg="rgba(0, 0, 0, 0.6)"
          color="white"
          px={6}
          py={4}
          align="center"
          justify="center"
          boxShadow="md"
          backdropFilter="blur(8px)"
        >
          <Text fontSize="sm" mr={4}>
            Sign in to save your favorite countries across devices.
          </Text>
          <IconButton
            icon={<CloseIcon />}
            aria-label="Dismiss"
            size="sm"
            onClick={() => setDismissed(true)}
            variant="ghost"
            colorScheme="whiteAlpha"
          />
        </Flex>
      )}
    </Box>
  );
}