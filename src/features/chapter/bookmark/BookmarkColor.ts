/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import type { Theme } from '@mui/material/styles';
import type { ChapterBookmarkColorInfo } from '@/features/chapter/Chapter.types.ts';

/**
 * fork (Komikku port): colored bookmarks. The ids and colors are Komikku's, so backups exchange them unchanged;
 * 0 is the default bookmark color, which follows the theme.
 */
export const DEFAULT_BOOKMARK_COLOR = 0;

export const BOOKMARK_COLORS: { id: number; label: MessageDescriptor; color: string | null }[] = [
    { id: DEFAULT_BOOKMARK_COLOR, label: msg`Default`, color: null },
    { id: 1, label: msg`Red`, color: '#D32F2F' },
    { id: 2, label: msg`Orange`, color: '#E64A19' },
    { id: 3, label: msg`Yellow`, color: '#F9A825' },
    { id: 4, label: msg`Green`, color: '#2E7D32' },
    { id: 5, label: msg`Blue`, color: '#1565C0' },
    { id: 6, label: msg`Purple`, color: '#6A1B9A' },
];

export const isValidBookmarkColor = (color: number): boolean => BOOKMARK_COLORS.some(({ id }) => id === color);

export const getBookmarkColorInfo = (color: number) =>
    BOOKMARK_COLORS.find(({ id }) => id === color) ?? BOOKMARK_COLORS[0];

/** The css color of a bookmark; the default color is the theme's primary color (or [defaultColor]). */
export const getBookmarkCssColor = (color: number, theme: Theme, defaultColor: string = theme.palette.primary.main) =>
    getBookmarkColorInfo(color).color ?? defaultColor;

/** The color a bookmarked chapter has (null when it is not bookmarked). */
export const getChapterBookmarkColor = ({ isBookmarked, bookmarkColor }: ChapterBookmarkColorInfo): number | null =>
    isBookmarked ? (bookmarkColor ?? DEFAULT_BOOKMARK_COLOR) : null;

/**
 * Komikku's tri-state color filter: a chapter passes when none of its colors is excluded and, when colors are
 * included, it has one of them. A chapter without a bookmark has no color.
 */
export const matchesBookmarkColorFilter = (
    chapter: ChapterBookmarkColorInfo,
    included: number[],
    excluded: number[],
): boolean => {
    const color = getChapterBookmarkColor(chapter);
    if (color !== null && excluded.includes(color)) {
        return false;
    }

    return !included.length || (color !== null && included.includes(color));
};

/** The colors shared by all [chapters] (null when they differ or one is not bookmarked). */
export const getSharedBookmarkColor = (chapters: ChapterBookmarkColorInfo[]): number | null => {
    const colors = new Set(chapters.map(getChapterBookmarkColor));
    if (colors.size !== 1) {
        return null;
    }

    return [...colors][0] ?? null;
};
