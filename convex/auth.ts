import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Anonymous],
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});

function randomIndonesianName(): string {
  const firstNames: Array<string> = [
    "Budi",
    "Adi",
    "Agus",
    "Rizky",
    "Andi",
    "Dewi",
    "Siti",
    "Putra",
    "Putri",
    "Ayu",
    "Wulan",
    "Rina",
    "Yuli",
    "Rudi",
    "Nanda",
  ];
  const lastNames: Array<string> = [
    "Santoso",
    "Wijaya",
    "Saputra",
    "Pratama",
    "Setiawan",
    "Nugroho",
    "Wulandari",
    "Mahendra",
    "Anggraini",
    "Sari",
    "Permata",
    "Utami",
    "Ramadhan",
    "Syahputra",
  ];
  const f = firstNames[Math.floor(Math.random() * firstNames.length)];
  const l = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${f} ${l}`;
}

export const ensureGuestName = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const hasName =
      typeof (user as any).name === "string" &&
      (user as any).name.trim().length > 0;
    if (hasName) return null;
    const name = randomIndonesianName();
    await ctx.db.patch(userId, { name });
    return null;
  },
});

export const setDisplayName = mutation({
  args: { name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const name = args.name.trim();
    if (name.length === 0) return null;
    await ctx.db.patch(userId, { name });
    return null;
  },
});
