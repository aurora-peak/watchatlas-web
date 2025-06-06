import {
    Box,
    Flex,
    Heading,
    Input,
    IconButton,
    useColorModeValue,
    useBreakpointValue,
    HStack,
    Avatar,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
  } from "@chakra-ui/react";
  import { SearchIcon } from "@chakra-ui/icons";
  import { useRouter } from "next/router";
  import { useEffect, useState } from "react";
  import Link from "next/link";
  import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
  import { auth } from "../lib/firebase";
  declare global {
    interface Window {
      google: any;
    }
  }
  export default function NavBar() {
    const [search, setSearch] = useState("");
    const [user, setUser] = useState<{ name: string; picture: string } | null>(null);
    const router = useRouter();
    const isMobile = useBreakpointValue({ base: true, md: false });
  
    const handleSearch = () => {
      if (search.trim()) {
        router.push(`/search?query=${encodeURIComponent(search)}`);
      }
    };
  
    useEffect(() => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
  
      script.onload = () => {
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
            callback: async (response: any) => {
              try {
                const credential = GoogleAuthProvider.credential(response.credential);
                const result = await signInWithCredential(auth, credential);
                const firebaseUser = result.user;
  
                const userData = {
                  name: firebaseUser.displayName || "",
                  picture: firebaseUser.photoURL || "",
                };
  
                console.log("✅ Signed in as:", userData.name);
  
                setUser(userData);
                localStorage.setItem("user", JSON.stringify(userData));
  
                window.location.href = "/settings";
              } catch (err) {
                console.error("🔥 Firebase Auth error:", err);
              }
            },
          });
  
          window.google.accounts.id.renderButton(
            document.getElementById("g_id_signin"),
            {
              theme: "outline",
              size: "large",
            }
          );
        }
      };
  
      const saved = localStorage.getItem("user");
      if (saved) {
        setUser(JSON.parse(saved));
      }
    }, []);
  
    return (
        <Box
        position="sticky"
        top="0"
        zIndex="1000"
        bg={useColorModeValue("gray.100", "gray.800")}
        px={4}
        py={4}
        mb={6}
        borderBottomWidth="1px"
        boxShadow="sm"
      >
        <Flex
          direction={isMobile ? "column" : "row"}
          align="center"
          justify="space-between"
          gap={isMobile ? 4 : 0}
        >
          <HStack spacing={4} w={isMobile ? "100%" : "auto"} flex={1}>
            <Link href="/">
              <HStack spacing={2} align="center">
                <Box boxSize="32px">
                  <img src="/logo.png" alt="WatchAtlas Logo" style={{ width: "100%", height: "auto" }} />
                </Box>
                <Heading
                  size="md"
                  cursor="pointer"
                  whiteSpace="nowrap"
                  fontFamily="'Cinzel', serif"
                >
                  WatchAtlas
                </Heading>
              </HStack>
            </Link>
  
            <Input
              placeholder="Search for movies or shows..."
              size="md"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              w={isMobile ? "100%" : "500px"}
              bg="white"
              borderColor="gray.300"
              borderWidth="1px"
              borderRadius="md"
              boxShadow="sm"
            />
  
            <IconButton
              icon={<SearchIcon />}
              aria-label="Search"
              size="md"
              onClick={handleSearch}
            />
          </HStack>
  
          <Box mt={isMobile ? 2 : 0}>
            {user ? (
              <Menu>
                <MenuButton
                  as={Avatar}
                  name={user.name}
                  src={user.picture}
                  size="sm"
                  cursor="pointer"
                />
                <MenuList>
                  <MenuItem onClick={() => router.push("/settings")}>Settings</MenuItem>
                  <MenuItem
                    onClick={() => {
                      localStorage.removeItem("user");
                      setUser(null);
                      router.push("/");
                    }}
                  >
                    Logout
                  </MenuItem>
                </MenuList>
              </Menu>
            ) : (
              <div id="g_id_signin" />
            )}
          </Box>
        </Flex>
      </Box>
    );
  }