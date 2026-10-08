// Thin adapter around <chess-board> (chessboard-element). Everything else talks
// to this interface, so the board library can be swapped by changing this file.
// Must only be imported from client-side <script> code (it defines a custom element).
import 'chessboard-element';
import type { ChessBoardElement } from 'chessboard-element';

export interface BoardHandlers {
  /** Return false to block picking up the piece (e.g. 'wP'). */
  canPickUp(piece: string, square: string): boolean;
  /** Return true if the move was accepted; false snaps the piece back. */
  onMove(from: string, to: string): boolean;
  /** Called after a drop animation finishes, so the board can be resynced. */
  onSettled(): void;
  /** Called when a square is clicked or tapped (without dragging). */
  onClick(square: string): void;
}

export interface Board {
  setPosition(fen: string, animate?: boolean): void;
  flip(): void;
  highlight(squares: string[]): void;
  /** Tint squares the player may click (e.g. pieces they can choose to lose). */
  mark(squares: string[]): void;
}

export function createBoard(el: ChessBoardElement, handlers: BoardHandlers): Board {
  el.addEventListener('drag-start', (e) => {
    const { source, piece } = (e as CustomEvent<{ source: string; piece: string }>).detail;
    if (!handlers.canPickUp(piece, source)) e.preventDefault();
  });

  el.addEventListener('drop', (e) => {
    type DropDetail = { source: string; target: string; setAction(a: 'snapback' | 'drop'): void };
    const { source, target, setAction } = (e as unknown as CustomEvent<DropDetail>).detail;
    if (source === target || target === 'offboard' || !handlers.onMove(source, target)) {
      setAction('snapback');
    }
  });

  // Castling, en passant and promotion change more than the dragged piece.
  el.addEventListener('snap-end', () => handlers.onSettled());

  // Taps and clicks on squares. Pointer events rather than 'click': the board
  // calls preventDefault() on touchstart over a piece, which stops iOS from
  // ever sending a click. A tap is a press and release on the same square.
  // Squares carry a data-square attribute inside the board's shadow DOM.
  const squareOf = (e: Event) =>
    (e.composedPath().find((n) => n instanceof HTMLElement && n.dataset.square) as HTMLElement | undefined)?.dataset
      .square;
  let pressed: string | undefined;
  el.addEventListener('pointerdown', (e) => (pressed = squareOf(e)));
  el.addEventListener('pointerup', (e) => {
    const square = squareOf(e);
    if (square && square === pressed) handlers.onClick(square);
    pressed = undefined;
  });

  // Squares expose a shadow part named after themselves (e.g. ::part(e4)),
  // so highlighting is a generated stylesheet rule.
  const tint = (color: string) => {
    const style = document.createElement('style');
    document.head.append(style);
    return (squares: string[]) => {
      style.textContent = squares.length
        ? `${squares.map((s) => `chess-board::part(${s})`).join(', ')} { box-shadow: inset 0 0 0 100vmax var(${color}); }`
        : '';
    };
  };
  const highlight = tint('--last-move');
  const mark = tint('--pick');

  return {
    setPosition(fen, animate = true) {
      el.setPosition(fen, animate);
    },
    flip() {
      el.flip();
    },
    highlight,
    mark,
  };
}
