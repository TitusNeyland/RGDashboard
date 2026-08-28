import type { NextConfig } from "next";

/**
 * STATIC_EXPORT=true produces the GitHub Pages demo build: a fully static
 * snapshot rendered from mock data (see lib/load-pipeline-data.ts). It is
 * NOT the real app — GitHub Pages cannot run the GHL sync, the webhook
 * receiver, or any server-side database query. Vercel builds run without
 * this flag and keep full server rendering.
 *
 * `scripts/prepare-static-demo.mjs` strips what static hosting can't serve
 * before this config is used; see the GitHub Pages workflow.
 */
const isStaticExport = process.env.STATIC_EXPORT === "true";

// GitHub Pages serves a project site under /<repo>, so every asset and
// link needs that prefix. Overridable for a custom domain (which serves
// from the root and needs an empty value).
const basePath = process.env.PAGES_BASE_PATH ?? "/RGDashboard";

const nextConfig: NextConfig = isStaticExport
  ? {
      output: "export",
      basePath,
      // Pages has no image optimizer.
      images: { unoptimized: true },
      // Emits /dashboard/index.html rather than /dashboard.html, which is
      // what Pages needs to resolve a bare /dashboard URL.
      trailingSlash: true,
    }
  : {};

export default nextConfig;
