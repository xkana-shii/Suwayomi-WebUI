/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

type MangaInput = {
    id: string | number;
    thumbnailUrl?: string;
};

type HashInfo = {
    id: string;
    aHash: string | null;
    pHash: string | null;
    index: number;
};

const DEFAULT_DETECTION_THRESHOLD = 20;

const BACKEND_BASE =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || 'http://localhost:4567';

function resolveUrl(url?: string): string | undefined {
    if (!url) {
        return undefined;
    }

    try {
        const parsed = new URL(url);
        return parsed.href;
    } catch {
        if (url.startsWith('/')) {
            return `${BACKEND_BASE}${url}`;
        }

        return `${BACKEND_BASE}/${url.replace(/^\/+/, '')}`;
    }
}

const c = (u: number) => (u === 0 ? 1 / Math.sqrt(2) : 1);

function dct2(input: number[], n: number): number[] {
    const output = new Array(n * n).fill(0);
    const factor = Math.PI / (2 * n);

    for (let u = 0; u < n; u += 1) {
        for (let v = 0; v < n; v += 1) {
            let sum = 0;

            for (let x = 0; x < n; x += 1) {
                for (let y = 0; y < n; y += 1) {
                    sum += input[x * n + y] * Math.cos((2 * x + 1) * u * factor) * Math.cos((2 * y + 1) * v * factor);
                }
            }

            output[u * n + v] = (2 / n) * c(u) * c(v) * sum;
        }
    }

    return output;
}

async function fetchBlobAndBitmap(url?: string): Promise<ImageBitmap | null> {
    const resolved = resolveUrl(url);

    if (!resolved) {
        return null;
    }

    try {
        const res = await fetch(resolved, { mode: 'cors' });

        if (!res.ok) {
            return null;
        }

        const blob = await res.blob();

        try {
            return await createImageBitmap(blob);
        } catch {
            return null;
        }
    } catch {
        return null;
    }
}

function computeHashesFromBitmap(bitmap: ImageBitmap | null): { aHash: string | null; pHash: string | null } {
    if (!bitmap) {
        return { aHash: null, pHash: null };
    }

    try {
        const aSize = 8;
        const canvasA = new OffscreenCanvas(aSize, aSize);
        const ctxA = canvasA.getContext('2d');

        if (!ctxA) {
            return { aHash: null, pHash: null };
        }

        ctxA.drawImage(bitmap, 0, 0, aSize, aSize);

        const imageDataA = ctxA.getImageData(0, 0, aSize, aSize);
        const { data } = imageDataA;

        let sum = 0;
        const lum: number[] = new Array(aSize * aSize);

        for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;

            lum[j] = l;
            sum += l;
        }

        const avg = sum / lum.length;

        let bits = '';

        for (let i = 0; i < lum.length; i += 1) {
            bits += lum[i] >= avg ? '1' : '0';
        }

        const hexParts: string[] = [];

        for (let i = 0; i < bits.length; i += 4) {
            const chunk = bits.substring(i, i + 4);
            const val = parseInt(chunk, 2);
            hexParts.push(val.toString(16));
        }

        const aHash = hexParts.join('').padStart(16, '0');

        const size = 32;
        const canvasP = new OffscreenCanvas(size, size);
        const ctxP = canvasP.getContext('2d');

        if (!ctxP) {
            return { aHash, pHash: null };
        }

        ctxP.drawImage(bitmap, 0, 0, size, size);

        const imageDataP = ctxP.getImageData(0, 0, size, size);
        const { data: dataP } = imageDataP;

        const gray: number[] = new Array(size * size);

        for (let i = 0, j = 0; i < dataP.length; i += 4, j += 1) {
            const r = dataP[i];
            const g = dataP[i + 1];
            const b = dataP[i + 2];

            gray[j] = 0.299 * r + 0.587 * g + 0.114 * b;
        }

        const dct = dct2(gray, size);

        const smallSize = 8;
        const vals: number[] = [];

        for (let u = 0; u < smallSize; u += 1) {
            for (let v = 0; v < smallSize; v += 1) {
                vals.push(dct[u * size + v]);
            }
        }

        const coeffsForMedian = vals.slice(1);
        const sorted = coeffsForMedian.slice().sort((a, b) => a - b);

        const mid = Math.floor(sorted.length / 2);

        const median = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

        let bitsP = '';

        for (let i = 0; i < vals.length; i += 1) {
            bitsP += vals[i] > median ? '1' : '0';
        }

        const hexPartsP: string[] = [];

        for (let i = 0; i < bitsP.length; i += 4) {
            const chunk = bitsP.substring(i, i + 4);
            const val = parseInt(chunk, 2);
            hexPartsP.push(val.toString(16));
        }

        const pHash = hexPartsP.join('').padStart(16, '0');

        return { aHash, pHash };
    } finally {
        // nothing to cleanup
    }
}

async function runWithConcurrency<T>(funcs: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
    const results = new Array<T>(funcs.length);
    let i = 0;

    const workers: Promise<void>[] = new Array(Math.min(concurrency, funcs.length)).fill(null).map(async () => {
        while (true) {
            const idx = i;
            i += 1;

            if (idx >= funcs.length) {
                break;
            }

            try {
                // eslint-disable-next-line no-await-in-loop
                results[idx] = await funcs[idx]();
            } catch {
                // @ts-expect-error
                results[idx] = undefined;
            }
        }
    });

    await Promise.all(workers);

    return results;
}

// eslint-disable-next-line no-restricted-globals
self.onmessage = async (
    ev: MessageEvent<{
        mangas: MangaInput[];
        threshold?: number;
        debug?: boolean;
    }>,
) => {
    const { mangas } = ev.data;

    const DETECTION_THRESHOLD = typeof ev.data.threshold === 'number' ? ev.data.threshold : DEFAULT_DETECTION_THRESHOLD;

    const DEBUG = !!ev.data.debug;

    const CONCURRENCY = Math.max(2, (navigator.hardwareConcurrency ?? 4) - 1);

    const tasks: (() => Promise<HashInfo>)[] = mangas.map((m, idx) => {
        const idStr = String(m.id);

        return async () => {
            let bitmap: ImageBitmap | null = null;

            try {
                bitmap = await fetchBlobAndBitmap(m.thumbnailUrl);

                if (!bitmap) {
                    return {
                        id: idStr,
                        aHash: null,
                        pHash: null,
                        index: idx,
                    };
                }

                const { aHash, pHash } = computeHashesFromBitmap(bitmap);

                return { id: idStr, aHash, pHash, index: idx };
            } finally {
                try {
                    if (bitmap && (bitmap as any).close) {
                        (bitmap as any).close();
                    }
                } catch {
                    //
                }
            }
        };
    });

    const hashResults = await runWithConcurrency(tasks, CONCURRENCY);

    if (DEBUG) {
        postMessage({ hashResults, thresholdUsed: DETECTION_THRESHOLD });
    } else {
        postMessage(hashResults);
    }
};
