import { debugLog } from "$lib/logger";

/**
 * @param {number} c Value from 0 to 1 (R, G, or B)
 * @returns {number} Linear sRGB value
 */
export function sRgbToLinear(c: number): number {
  if (c <= 0.04045) {
    return c / 12.92;
  }
  return Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Converts Linear RGB (0-1) to XYZ (D65)
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {number[]} [X, Y, Z]
 */
export function linearRgbToXyz(r: number, g: number, b: number): number[] {
  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const z = r * 0.0193339 + g * 0.119192 + b * 0.9503041;
  return [x, y, z];
}

/**
 * Converts XYZ (D65) to OKLab (Intermediate step)
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {number[]} [L, a, b]
 */
export function xyzToOkLab(x: number, y: number, z: number): number[] {
  // XYZ to LMS (D65) transformation
  const lmsL = x * 0.8189022 + y * 0.3618413 + z * -0.124081;
  const lmsM = x * 0.0329813 + y * 0.9215505 + z * 0.0457684;
  const lmsS = x * 0.0482043 + y * 0.2643663 + z * 0.6338517;

  // Apply cubic root (cube root)
  const l_ = Math.cbrt(lmsL);
  const m_ = Math.cbrt(lmsM);
  const s_ = Math.cbrt(lmsS);

  // OKLab (L, a, b) calculation
  const L = 0.2104542326 * l_ + 0.793617785 * m_ + -0.0040720468 * s_;
  const a = 1.9779984951 * l_ + -2.4285920366 * m_ + 0.4505935415 * s_;
  const b = 0.0259083637 * l_ + 0.7827717665 * m_ + -0.8086810287 * s_;

  return [L, a, b];
}

/**
 * Converts OKLab to OKLCH
 * @param {number} L OKLab Lightness (0-1)
 * @param {number} a OKLab a-axis
 * @param {number} b OKLab b-axis
 * @returns {number[]} [L, C, H]
 */
export function okLabToOklch(L: number, a: number, b: number): number[] {
  const C = Math.sqrt(a * a + b * b);
  let H = Math.atan2(b, a) * (180 / Math.PI);

  // Ensure Hue is positive (0 to 360)
  if (H < 0) {
    H += 360;
  }

  // Return L as percentage (0-100), C as is, H as degrees (0-360)
  return [L * 100, C, H];
}

/**
 * Main conversion export function: RGB (0-255) to OKLCH (L:0-100, C:0-~0.4, H:0-360)
 * @param {number} r Red (0-255)
 * @param {number} g Green (0-255)
 * @param {number} b Blue (0-255)
 * @returns {number[]} [L, C, H]
 */
export function rgbToOklch(r: number, g: number, b: number): number[] {
  // Normalize to 0-1 range
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;

  // 1. sRGB to Linear RGB
  const lr = sRgbToLinear(nr);
  const lg = sRgbToLinear(ng);
  const lb = sRgbToLinear(nb);

  // 2. Linear RGB to XYZ
  const [x, y, z] = linearRgbToXyz(lr, lg, lb);

  // 3. XYZ to OKLab
  const [okl, oka, okb] = xyzToOkLab(x, y, z);

  // 4. OKLab to OKLCH
  return okLabToOklch(okl, oka, okb);
}

/**
 * Extracts L, C, H from an oklch() string, rotates the Hue by 180 degrees,
 * and returns the new oklch() color string.
 * @param {string} oklchString - The color string from CSS, e.g., "oklch(60% 0.15 210.5)"
 * @param {number} addHue - The amount to rotate the hue by
 * @returns {string} The new rotated color string.
 */
export function rotateOklchHue(
  oklchString: string,
  addHue: number = 180,
): string {
  // 1. Extract L, C, H values
  // This regex looks for number/percentage groups within the parentheses
  const matches = oklchString.match(/([\d.]+%?)\s+([\d.]+)\s+([\d.]+)/);

  if (!matches || matches.length < 4) {
    debugLog("error", "Failed to parse oklch string:", oklchString);
    return oklchString; // Return original if parsing fails
  }

  const lightness = matches[1]; // L (e.g., "60%")
  const chroma = matches[2]; // C (e.g., "0.15")
  const hue = parseFloat(matches[3]); // H (e.g., 210.5)

  // 2. Apply 180 degree rotation and wrap around 360
  const rotatedHue = (hue + addHue) % 360;

  // 3. Reconstruct the new oklch string
  return `oklch(${lightness} ${chroma} ${rotatedHue.toFixed(2)})`;
}

/**
 * Parses an OKLCH color string (e.g., 'oklch(60% 0.15 240)') into its numerical components
 * and the original Lightness string format (e.g., "60%").
 *
 * @param oklchString The color string from CSS.
 * @returns An object containing the parsed components and original lightness string, or null if parsing fails.
 */
export function parseOklch(
  oklchString: string,
): { l: number; c: number; h: number; lightnessStr: string } | null {
  // Regex to match L, C, H values within oklch() parentheses
  const matches = oklchString.match(/([\d.]+%?)\s+([\d.]+)\s+([\d.]+)/);

  if (!matches || matches.length < 4) {
    // debugLog("error", "Failed to parse oklch string:", oklchString);
    return null;
  }

  const lightnessStr = matches[1]; // L as string (e.g., "60%")
  const chroma = parseFloat(matches[2]); // C as number
  const hue = parseFloat(matches[3]); // H as number

  // Convert lightness string to a 0-100 number for math.
  // Assumes percentage if '%' is present, otherwise assumes 0-100 number.
  const l = lightnessStr.endsWith("%")
    ? parseFloat(lightnessStr.slice(0, -1))
    : parseFloat(lightnessStr);

  return { l, c: chroma, h: hue, lightnessStr };
}

/**
 * Linearly interpolates between two OKLCH color strings, ensuring shortest-path hue interpolation.
 *
 * @param colorA The starting OKLCH color string (e.g., 'oklch(60% 0.15 240)').
 * @param colorB The ending OKLCH color string.
 * @param t The interpolation factor (0.0 to 1.0).
 * @returns The interpolated OKLCH color string.
 */
export function lerpOklchString(
  colorA: string,
  colorB: string,
  t: number,
): string {
  const aData = parseOklch(colorA);
  const bData = parseOklch(colorB);

  if (!aData || !bData) {
    // Return the start color or throw an error if parsing fails
    return colorA;
  }

  // Helper LERP function: value = a + (b - a) * t
  const lerp = (start: number, end: number, factor: number) =>
    start + (end - start) * factor;

  // 1. LERP Lightness (L)
  const lerpedL = lerp(aData.l, bData.l, t);

  // 2. LERP Chroma (C)
  const lerpedC = lerp(aData.c, bData.c, t);

  // 3. LERP Hue (H) - Shortest Path Interpolation
  let deltaH = bData.h - aData.h;

  // Adjust deltaH to take the shortest path (inspired by the modulo logic in your rotate function)
  if (deltaH > 180) {
    deltaH -= 360;
  } else if (deltaH < -180) {
    deltaH += 360;
  }

  // Interpolate and ensure result is in [0, 360) range
  const lerpedH = (aData.h + deltaH * t + 360) % 360;

  // 4. Reconstruct the final OKLCH string
  // We try to preserve the original format of the lightness string (e.g., "60%")
  const finalLStr = `${lerpedL.toFixed(2)}${aData.lightnessStr.endsWith("%") ? "%" : ""}`;
  const finalC = lerpedC.toFixed(4);
  const finalH = lerpedH.toFixed(2);

  return `oklch(${finalLStr} ${finalC} ${finalH})`;
}

export function colorMix(colorA: string, colorB: string, lerp: number): string {
  return `color-mix(in lab, ${colorA} ${lerp * 100}%, ${colorB} ${100 - lerp * 100}%)`;
}

export function sortedByLightness(
  colorA: string,
  colorB: string,
): [string, string] {
  const lA = parseOklch(colorA)?.l;
  const lB = parseOklch(colorB)?.l;

  if (!lA || !lB) return [colorA, colorB];

  if (lA > lB) return [colorA, colorB];
  return [colorB, colorA];
}
