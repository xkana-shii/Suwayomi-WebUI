/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { MangaCard } from '@/features/manga/components/cards/MangaCard.tsx';
import { StyledGroupedVirtuoso } from '@/base/components/virtuoso/StyledGroupedVirtuoso.tsx';
import { StyledGroupHeader } from '@/base/components/virtuoso/StyledGroupHeader.tsx';
import type { GetMangasDuplicatesQuery, GetMangasDuplicatesQueryVariables } from '@/lib/graphql/generated/graphql.ts';
import { GET_MANGAS_DUPLICATES } from '@/lib/graphql/manga/MangaQuery.ts';
import { BaseMangaGrid } from '@/features/manga/components/BaseMangaGrid.tsx';
import type { IMangaGridProps } from '@/features/manga/components/MangaGrid.tsx';
import { StyledGroupItemWrapper } from '@/base/components/virtuoso/StyledGroupItemWrapper.tsx';
import { VirtuosoUtil } from '@/lib/virtuoso/Virtuoso.util.tsx';
import type {
    LibraryDuplicatesWorkerInput,
    TMangaDuplicate,
    TMangaDuplicates,
} from '@/features/library/Library.types.ts';
import { GridLayout } from '@/base/Base.types.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { useAppTitleAndAction } from '@/features/navigation-bar/hooks/useAppTitleAndAction.ts';

// ------------- Hyperlink helpers for certain trackers -------------
const TRACKER_URLS: Record<string, (remoteId: string) => string> = {
    // 1: MyAnimeList
    '1': (id) => `https://myanimelist.net/manga/${id}`,
    // 4: MangaUpdates
    '4': (id) => `https://www.mangaupdates.com/series.html?id=${id}`,
    // 7: MangaBaka
    '7': (id) => `https://mangabaka.org/${id}`,
};

function getTrackerGroupInfo(groupLabel: string, groupMangas: Array<any>): { url: string; title: string } | null {
    const match = groupLabel.match(/\((\d+)::(\d+)\)$/);
    if (!match) {return null;}
    const [, trackerId, remoteId] = match;
    const urlMaker = TRACKER_URLS[trackerId];
    if (!urlMaker) {return null;}

    let remoteTitle: string | undefined;
    for (const manga of groupMangas) {
        const records = Array.isArray(manga.trackRecords) ? manga.trackRecords : (manga.trackRecords?.nodes ?? []);
        for (const rec of records) {
            if (String(rec.trackerId) === trackerId && String(rec.remoteId) === remoteId && rec.remoteTitle) {
                ({ remoteTitle } = rec);
                break;
            }
        }
        if (remoteTitle) {break;}
    }

    return { url: urlMaker(remoteId), title: remoteTitle || groupLabel };
}
// -----------------------------------------------------------------

export const LibraryDuplicates = () => {
    const { t } = useLingui();

    const [gridLayout, setGridLayout] = useLocalStorage('libraryDuplicatesGridLayout', GridLayout.List);
    const [checkAlternativeTitles, setCheckAlternativeTitles] = useLocalStorage(
        'libraryDuplicatesCheckAlternativeTitles',
        false,
    );

    const [checkTrackedBySameTracker, setCheckTrackedBySameTracker] = useLocalStorage(
        'libraryDuplicatesCheckTrackedBySameTracker',
        false,
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

    const [mangasByTitle, setMangasByTitle] = useState<Record<string, TMangaDuplicate[]>>({});
    useEffect(() => {
        setIsCheckingForDuplicates(true);
        const libraryMangas: TMangaDuplicate[] = data?.mangas.nodes ?? [];

        if (!libraryMangas.length) {
            setMangasByTitle({});
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

        const worker = new Worker(new URL('../workers/LibraryDuplicatesWorker.ts', import.meta.url), {
            type: 'module',
        });

        worker.onmessage = (event: MessageEvent<any>) => {
            const payload = event.data as
                | TMangaDuplicates<(typeof workerMangas)[number]>
                | {
                      result: TMangaDuplicates<(typeof workerMangas)[number]>;
                      debugSamples?: { idA: string; idB: string; aDist: number; pDist: number; avg: number }[];
                      thresholdUsed?: number;
                  };

            const debugSamples = (payload as any).debugSamples ?? undefined;

            if (payload && (debugSamples || (payload as any).thresholdUsed !== undefined)) {
                setMangasByTitle((payload as any).result ?? {});
                setIsCheckingForDuplicates(false);
                return;
            }

            setMangasByTitle((payload as TMangaDuplicates<(typeof workerMangas)[number]>) ?? {});
            setIsCheckingForDuplicates(false);
        };

        worker.postMessage({
            mangas: workerMangas,
            checkAlternativeTitles,
            checkTrackedBySameTracker,
            checkImageHashes,
            debug: true,
        } satisfies LibraryDuplicatesWorkerInput & { debug?: boolean });

        return () => worker.terminate();
    }, [data?.mangas.nodes, checkAlternativeTitles, checkTrackedBySameTracker, checkImageHashes]);

    const duplicatedTitles = useMemo(
        () => Object.keys(mangasByTitle).toSorted((titleA, titleB) => titleA.localeCompare(titleB)),
        [mangasByTitle],
    );
    const duplicatedMangas = useMemo(() => duplicatedTitles.flatMap((title) => mangasByTitle[title]), [mangasByTitle]);

    const duplicateGroupsCount = duplicatedTitles.length;
    const duplicateMangasCount = duplicatedMangas.length;

    const countsRef = useRef(0);
    useEffect(() => {
        countsRef.current = duplicateGroupsCount + duplicateMangasCount;
    }, [duplicateGroupsCount, duplicateMangasCount]);

    const mangasCountByTitle = useMemo(
        () => duplicatedTitles.map((title) => mangasByTitle[title]).map((mangas) => mangas.length),
        [mangasByTitle],
    );

    const computeItemKey = VirtuosoUtil.useCreateGroupedComputeItemKey(
        mangasCountByTitle,
        useCallback((index) => duplicatedTitles[index], [duplicatedTitles]),
        useCallback(
            (index, groupIndex) => `${duplicatedTitles[groupIndex]}-${duplicatedMangas[index].id}}`,
            [duplicatedTitles, duplicatedMangas],
        ),
    );

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

    if (gridLayout === GridLayout.List) {
        return (
            <StyledGroupedVirtuoso
                persistKey="library-duplicates"
                groupCounts={mangasCountByTitle}
                groupContent={(index) => (
                    <StyledGroupHeader isFirstItem={index === 0}>
                        <Typography variant="h5" component="h2">
                            {(() => {
                                const info = getTrackerGroupInfo(
                                    duplicatedTitles[index],
                                    mangasByTitle[duplicatedTitles[index]],
                                );
                                return info ? (
                                    <a
                                        href={info.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: 'inherit', textDecoration: 'underline' }}
                                    >
                                        {info.title}
                                    </a>
                                ) : (
                                    duplicatedTitles[index]
                                );
                            })()}
                        </Typography>
                    </StyledGroupHeader>
                )}
                computeItemKey={computeItemKey}
                itemContent={(index) => (
                    <StyledGroupItemWrapper>
                        <MangaCard
                            manga={duplicatedMangas[index] as IMangaGridProps['mangas'][number]}
                            gridLayout={gridLayout}
                            selected={null}
                            mode="duplicate"
                        />
                    </StyledGroupItemWrapper>
                )}
            />
        );
    }

    return duplicatedTitles.map((title, index) => (
        <Box key={title}>
            <StyledGroupHeader sx={{ pt: index === 0 ? undefined : 0, pb: 0 }} isFirstItem={false}>
                <Typography variant="h5" component="h2">
                    {(() => {
                        const info = getTrackerGroupInfo(title, mangasByTitle[title]);
                        return info ? (
                            <a
                                href={info.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'inherit', textDecoration: 'underline' }}
                            >
                                {info.title}
                            </a>
                        ) : (
                            title
                        );
                    })()}
                </Typography>
            </StyledGroupHeader>
            <BaseMangaGrid
                key={`${checkAlternativeTitles.toString()}-${checkImageHashes.toString()}`}
                mangas={mangasByTitle[title] as IMangaGridProps['mangas']}
                hasNextPage={false}
                loadMore={() => {}}
                isLoading={false}
                gridLayout={gridLayout}
                inLibraryIndicator={false}
                horizontal
                mode="duplicate"
            />
        </Box>
    ));
};
