/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { TMangaDuplicate } from '@/features/library/Library.types.ts';

interface TrackerGroupHeader {
    kind: 'MAL' | 'MU' | 'MB';
    trackerId: string;
    remoteId: string;
    remoteTitle: string;
}

// Disjoint-set Union-Find data structure
class UnionFind {
    parent: number[];
    constructor(n: number) {
        this.parent = new Array(n);
        for (let i = 0; i < n; i += 1) {
            this.parent[i] = i;
        }
    }
    find(a: number): number {
        let p = a;
        while (this.parent[p] !== p) {
            p = this.parent[p];
        }
        let cur = a;
        while (this.parent[cur] !== cur) {
            const next = this.parent[cur];
            this.parent[cur] = p;
            cur = next;
        }
        return p;
    }
    union(a: number, b: number) {
        const pa = this.find(a);
        const pb = this.find(b);
        if (pa !== pb) {
            this.parent[pb] = pa;
        }
    }
}

// eslint-disable-next-line no-restricted-globals
self.onmessage = (event: MessageEvent<{ mangas: TMangaDuplicate[] }>) => {
    const { mangas } = event.data;
    const n = mangas.length;
    const uf = new UnionFind(n);

    // Map each tracker binding to all manga indices that contain it
    const keyToIndices: Record<string, number[]> = {};

    mangas.forEach((m, idx) => {
        const nodes = Array.isArray(m.trackRecords) ? m.trackRecords : (m.trackRecords?.nodes ?? []);
        nodes.forEach((tr) => {
            if (!tr.remoteId) {
                return;
            }
            const key = `${tr.trackerId}::${tr.remoteId}`;
            if (!keyToIndices[key]) {
                keyToIndices[key] = [];
            }
            keyToIndices[key].push(idx);
        });
    });

    // Union all manga that share the same tracker binding
    for (const indices of Object.values(keyToIndices)) {
        if (indices.length > 1) {
            const [base, ...rest] = indices;
            for (const idx of rest) {
                uf.union(base, idx);
            }
        }
    }

    // Group by connected component
    const rootToMembers = new Map<number, number[]>();
    for (let i = 0; i < n; i++) {
        const root = uf.find(i);
        if (!rootToMembers.has(root)) {
            rootToMembers.set(root, []);
        }
        rootToMembers.get(root)!.push(i);
    }

    type ResultEntry = {
        trackers: TrackerGroupHeader[];
        members: TMangaDuplicate[];
    };

    const result: ResultEntry[] = [];

    for (const members of rootToMembers.values()) {
        if (members.length <= 1) {
            continue;
        }

        // Find all unique MAL/MU/MB tracker ids present in group
        const trackers: Record<string, TrackerGroupHeader> = {};
        for (const idx of members) {
            const m = mangas[idx];
            const nodes = Array.isArray(m.trackRecords) ? m.trackRecords : (m.trackRecords?.nodes ?? []);
            for (const tr of nodes) {
                let kind: TrackerGroupHeader['kind'] | undefined;
                if (String(tr.trackerId) === '1') {
                    kind = 'MAL';
                } else if (String(tr.trackerId) === '4') {
                    kind = 'MU';
                } else if (String(tr.trackerId) === '7') {
                    kind = 'MB';
                } else {
                    continue;
                }
                if (!tr.remoteId) {
                    continue;
                }
                // Only overwrite if we haven't yet or the prior has empty remoteTitle and this doesn't
                const key = `${kind}:${tr.remoteId}`;
                if (!trackers[key] || (!trackers[key].remoteTitle && tr.remoteTitle)) {
                    trackers[key] = {
                        kind,
                        trackerId: String(tr.trackerId),
                        remoteId: String(tr.remoteId),
                        remoteTitle: tr.remoteTitle || '',
                    };
                }
            }
        }

        // Sort by preferred order: MAL, MU, MB, then trackId then remoteId
        const trackerOrder = { MAL: 1, MU: 2, MB: 3 } as const;
        const trackerArray = Object.values(trackers).sort(
            (a, b) =>
                (trackerOrder[a.kind] ?? 99) - (trackerOrder[b.kind] ?? 99) ||
                a.trackerId.localeCompare(b.trackerId) ||
                a.remoteId.localeCompare(b.remoteId),
        );

        // Add group entry
        result.push({
            trackers: trackerArray,
            members: members.map((i) => mangas[i]),
        });
    }

    postMessage(result);
};
