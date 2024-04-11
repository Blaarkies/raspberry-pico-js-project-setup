export * from './internal/kelvin-temperature-table';

export type ColorHsl = [h: number, s: number, l: number];
export type ColorRgb = [r: number, g: number, b: number];

/**
 * Return the RGB representation given an HSL value
 * @example `hslToRgb(0, 1, 0.5)` returns `[255, 0, 0]`
 * @param h Hue range [0-1]
 * @param s Saturation range [0-1]
 * @param l Luminosity range [0-1]
 */
export function hslToRgb(h: number, s: number, l: number): ColorRgb {
    let r: number;
    let g: number;
    let b: number;

    if (s === 0) {
        r = g = b = l;
    } else {
        let q = l < .5
                ? l * (1 + s)
                : l + s - l * s;
        let p = 2 * l - q;

        r = hueToRgb(p, q, h + 1 / 3);
        g = hueToRgb(p, q, h);
        b = hueToRgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function hueToRgb(p: number, q: number, t: number): number {
    if (t < 0) {
        t += 1;
    }
    if (t > 1) {
        t -= 1;
    }

    if (t < 1 / 6) {
        return p + (q - p) * 6 * t;
    }
    if (t < 1 / 2) {
        return q;
    }
    if (t < 2 / 3) {
        return p + (q - p) * (2 / 3 - t) * 6;
    }
    return p;
}
