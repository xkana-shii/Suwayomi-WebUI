/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useLingui } from '@lingui/react/macro';
import { CustomTooltip } from '@/base/components/CustomTooltip.tsx';
import { BookmarkedFilterWithColors } from '@/features/chapter/bookmark/BookmarkedFilterWithColors.tsx';
import {
    createUpdateMetadataServerSettings,
    useMetadataServerSettings,
} from '@/features/settings/services/ServerSettingsMetadata.ts';
import { makeToast } from '@/base/utils/Toast.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import type { ChapterFilterInput } from '@/lib/graphql/generated/graphql-base.types.ts';
import type { MetadataKomikkuPortSettings } from '@/features/settings/Settings.types.ts';

/** fork (Komikku port): the server-side chapter filter of the Updates bookmark filter */
export const useUpdatesBookmarkFilter = (): ChapterFilterInput => {
    const {
        settings: { updatesBookmarked, updatesBookmarkColorsIncluded, updatesBookmarkColorsExcluded },
    } = useMetadataServerSettings();

    if (updatesBookmarked === false) {
        return { isBookmarked: { equalTo: false } };
    }
    if (updatesBookmarked !== true) {
        return {};
    }
    const hasColors = !!updatesBookmarkColorsIncluded.length || !!updatesBookmarkColorsExcluded.length;
    return {
        isBookmarked: { equalTo: true },
        ...(hasColors && {
            bookmarkColor: {
                in: updatesBookmarkColorsIncluded.length ? updatesBookmarkColorsIncluded : undefined,
                notIn: updatesBookmarkColorsExcluded.length ? updatesBookmarkColorsExcluded : undefined,
            },
        }),
    };
};

export const UpdatesFilterButton = () => {
    const { t } = useLingui();
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const {
        settings: { updatesBookmarked, updatesBookmarkColorsIncluded, updatesBookmarkColorsExcluded },
    } = useMetadataServerSettings();
    const updateSetting = createUpdateMetadataServerSettings<keyof MetadataKomikkuPortSettings>((e) =>
        makeToast(t`Failed to save changes`, 'error', getErrorMessage(e)),
    );

    return (
        <>
            <CustomTooltip title={t`Filter`}>
                <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)} aria-label={t`Filter`}>
                    <FilterListIcon color={updatesBookmarked != null ? 'warning' : undefined} />
                </IconButton>
            </CustomTooltip>
            <Popover
                open={!!anchorEl}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Stack sx={{ p: 2, minWidth: 260 }}>
                    <BookmarkedFilterWithColors
                        bookmarked={updatesBookmarked}
                        onBookmarkedChange={(checked) => updateSetting('updatesBookmarked', checked)}
                        included={updatesBookmarkColorsIncluded}
                        excluded={updatesBookmarkColorsExcluded}
                        onColorsChange={(included, excluded) => {
                            updateSetting('updatesBookmarkColorsIncluded', included);
                            updateSetting('updatesBookmarkColorsExcluded', excluded);
                        }}
                    />
                </Stack>
            </Popover>
        </>
    );
};
