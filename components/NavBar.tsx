import {
    Box,
    Flex,
    Heading,
    Input,
    InputGroup,
    InputRightElement,
    IconButton,
    useColorModeValue,
    useBreakpointValue,
    HStack,
    Avatar,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    useColorMode,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import { SearchIcon } from "@chakra-ui/icons";
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
    const { colorMode, toggleColorMode } = useColorMode();

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
            if (typeof window !== "undefined" && window.google) {
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

                            setUser(userData);
                            localStorage.setItem("user", JSON.stringify(userData));
                            window.location.href = "/settings";
                        } catch (err) {
                            console.error("🔥 Firebase Auth error:", err);
                        }
                    },
                });

                window.google.accounts.id.renderButton(document.getElementById("g_id_signin"), {
                    theme: "outline",
                    size: "large",
                });
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
                direction={{ base: "column", md: "row" }}
                align={{ base: "start", md: "center" }}
                justify="space-between"
                gap={4}
                pb={{ base: 3, md: 0 }}
            >
                {/* Left: Logo + Search */}
                <Box w="100%">
                    <HStack spacing={3}>
                        <Link href="/">
                            <HStack spacing={2}>
                                <Box boxSize="32px">
                                    <img src="/logo.png" alt="WatchAtlas Logo" style={{ width: "100%", height: "auto" }} />
                                </Box>
                                <Heading size="md" fontFamily="'Cinzel', serif">
                                    WatchAtlas
                                </Heading>
                            </HStack>
                        </Link>
                    </HStack>

                    <InputGroup mt={{ base: 3, md: 0 }} w="100%">
                        <Input
                            placeholder="Search for movies or shows..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            bg={useColorModeValue("white", "gray.700")}
                            color={useColorModeValue("black", "white")}
                            _placeholder={{ color: useColorModeValue("gray.500", "gray.400") }}
                            borderColor="gray.300"
                            w="100%"
                        />
                        <InputRightElement>
                            <IconButton
                                icon={<SearchIcon />}
                                aria-label="Search"
                                size="sm"
                                onClick={handleSearch}
                                variant="ghost"
                            />
                        </InputRightElement>
                    </InputGroup>
                </Box>

                {/* Right: Color mode toggle + user avatar */}
                <HStack spacing={3} mt={{ base: 3, md: 0 }} alignSelf={{ base: "flex-end", md: "center" }}>
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
                                        localStorage.removeItem("favoriteCountries");
                                        setUser(null);
                                        router.push("/");
                                    }}
                                >
                                    Logout
                                </MenuItem>
                            </MenuList>
                        </Menu>
                    ) : (
                        <Box id="g_id_signin" />
                    )}
                </HStack>
            </Flex>
        </Box>
    );
}