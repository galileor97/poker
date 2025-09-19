import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

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

const updateUserRecord = async (
  ctx: any,
  userId: Id<"users">,
  username: string
) => {
  await ctx.db.patch(userId, { name: username });
};

export const ensureGuestUsername = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;

    const existing =
      typeof (user as any).name === "string" ? (user as any).name : null;

    if (existing && existing.trim().length > 0) return null;

    const username = randomIndonesianName();
    await updateUserRecord(ctx, userId, username);
    return null;
  },
});

export const setUsername = mutation({
  args: { username: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const username = args.username.trim();
    if (username.length === 0) throw new Error("Username is required");

    await updateUserRecord(ctx, userId, username);

    // Propagate to all player records for this user so lobby/game use up-to-date usernames
    const players = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    await Promise.all(
      players.map((p) => ctx.db.patch(p._id, { username }))
    );
    return null;
  },
});
