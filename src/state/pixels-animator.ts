import {
    ColorRgb,
    lerp,
    pickRandomElement,
    waitForDuration,
} from '../common';
import { toLog } from '../common/transform';
import { Ws2812 } from '../devices/ws2812/ws2812';

type AnimationType =
    | 'fade'
    | 'sweep-right'
    | 'sweep-left'
    | 'sweep-center-out'
    | 'sweep-center-in';

interface AnimationConfig {
    animationType?: AnimationType;
    duration?: number;
    fromRgb?: ColorRgb;
    rgbLerpFn?: (rgb1: ColorRgb, rgb2: ColorRgb, t: number) => ColorRgb,
}

export class PixelsAnimator {

    private isBusy = false;
    private animationMap = new Map<AnimationType, typeof this.setColor>([
        ['fade', this.animateFade.bind(this)],
        ['sweep-right', this.animateSweepRight.bind(this)],
        ['sweep-left', this.animateSweepLeft.bind(this)],
        ['sweep-center-out', this.animateSweepCenterOut.bind(this)],
        ['sweep-center-in', this.animateSweepCenterIn.bind(this)],
    ]);
    private animationsList = Array.from(this.animationMap.entries())
        .filter(([k]) => k !== 'fade')
        .map(([_, v]) => v);

    constructor(
        private readonly pixels: Ws2812,
        private intervalMs = 17,
    ) {
    }

    async setColor(rgb: ColorRgb, config: AnimationConfig = {}) {
        if (this.isBusy) {
            return;
        }

        this.isBusy = true;

        let animationJob = config.animationType
                           ? this.animationMap.get(config.animationType)
                           : pickRandomElement(this.animationsList);

        await animationJob(rgb, config);

        this.isBusy = false;
    }

    private lerpRgbChannel(i: number,
                           rgb1: ColorRgb,
                           rgb2: ColorRgb,
                           t: number): number {
        return lerp(rgb1[i], rgb2[i], toLog(t, 10));
    }

    private async animateFade(rgb: ColorRgb, config: AnimationConfig = {}) {
        let rgbLerpFn = config.rgbLerpFn 
            ?? ((rgb1, rgb2, t) => [
            this.lerpRgbChannel(0, rgb1, rgb2, t),
            this.lerpRgbChannel(1, rgb1, rgb2, t),
            this.lerpRgbChannel(2, rgb1, rgb2, t),
        ]);

        let stepsCount = Math.floor((config.duration ?? 2e3) / this.intervalMs);
        for (let i = 0; i <= stepsCount; i++) {
            let newColor = rgbLerpFn(config.fromRgb, rgb, i / stepsCount);
            this.pixels.fillAllColor(newColor);
            this.pixels.write();

            await waitForDuration(this.intervalMs);
        }
    }

    private async animateSweepRight(rgb: ColorRgb, config: AnimationConfig = {}) {
        for (let i = 0; i < this.pixels.ledAmount; i+=2) {
            this.pixels.setLedColor(i+1, rgb);
            this.pixels.setLedColor(i, rgb);
            this.pixels.write();

            await waitForDuration(this.intervalMs);
        }
    }

    private async animateSweepLeft(rgb: ColorRgb, config: AnimationConfig = {}) {
        for (let i = this.pixels.ledAmount - 1; i >= 0; i-=2) {
            this.pixels.setLedColor(i-1, rgb);
            this.pixels.setLedColor(i, rgb);
            this.pixels.write();

            await waitForDuration(this.intervalMs);
        }
    }

    private async animateSweepCenterIn(rgb: ColorRgb, config: AnimationConfig = {}) {
        let lastIndex = this.pixels.ledAmount - 1;
        let halfLength = Math.ceil(this.pixels.ledAmount / 2);
        for (let i = 0; i < halfLength; i++) {
            this.pixels.setLedColor(i, rgb);
            this.pixels.setLedColor(lastIndex - i, rgb);
            this.pixels.write();

            await waitForDuration(this.intervalMs);
        }
    }

    private async animateSweepCenterOut(rgb: ColorRgb, config: AnimationConfig = {}) {
        let lastIndex = this.pixels.ledAmount - 1;
        let halfLength = Math.ceil(this.pixels.ledAmount / 2);
        for (let i = halfLength - 1; i >= 0; i--) {
            this.pixels.setLedColor(i, rgb);
            this.pixels.setLedColor(lastIndex - i, rgb);
            this.pixels.write();

            await waitForDuration(this.intervalMs);
        }
    }
}