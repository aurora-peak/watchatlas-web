// pages/_app.tsx
import { ChakraProvider } from "@chakra-ui/react";
import type { AppProps } from "next/app";
import AppLayout from "../components/AppLayout";
import theme from "../theme";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider theme={theme}>
      <AppLayout>
        <Component {...pageProps} />
      </AppLayout>
    </ChakraProvider>
  );
}

export default MyApp;