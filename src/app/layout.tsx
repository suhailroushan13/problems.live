import type { Metadata, Viewport } from "next";
import { Figtree, Inter } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/sonner";
import { SoundEffects } from "@/components/ui/sound";
import { SiteHeader } from "@/components/navigation/site-header";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageBackButton } from "@/components/navigation/page-back-button";
import { AuthErrorToast } from "@/components/navigation/auth-error-toast";
import { getCurrentUser } from "@/lib/auth/current-user";
import { countUnreadNotifications } from "@/lib/data/notifications";
import { getLiveVisitorStats } from "@/lib/data/stats";
import { env, APP_NAME, APP_TAGLINE } from "@/lib/env";
import "./globals.css";

/**
 * One sans for the entire product. The weight range carries the hierarchy
 * that a second family would otherwise be needed for. Inter is loaded only
 * for tabular figures in numeric displays (see live-pill.tsx).
 */
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: `${APP_NAME}, ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description:"Share a real problem. Find out how many other people have it. Then find, or build, the solution. problems.live is the internet's open list of problems worth solving.",
  applicationName: APP_NAME,
  keywords: ["problems","problem database","startup ideas","problem validation","solutions","community",
  ],
  authors: [{ name: APP_NAME }],
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: `${APP_NAME}, ${APP_TAGLINE}`,
    description:"Have a problem? Share it. Have the same problem? Vote for it. Have a solution? Build it.",
    url: env.appUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME}, ${APP_TAGLINE}`,
    description:"Have a problem? Share it. Have the same problem? Vote for it. Have a solution? Build it.",
  },
  alternates: { canonical: "/" },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
};

/**
 * Sets the "dark" class before first paint so there is no flash of the
 * wrong theme. Light is the default; an explicitly saved preference wins.
 * Runs before hydration (`beforeInteractive`), reading the same "theme"
 * localStorage key AnimatedThemeToggler writes to.
 */
const THEME_INIT_SCRIPT = `(function(){try{if(localStorage.getItem("theme")==="dark")document.documentElement.classList.add("dark");}catch(e){}})();`;

/** A browser can restore a previous scroll offset on refresh; reloads start at the top instead. */
const SCROLL_RESET_ON_RELOAD_SCRIPT = `(function(){try{var n=performance.getEntriesByType("navigation")[0];var r=n&&n.type==="reload";if(!r&&performance.navigation)r=performance.navigation.type===1;if(r){if("scrollRestoration" in history)history.scrollRestoration="manual";window.scrollTo(0,0);requestAnimationFrame(function(){window.scrollTo(0,0);});}}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [user, unreadCount, liveStats] = await Promise.all([
    getCurrentUser(),
    countUnreadNotifications(),
    getLiveVisitorStats(),
  ]);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${figtree.variable} ${inter.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-background">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <Script
          id="scroll-reset-on-reload"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: SCROLL_RESET_ON_RELOAD_SCRIPT }}
        />
        <SoundEffects>
          <SiteHeader user={user} unreadCount={unreadCount} liveStats={liveStats} />
          <div className="flex-1">
            <PageBackButton />
            {children}
          </div>
          {/* Marketing chrome — signed-in users are in the app, not on the
              landing page, so the footer's nav/legal links (already reachable
              elsewhere) stop showing once there's a session. */}
          {!user ? <SiteFooter /> : null}
          <Toaster position="top-center" />
          <AuthErrorToast />
        </SoundEffects>
        <Analytics />
        <Script
          strategy="afterInteractive"
          data-website-id="dfid_6rsKInmebGFZpSFynBB68"
          data-domain="problems.live"
          src="https://datafa.st/js/script.js"
        />
      </body>
    </html>
  );
}
