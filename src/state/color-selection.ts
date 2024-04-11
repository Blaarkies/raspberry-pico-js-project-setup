import {
    ColorHsl,
    ColorRgb,
    hslToRgb,
} from '../common';
import { toExp } from '../common/transform';

interface CurrentSelection {
    index: number;
    preset: ColorPreset;
}

interface ColorPreset {
    id: string;
    hsl: number[];
    rgb: number[];
}

interface HslPreset {
    [key: string]: ColorHsl;
}

export class ColorCycler {

    selected?: CurrentSelection;

    get selectedRgb(): ColorRgb {
        let [r, g, b] = this.selected.preset.rgb;
        let p = this.active
                ? toExp(this.powerLevel ?? .5, this.skewFactor)
                : 0;
        return [r * p, g * p, b * p];
    }

    private readonly presetsList: ColorPreset[];
    private skewFactor = 10;
    private powerLevel = toExp(2 / 3, this.skewFactor);
    private active = true;

    constructor(colorPresets: HslPreset) {
        this.presetsList = Object.entries(colorPresets)
            .map(([id, hsl]) => ({
                id, hsl,
                rgb: hslToRgb(hsl[0], hsl[1], hsl[2]),
            }));
        this.setNewSelection(0);
    }

    cycleColor() {
        let newIndex = (this.selected.index + 1) % this.presetsList.length;
        this.setNewSelection(newIndex);
    }

    cyclePower(direction: 1 | -1 = 1, steps = 5) {
        let increaseAmount = 1 / steps;

        // When `direction` is positive, a new power is rising...
        let newPower = this.powerLevel + increaseAmount * direction;

        let cappedPower = newPower > 1
                          ? 0
                          : newPower < 0
                            ? 1
                            : newPower;
        this.powerLevel = cappedPower;
    }

    setPower(value: number) {
        this.powerLevel = value;
    }

    private setNewSelection(index: number) {
        this.selected = {
            index,
            preset: this.presetsList[index],
        };
    }

    toggle() {
        this.active = !this.active;
    }
}