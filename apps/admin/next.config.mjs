/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@khabir/ui-tokens', '@khabir/shared-types', '@khabir/shared-validation'],
};

export default nextConfig;
