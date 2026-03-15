/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import type { ChapterAction, ChapterListOptions, ChapterSortMode } from '@/features/chapter/Chapter.types.ts';

export const FALLBACK_CHAPTER = {
    id: -1,
    name: '',
    realUrl: '',
    isDownloaded: false,
    isBookmarked: false,
    isFillermarked: false,
};

export const DEFAULT_CHAPTER_OPTIONS: ChapterListOptions = {
    unread: undefined,
    downloaded: undefined,
    bookmarked: undefined,
    fillermarked: undefined,
    reverse: true,
    sortBy: 'source',
    showChapterNumber: false,
    excludedScanlators: [],
};

export const CHAPTER_SORT_OPTIONS_TO_TRANSLATION: Record<ChapterSortMode, MessageDescriptor> = {
    source: msg`By source`,
    chapterNumber: msg`By chapter number`,
    uploadedAt: msg`By upload date`,
    fetchedAt: msg`By date fetched`,
};

export const CHAPTER_ACTION_TO_CONFIRMATION_REQUIRED: Record<
    ChapterAction,
    { always: boolean; bulkAction: boolean; bulkActionCountForce?: number }
> = {
    download: { always: false, bulkAction: false, bulkActionCountForce: 300 },
    delete: { always: true, bulkAction: true },
    bookmark: { always: false, bulkAction: false },
    unbookmark: { always: false, bulkAction: true },
    mark_as_read: { always: false, bulkAction: true },
    mark_as_unread: { always: false, bulkAction: true },
    fillermark: { always: false, bulkAction: false },
    unfillermark: { always: false, bulkAction: true },
};

export const CHAPTER_ACTION_TO_TRANSLATION: {
    [key in ChapterAction]: {
        action: {
            single: MessageDescriptor;
            selected: MessageDescriptor;
        };
        confirmation?: MessageDescriptor;
        success: MessageDescriptor;
        error: MessageDescriptor;
    };
} = {
    download: {
        action: {
            single: msg`Download`,
            selected: msg`Download selected`,
        },
        confirmation: msg`{count, plural, one {You are about to download one chapter} other {You are about to download # chapters.\nSuwayomi is not a mass downloader and too many downloads can get you banned from sources and/or cause performance issues.}}`,
        success: msg`{count, plural, one {Download added} other {# downloads added}}`,
        error: msg`{count, plural, one {Could not add the download} other {Could not add downloads}}`,
    },
    delete: {
        action: {
            single: msg`Delete`,
            selected: msg`Delete selected`,
        },
        confirmation: msg`{count, plural, one {You are about to delete one download} other {You are about to delete # downloads}}`,
        success: msg`{count, plural, one {Chapter deleted} other {# chapters deleted}}`,
        error: msg`{count, plural, one {Could not delete the chapter} other {Could not delete chapters}}`,
    },
    bookmark: {
        action: {
            single: msg`Add bookmark`,
            selected: msg`Bookmark selected`,
        },
        success: msg`{count, plural, one {Chapter bookmarked} other {# chapters bookmarked}}`,
        error: msg`{count, plural, one {Could not bookmark the chapter} other {Could not bookmark chapters}}`,
    },
    unbookmark: {
        action: {
            single: msg`Remove bookmark`,
            selected: msg`Remove bookmarks from selected`,
        },
        confirmation: msg`{count, plural, one {You are about to remove one bookmark} other {You are about to remove # bookmarks}}`,
        success: msg`{count, plural, one {Chapter bookmark removed} other {# chapter bookmarks removed}}`,
        error: msg`{count, plural, one {Could not remove the bookmark} other {Could not remove the bookmarks}}`,
    },
    fillermark: {
        action: {
            single: msg`Add fillermark`,
            selected: msg`Fillermark selected`,
        },
        success: msg`{count, plural, one {Chapter fillermarked} other {# chapters fillermarked}}`,
        error: msg`{count, plural, one {Could not fillermark the chapter} other {Could not fillermark chapters}}`,
    },
    unfillermark: {
        action: {
            single: msg`Remove fillermark`,
            selected: msg`Remove fillermarks from selected`,
        },
        confirmation: msg`{count, plural, one {You are about to remove one fillermark} other {You are about to remove # fillermarks}}`,
        success: msg`{count, plural, one {Chapter fillermark removed} other {# chapter fillermarks removed}}`,
        error: msg`{count, plural, one {Could not remove the fillermark} other {Could not remove the fillermarks}}`,
    },
    mark_as_read: {
        action: {
            single: msg`Mark as read`,
            selected: msg`Mark selected as read`,
        },
        confirmation: msg`{count, plural, one {You are about to mark one chapter as read} other {You are about to mark # chapters as read}}`,
        success: msg`{count, plural, one {Chapter marked as read} other {# chapters marked as read}}`,
        error: msg`{count, plural, one {Could not mark the chapter as read} other {Could not mark chapters as read}}`,
    },
    mark_as_unread: {
        action: {
            single: msg`Mark as unread`,
            selected: msg`Mark selected as unread`,
        },
        confirmation: msg`{count, plural, one {You are about to mark one chapter as unread} other {You are about to mark # chapters as unread}}`,
        success: msg`{count, plural, one {Chapter marked as unread} other {# chapters marked as unread}}`,
        error: msg`{count, plural, one {Could not mark the chapter as unread} other {Could not mark chapters as unread}}`,
    },
};
