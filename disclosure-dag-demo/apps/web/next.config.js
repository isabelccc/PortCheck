import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, "../..");

// Root `.env` lives at `disclosure-dag-demo/.env` (Next only auto-loads `apps/web/.env*`).
loadEnv({ path: path.join(monorepoRoot, ".env") });
loadEnv({ path: path.join(__dirname, ".env.local") });

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/db"],
  /** Match `turbopack.root` so Next 16 does not warn on Vercel. */
  outputFileTracingRoot: monorepoRoot,
  experimental: {
    serverActions: {
      /** Large filing bodies can exceed the default Server Actions body limit. */
      bodySizeLimit: "8mb",
    },
  },
  // Avoid picking a parent folder that has another lockfile (e.g. ~/pnpm-lock.yaml).
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;
