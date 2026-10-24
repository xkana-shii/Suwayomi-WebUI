/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import { useLingui } from '@lingui/react/macro';
import { ListSubheader } from '@/base/components/lists/ListSubheader.tsx';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { makeToast } from '@/base/utils/Toast.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import {
    createUpdateMetadataServerSettings,
    useMetadataServerSettings,
} from '@/features/settings/services/ServerSettingsMetadata.ts';
import type { MetadataKomikkuPortSettings } from '@/features/settings/Settings.types.ts';
import { BOOKMARK_COLORS } from '@/features/chapter/bookmark/BookmarkColor.ts';
import { BookmarkColorSwatch } from '@/features/chapter/bookmark/BookmarkColorMenu.tsx';

/** fork (Komikku port): Smart Scanlator Merge, automatic refresh and bookmark color settings */
export const ChapterSettingsSection = () => {
    const { t } = useLingui();
    const { settings } = useMetadataServerSettings();
    const userSettings = requestManager.useGetKomikkuPortUserSettings();
    const smartScanlatorMerge = !!userSettings.data?.userSettings.smartScanlatorMerge;

    const setMetadataSetting = createUpdateMetadataServerSettings<keyof MetadataKomikkuPortSettings>((e) =>
        makeToast(t`Failed to save changes`, 'error', getErrorMessage(e)),
    );

    return (
        <List
            subheader={
                <ListSubheader component="div" id="library-chapter-settings">
                    {t`Chapters`}
                </ListSubheader>
            }
        >
            <ListItem>
                <ListItemText
                    primary={t`Smart Scanlator Merge`}
                    secondary={t`Show one release per chapter number, chosen by each manga's scanlator order and range rules. A manga can override this in its scanlator settings.`}
                />
                <Switch
                    edge="end"
                    checked={smartScanlatorMerge}
                    disabled={userSettings.loading}
                    onChange={(e) =>
                        requestManager
                            .setSmartScanlatorMerge(e.target.checked)
                            .response.catch((error) =>
                                makeToast(t`Failed to save changes`, 'error', getErrorMessage(error)),
                            )
                    }
                />
            </ListItem>
            <ListItem>
                <ListItemText
                    primary={t`Refresh opened entries`}
                    secondary={t`Update the details and chapters of a manga in the background when its page is opened. The saved data is shown right away.`}
                />
                <Switch
                    edge="end"
                    checked={settings.autoRefreshOpenedManga}
                    onChange={(e) => setMetadataSetting('autoRefreshOpenedManga', e.target.checked)}
                />
            </ListItem>
            <ListItem>
                <ListItemText
                    primary={t`Default bookmark color`}
                    secondary={t`Used when bookmarking with a click. Hold or right click a bookmark button to pick another color.`}
                />
                <TextField
                    select
                    size="small"
                    value={settings.defaultBookmarkColor}
                    onChange={(e) => setMetadataSetting('defaultBookmarkColor', Number(e.target.value))}
                    sx={{ minWidth: 140 }}
                    slotProps={{ htmlInput: { 'aria-label': t`Default bookmark color` } }}
                >
                    {BOOKMARK_COLORS.map(({ id, label }) => (
                        <MenuItem key={id} value={id}>
                            <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                                <BookmarkColorSwatch color={id} size={14} />
                                {t(label)}
                            </Stack>
                        </MenuItem>
                    ))}
                </TextField>
            </ListItem>
            <ListItem>
                <ListItemText
                    primary={t`Remember the last bookmark color`}
                    secondary={t`A click bookmarks with the color last picked from the color menu`}
                />
                <Switch
                    edge="end"
                    checked={settings.rememberLastBookmarkColor}
                    onChange={(e) => setMetadataSetting('rememberLastBookmarkColor', e.target.checked)}
                />
            </ListItem>
        </List>
    );
};
