/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * fork (Komikku port of SequentialWriter): runs writes one after another, in the order they were requested, so a
 * fast series of auto-saved changes reaches the server in order and a later write never races an earlier one.
 * A failing write does not block the following ones.
 */
export class SequentialWriter {
    private tail: Promise<unknown> = Promise.resolve();

    private pending = 0;

    enqueue<T>(write: () => Promise<T>): Promise<T> {
        this.pending += 1;
        const result = this.tail.then(write, write);
        this.tail = result
            .catch(() => {})
            .finally(() => {
                this.pending -= 1;
            });
        return result;
    }

    get isIdle(): boolean {
        return this.pending === 0;
    }
}

/** shared by every scanlator settings editor, like Komikku's app-wide queue */
export const scanlatorSettingsWriter = new SequentialWriter();
