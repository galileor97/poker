import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import guestBtnUrl from "@assets/guest_login_button 1.svg";

export function GuestSignIn() {
  const { signIn } = useAuthActions();
  const ensureGuestName = useMutation(api.auth.ensureGuestName);
  const setDisplayName = useMutation(api.auth.setDisplayName);
  const [guestName, setGuestName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="w-full flex flex-col items-center">
      <input
        className="auth-input-field max-w-xs"
        type="text"
        name="guestName"
        placeholder="Enter temporary username"
        value={guestName}
        onChange={(e) => setGuestName(e.target.value)}
      />
      <button
        type="button"
        aria-label="Guest login"
        className="w-full flex items-center justify-center mt-3 disabled:opacity-50"
        disabled={submitting}
        onClick={async () => {
          try {
            setSubmitting(true);
            await signIn("anonymous");
            if (guestName.trim().length > 0) {
              await setDisplayName({ name: guestName.trim() });
            } else {
              await ensureGuestName({});
            }
            toast.success("Signed in as guest");
          } catch (err) {
            toast.error("Guest sign-in failed");
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
