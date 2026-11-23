import type { NextConfig } from "next";
import { configuredLiveUpdates } from "./lib/live-mode-config";

const nextConfig: NextConfig = {
  agentRules: false,
  env: { NEXT_PUBLIC_LIVE_UPDATES: configuredLiveUpdates({ explicit: process.env.NEXT_PUBLIC_LIVE_UPDATES, vercelEnv: process.env.VERCEL_ENV }) },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
