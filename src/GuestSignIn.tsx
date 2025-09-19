import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";
import guestBtnUrl from "@assets/guest_login_button 1.svg";

export function GuestSignIn() {
  const { signIn } = useAuthActions();
  const [guestUsername, setGuestUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
            try {
              localStorage.setItem("pendingUsername", username);
            } catch {
              // ignore storage failure, we'll rely on immediate session if possible
            }
            await signIn("anonymous");
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
