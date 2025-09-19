export default {
  providers: [
    {
      // Use the Convex deployment URL from env; fallback to CONVEX_SITE_URL if provided
      // This must match the Convex URL your frontend calls (VITE_CONVEX_URL)
      domain: process.env.VITE_CONVEX_URL || process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
