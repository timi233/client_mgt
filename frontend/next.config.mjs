const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*/",
        destination: "http://localhost:8000/api/:path*/",
      },
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
  async headers() {
    if (process.env.NODE_ENV === "development") {
      return [
        {
          source: "/:path*",
          headers: [
            {
              key: "Cross-Origin-Opener-Policy",
              value: "unsafe-none",
            },
          ],
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
