# These are the rules to chess risk.
It is the same as normal chess except when a piece is capture.

Let player B have a piece on square X. Let player A have at least one piece that can move to X.

When player A moves their piece to capture an opponents piece we do the following:
1. Count all of A's pieces that could move to X. Call this number nA (nA \ge 1)
2. Count all of B's piece that could move to X. Add 1 for the existing piece. Call this nB (nB \ge 1).
3. B then chooses to risk a number up to rB := min(nB, 2)
4. A then chooses to risk a number up to rA := min(nA, 3)
5. A roles rA dice.
6. B roles rB dice.
7. The dice are sorted and placed in order. For every dice rA_i > rB_i, B must choose to lose a defender (they get to decide which piece is lost).
8. For every dice rB_i > rA_i the same happens for A.
9. If all of rA_i > rB_i for all i, then A's piece moves to X.
10. Else: all surviving pieces stay where they are. (If B nominated the piece on X to be lost, X is empty).