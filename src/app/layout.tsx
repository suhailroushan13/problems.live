import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/navigation/site-header";
import { SiteFooter } from "@/components/navigation/site-footer";
import { AuthErrorToast } from "@/components/navigation/auth-error-toast";
import { getCurrentUser } from "@/lib/auth/current-user";
import { countUnreadNotifications } from "@/lib/data/notifications";
import { getPlatformStats } from "@/lib/data/stats";
import { env, APP_NAME, APP_TAGLINE } from "@/lib/env";
import "./globals.css";

/**
 * One geometric sans for the entire product. The weight range carries the
 * hierarchy that a second family would otherwise be needed for.
 */
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description:"Share a real problem. Find out how many other people have it. Then find — or build — the solution. problems.live is the internet's open list of problems worth solving.",
  applicationName: APP_NAME,
  keywords: ["problems","problem database","startup ideas","problem validation","solutions","community",
  ],
  authors: [{ name: APP_NAME }],
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description:"Have a problem? Share it. Have the same problem? Vote for it. Have a solution? Build it.",
    url: env.appUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description:"Have a problem? Share it. Have the same problem? Vote for it. Have a solution? Build it.",
  },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfcfb" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1817" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Fetched once in the layout and passed down, so the header, mobile nav and
  // command palette all share a single set of queries per request.
  const [user, unreadCount, stats] = await Promise.all([
    getCurrentUser(),
    countUnreadNotifications(),
    // A database hiccup should soften the header, not break the page.
    getPlatformStats().catch(() => ({
      problems: 0,
      validations: 0,
      solutions: 0,
      solved: 0,
    })),
  ]);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jakarta.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SiteHeader user={user} unreadCount={unreadCount} stats={stats} />
          <div className="flex-1">{children}</div>
          <SiteFooter />
          <Toaster position="top-center" />
          <AuthErrorToast />
        </ThemeProvider>
      </body>
    </html>
  );
}
