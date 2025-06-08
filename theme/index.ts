import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "system", // or "light" / "dark"
  useSystemColorMode: true,
};

const theme = extendTheme({ config });

export default theme;