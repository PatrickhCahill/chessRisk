# Chess Risk

*Declaration:* Vibe coded website. Game rules and page design my

A website which lets you play variants of chess inspired by the board game risk. Made for my best friend.

## Variants

- **Regular**: standard chess.
- **Chess Risk**: every capture is a dice battle (rules below).
- **Chess Zone**: Chess Risk, but the board is split into eight 4×2 zones and
  the zone decides who fights.

## Chess Risk rules

Play chess as normal until someone wants to capture a piece. When A wants to capture B's piece, the following rules apply:

1. **Count.** A's attackers are A's pieces that could legally capture on X.
   B's defenders are B's pieces that could legally recapture on X, plus the
   piece on X.
2. **Risk.** B risks 1 or 2 dice, then A risks 1 to 3, never more than
   their number of pieces.
3. **Roll.** Each side's dice are sorted and compared highest against
   highest. For each pair A wins, B loses a piece; for each other pair (ties
   included) A loses one. Each side clicks which of its counted pieces to
   lose, defender first.
4. **Result.** If A won every pair, the piece on X is one of B's losses and
   A's piece moves to X. Otherwise survivors stay put.
5. The turn always passes.

**Kings.** Losing your king loses the game. If a capture leaves the enemy
king in check, the next player must capture it (with dice). If that ends
with the king taken or still in check, its owner loses. Checkmate still wins.

**En passant.** X is the captured pawn's square; a winning pawn lands on
the usual square behind it.

**Chess Zone** counts differently: the attackers are the attacking piece
(from anywhere) plus all of A's pieces in X's zone, and the defenders are
all of B's pieces in that zone. Legal moves don't matter.
