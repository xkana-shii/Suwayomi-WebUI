/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import { ListSubheader } from '@/base/components/lists/ListSubheader.tsx';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { useLingui } from '@lingui/react/macro';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { CustomTooltip } from '@/base/components/CustomTooltip.tsx';
import { makeToast } from '@/base/utils/Toast.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import {
    createUpdateMetadataServerSettings,
    useMetadataServerSettings,
} from '@/features/settings/services/ServerSettingsMetadata.ts';
import type { GetTrackerMangaMetadataQuery } from '@/lib/graphql/generated/graphql.ts';

export type TrackerMangaMetadata = GetTrackerMangaMetadataQuery['trackerMangaMetadata'];

const updateSetting = createUpdateMetadataServerSettings<'preferredMetadataTrackerId'>();

/**
 * fork (Komikku port of MetadataAutofill): fills the metadata editor from one of the manga's trackers that provide
 * metadata (MyAnimeList, AniList, MangaUpdates, MangaBaka). Nothing is saved: the values are only put into the editor
 * for review. With several trackers the user picks one, unless a preferred tracker is set.
 */
export const TrackerAutofillButton = ({
    mangaId,
    onFill,
}: {
    mangaId: number;
    onFill: (metadata: TrackerMangaMetadata, trackerName: string) => void;
}) => {
    const { t } = useLingui();
    const {
        settings: { preferredMetadataTrackerId },
    } = useMetadataServerSettings();
    const { data, loading } = requestManager.useGetMangaAutofillTrackers(mangaId);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [rememberChoice, setRememberChoice] = useState(false);
    const [isFetching, setIsFetching] = useState(false);

    const eligibleTrackers = useMemo(() => {
        const trackedIds = new Set(data?.manga.trackRecords.nodes.map((record) => record.trackerId) ?? []);
        return (data?.trackers.nodes ?? []).filter(
            (tracker) => tracker.supportsMangaMetadata && trackedIds.has(tracker.id),
        );
    }, [data]);

    const autofill = async (tracker: (typeof eligibleTrackers)[number]) => {
        setAnchorEl(null);
        if (rememberChoice) {
            updateSetting('preferredMetadataTrackerId', tracker.id);
        }
        setIsFetching(true);
        try {
            const result = await requestManager.getTrackerMangaMetadata(mangaId, tracker.id).response;
            const metadata = result.data?.trackerMangaMetadata;
            const hasData =
                !!metadata &&
                ([metadata.title, metadata.author, metadata.artist, metadata.description, metadata.status].some(
                    Boolean,
                ) ||
                    !!metadata.genre.length);
            if (!metadata || !hasData) {
                makeToast(t`${tracker.name} has no metadata for this entry`, 'warning');
                return;
            }
            onFill(metadata, tracker.name);
            makeToast(t`Filled from ${tracker.name}. Review the changes and save.`, 'info');
        } catch (e) {
            makeToast(t`Could not load metadata from ${tracker.name}`, 'error', getErrorMessage(e));
        } finally {
            setIsFetching(false);
        }
    };

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        const preferred = eligibleTrackers.find((tracker) => tracker.id === preferredMetadataTrackerId);
        if (preferred) {
            autofill(preferred);
            return;
        }
        if (eligibleTrackers.length === 1) {
            autofill(eligibleTrackers[0]);
            return;
        }
        // several trackers: ask, the results can differ
        setAnchorEl(event.currentTarget);
    };

    const isDisabled = loading || isFetching || !eligibleTrackers.length;

    return (
        <>
            <CustomTooltip
                title={
                    eligibleTrackers.length
                        ? t`Fill the fields from a tracker. Hold or right click to choose the tracker.`
                        : t`Track this entry with MyAnimeList, AniList, MangaUpdates or MangaBaka to autofill its metadata`
                }
            >
                <span>
                    <Button
                        size="small"
                        variant="outlined"
                        disabled={isDisabled}
                        startIcon={isFetching ? <CircularProgress size={16} /> : <AutoFixHighIcon />}
                        onClick={handleClick}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            if (eligibleTrackers.length) {
                                setAnchorEl(e.currentTarget);
                            }
                        }}
                    >
                        {t`Autofill from tracker`}
                    </Button>
                </span>
            </CustomTooltip>
            <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
                <ListSubheader>{t`Autofill from`}</ListSubheader>
                {eligibleTrackers.map((tracker) => (
                    <MenuItem key={tracker.id} onClick={() => autofill(tracker)}>
                        <ListItemText
                            primary={tracker.name}
                            secondary={tracker.id === preferredMetadataTrackerId ? t`Preferred` : undefined}
                        />
                    </MenuItem>
                ))}
                <Divider />
                <MenuItem disableRipple onClick={(e) => e.preventDefault()}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                size="small"
                                checked={rememberChoice}
                                onChange={(e) => setRememberChoice(e.target.checked)}
                            />
                        }
                        label={t`Always use this tracker`}
                    />
                </MenuItem>
            </Menu>
        </>
    );
};
