/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useMemo } from 'react';
import type { ChapterType } from '@/lib/graphql/generated/graphql-base.types.ts';
import type {
    ChapterBookmarkInfo,
    ChapterFillermarkInfo,
    ChapterDownloadInfo,
    ChapterListFilterOptions,
    ChapterListFilterSortOptions,
    ChapterListOptions,
    ChapterListSortOptions,
    ChapterNumberInfo,
    ChapterReadInfo,
    ChapterScanlatorInfo,
    ChapterSourceOrderInfo,
    ChapterBookmarkColorInfo,
    ChapterVisibilityInfo,
} from '@/features/chapter/Chapter.types.ts';
import { matchesBookmarkColorFilter } from '@/features/chapter/bookmark/BookmarkColor.ts';
import type { MangaIdInfo } from '@/features/manga/Manga.types.ts';
import type { GqlMetaHolder } from '@/features/metadata/Metadata.types.ts';
import { createUpdateMangaMetadata, useGetMangaMetadata } from '@/features/manga/services/MangaMetadata.ts';
import { defaultPromiseErrorHandler } from '@/lib/DefaultPromiseErrorHandler.ts';

export function unreadFilter(unread: NullAndUndefined<boolean>, { isRead: isChapterRead }: ChapterReadInfo) {
    switch (unread) {
        case true:
            return !isChapterRead;
        case false:
            return isChapterRead;
        default:
            return true;
    }
}

function downloadFilter(downloaded: NullAndUndefined<boolean>, { isDownloaded: chapterDownload }: ChapterDownloadInfo) {
    switch (downloaded) {
        case true:
            return chapterDownload;
        case false:
            return !chapterDownload;
        default:
            return true;
    }
}

function bookmarkedFilter(
    bookmarked: NullAndUndefined<boolean>,
    { isBookmarked: chapterBookmarked }: ChapterBookmarkInfo,
) {
    switch (bookmarked) {
        case true:
            return chapterBookmarked;
        case false:
            return !chapterBookmarked;
        default:
            return true;
    }
}

function fillermarkedFilter(
    fillermarked: NullAndUndefined<boolean>,
    { isFillermarked: chapterFillermarked }: ChapterFillermarkInfo,
) {
    switch (fillermarked) {
        case true:
            return chapterFillermarked;
        case false:
            return !chapterFillermarked;
        default:
            return true;
    }
}
function scanlatorFilter(excludedScanlators: string[], { scanlator }: ChapterScanlatorInfo): boolean {
    return !scanlator || !excludedScanlators.includes(scanlator);
}

/** fork (Komikku port): hidden by the chapter blacklist or Smart Scanlator Merge */
export const isChapterHidden = ({ isBlacklisted, isMergeHidden }: Partial<ChapterVisibilityInfo>): boolean =>
    !!isBlacklisted || !!isMergeHidden;

/**
 * fork (Komikku port): the chapter list can reveal blacklisted chapters and merged duplicates; reading navigation and
 * downloads ([strict]) never include them.
 */
function visibilityFilter(
    {
        hideBlacklistedChapters,
        showMergedChapters,
    }: Pick<ChapterListFilterOptions, 'hideBlacklistedChapters' | 'showMergedChapters'>,
    { isBlacklisted, isMergeHidden }: Partial<ChapterVisibilityInfo>,
    strict: boolean,
): boolean {
    if (isBlacklisted && (strict || hideBlacklistedChapters)) {
        return false;
    }

    return !isMergeHidden || (!strict && showMergedChapters);
}

type TChapterSort = ChapterSourceOrderInfo & ChapterNumberInfo & Pick<ChapterType, 'fetchedAt' | 'uploadDate'>;
const sortChapters = <T extends TChapterSort>(chapters: T[], { sortBy, reverse }: ChapterListSortOptions): T[] => {
    const sortedChapters: T[] = [...chapters];

    switch (sortBy) {
        case 'source':
            sortedChapters.sort((a, b) => a.sourceOrder - b.sourceOrder);
            break;
        case 'fetchedAt':
            sortedChapters.sort((a, b) => Number(a.fetchedAt ?? 0) - Number(b.fetchedAt ?? 0));
            break;
        case 'chapterNumber':
            sortedChapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
            break;
        case 'uploadedAt':
            sortedChapters.sort((a, b) => Number(a.uploadDate ?? 0) - Number(b.uploadDate ?? 0));
            break;
        default:
        // nothing to do
    }

    if (reverse) {
        sortedChapters.reverse();
    }

    return sortedChapters;
};

type TChapterFilter = ChapterReadInfo &
    ChapterDownloadInfo &
    ChapterBookmarkInfo &
    ChapterScanlatorInfo &
    ChapterFillermarkInfo &
    Partial<ChapterBookmarkColorInfo & ChapterVisibilityInfo>;
export function filterChapters<Chapters extends TChapterFilter>(
    chapters: Chapters[],
    options: ChapterListFilterOptions,
    { strictVisibility = false }: { strictVisibility?: boolean } = {},
): Chapters[] {
    return chapters.filter(
        (chp) =>
            visibilityFilter(options, chp, strictVisibility) &&
            matchesBookmarkColorFilter(
                { isBookmarked: chp.isBookmarked, bookmarkColor: chp.bookmarkColor ?? 0 },
                options.bookmarkColorsIncluded ?? [],
                options.bookmarkColorsExcluded ?? [],
            ) &&
            unreadFilter(options.unread, chp) &&
            downloadFilter(options.downloaded, chp) &&
            bookmarkedFilter(options.bookmarked, chp) &&
            fillermarkedFilter(options.fillermarked, chp) &&
            scanlatorFilter(options.excludedScanlators, chp),
    );
}

export function filterAndSortChapters<Chapters extends TChapterSort & TChapterFilter>(
    chapters: Chapters[],
    options: ChapterListFilterSortOptions,
): Chapters[] {
    const filtered = filterChapters(chapters, options);

    return sortChapters(filtered, options);
}

export const isFilterActive = (options: ChapterListFilterOptions) => {
    const {
        unread,
        downloaded,
        bookmarked,
        fillermarked,
        excludedScanlators,
        bookmarkColorsIncluded,
        bookmarkColorsExcluded,
        hideBlacklistedChapters,
        showMergedChapters,
    } = options;
    return (
        unread != null ||
        downloaded != null ||
        bookmarked != null ||
        fillermarked != null ||
        !!excludedScanlators.length ||
        !!bookmarkColorsIncluded?.length ||
        !!bookmarkColorsExcluded?.length ||
        hideBlacklistedChapters === false ||
        !!showMergedChapters
    );
};

export const useChapterListOptions = (manga: MangaIdInfo & GqlMetaHolder): ChapterListOptions => {
    const {
        unread,
        downloaded,
        bookmarked,
        fillermarked,
        reverse,
        sortBy,
        showChapterNumber,
        excludedScanlators,
        bookmarkColorsIncluded,
        bookmarkColorsExcluded,
        hideBlacklistedChapters,
        showMergedChapters,
    } = useGetMangaMetadata(manga);

    return useMemo(
        () => ({
            unread,
            downloaded,
            bookmarked,
            fillermarked,
            reverse,
            sortBy,
            showChapterNumber,
            excludedScanlators,
            bookmarkColorsIncluded,
            bookmarkColorsExcluded,
            hideBlacklistedChapters,
            showMergedChapters,
        }),
        [
            unread,
            downloaded,
            bookmarked,
            fillermarked,
            reverse,
            sortBy,
            showChapterNumber,
            excludedScanlators,
            bookmarkColorsIncluded,
            bookmarkColorsExcluded,
            hideBlacklistedChapters,
            showMergedChapters,
        ],
    );
};

export const updateChapterListOptions = (
    manga: MangaIdInfo & GqlMetaHolder,
    handleError: (error: any) => void = defaultPromiseErrorHandler('createUpdateMangaMetadata'),
) => createUpdateMangaMetadata(manga, handleError);
