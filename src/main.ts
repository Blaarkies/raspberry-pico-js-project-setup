import { Stream } from 'kefir';
import {
    getHslAtKelvin,
    hslToRgb,
    sequencedInterval,
    SequenceIntervalSubject,
    waitForDuration,
} from './common';
import { TimeoutHandle } from './common/types';
import {
    MultiActionButton,
    Ws2812,
} from './devices';
import { ColorCycler } from './state/color-selection';
import { PixelsAnimator } from './state/pixels-animator';

try {
    runProgram();
} catch (error) {
    console.error('Error in main program\n',
        error,
        error.stack
        );
}

function runProgram() {
    let ledPin = board.LED;
    pinMode(ledPin, OUTPUT);

    let colorCycler = new ColorCycler(
        {
            warm: getHslAtKelvin(2000),
            cold: getHslAtKelvin(4000),
            // red: [0, 1, .5],
            // green: [.33, 1, .5],
            // blue: [.67, 1, .5],
        },
        [.15, .4, 1],
    );

    let pinButtonA = 0;
    let pinButtonB = 1;
    let pinPixels = 2;

    let pixels = new Ws2812(pinPixels, 74);

    let pixelsAnimator = new PixelsAnimator(pixels);
    pixelsAnimator.setColor(colorCycler.selectedRgb, {
        animationType: 'sweep-center-out',
    });


// Buttons
    let longPress = {b: false, c: false};

    let buttonC = new MultiActionButton(pinButtonA);
    buttonC.onLongPress({
        startFn: () => longPress.c = true,
        endFn: () => longPress.c = false,
    });

    let buttonB = new MultiActionButton(pinButtonB);
    let hueGo = false;
    buttonB.onLongPress({
        startFn: () => longPress.b = true,
        endFn: async () => {
            console.log('buttonB.onLongPress endFn');
            longPress.b = false;

            if (longPress.c) {
                hueGo = true;
                let waitMs = 50;
                let leds = pixels.ledAmount;
                let run1 = 0;
                for (let t = 0; hueGo; t++) {
                    run1 = (run1 + .1) % (leds * 3);
                    let tNormalized = (t % leds) / leds;
                    let sine = Math.sin(tNormalized * Math.PI) * 2;
                    let aRange = [sine * run1, sine * run1 + 10]
                        .map(n => Math.floor(n) % leds);

                    let hueColor = hslToRgb(tNormalized, 1, .5);
                    let hueColor2 = hslToRgb(1 - tNormalized, 1, .5);

                    let aColor = Ws2812.valueFromColor(hueColor2);

                    pixels.fillAllColor(hueColor);
                    for (let i = aRange[0]; i < aRange[1]; i++) {
                        pixels.setLed(i, aColor);
                    }

                    pixels.write();
                    await waitForDuration(waitMs);
                }
            }
        },
    });

    let isBusy = false;
    let shutdownNotification$: SequenceIntervalSubject;

    function abortShutdown() {
        isBusy = false;
        shutdownNotification$.stop();
        digitalWrite(ledPin, 0);
    }

    buttonC.onRelease(async () => {
        if (longPress.b) {
            console.log('c release after longpress b');
            colorCycler.cycleColor();
            pixelsAnimator.setColor(colorCycler.selectedRgb);
            return;
        }

        console.log('is busy', isBusy,
            'isPoweredOn', colorCycler.isPoweredOn);
        if (isBusy) {
            abortShutdown();
            return;
        }

        if (colorCycler.isPoweredOn) {
            isBusy = true;
            shutdownNotification$ = sequencedInterval([100,200,300,400,500])
                .onValue(() => digitalToggle(ledPin));
            await waitForDuration(20e3);

            if (!isBusy) {
                return;
            }
            abortShutdown();
        }

        let oldColor = colorCycler.selectedRgb;
        colorCycler.toggle();
        let selectedColor = colorCycler.selectedRgb;

        pixelsAnimator.setColor(selectedColor, {
            animationType: 'fade',
            duration: 8e3,
            fromRgb: oldColor,
        });
    });

    buttonB.onRelease(() => {
        hueGo = false;
        colorCycler.cyclePower(longPress.c ? -1 : 1);
        pixelsAnimator.setColor(colorCycler.selectedRgb);
    });
}
