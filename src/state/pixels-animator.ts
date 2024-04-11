import {
    ColorRgb,
    pickRandomElement,
    waitForDuration,
} from '../common';
import { Ws2812 } from '../ws2812/ws2812';

type AnimationType =
    | 'sweep-right'
    | 'sweep-left'
    | 'sweep-center-out'
    | 'sweep-center-in';

interface AnimationConfig {
    animationType?: AnimationType;
}

export class PixelsAnimator {

    private isBusy = false;
    private animationMap = new Map<AnimationType, typeof this.setColor>([
        ['sweep-right', this.animateSweepRight.bind(this)],
        ['sweep-left', this.animateSweepLeft.bind(this)],
        ['sweep-center-out', this.animateSweepCenterOut.bind(this)],
        ['sweep-center-in', this.animateSweepCenterIn.bind(this)],
    ]);
    private animationsList = Array.from(this.animationMap.values());

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

    private async animateSweepRight(rgb: ColorRgb, config: AnimationConfig = {}) {
        for (let i = 0; i < this.pixels.ledAmount; i++) {
            this.pixels.setLedColor(i, rgb);
            this.pixels.write();

            await waitForDuration(this.intervalMs);
        }
    }

    private async animateSweepLeft(rgb: ColorRgb, config: AnimationConfig = {}) {
        for (let i = this.pixels.ledAmount - 1; i >= 0; i--) {
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