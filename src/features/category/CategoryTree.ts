/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';

export type TreeCategory = { id: number; order: number; parentId?: number | null; isDefaultCategory?: boolean };

export type FlatTreeCategory<T extends TreeCategory> = { category: T; depth: number; childCount: number };

/**
 * fork (Komikku port of CategoryTree): nested categories. A category without a parent, or whose parent does not exist
 * (anymore), is top level. Every walk is cycle safe.
 */
export class CategoryTree<T extends TreeCategory> {
    private readonly byId: Map<number, T>;

    private readonly childrenOf: Map<number | null, T[]>;

    constructor(categories: T[]) {
        this.byId = new Map(categories.map((category) => [category.id, category]));
        this.childrenOf = new Map();
        [...categories]
            .sort((a, b) => a.order - b.order)
            .forEach((category) => {
                const parentId = this.parentOf(category.id);
                this.childrenOf.set(parentId, [...(this.childrenOf.get(parentId) ?? []), category]);
            });
    }

    get(id: number): T | undefined {
        return this.byId.get(id);
    }

    parentOf(id: number): number | null {
        const parentId = this.byId.get(id)?.parentId ?? null;
        return parentId !== null && this.byId.has(parentId) && parentId !== id ? parentId : null;
    }

    children(id: number | null): T[] {
        return this.childrenOf.get(id) ?? [];
    }

    /** nearest first */
    ancestors(id: number): T[] {
        const result: T[] = [];
        const seen = new Set([id]);
        let current = this.parentOf(id);
        while (current !== null && !seen.has(current)) {
            seen.add(current);
            result.push(this.byId.get(current)!);
            current = this.parentOf(current);
        }
        return result;
    }

    descendantIds(id: number): number[] {
        const result: number[] = [];
        const seen = new Set([id]);
        const queue = this.children(id).map(({ id: childId }) => childId);
        while (queue.length) {
            const next = queue.shift()!;
            if (!seen.has(next)) {
                seen.add(next);
                result.push(next);
                queue.push(...this.children(next).map(({ id: childId }) => childId));
            }
        }
        return result;
    }

    /** the top level category of a category's branch */
    root(id: number): T | undefined {
        return this.ancestors(id).at(-1) ?? this.byId.get(id);
    }

    path(id: number, separator = ' / '): string {
        return [...this.ancestors(id).reverse(), this.byId.get(id)]
            .filter(Boolean)
            .map((category) => (category as T & { name?: string }).name ?? '')
            .join(separator);
    }

    canMove(id: number, newParentId: number | null): boolean {
        return (
            newParentId === null ||
            (this.byId.has(newParentId) && newParentId !== id && !this.descendantIds(id).includes(newParentId))
        );
    }

    /** depth-first, siblings by order; [collapsed] categories hide their subtree; cycles are appended */
    flattened(collapsed: Set<number> = new Set()): FlatTreeCategory<T>[] {
        const result: FlatTreeCategory<T>[] = [];
        const seen = new Set<number>();
        const visit = (category: T, depth: number, hidden: boolean) => {
            if (seen.has(category.id)) {
                return;
            }
            seen.add(category.id);
            const children = this.children(category.id);
            if (!hidden) {
                result.push({ category, depth, childCount: children.length });
            }
            children.forEach((child) => visit(child, depth + 1, hidden || collapsed.has(category.id)));
        };
        this.children(null).forEach((category) => visit(category, 0, false));
        [...this.byId.values()].sort((a, b) => a.order - b.order).forEach((category) => visit(category, 0, false));
        return result;
    }
}

/** fork (Komikku port): Smart Category bindings, the server's UnifiedTrackStatus values */
export const SMART_CATEGORY_STATUSES: { value: number; label: MessageDescriptor }[] = [
    { value: 1, label: msg`Reading` },
    { value: 2, label: msg`Rereading` },
    { value: 3, label: msg`Plan to read` },
    { value: 4, label: msg`On hold` },
    { value: 5, label: msg`Completed` },
    { value: 6, label: msg`Dropped` },
];

export const getSmartCategoryStatusLabel = (value: number | null | undefined): MessageDescriptor | undefined =>
    SMART_CATEGORY_STATUSES.find((status) => status.value === value)?.label;
