// Dice box and risk buttons, next to the board.
// Attacker dice roll in the top row of the box, defender dice in the bottom row.
import type { Color } from 'chess.js';

const ANIMATION_MS = 3000; // length of roll-a-die's CSS animation
const KEEP_DICE_MS = 24 * 60 * 60 * 1000; // leave the dice showing until the next roll

export const diceSettings = { sound: true };

const $ = (id: string) => document.getElementById(id) as HTMLElement;

/** Show a prompt in the line under the dice. */
export function showDiceText(text: string): void {
  $('dice-result').textContent = text;
}

/** Enable buttons 1..max in a risk row and resolve with the number clicked. */
export function chooseRisk(side: 'attacker' | 'defender', max: number, prompt: string): Promise<number> {
  const row = $(`${side}-risk`);
  const buttons = [...row.querySelectorAll('button')];
  showDiceText(prompt);
  row.classList.add('active');
  buttons.forEach((b) => (b.disabled = Number(b.value) > max));

  return new Promise((resolve) => {
    const onClick = (e: Event) => {
      const button = (e.target as HTMLElement).closest('button');
      if (!button) return;
      row.removeEventListener('click', onClick);
      row.classList.remove('active');
      buttons.forEach((b) => (b.disabled = true));
      resolve(Number(button.value));
    };
    row.addEventListener('click', onClick);
  });
}

/** Roll both sides' dice and resolve with each side's values once the animation ends. */
export async function rollDice(attackerDice: number, defenderDice: number, attackerColor: Color) {
  // Imported lazily: roll-a-die injects its CSS on import, which needs a browser.
  // @ts-expect-error roll-a-die ships no type definitions
  const { default: rollADie } = await import('roll-a-die');
  const top = $('attacker-dice');
  const bottom = $('defender-dice');

  // Dice are coloured by chess side.
  top.dataset.color = attackerColor;
  bottom.dataset.color = attackerColor === 'w' ? 'b' : 'w';
  top.replaceChildren();
  bottom.replaceChildren();
  showDiceText('Rolling…');

  // roll-a-die clears the previous roll's dice on every call, so roll all
  // dice at once in the bottom row, then move the attacker's into the top row.
  const values = await new Promise<number[]>((resolve) =>
    rollADie({
      element: bottom,
      numberOfDice: attackerDice + defenderDice,
      callback: resolve,
      delay: KEEP_DICE_MS,
      soundVolume: diceSettings.sound ? 1 : 0,
    }),
  );
  top.append(...[...bottom.querySelectorAll('.dice-outer')].slice(0, attackerDice));
  await new Promise((r) => setTimeout(r, ANIMATION_MS));

  const highToLow = (a: number, b: number) => b - a;
  const attacker = values.slice(0, attackerDice).sort(highToLow);
  const defender = values.slice(attackerDice).sort(highToLow);
  showDiceText(defenderDice ? `Attacker ${attacker.join(' ')} · Defender ${defender.join(' ')}` : `Rolled ${attacker.join(' ')}`);
  return { attacker, defender };
}
