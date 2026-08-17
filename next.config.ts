import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允許從 Codespaces 轉發埠 / Cloudflare Tunnel 存取 dev server
  allowedDevOrigins: ["*.app.github.dev", "*.trycloudflare.com", "*.ts.net"],
};

export default nextConfig;
