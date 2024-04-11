import {
    getHslAtKelvin,
    MultiActionButton,
    sum,
    waitForDuration,
} from './common';
import { ColorCycler } from './state/color-selection';
import { PixelsAnimator } from './state/pixels-animator';
import { Ws2812 } from './ws2812/ws2812';


let ledPin = board.LED;
pinMode(ledPin, OUTPUT);

let colorCycler = new ColorCycler(
    {
        warm: getHslAtKelvin(2000),
        cold: getHslAtKelvin(4000),
        red: [0, 1, .5],
        green: [.33, 1, .5],
        blue: [.67, 1, .5],
    },
);

let pinButtonA = 0;
let pinButtonB = 1;
let pinPixels = 2;

let pixels = new Ws2812(pinPixels, 74);
let pixelsAnimator = new PixelsAnimator(
    pixels,
);
pixelsAnimator.setColor(colorCycler.selectedRgb, {
    animationType: 'sweep-center-out',
});


// Buttons
let buttonC = new MultiActionButton(pinButtonA);
let isHeldC: boolean;
buttonC.onHold({
    callbackStart: () => isHeldC = true,
    callbackEnd: () => isHeldC = false,
});

let buttonB = new MultiActionButton(pinButtonB);
let isHeldB: boolean;
buttonB.onHold({
    callbackStart: () => isHeldB = true,
    callbackEnd: () => isHeldB = false,
});

buttonC.onRelease(async () => {
    if (isHeldB) {
        colorCycler.cycleColor();
        pixelsAnimator.setColor(colorCycler.selectedRgb);
        return;
    }

    colorCycler.toggle();

    if (sum(colorCycler.selectedRgb) === 0) {
        let handle = setInterval(() => digitalToggle(ledPin), 500);
        await waitForDuration(2e3);
        clearInterval(handle);
        digitalWrite(ledPin, 0);
    }

    pixelsAnimator.setColor(colorCycler.selectedRgb);
});

buttonB.onRelease(() => {
    colorCycler.cyclePower(isHeldC ? -1 : 1, 3);
    pixelsAnimator.setColor(colorCycler.selectedRgb);
});






