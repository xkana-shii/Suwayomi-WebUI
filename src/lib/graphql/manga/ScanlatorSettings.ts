/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import gql from 'graphql-tag';

// fork (Komikku port): Smart Scanlator Merge and chapter blacklist settings of a manga

export const MANGA_SCANLATOR_SETTINGS_FIELDS = gql`
    fragment MANGA_SCANLATOR_SETTINGS_FIELDS on MangaScanlatorSettingsType {
        mangaId
        scanlatorPriority
        scanlatorRangeRules {
            from
            to
            scanlator
        }
        smartMergeMode
        smartMergeEnabled
        blacklistedChapters {
            key
            chapterIds
            chapterNames
            chapterNumber
            scanlator
        }
    }
`;

export const GET_MANGA_SCANLATOR_SETTINGS = gql`
    ${MANGA_SCANLATOR_SETTINGS_FIELDS}

    query GET_MANGA_SCANLATOR_SETTINGS($id: Int!) {
        manga(id: $id) {
            id
            scanlatorSettings {
                ...MANGA_SCANLATOR_SETTINGS_FIELDS
            }
        }
    }
`;

const MANGA_VISIBILITY_CHANGE_FIELDS = gql`
    ${MANGA_SCANLATOR_SETTINGS_FIELDS}

    fragment MANGA_VISIBILITY_CHANGE_FIELDS on MangaType {
        id
        unreadCount
        bookmarkCount
        firstUnreadChapter {
            id
        }
        scanlatorSettings {
            ...MANGA_SCANLATOR_SETTINGS_FIELDS
        }
        chapters {
            nodes {
                id
                isBlacklisted
                isMergeHidden
            }
        }
    }
`;

export const UPDATE_MANGA_SCANLATOR_SETTINGS = gql`
    ${MANGA_VISIBILITY_CHANGE_FIELDS}

    mutation UPDATE_MANGA_SCANLATOR_SETTINGS($input: UpdateMangaScanlatorSettingsInput!) {
        updateMangaScanlatorSettings(input: $input) {
            manga {
                ...MANGA_VISIBILITY_CHANGE_FIELDS
            }
        }
    }
`;

export const COPY_FILLERMARKS_TO_BLACKLIST = gql`
    ${MANGA_VISIBILITY_CHANGE_FIELDS}

    mutation COPY_FILLERMARKS_TO_BLACKLIST($input: CopyFillermarksToBlacklistInput!) {
        copyFillermarksToBlacklist(input: $input) {
            manga {
                ...MANGA_VISIBILITY_CHANGE_FIELDS
            }
        }
    }
`;
