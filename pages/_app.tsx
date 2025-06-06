import { ChakraProvider } from "@chakra-ui/react";
import type { AppProps } from "next/app";
import AppLayout from "../components/AppLayout";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider>
      <AppLayout>
        <Component {...pageProps} />
      </AppLayout>
    </ChakraProvider>
  );
}

export default MyApp;