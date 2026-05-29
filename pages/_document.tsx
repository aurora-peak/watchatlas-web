// pages/_document.tsx
import Document, { Html, Head, Main, NextScript } from "next/document";

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en" suppressHydrationWarning>
        <Head>
          {/* Watchatlas brand favicons / app icons */}
          <link rel="icon" type="image/svg+xml" href="/favicons/favicon.svg" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicons/favicon-32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/favicons/favicon-16.png" />
          <link rel="apple-touch-icon" href="/favicons/apple-touch-icon.png" />
          <link rel="manifest" href="/favicons/site.webmanifest" />
          <meta name="theme-color" content="#15110d" />

          {/* Brand type: Space Grotesk (display) + JetBrains Mono (tagline) */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;500&display=swap"
            rel="stylesheet"
          />
        </Head>
        <body className="bg-background text-foreground">
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  try {
                    var mode = localStorage.getItem('theme') || 'system';
                    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    var theme = (mode === 'dark' || (mode === 'system' && prefersDark)) ? 'dark' : 'light';
                    document.documentElement.classList.add(theme);
                  } catch (_) {}
                })();
              `,
            }}
          />
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}