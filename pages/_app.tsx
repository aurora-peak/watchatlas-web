// pages/_app.tsx
import { NextUIProvider } from "@nextui-org/react";
import AppLayout from "@/components/AppLayout";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { AuthProvider } from "@/lib/AuthContext";
import { RegionProvider } from "@/lib/RegionContext";
import "@/styles/globals.css";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system">
      <NextUIProvider>
        <AuthProvider>
          <RegionProvider>
            <AppLayout>
              <Component {...pageProps} />
            </AppLayout>
          </RegionProvider>
        </AuthProvider>
      </NextUIProvider>
    </NextThemesProvider>
  );
}