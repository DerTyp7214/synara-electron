import ColorThief, { type RGBColor } from "colorthief";
import {
  oklchToRgb,
  rgbToOklch,
  sortedByLightnessOklch,
} from "$lib/color/converters";

export async function getColorPalette(imageUrl?: string) {
  if (!imageUrl) return [[-1, -1, -1]] as RGBColor[];

  const colorThief = new ColorThief();
  const img = new Image();

  const palette = new Promise<RGBColor[]>((resolve) => {
    img.addEventListener("load", () => {
      resolve(colorThief.getPalette(img, 2));
    });
  });

  img.crossOrigin = "anonymous";
  img.src = imageUrl;

  return await palette;
}

type IntervalType = Record<
  50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950,
  {
    L_delta: number;
    C_target: number;
    H_shift: number;
  }
>;

export type OKLCHColor = [number, number, number];
export type OKLabColor = [number, number, number];

export const targetScaleIntervals: IntervalType = {
  50: { L_delta: 48.82, C_target: 0.05, H_shift: 3.9 },
  100: { L_delta: 40.67, C_target: 0.09, H_shift: 7.3 },
  200: { L_delta: 32.6, C_target: 0.13, H_shift: 8.17 },
  300: { L_delta: 24.99, C_target: 0.17, H_shift: 7.54 },
  400: { L_delta: 17.64, C_target: 0.2, H_shift: 6.48 },
  500: { L_delta: 11.23, C_target: 0.23, H_shift: 4.19 },
  600: { L_delta: 7.55, C_target: 0.21, H_shift: 3.33 },
  700: { L_delta: 3.91, C_target: 0.19, H_shift: 1.99 },
  800: { L_delta: 0.0, C_target: 0.17, H_shift: 0.0 },
  900: { L_delta: -3.76, C_target: 0.15, H_shift: -2.3 },
  950: { L_delta: -7.66, C_target: 0.13, H_shift: -5.11 },
};

export function transformColor(
  input: RGBColor,
  shade: keyof IntervalType,
): RGBColor {
  const [baseL, _, baseH] = rgbToOklch(input);

  const H_800_ref = 296.27;

  const L = baseL + targetScaleIntervals[shade].L_delta;
  const C = targetScaleIntervals[shade].C_target;
  const H = baseH + targetScaleIntervals[shade].H_shift * (baseH / H_800_ref);

  return oklchToRgb([L, C, H]);
}

export function oklchToString([L, C, H]: OKLCHColor): string {
  return `oklch(${L}% ${C} ${H}deg)`;
}

export function sortRgbColors(
  color1: RGBColor,
  color2: RGBColor,
  shade: keyof IntervalType = 300,
): Array<RGBColor> {
  return sortedByLightnessOklch(
    rgbToOklch(transformColor(color1, shade)),
    rgbToOklch(transformColor(color2, shade)),
  ).map(oklchToRgb);
}

export function generateOklchScale(
  color: RGBColor,
  colorName: string = "secondary",
  intervals: IntervalType = targetScaleIntervals,
) {
  const scale: Record<string, string> = {};

  const [baseL, _, baseH] = rgbToOklch(color);

  const H_800_ref = 296.27;

  for (const [shade, data] of Object.entries(intervals)) {
    const L = (baseL + data.L_delta).toFixed(2);

    const C = data.C_target.toFixed(4);

    const H = (baseH + data.H_shift * (baseH / H_800_ref)).toFixed(2);

    const varName = `--color-${colorName}-${shade}`;
    scale[varName] = `oklch(${L}% ${C} ${H}deg)`;
  }

  return scale;
}

export function getColorCssVars(color: Array<RGBColor>) {
  if (color[0][0] === -1 || color[0][1] === -1 || color[0][2] === -1) return "";
  if (color[1][0] === -1 || color[1][1] === -1 || color[1][2] === -1) return "";

  return Object.entries({
    ...generateOklchScale(color[0]),
    ...generateOklchScale(color[1], "tertiary"),
  })
    .map(([color, scale]) => {
      return `${color}: ${scale};`;
    })
    .join("\n");
}

export function rgbToCss(color: RGBColor): string {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}
