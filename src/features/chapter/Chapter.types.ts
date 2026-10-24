/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ChapterType } from '@/lib/graphql/generated/graphql-base.types';
import type { ChapterReaderFieldsFragment, DownloadStatusFieldsFragment } from '@/lib/graphql/generated/graphql.ts';

export type ChapterSortMode = 'fetchedAt' | 'source' | 'chapterNumber' | 'uploadedAt';

export interface ChapterListFilterOptions {
    unread: NullAndUndefined<boolean>;
    downloaded: NullAndUndefined<boolean>;
    bookmarked: NullAndUndefined<boolean>;
    fillermarked: NullAndUndefined<boolean>;
    excludedScanlators: string[];
    // fork (Komikku port)
    /** bookmark colors a chapter needs one of (empty = any) */
    bookmarkColorsIncluded: number[];
    /** bookmark colors that hide a chapter */
    bookmarkColorsExcluded: number[];
    /** false reveals the chapters of the chapter blacklist (they are marked in the list) */
    hideBlacklistedChapters: boolean;
    /** shows the duplicates Smart Scanlator Merge hides */
    showMergedChapters: boolean;
}

export interface ChapterListSortOptions {
    reverse: boolean;
    sortBy: ChapterSortMode;
}

export interface ChapterListFilterSortOptions extends ChapterListFilterOptions, ChapterListSortOptions {}

export interface ChapterListOptions extends ChapterListFilterSortOptions {
    showChapterNumber: boolean;
}

export type TChapterReader = ChapterReaderFieldsFragment;

export type ChapterAction =
    | 'download'
    | 'download_cancel'
    | 'delete'
    | 'bookmark'
    | 'unbookmark'
    | 'fillermark'
    | 'unfillermark'
    | 'blacklist'
    | 'unblacklist'
    | 'mark_as_read'
    | 'mark_as_unread';

export type ChapterDownloadStatus = DownloadStatusFieldsFragment['queue'][number];

export type ChapterIdInfo = Pick<ChapterType, 'id'>;

export type ChapterMangaInfo = Pick<ChapterType, 'mangaId'>;

export type ChapterDownloadInfo = Pick<ChapterType, 'isDownloaded'>;

export type ChapterBookmarkInfo = Pick<ChapterType, 'isBookmarked'>;

export type ChapterFillermarkInfo = Pick<ChapterType, 'isFillermarked'>;

// fork (Komikku port)
export type ChapterBookmarkColorInfo = Pick<ChapterType, 'isBookmarked' | 'bookmarkColor'>;

export type ChapterVisibilityInfo = Pick<ChapterType, 'isBlacklisted' | 'isMergeHidden'>;

export type ChapterReadInfo = Pick<ChapterType, 'isRead'>;

export type ChapterNumberInfo = Pick<ChapterType, 'chapterNumber'>;

export type ChapterSourceOrderInfo = Pick<ChapterType, 'sourceOrder'>;

export type ChapterScanlatorInfo = Pick<ChapterType, 'scanlator'>;

export type ChapterRealUrlInfo = Pick<ChapterType, 'realUrl'>;

export type ChapterNameInfo = Pick<ChapterType, 'name'>;
