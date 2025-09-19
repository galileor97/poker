interface PlayingCardProps {
  card: {
    suit: "hearts" | "diamonds" | "clubs" | "spades";
    rank:
      | "3"
      | "4"
      | "5"
      | "6"
      | "7"
      | "8"
      | "9"
      | "10"
      | "J"
      | "Q"
      | "K"
      | "A"
      | "2";
  };
  isSelected?: boolean;
  onClick?: () => void;
  clickable?: boolean;
  size?: "small" | "normal" | "large";
}

export function PlayingCard({
  card,
  isSelected = false,
  onClick,
  clickable = false,
  size = "normal",
}: PlayingCardProps) {
  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case "hearts":
        return "♥";
      case "diamonds":
        return "♦";
      case "clubs":
        return "♣";
      case "spades":
        return "♠";
      default:
        return "";
    }
  };

  const getSuitColor = (suit: string) => {
    return suit === "hearts" || suit === "diamonds"
      ? "text-red-600"
      : "text-gray-800";
  };

  const getCardSize = () => {
    switch (size) {
      case "small":
        return "w-10 h-14 text-xs";
      case "large":
        return "w-20 h-28 text-base";
      default:
        return "w-16 h-24 text-sm";
    }
  };

  const getSymbolSize = () => {
    switch (size) {
      case "small":
        return "text-sm";
      case "large":
        return "text-3xl";
      default:
        return "text-2xl";
    }
  };

  const getRankDisplay = (rank: string) => {
    return rank === "10" ? "10" : rank;
  };

  return (
    <div
      className={`
        ${getCardSize()} bg-white rounded-lg border-2 shadow-md font-inter
        flex flex-col justify-between p-1 relative overflow-hidden
        ${isSelected ? "border-blue-500 bg-blue-50 transform -translate-y-3 scale-110 z-10" : "border-gray-300"}
        ${clickable ? "cursor-pointer hover:border-blue-400 hover:shadow-lg hover:-translate-y-1" : ""}
        transition-all duration-200 select-none
      `}
      onClick={clickable ? onClick : undefined}
    >
      {/* Top left corner */}
      <div
        className={`absolute top-1 left-1 flex flex-col items-center ${getSuitColor(card.suit)}`}
      >
        <div className="font-bold leading-none">
          {getRankDisplay(card.rank)}
        </div>
        <div
          className={`${size === "small" ? "text-xs" : "text-sm"} leading-none`}
        >
          {getSuitSymbol(card.suit)}
        </div>
      </div>

      {/* Center symbol */}
      <div
        className={`flex-1 flex items-center justify-center ${getSuitColor(card.suit)}`}
      >
        <div className={`${getSymbolSize()} font-bold`}>
          {getSuitSymbol(card.suit)}
        </div>
      </div>

      {/* Bottom right corner (rotated) */}
      <div
        className={`absolute bottom-1 right-1 flex flex-col items-center transform rotate-180 ${getSuitColor(card.suit)}`}
      >
        <div className="font-bold leading-none">
          {getRankDisplay(card.rank)}
        </div>
        <div
          className={`${size === "small" ? "text-xs" : "text-sm"} leading-none`}
        >
          {getSuitSymbol(card.suit)}
        </div>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute inset-0 bg-blue-200 bg-opacity-30 rounded-lg pointer-events-none" />
      )}
    </div>
  );
}
