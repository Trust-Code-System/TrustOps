import type { MetadataRoute } from "next";

/** PWA manifest — makes TrustOps installable on phones (Add to Home Screen). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TrustOps AI",
    short_name: "TrustOps",
    description: "The operating system for African SMEs.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0712",
    theme_color: "#0a0712",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
