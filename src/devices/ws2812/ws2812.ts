import {
    ASM,
    PIO,
    StateMachine,
} from 'rp2';
import {
    ColorRgb,
    reverseBits,
} from '../../common';

/**
 * Controller for
 * [WS2812 devices]{@link https://duckduckgo.com/?q=WS2812+devices+images}
 * [Data sheet]{@link https://cdn-shop.adafruit.com/datasheets/WS2812B.pdf}
 *
 * @description
 * Important: The data channel expects a Uint32Array defining the color for each LED
 * - Data format order example: `0x00BBRRGG` (`BB`=Blue, `RR`=Red, `GG`=Green)
 * - Each 8 bit byte is read in reverse bit order through the PIO ASM or device and needs to be
 * reversed beforehand
 * @see valueFromColor
 *
 * @example
 * // 12 LED device with data connected at Pin#2
 * let myPixels = new Ws2812(2, 12);
 * // Set color of first LED to Lime Green
 * myPixels.setLedColor(0, [128, 255, 0]);
 * // Output the data to the LED device
 * myPixels.write();
 */
export class Ws2812 {

    private stateMachine: StateMachine;
    private buffer: Uint32Array;

    constructor(pin: number, readonly ledAmount: number) {
        if (!(ledAmount > 0)) {
            throw Error(`Cannot create WS2812 instance with no LEDs`);
        }

        const assemblyProgram = new ASM({sideset: 1});
        assemblyProgram
            .label('bitloop')
            .out('x', 1).side(0).delay(2)
            .jmp('!x', 'do_zero').side(1).delay(1)
            .label('do_one')
            .jmp('bitloop').side(1).delay(4)
            .label('do_zero')
            .nop().side(0).delay(4);

        this.stateMachine = new StateMachine(
            StateMachine.getAvailableId(),
            assemblyProgram,
            {
                freq: 8e6,
                autopull: true,
                pullThreshold: 24,
                fifoJoin: PIO.FIFO_JOIN_TX,
                sidesetBase: pin,
            });

        this.stateMachine.active(true);

        this.buffer = new Uint32Array(ledAmount);
    }

    static valueFromColor(rgb: ColorRgb): number {
        let [r, g, b] = rgb;
        return reverseBits(b) << 16
            | reverseBits(r) << 8
            | reverseBits(g);
    }

    /** Updates the LED device with new data */
    write() {
        let rxfifo = this.stateMachine.rxfifo();
        let txfifo = this.stateMachine.txfifo();
        if (rxfifo || txfifo) {
console.log(`---
rxfifo[${rxfifo}] txfifo[${txfifo}] 
`.trim());
        }

        this.stateMachine.put(this.buffer);
    }

    /**
     * Set the data values for all LEDs with a new buffer
     * @see Ws2812
     */
    replaceBuffer(newBuffer: Uint32Array) {
        this.buffer = newBuffer;
    }

    /**
     * Set the data value for a specific LED in the buffer
     * @see Ws2812
     */
    setLed(index: number, value: number) {
        this.buffer[index] = value;
    }

    setLedColor(index: number, rgb: ColorRgb) {
        this.setLed(index, Ws2812.valueFromColor(rgb));
    }

    fillAllColor(rgb: ColorRgb) {
        let value = Ws2812.valueFromColor(rgb);
        let count = this.buffer.length;
        for (let i = 0; i < count; i++) {
            this.buffer[i] = value;
        }
    }

}
