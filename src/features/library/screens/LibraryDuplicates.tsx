/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useState } from 'react';
import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import PopupState, { bindMenu, bindTrigger } from 'material-ui-popup-state';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useLingui } from '@lingui/react/macro';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { useLocalStorage } from '@/base/hooks/useStorage.tsx';
import { GridLayouts } from '@/base/components/GridLayouts.tsx';
import { CheckboxInput } from '@/base/components/inputs/CheckboxInput.tsx';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { EmptyViewAbsoluteCentered } from '@/base/components/feedback/EmptyViewAbsoluteCentered.tsx';
import { defaultPromiseErrorHandler } from '@/lib/DefaultPromiseErrorHandler.ts';
import { StyledGroupHeader } from '@/base/components/virtuoso/StyledGroupHeader.tsx';
import { BaseMangaGrid } from '@/features/manga/components/BaseMangaGrid.tsx';
import type { IMangaGridProps } from '@/features/manga/components/MangaGrid.tsx';
import type { LibraryDuplicatesWorkerInput, TMangaDuplicate } from '@/features/library/Library.types.ts';
import { GridLayout } from '@/base/Base.types.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { useAppTitleAndAction } from '@/features/navigation-bar/hooks/useAppTitleAndAction.ts';
import type { GetMangasDuplicatesQuery, GetMangasDuplicatesQueryVariables } from '@/lib/graphql/generated/graphql.ts';
import { GET_MANGAS_DUPLICATES } from '@/lib/graphql/manga/MangaQuery.ts';

// ---- Type for the worker output ----
interface TrackerGroupHeader {
    kind: 'MAL' | 'MU' | 'MB';
    trackerId: string;
    remoteId: string;
    remoteTitle: string;
}
type WorkerGroupResult = {
    trackers: TrackerGroupHeader[];
    members: TMangaDuplicate[];
}[];

// ---- Hyperlink helpers for trackers ----
function trackerUrl(tr: TrackerGroupHeader): string {
    if (tr.kind === 'MU') {
        // remoteId is the MU slug, NOT a numeric id!
        return `https://www.mangaupdates.com/series/${tr.remoteId}`;
    }
    if (tr.kind === 'MAL') {
        return `https://myanimelist.net/manga/${tr.remoteId}`;
    }
    if (tr.kind === 'MB') {
        return `https://mangabaka.org/${tr.remoteId}`;
    }
    return '#';
}

export const LibraryDuplicates = () => {
    const { t } = useLingui();

    const [gridLayout, setGridLayout] = useLocalStorage('libraryDuplicatesGridLayout', GridLayout.List);
    const [checkAlternativeTitles, setCheckAlternativeTitles] = useLocalStorage(
        'libraryDuplicatesCheckAlternativeTitles',
        false,
    );
    const [checkTrackedBySameTracker, setCheckTrackedBySameTracker] = useLocalStorage(
        'libraryDuplicatesCheckTrackedBySameTracker',
        true,
    );
    const [checkImageHashes, setCheckImageHashes] = useLocalStorage('libraryDuplicatesCheckImageHashes', false);

    useAppTitleAndAction(
        t`Duplicated entries`,
        <>
            <GridLayouts gridLayout={gridLayout} onChange={setGridLayout} />
            <PopupState variant="popover" popupId="library-dupliactes-settings">
                {(popupstate) => (
                    <>
                        <IconButton {...bindTrigger(popupstate)} color="inherit">
                            <SettingsIcon />
                        </IconButton>
                        <Menu {...bindMenu(popupstate)}>
                            <MenuItem>
                                <CheckboxInput
                                    label={t`Check description`}
                                    checked={checkAlternativeTitles}
                                    onChange={(_, checked) => {
                                        setCheckAlternativeTitles(checked);
                                        if (checked) {
                                            setCheckTrackedBySameTracker(false);
                                            setCheckImageHashes(false);
                                        }
                                    }}
                                />
                            </MenuItem>
                            <MenuItem>
                                <CheckboxInput
                                    label={t`Check tracker bindings`}
                                    checked={checkTrackedBySameTracker}
                                    onChange={(_, checked) => {
                                        setCheckTrackedBySameTracker(checked);
                                        if (checked) {
                                            setCheckAlternativeTitles(false);
                                            setCheckImageHashes(false);
                                        }
                                    }}
                                />
                            </MenuItem>
                            <MenuItem>
                                <CheckboxInput
                                    label={t`Check image hashes`}
                                    checked={checkImageHashes}
                                    onChange={(_, checked) => {
                                        setCheckImageHashes(checked);
                                        if (checked) {
                                            setCheckAlternativeTitles(false);
                                            setCheckTrackedBySameTracker(false);
                                        }
                                    }}
                                />
                            </MenuItem>
                        </Menu>
                    </>
                )}
            </PopupState>
        </>,
        [t, gridLayout, checkAlternativeTitles, checkTrackedBySameTracker, checkImageHashes],
    );

    const { data, loading, error, refetch } = requestManager.useGetMangas<
        GetMangasDuplicatesQuery,
        GetMangasDuplicatesQueryVariables
    >(GET_MANGAS_DUPLICATES, { condition: { inLibrary: true } });

    const [isCheckingForDuplicates, setIsCheckingForDuplicates] = useState(true);

    const [groupsFromWorker, setGroupsFromWorker] = useState<WorkerGroupResult>([]);
    useEffect(() => {
        setIsCheckingForDuplicates(true);
        const libraryMangas: TMangaDuplicate[] = data?.mangas.nodes ?? [];

        if (!libraryMangas.length) {
            setGroupsFromWorker([]);
            return () => {};
        }

        const workerMangas = libraryMangas.map((m) => ({
            id: m.id,
            title: (m as any).title,
            description: (m as any).description,
            thumbnailUrl: (m as any).thumbnailUrl,
            trackRecords: (m as any).trackRecords?.nodes?.map((n: any) => ({
                trackerId: n.trackerId,
                remoteId: n.remoteId,
                remoteTitle: n.remoteTitle,
            })),
        }));

        const worker = new Worker(new URL('../workers/LibraryDuplicatesTrackerWorker.ts', import.meta.url), {
            type: 'module',
        });

        worker.onmessage = (event: MessageEvent<WorkerGroupResult>) => {
            setGroupsFromWorker(event.data ?? []);
            setIsCheckingForDuplicates(false);
        };

        worker.postMessage({
            mangas: workerMangas,
            checkAlternativeTitles,
            checkTrackedBySameTracker,
            checkImageHashes,
            debug: false,
        } as LibraryDuplicatesWorkerInput);

        return () => worker.terminate();
    }, [data?.mangas.nodes, checkAlternativeTitles, checkTrackedBySameTracker, checkImageHashes]);

    if (loading || isCheckingForDuplicates) {
        return <LoadingPlaceholder />;
    }

    if (error) {
        return (
            <EmptyViewAbsoluteCentered
                message={t`Unable to load data`}
                messageExtra={getErrorMessage(error)}
                retry={() => refetch().catch(defaultPromiseErrorHandler('LibraryDuplicates::refetch'))}
            />
        );
    }

    if (groupsFromWorker.length === 0) {
        return <EmptyViewAbsoluteCentered message={t`No duplicate tracker groups found`} />;
    }

    return (
        <>
            {groupsFromWorker.map((group, groupIdx) => (
                <Box key={group.trackers.map((tracker) => `${tracker.kind}:${tracker.remoteId}`).join(',')}>
                    <StyledGroupHeader sx={{ pt: groupIdx === 0 ? undefined : 0, pb: 0 }} isFirstItem={groupIdx === 0}>
                        <Typography variant="h5" component="h2">
                            {group.trackers.map((tracker, i) => {
                                const url = trackerUrl(tracker);
                                const label = tracker.remoteTitle
                                    ? `${tracker.kind}: ${tracker.remoteTitle}`
                                    : `${tracker.kind}: ${tracker.remoteId}`;
                                return (
                                    <span key={tracker.kind + tracker.remoteId}>
                                        <a
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: 'inherit', textDecoration: 'underline', marginRight: 8 }}
                                        >
                                            {label}
                                        </a>
                                        {i < group.trackers.length - 1 && ', '}
                                    </span>
                                );
                            })}
                        </Typography>
                    </StyledGroupHeader>
                    <BaseMangaGrid
                        mangas={group.members as IMangaGridProps['mangas']}
                        hasNextPage={false}
                        loadMore={() => {}}
                        isLoading={false}
                        gridLayout={gridLayout}
                        inLibraryIndicator={false}
                        horizontal
                        mode="duplicate"
                    />
                </Box>
            ))}
        </>
    );
};
