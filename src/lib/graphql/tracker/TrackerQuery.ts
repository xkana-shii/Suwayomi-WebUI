/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import gql from 'graphql-tag';
import { PAGE_INFO } from '@/lib/graphql/common/Fragments.ts';
import { TRACKER_BIND_FIELDS, TRACKER_SETTING_FIELDS } from '@/lib/graphql/tracker/TrackFragments.ts';
import { TRACK_RECORD_SEARCH_FIELDS } from '@/lib/graphql/tracker/TrackRecordFragments.ts';

export const GET_TRACKERS_SETTINGS = gql`
    ${PAGE_INFO}
    ${TRACKER_SETTING_FIELDS}

    query GET_TRACKERS_SETTINGS {
        trackers {
            totalCount
            pageInfo {
                ...PAGE_INFO
            }
            nodes {
                ...TRACKER_SETTING_FIELDS
            }
        }
    }
`;

export const GET_TRACKERS_BIND = gql`
    ${PAGE_INFO}
    ${TRACKER_BIND_FIELDS}

    query GET_TRACKERS_BIND {
        trackers {
            totalCount
            pageInfo {
                ...PAGE_INFO
            }
            nodes {
                ...TRACKER_BIND_FIELDS
            }
        }
    }
`;

export const TRACKER_SEARCH = gql`
    ${TRACK_RECORD_SEARCH_FIELDS}

    query TRACKER_SEARCH($query: String!, $trackerId: Int!) {
        searchTracker(input: { query: $query, trackerId: $trackerId }) {
            trackSearches {
                ...TRACK_RECORD_SEARCH_FIELDS
            }
        }
    }
`;

// fork (Komikku port): metadata of a tracker binding, to fill the metadata editor
export const GET_TRACKER_MANGA_METADATA = gql`
    query GET_TRACKER_MANGA_METADATA($mangaId: Int!, $trackerId: Int!) {
        trackerMangaMetadata(mangaId: $mangaId, trackerId: $trackerId) {
            trackerId
            title
            author
            artist
            description
            genre
            status
            thumbnailUrl
        }
    }
`;

// fork (Komikku port): the trackers a manga can be autofilled from
export const GET_MANGA_AUTOFILL_TRACKERS = gql`
    query GET_MANGA_AUTOFILL_TRACKERS($mangaId: Int!) {
        manga(id: $mangaId) {
            id
            trackRecords {
                nodes {
                    id
                    trackerId
                    title
                }
            }
        }
        trackers {
            nodes {
                id
                name
                icon
                supportsMangaMetadata
            }
        }
    }
`;
