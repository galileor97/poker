"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import logoutBtnUrl from "@assets/logout_button 1.svg";

export function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <button
      className="flex items-center justify-center"
      aria-label="Sign out"
      onClick={() => {
        try {
          localStorage.removeItem("currentGameId");
        } catch {}
        void signOut();
      }}
    >
      <img
        src={logoutBtnUrl}
        alt="Sign out"
        className="h-16 md:h-20 select-none"
      />
    </button>
  );
}
