import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import guestBtnUrl from "@assets/guest_login_button 1.svg";

export function GuestSignIn() {
  const { signIn } = useAuthActions();
  const setUsername = useMutation(api.auth.setUsername);
  const [guestUsername, setGuestUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const attemptSetUsername = async (username: string) => {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await setUsername({ username });
        return;
      } catch (err: any) {
        const message = err?.message || String(err || "");
        if (message.includes("Not authenticated") && attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
          continue;
        }
        throw err;
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <input
        className="auth-input-field max-w-xs"
        type="text"
        name="guestName"
        placeholder="Enter temporary username"
        value={guestUsername}
        onChange={(e) => setGuestUsername(e.target.value)}
      />
      <button
        type="button"
        aria-label="Guest login"
        className="w-full flex items-center justify-center mt-3 disabled:opacity-50"
        disabled={submitting}
        onClick={async () => {
          const username = guestUsername.trim();
          if (username.length === 0) {
            toast.error("Please enter a username to continue");
            return;
          }

          try {
            setSubmitting(true);
            await signIn("anonymous");
            await attemptSetUsername(username);
            toast.success("Signed in as guest");
          } catch (err: any) {
            const msg = err?.message || (typeof err === "string" ? err : "Guest sign-in failed");
            toast.error(msg);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <img
          src={guestBtnUrl}
          alt="Guest login"
          className="w-full max-w-xs select-none"
        />
      </button>
    </div>
  );
}
