// pages/_app.tsx
import { NextUIProvider } from "@nextui-org/react";
import AppLayout from "@/components/AppLayout";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { AuthProvider } from "@/lib/AuthContext";
import "@/styles/globals.css";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system">
      <NextUIProvider>
        <AuthProvider>
          <AppLayout>
            <Component {...pageProps} />
          </AppLayout>
        </AuthProvider>
      </NextUIProvider>
    </NextThemesProvider>
  );
}