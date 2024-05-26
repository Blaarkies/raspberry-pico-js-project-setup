import { IPWM } from 'pwm';
import {
    getHslAtKelvin,
    sequencedInterval,
    SequenceIntervalSubject,
    waitForDuration,
} from './common';
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
        },
        [.15, .4, 1],
    );

    let pinButtonA = 0;
    let pinButtonB = 1;
    let pinPixels = 2;
    let pinExtraLed = 4;

    let extraLed = board.pwm(pinExtraLed, 1500, .3) as IPWM;

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
    buttonB.onLongPress({
        startFn: () => longPress.b = true,
        endFn: () => longPress.b = false,
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
            colorCycler.cycleColor();
            pixelsAnimator.setColor(colorCycler.selectedRgb);

            (colorCycler.selected.colorIndex === 1)
            ? extraLed.start()
            : extraLed.stop();

            return;
        }

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
        colorCycler.cyclePower(longPress.c ? -1 : 1);
        pixelsAnimator.setColor(colorCycler.selectedRgb);
    });
}
