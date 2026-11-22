import type { NextConfig } from "next";
const config: NextConfig = { transpilePackages: ["@repuchain/ui", "@repuchain/utils", "@repuchain/validation", "@repuchain/shared-types"] };
export default config;
