// Pure game logic: no DOM access.
import type { Chess, Color, Square } from 'chess.js';
import { ChessRisk, VARIANTS, type VariantName } from './variants';

export type GameStatus = 'playing' | 'check' | 'take-king' | 'checkmate' | 'king-lost' | 'stalemate' | 'draw';
export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

export interface MoveInput {
  from: Square;
  to: Square;
  promotion?: PromotionPiece;
}

// Our own move history. Chess Risk edits the board directly, which chess.js's
// history can't record, so each turn stores the position after it.
export interface Turn {
  san: string;
  from: Square;
  to: Square;
  fen: string;
}

export interface GameState {
  chess: Chess;
  variant: VariantName;
  turns: Turn[];
  status: GameStatus;
}

export function createGame(variant: VariantName = 'regular', turns: Turn[] = []): GameState {
  const state: GameState = { chess: new VARIANTS[variant].Game(), variant, turns, status: 'playing' };
  goTo(state, turns.at(-1)?.fen);
  return state;
}

/** Load a position (or the start position) and refresh the status. */
function goTo(state: GameState, fen?: string): void {
  if (fen) state.chess.load(fen, { skipValidation: true });
  else state.chess.reset();
  state.status = computeStatus(state.chess);
}

const hasKing = (chess: Chess, color: Color) => chess.findPiece({ type: 'k', color }).length > 0;

function computeStatus(chess: Chess): GameStatus {
  if (!hasKing(chess, 'w') || !hasKing(chess, 'b')) return 'king-lost';
  if (chess instanceof ChessRisk && chess.kingToTake()) return 'take-king';
  // Uses moves() rather than isCheckmate(), so a variant's move rules count.
  if (chess.moves().length === 0) return chess.inCheck() ? 'checkmate' : 'stalemate';
  if (chess.isDraw()) return 'draw';
  if (chess.inCheck()) return 'check';
  return 'playing';
}

export function isGameOver(state: GameState): boolean {
  return ['checkmate', 'king-lost', 'stalemate', 'draw'].includes(state.status);
}

export function lastMove(state: GameState): Square[] {
  const last = state.turns.at(-1);
  return last ? [last.from, last.to] : [];
}

/** Can the side to move pick up this piece (e.g. 'wP')? */
export function canPickUp(state: GameState, piece: string): boolean {
  return !isGameOver(state) && piece.startsWith(state.chess.turn());
}

function findMove(state: GameState, from: Square, to: Square) {
  return state.chess.moves({ square: from, verbose: true }).find((m) => m.to === to);
}

/** Does moving from -> to require choosing a promotion piece? */
export function needsPromotion(state: GameState, from: Square, to: Square): boolean {
  return !!findMove(state, from, to)?.promotion;
}

/** In Chess Risk, the pieces that count for a capture from -> to. Otherwise null. */
export function riskPieces(state: GameState, from: Square, to: Square) {
  const { chess } = state;
  const move = findMove(state, from, to);
  return chess instanceof ChessRisk && move?.captured ? chess.riskPieces(move) : null;
}

function addTurn(state: GameState, san: string, from: Square, to: Square): void {
  state.turns.push({ san, from, to, fen: state.chess.fen() });
  state.status = computeStatus(state.chess);
}

/** Apply a move if legal. Returns false if illegal. */
export function tryMove(state: GameState, input: MoveInput): boolean {
  try {
    const move = state.chess.move(input); // throws on illegal moves
    addTurn(state, move.san, move.from, move.to);
    return true;
  } catch {
    return false;
  }
}

/** Apply the outcome of a Chess Risk capture. */
export function settleCapture(state: GameState, input: MoveInput, won: boolean, lost: Square[]): void {
  const move = state.chess.moves({ square: input.from, verbose: true })
    .find((m) => m.to === input.to && m.promotion === input.promotion);
  if (!move || !(state.chess instanceof ChessRisk)) return;
  state.chess.settle(move, won, lost);
  addTurn(state, move.san + (won ? '✓' : '✗'), move.from, move.to);
}

export function undo(state: GameState): void {
  state.turns.pop();
  goTo(state, state.turns.at(-1)?.fen);
}

export function statusText(state: GameState): string {
  const { chess } = state;
  const toMove = chess.turn() === 'w' ? 'White' : 'Black';
  const justMoved = toMove === 'White' ? 'Black' : 'White';
  switch (state.status) {
    case 'checkmate':
      return `Checkmate: ${justMoved} wins`;
    case 'king-lost':
      return hasKing(chess, 'w') ? 'Black lost their king: White wins' : 'White lost their king: Black wins';
    case 'stalemate':
      return 'Stalemate: draw';
    case 'draw':
      if (chess.isThreefoldRepetition()) return 'Draw by threefold repetition';
      if (chess.isInsufficientMaterial()) return 'Draw by insufficient material';
      return 'Draw by the fifty-move rule';
    case 'take-king':
      return `${toMove} must capture the ${justMoved.toLowerCase()} king!`;
    case 'check':
      return `${toMove} to move: check!`;
    default:
      return `${toMove} to move`;
  }
}
