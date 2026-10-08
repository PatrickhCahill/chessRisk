// Each variant is a chess.js game with some rules overridden.
// The rest of the app only calls chess.moves() / chess.move(), so it never
// needs to know which variant is being played.
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';

class Regular extends Chess {} // standard chess: changes nothing

// class Different extends Chess {
//   // Pawns can't advance two squares.
//   override moves({ verbose = false, square, piece }: { verbose?: boolean; square?: Square; piece?: PieceSymbol } = {}): any {
//     const moves = super.moves({ square, piece, verbose: true }).filter((m) => !m.isBigPawn());
//     return verbose ? moves : moves.map((m) => m.san);
//   }

//   override move(...args: Parameters<Chess['move']>) {
//     const move = super.move(...args);
//     if (move.isBigPawn()) {
//       this.undo();
//       throw new Error(`Illegal move in this variant: ${move.san}`);
//     }
//     return move;
//   }
// }

// class Dice extends Chess {
//   // Captures roll a die. For now the roll is only shown, not used.
//   override move(...args: Parameters<Chess['move']>) {
//     const move = super.move(...args);
//     if (move.captured) void rollDice(1, 0, move.color);
//     return move;
//   }
// }

/** The square of the piece being captured. For en passant it is not the square moved to. */
function captureSquare(move: Move): Square {
  return move.isEnPassant() ? ((move.to[0] + move.from[1]) as Square) : move.to;
}

/** The distinct pieces among these moves that capture on square x. */
function piecesTaking(moves: Move[], x: Square): Square[] {
  return [...new Set(moves.filter((m) => m.captured && captureSquare(m) === x).map((m) => m.from))];
}

const other = (color: Color): Color => (color === 'w' ? 'b' : 'w');

export class ChessRisk extends Chess {
  // Captures are settled by dice; see chess_risk.md.

  /** The enemy king's square, if the side to move can capture it (it must, see moves()). */
  kingToTake(): Square | null {
    const [king] = this.findPiece({ type: 'k', color: other(this.turn()) });
    return king && this.isAttacked(king, this.turn()) ? king : null;
  }

  // A player who can capture the enemy king is obliged to.
  override moves({ verbose = false, square, piece }: { verbose?: boolean; square?: Square; piece?: PieceSymbol } = {}): any {
    const king = this.kingToTake();
    const moves = super.moves({ square, piece, verbose: true }).filter((m) => !king || m.to === king);
    return verbose ? moves : moves.map((m) => m.san);
  }

  /** The captured square x, and the attacker's (A) and defender's (B) pieces that count for it. */
  riskPieces(move: Move): { x: Square; attackers: Square[]; defenders: Square[] } {
    const x = captureSquare(move);
    const attackers = piecesTaking(this.moves({ verbose: true }), x);

    // Defenders: pretend x holds an attacking knight and find the defender's
    // pieces that could legally take it, plus the piece on x itself.
    const pretend = new Chess(this.fen(), { skipValidation: true });
    pretend.remove(x);
    pretend.put({ type: 'n', color: move.color }, x);
    const fen = pretend.fen().split(' ');
    fen[1] = other(move.color); // defender to move
    fen[3] = '-'; // no en passant
    pretend.load(fen.join(' '), { skipValidation: true });
    const defenders = [x, ...piecesTaking(pretend.moves({ verbose: true }), x)];

    return { x, attackers, defenders };
  }

  /**
   * Apply a dice capture: remove the lost pieces, move the attacker in if it won
   * every pair, then pass the turn.
   */
  settle(move: Move, won: boolean, lost: Square[]): void {
    const defender = other(move.color);
    const attackedKing = this.get(captureSquare(move))?.type === 'k';

    for (const square of lost) this.remove(square);
    if (won) {
      this.remove(move.from);
      this.put({ type: move.promotion ?? move.piece, color: move.color }, move.to);
    }
    // After an attempt on the king, a king still in check is taken.
    const [king] = this.findPiece({ type: 'k', color: defender });
    if (attackedKing && king && this.isAttacked(king, move.color)) this.remove(king);

    const fen = this.fen().split(' ');
    fen[1] = defender;
    fen[2] = this.castlingStillPossible(fen[2]);
    fen[3] = '-'; // no en passant
    fen[4] = '0'; // halfmove clock resets on a capture
    if (move.color === 'b') fen[5] = String(Number(fen[5]) + 1);
    this.load(fen.join(' '), { skipValidation: true });
  }

  /** Keep only the castling rights (e.g. 'KQkq') whose king and rook are still on their home squares. */
  private castlingStillPossible(rights: string): string {
    const kept = [...rights].filter((right) => {
      const color = right === right.toUpperCase() ? 'w' : 'b';
      const rank = color === 'w' ? '1' : '8';
      const rook = this.get(((right.toLowerCase() === 'k' ? 'h' : 'a') + rank) as Square);
      const king = this.get(('e' + rank) as Square);
      return king?.type === 'k' && king.color === color && rook?.type === 'r' && rook.color === color;
    });
    return kept.join('') || '-';
  }
}

// Each variant's label, class, and the rules shown under the board.
/** The 4×2 zone (files a–d or e–h, ranks 1–2, 3–4, 5–6 or 7–8) that contains a square. */
function zoneOf(square: Square): Square[] {
  const files = square[0] <= 'd' ? 'abcd' : 'efgh';
  const bottom = Math.floor((Number(square[1]) - 1) / 2) * 2 + 1;
  return [...files].flatMap((file) => [`${file}${bottom}`, `${file}${bottom + 1}`] as Square[]);
}

class ChessZone extends ChessRisk {
  // Like Chess Risk, but the pieces that count are those in the captured piece's zone.
  // The attacking piece always counts, wherever it came from.
  override riskPieces(move: Move): { x: Square; attackers: Square[]; defenders: Square[] } {
    const x = captureSquare(move);
    const inZone = (color: Color) => zoneOf(x).filter((s) => this.get(s)?.color === color);
    return {
      x,
      attackers: [move.from, ...inZone(move.color).filter((s) => s !== move.from)],
      defenders: [x, ...inZone(other(move.color)).filter((s) => s !== x)],
    };
  }
}

// Rules shared by Chess Risk and Chess Zone, shown after each one's counting rules.
const DICE_RULES = [
  'The defender risks 1 or 2 dice, then the attacker risks 1, 2 or 3, never more than their number of pieces.',
  'Dice are sorted and compared highest against highest. For every pair the attacker wins, the defender loses a piece. For every other pair, ties included, the attacker loses one.',
  'Each side clicks which of its pieces to lose, defender first.',
  'If the attacker wins every pair, the captured piece is one of the losses and the attacking piece moves in. Otherwise surviving pieces stay where they are.',
  "En passant: the captured pawn's square is the one fought over. A winning pawn lands on the usual square behind it.",
  'The turn always passes, whether or not the capture succeeded.',
  'If the enemy king is left in check, you must capture it. If that capture ends with the king taken or still in check, its owner loses.',
  'Losing your king loses the game. Checkmate still wins.',
];

export const VARIANTS = {
  regular: {
    label: 'Regular',
    Game: Regular,
    intro: 'Standard chess rules.',
    rules: [],
  },
  // different: {
  //   label: 'Different',
  //   Game: Different,
  //   intro: 'Standard chess, except pawns can never advance two squares, even on their first move.',
  //   rules: ['Since no pawn makes a two-square move, en passant never happens.'],
  // },
  // dice: {
  //   label: 'Dice',
  //   Game: Dice,
  //   intro: 'Standard chess, but every capture rolls a die.',
  //   rules: ['The roll is only for show: captures always succeed.'],
  // },
  risk: {
    label: 'Chess Risk',
    Game: ChessRisk,
    intro: 'Standard chess, except every capture is settled by a Risk-style dice roll.',
    rules: [
      'When you capture a piece on a square, you are the attacker and its owner is the defender.',
      "The attacker's pieces are all of theirs that could legally capture on that square. The defender's pieces are the piece being captured plus all of theirs that could legally recapture there.",
      ...DICE_RULES,
    ],
  },
  zone: {
    label: 'Chess Zone',
    Game: ChessZone,
    intro: 'Like Chess Risk, but the board is split into 8 coloured zones, and the zone decides who joins a fight.',
    rules: [
      'Each zone is 4 squares wide and 2 tall.',
      'When you capture a piece, you are the attacker and its owner is the defender. The fight is over the zone the captured piece is in.',
      "The attacker's pieces are the attacking piece, wherever it came from, plus all of the attacker's pieces in that zone, even ones that couldn't legally make the capture.",
      "The defender's pieces are all of the defender's pieces in that zone, including the one being captured.",
      ...DICE_RULES,
    ],
  },
};
export type VariantName = keyof typeof VARIANTS;
