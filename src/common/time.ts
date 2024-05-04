import {
    Subject,
    subject,
} from './stream';

type Stoppable<T> = T & { stop: () => void, stopped: boolean };
export type SequenceIntervalSubject = Stoppable<Subject<number, unknown>>;

/**
 * Returns an observable that emits according to the time duration specified by
 * each element in `sequence`
 * Call the `stop()` method to complete
 * @param sequence List of interval durations in milliseconds
 */
export function sequencedInterval(sequence: number[]): SequenceIntervalSubject {
    let source$ = subject<number>() as SequenceIntervalSubject;

    let asyncSyntaxFn = async () => {
        // Loop until `source$.stopped` is true. Keep the iteration index
        let count = sequence.length;
        for (let iteration = 0; true; iteration++) {
            let index = iteration % count;
            let durationMs = sequence[index];

            await waitForDuration(durationMs);
            if (source$.stopped) {
                source$.complete();
                break;
            }

            source$.next(iteration);
        }
    };
    asyncSyntaxFn();

    source$.stop = () => source$.stopped = true;

    return source$;
}

export async function waitForDuration(durationMs: number) {
    return new Promise<void>(resolve =>
        setTimeout(() => resolve(), durationMs));
}
