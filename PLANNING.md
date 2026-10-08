# Chess Risk: Planning

## Goal
A static, local website where two people play chess on one screen (hot-seat). The eventual goal is variants, starting with "Chess Risk", where captures are settled by a Risk-style dice roll (see `readme.md`). **Milestone 1 is standard chess.**

## Decisions
| Topic | Decision | Why |
|---|---|---|
| Framework | **Astro**, static output | Each page is a file in `src/pages/`, so variant pages are cheap to add. Builds to a plain `dist/` folder. |
| UI framework | **None.** Vanilla TS in Astro `<script>` tags | The UI is small: board, status, move list, buttons. Preact or Svelte islands can be added later if needed. |
| State management | **No library.** A `GameState` object, functions that update it, and a `render()` | chess.js owns the position. The rest is a few fields. |
| Language | TypeScript (`astro/tsconfigs/strict`) | |
| Rules | `chess.js` v1 | It throws on illegal moves, which `tryMove` wraps. |
| Board | `chessboard-element` (Web Component) behind `src/lib/board.ts` | Swapping to chessground or cm-chessboard later only touches the adapter. |

**Astro gotcha:** chessboard-element registers a custom element, so it can only be imported from client `<script>` code, never from component frontmatter (`---`), which runs at build time.

## Layout
```
src/
  pages/index.astro             html shell + header
  components/ChessGame.astro    board, side panel, variant dropdown, promotion dialog, client script
  lib/game.ts                   pure game logic (no DOM)
  lib/variants.ts               one class per variant, each extends chess.js Chess
  lib/dice.ts                   dice box + risk buttons (roll-a-die)
  lib/board.ts                  <chess-board> adapter: drag/drop events, setPosition, flip, highlight
  styles/global.css             theme colours, base elements, page layout
  styles/board.css              board, board column, promotion dialog
  styles/dice.css               dice box and risk buttons
  styles/panel.css              side panel
  styles/rules.css              rules card
```
Styling hooks: the CSS variables in `global.css` and `board.css` feed chessboard-element's `--light-color`, `--dark-color` and `--highlight-color`. Squares are also exposed as `::part(white|black|highlight|<square>)`.

## Running
- `npm run dev` starts the dev server at http://localhost:4321
- `npm run check` runs the TypeScript/Astro type check
- `npm run build && npm run preview` builds the static site and serves it

`dist/index.html` can't be opened directly from disk (`file://`), because browsers block ES modules there. Serve it instead, e.g. `npm run preview` or `python3 -m http.server -d dist`.

## Milestone 1 (standard chess): done
Drag-and-drop moves with legality checks, turn enforcement, promotion picker, last-move highlight, check/mate/stalemate/draw status, SAN move list, Undo / Flip / New game, and the game saved to `localStorage`.

## Variants
**Architecture (decided).** Each variant is a class in `src/lib/variants.ts` that extends chess.js's `Chess` and overrides only what it changes. Regular chess is an empty class. Captures in Chess Risk need the players' input, so `ChessGame.astro` runs that flow and `ChessRisk.settle()` applies the result.

**Chess Risk decisions** (rules in `chess_risk.md`):
- nA = A's pieces with a legal capture on X. nB = B's pieces that could legally capture an A knight placed on X, plus the piece on X.
- En passant: X is the captured pawn's square; a winning pawn lands on the usual square behind it.
- Order: B picks dice, then A; A's click rolls. Dice compared high to high; ties go to the defender.
- Lost pieces are clicked on the board, defender first. If A wins every pair, the piece on X is one of B's losses and A's piece moves to X.
- The turn always passes. Losing your king loses the game.
- A player who can capture the enemy king must do so (e.g. after a failed escape from check). If that capture ends with the king still in check, or taken, its owner loses.
- Checkmate still ends the game.

**Technical notes:**
- `GameState.turns` stores the FEN after every turn. Undo and saving use it, because Chess Risk rewrites the board with `load()`, which wipes chess.js's history. Side effect: threefold repetition only counts positions since the last undo or page reload.
- Testing: add Vitest for `game.ts` and variant logic.
