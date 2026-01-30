// pages/_app.tsx
import { NextUIProvider } from "@nextui-org/react";
import AppLayout from "@/components/AppLayout";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import "@/styles/globals.css";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system">
      <NextUIProvider>
        <AppLayout>
          <Component {...pageProps} />
        </AppLayout>
      </NextUIProvider>
    </NextThemesProvider>
  );
}