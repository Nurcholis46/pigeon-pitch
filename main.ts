// pigeon-pitch: entry program for the make.fun bounty "Pigeon Pitch, One Line".
// It publishes a single elevator-pitch line, spoken by a city pigeon pitching
// its startup to investors, into entry.txt under the output directory.
// The bounty gate accepts UTF-8 text of 1 to 200 characters that is not only
// white space; this program checks that gate (plus the one-line shape the
// brief asks for) before writing, then reads the file back to prove the
// bytes on disk are exactly the intended line.

import { chmodSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// The pitch itself. A pigeon founder sells investors a review platform for
// the only real estate it cares about: ledges. The rating criteria (wind,
// sun, and the janitor's broom schedule) are details only a roosting bird
// would put in a pitch deck.
const pitchLine =
  "I built Yelp for ledges — 5-star roosts rated by wind, sun, and how often the janitor actually shows up with a broom.";

const maxCharacters = 200;
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const entryPath = join(outputDir, "entry.txt");

// Count Unicode code points, not UTF-16 code units, so an em dash or any
// other wide character counts once, the way the gate counts characters.
function characterCount(text: string): number {
  return [...text].length;
}

// Refuse to publish anything the gate would reject: wrong length, blank
// text, more than one line, or stray whitespace at either end.
function checkGate(text: string): void {
  const count = characterCount(text);
  if (count < 1 || count > maxCharacters) {
    throw new Error(`gate: line has ${count} characters, allowed 1-${maxCharacters}`);
  }
  if (text.trim().length === 0) {
    throw new Error("gate: line is only white space");
  }
  if (text.includes("\n") || text.includes("\r")) {
    throw new Error("gate: line must be a single line");
  }
  if (text !== text.trim()) {
    throw new Error("gate: line has leading or trailing white space");
  }
}

// Write the line with mode 0644 so the collector (a different user than the
// one running this program) can read it, then verify both the mode and the
// exact content by reading the file back.
function publishEntry(text: string): void {
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(entryPath, text, { encoding: "utf8", mode: 0o644 });
  chmodSync(entryPath, 0o644);

  const onDiskMode = statSync(entryPath).mode & 0o777;
  if (onDiskMode !== 0o644) {
    throw new Error(`mode: ${entryPath} is ${onDiskMode.toString(8)}, expected 644`);
  }

  const readBack = readFileSync(entryPath, "utf8");
  if (readBack !== text) {
    throw new Error("read-back: file content differs from the intended line");
  }
  // The em dash makes bytes and characters differ; assert both so a silent
  // encoding change on disk is caught here instead of at the gate.
  const expectedBytes = Buffer.byteLength(text, "utf8");
  const actualBytes = statSync(entryPath).size;
  if (actualBytes !== expectedBytes) {
    throw new Error(`read-back: file is ${actualBytes} bytes, expected ${expectedBytes}`);
  }
}

function main(): void {
  checkGate(pitchLine);
  publishEntry(pitchLine);
  console.log(`wrote ${characterCount(pitchLine)} characters to ${entryPath}`);
}

main();
