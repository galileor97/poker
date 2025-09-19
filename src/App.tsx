import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { GameLobby } from "./GameLobby";
import { GameBoard } from "./GameBoard";
import { useEffect, useState } from "react";
import { Id } from "../convex/_generated/dataModel";
import backgroundUrl from "@assets/background.svg";
import logoUrl from "@assets/LOGOS.svg";
import { GuestSignIn } from "./GuestSignIn";

export default function App() {
  const [currentGameId, setCurrentGameId] = useState<Id<"games"> | null>(null);

  // Restore selected game on refresh
  useEffect(() => {
    const saved = localStorage.getItem("currentGameId");
    if (saved) {
      setCurrentGameId(saved as Id<"games">);
    }
  }, []);

  // Persist or clear selection
  useEffect(() => {
    if (currentGameId) {
      localStorage.setItem("currentGameId", currentGameId as string);
    } else {
      localStorage.removeItem("currentGameId");
    }
  }, [currentGameId]);

  return (
    <div className="min-h-screen h-screen overflow-hidden flex flex-col relative">
      <img
        src={backgroundUrl}
        alt=""
        aria-hidden="true"
        className="fixed inset-0 -z-10 w-full h-full object-cover"
      />
      <div className="absolute top-4 right-4 z-10">
        <SignOutButton />
      </div>
      <main className="flex-1 p-4 overflow-hidden">
        <Content
          currentGameId={currentGameId}
          setCurrentGameId={setCurrentGameId}
        />
      </main>
      <Toaster />
    </div>
  );
}

function Content({
  currentGameId,
  setCurrentGameId,
}: {
  currentGameId: Id<"games"> | null;
  setCurrentGameId: (id: Id<"games"> | null) => void;
}) {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Authenticated>
        {currentGameId ? (
          <GameBoard
            gameId={currentGameId}
            onLeave={() => setCurrentGameId(null)}
          />
        ) : (
          <GameLobby onJoinGame={setCurrentGameId} />
        )}
      </Authenticated>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="flex justify-center -mb-5">
            <img
              src={logoUrl}
              alt="Big Two"
              className="h-16 md:h-80 select-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl items-start mt-6">
            <div className=" rounded-lg max-w-md mx-auto w-full">
              <SignInForm />
            </div>
            <div className=" rounded-lg max-w-md mx-auto w-full">
              <GuestSignIn />
            </div>
          </div>
        </div>
      </Unauthenticated>
    </div>
  );
}
