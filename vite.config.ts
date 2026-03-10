// vite-cache-bust: 2026-03-10b
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    define: {
      // Always inject env vars so the app never crashes with "supabaseUrl is required"
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || "https://jxwvvbqitdcczlwnptxj.supabase.co"),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4d3Z2YnFpdGRjY3psd25wdHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTQ5NDQsImV4cCI6MjA4ODU5MDk0NH0.aCJK8f5qZXizm4LxBA4Esa6Ve9QnPNYzAnAzN2rvJFo"),
      'import.meta.env.VITE_SUPABASE_PROJECT_ID': JSON.stringify(env.VITE_SUPABASE_PROJECT_ID || "jxwvvbqitdcczlwnptxj"),
    },
  optimizeDeps: {
    force: true,
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "react-router-dom",
      "react-dom/client",
      "@radix-ui/react-tooltip",
    ],
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
