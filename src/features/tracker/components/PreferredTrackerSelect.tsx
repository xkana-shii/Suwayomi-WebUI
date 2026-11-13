/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Notifications } from '@/base/notification/Notifications.ts';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { useLingui } from '@lingui/react/macro';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { GET_MANGA_META } from '@/lib/graphql/manga/MangaQuery.ts';
import type { GetMangaMetaQuery, GetMangaMetaQueryVariables } from '@/lib/graphql/generated/graphql.ts';
import { updateMangaMetadata, useGetMangaMetadata } from '@/features/manga/services/MangaMetadata.ts';
import { useMetadataServerSettings } from '@/features/settings/services/ServerSettingsMetadata.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { STABLE_EMPTY_ARRAY } from '@/base/Base.constants.ts';

const FOLLOW_GLOBAL = 0;

/**
 * fork (Komikku port): the tracker this manga's metadata autofill uses. "Follow global" uses the global preferred
 * tracker (Library settings). Saved immediately in the user's manga meta, so it is backed up with the manga.
 */
export const PreferredTrackerSelect = ({
    mangaId,
    trackers,
}: {
    mangaId: number;
    /** trackers that provide metadata */
    trackers: { id: number; name: string }[];
}) => {
    const { t } = useLingui();
    const { data } = requestManager.useGetManga<GetMangaMetaQuery, GetMangaMetaQueryVariables>(GET_MANGA_META, mangaId);
    const manga = data?.manga ?? { id: mangaId, meta: STABLE_EMPTY_ARRAY };
    const { preferredTrackerId } = useGetMangaMetadata(manga);
    const {
        settings: { preferredMetadataTrackerId },
    } = useMetadataServerSettings();

    const globalName = trackers.find((tracker) => tracker.id === preferredMetadataTrackerId)?.name ?? t`Ask`;

    return (
        <TextField
            select
            size="small"
            fullWidth
            label={t`Preferred tracker for metadata`}
            value={trackers.some((tracker) => tracker.id === preferredTrackerId) ? preferredTrackerId : FOLLOW_GLOBAL}
            disabled={!data}
            onChange={(e) =>
                updateMangaMetadata(manga, 'preferredTrackerId', Number(e.target.value)).catch((error) =>
                    Notifications.error(t`Failed to save changes`, getErrorMessage(error)),
                )
            }
        >
            <MenuItem value={FOLLOW_GLOBAL}>{t`Follow global (${globalName})`}</MenuItem>
            {trackers.map((tracker) => (
                <MenuItem key={tracker.id} value={tracker.id}>
                    {tracker.name}
                </MenuItem>
            ))}
        </TextField>
    );
};
