const COLORS = ['#B0F280', '#9D4EDD', '#F59E0B', '#06D6A0', '#FF6B35', '#E63946'];

const PIECES = Array.from({ length: 28 }, (_, index) => ({
  left: (index * 37) % 100,
  delay: (index % 7) * 0.18,
  duration: 2.4 + (index % 5) * 0.35,
  color: COLORS[index % COLORS.length],
  size: 6 + (index % 3) * 3,
}));

/** Purely decorative victory rain, hidden from assistive tech and reduced-motion users. */
export default function Confetti() {
  return (
    <div aria-hidden="true" className="confetti-layer">
      {PIECES.map((piece, index) => (
        <span
          key={index}
          className="confetti-piece"
          style={{
            left: `${piece.left}%`,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
