/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // @app/ui ships raw TypeScript rather than a build artifact, so Next has to
  // compile it as if it were app source.
  transpilePackages: ['@app/ui'],
};

module.exports = nextConfig;
