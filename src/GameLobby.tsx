import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";
import logoUrl from "@assets/LOGOS.svg";
import playBtnUrl from "@assets/play_button 2.svg";
import playRoomBtnUrl from "@assets/play_room_button01.svg";

interface GameLobbyProps {
  onJoinGame: (gameId: Id<"games">) => void;
}

export function GameLobby({ onJoinGame }: GameLobbyProps) {
  const games = useQuery(api.games.listGames) || [];
  const createGame = useMutation(api.games.createGame);
  const joinGame = useMutation(api.games.joinGame);

  const handleCreateGame = async () => {
    try {
      const gameId = await createGame({});
      onJoinGame(gameId);
      toast.success("Game created!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create game"
      );
    }
  };

  const handleJoinGame = async (gameId: Id<"games">) => {
    try {
      await joinGame({ gameId });
      onJoinGame(gameId);
      toast.success("Joined game!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to join game"
      );
    }
  };

  return (
    <div className="text-white">
      <div className="text-center mb-8">
        <div className="flex justify-center -mb-5">
          <img
            src={logoUrl}
            alt="Big Two"
            className="h-16 md:h-80 select-none"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className=" rounded-lg p-6 border bg-gradient-to-t from-green-800 to-green-900/10 border-white/20">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-black">
            🎮 Play
          </h2>
          <p className="text-green-100 mb-6 font-inter">
            Start a new Big Two game and invite up to 3 other players to join
            you. The game will start once at least 2 players have joined.
          </p>
          <button
            onClick={handleCreateGame}
            className="w-full flex items-center justify-center"
            aria-label="Play"
          >
            <img
              src={playBtnUrl}
              alt="Play"
              className="h-20 md:h-80 select-none"
            />
          </button>
        </div>

        <div className=" rounded-lg p-6 border border-white/20">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            🚪 Play Room
          </h2>
          {games.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-green-100 mb-4">
                No games available right now.
              </p>
              <p className="text-green-200 text-sm">
                Be the first to create one!
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {games.map((game) => (
                <div
                  key={game._id}
                  className=" rounded-lg p-4 flex justify-between items-center border border-white/10 hover:border-white/30 transition-colors"
                >
                  <div>
                    <p className="font-medium">Game #{game._id.slice(-6)}</p>
                    <p className="text-sm text-green-100">
                      {game.playerCount}/4 players
                    </p>
                    {Array.isArray(game.playerUsernames) && (
                      <p className="text-xs text-green-200 truncate max-w-[240px]">
                        {game.playerUsernames.join(", ")}
                      </p>
                    )}
                    <p className="text-xs text-green-200">
                      Created {new Date(game.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleJoinGame(game._id)}
                    disabled={game.playerCount >= 4}
                    aria-label="Play Room"
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <img
                      src={playRoomBtnUrl}
                      alt="Play Room"
                      className="h-16 md:h-80 select-none"
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* <div className=" rounded-lg p-6 border border-white/20">
        <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          📚 How to Play Big Two
        </h3>
        <div className="grid md:grid-cols-2 gap-6 text-green-100">
          <div>
            <h4 className="font-semibold text-white mb-2">🎯 Objective</h4>
            <p className="text-sm mb-4">
              Be the first player to play all your cards and win the round!
            </p>

            <h4 className="font-semibold text-white mb-2">🃏 Card Rankings</h4>
            <div className="text-sm space-y-1">
              <p>
                <strong>Ranks:</strong> 3 (lowest) → 4, 5, 6, 7, 8, 9, 10, J, Q,
                K, A, 2 (highest)
              </p>
              <p>
                <strong>Suits:</strong> ♦ (lowest) → ♣ → ♥ → ♠ (highest)
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-2">🎮 Gameplay</h4>
            <div className="text-sm space-y-1">
              <p>• Player with 3♦ starts the first round</p>
              <p>• Play singles, pairs, triples, or special combinations</p>
              <p>• You must beat the previous play or pass your turn</p>
              <p>• When all others pass, you can play any valid combination</p>
              <p>• First to empty their hand wins!</p>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-900/30 rounded-lg">
          <h4 className="font-semibold text-blue-200 mb-2">💡 Pro Tips</h4>
          <div className="text-sm text-blue-100 space-y-1">
            <p>• Save your 2s (highest cards) for crucial moments</p>
            <p>• Try to get rid of low cards early in the game</p>
            <p>• Watch what other players pass on to learn their hands</p>
            <p>• Straights and flushes can be powerful but hard to make</p>
          </div>
        </div>
      </div> */}
    </div>
  );
}
