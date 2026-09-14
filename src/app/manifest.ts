import type { MetadataRoute } from "next";
import { APP_NAME, APP_TAGLINE } from "@/lib/env";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} — ${APP_TAGLINE}`,
    short_name: APP_NAME,
    description:
      "Have a problem? Share it. Have the same problem? Vote for it. Have a solution? Build it.",
    start_url: "/",
    display: "standalone",
    background_color: "#fdfcfa",
    theme_color: "#de4a1e",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
