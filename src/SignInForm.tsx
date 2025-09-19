"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";
import loginBtnUrl from "@assets/login_button 2.svg";
import registerBtnUrl from "@assets/register_button 1.svg";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const setUsername = useMutation(api.auth.setUsername);
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);
  // Guest UI is moved to GuestSignIn component

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
    <div className="w-full">
      <form
        className="flex flex-col gap-form-field"
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          const formData = new FormData(e.target as HTMLFormElement);
          formData.set("flow", flow);
          try {
            await signIn("password", formData);
            // If this was a sign up and a username was provided, set display name
            if (flow === "signUp") {
              const username = (formData.get("username") as string | null)?.trim();
              if (username && username.length > 0) {
                await attemptSetUsername(username);
              }
            }
          } catch (error: any) {
            const msg = error?.message || (typeof error === "string" ? error : "Authentication failed");
            toast.error(msg);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <input
          className="auth-input-field"
          type="email"
          name="email"
          placeholder="Email"
          required
        />
        <input
          className="auth-input-field !text-black placeholder:!text-black/60 caret-black"
          type="password"
          name="password"
          placeholder="Password"
          required
        />
        {flow === "signUp" && (
          <input
            className="auth-input-field"
            type="text"
            name="username"
            placeholder="Username"
            required
          />
        )}
        <button
          className="w-full flex items-center justify-center"
          type="submit"
          aria-label={flow === "signIn" ? "Sign in" : "Sign up"}
          disabled={submitting}
        >
          <img
            src={flow === "signIn" ? loginBtnUrl : registerBtnUrl}
            alt={flow === "signIn" ? "Sign in" : "Sign up"}
            className="w-full max-w-xs select-none"
          />
        </button>
        <div className="text-center text-sm text-secondary">
          <span>
            {flow === "signIn"
              ? "Don't have an account? "
              : "Already have an account? "}
          </span>
          <button
            type="button"
            className="text-primary hover:text-primary-hover hover:underline font-medium cursor-pointer -mt-10"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          >
            {flow === "signIn" ? "Sign up instead" : "Sign in instead"}
          </button>
        </div>
      </form>
      {/* Guest login UI moved to separate right column */}
    </div>
  );
}
