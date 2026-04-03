/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Typography from '@mui/material/Typography';
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLingui } from '@lingui/react/macro';
import { Link } from 'react-router-dom';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { EmptyViewAbsoluteCentered } from '@/base/components/feedback/EmptyViewAbsoluteCentered.tsx';
import { UpdateChecker } from '@/features/updates/components/UpdateChecker.tsx';
import { StyledGroupedVirtuoso } from '@/base/components/virtuoso/StyledGroupedVirtuoso.tsx';
import { StyledGroupHeader } from '@/base/components/virtuoso/StyledGroupHeader.tsx';
import { StyledGroupItemWrapper } from '@/base/components/virtuoso/StyledGroupItemWrapper.tsx';
import { dateTimeFormatter } from '@/base/utils/DateHelper.ts';
import { defaultPromiseErrorHandler } from '@/lib/DefaultPromiseErrorHandler.ts';
import { VirtuosoUtil } from '@/lib/virtuoso/Virtuoso.util.tsx';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { useNavBarContext } from '@/features/navigation-bar/NavbarContext.tsx';
import { Chapters } from '@/features/chapter/services/Chapters.ts';
import { useAppTitleAndAction } from '@/features/navigation-bar/hooks/useAppTitleAndAction.ts';
import { GROUPED_VIRTUOSO_Z_INDEX } from '@/lib/virtuoso/Virtuoso.constants.ts';
import { STABLE_EMPTY_ARRAY } from '@/base/Base.constants.ts';
import type { ChapterUpdateListFieldsFragment } from '@/lib/graphql/generated/graphql.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { ChapterCardThumbnail } from '@/features/chapter/components/cards/ChapterCardThumbnail.tsx';
import { ChapterCardMetadata } from '@/features/chapter/components/cards/ChapterCardMetadata.tsx';
import { DownloadStateIndicator } from '@/base/components/downloads/DownloadStateIndicator.tsx';
import { ChapterDownloadButton } from '@/features/chapter/components/buttons/ChapterDownloadButton.tsx';
import { ChapterDownloadRetryButton } from '@/features/chapter/components/buttons/ChapterDownloadRetryButton.tsx';
import { ListCardContent } from '@/base/components/lists/cards/ListCardContent.tsx';

type MangaUpdateGroup = {
    mangaId: ChapterUpdateListFieldsFragment['manga']['id'];
    chapters: ChapterUpdateListFieldsFragment[];
};

export const Updates: React.FC = () => {
    const { t } = useLingui();
    const { appBarHeight } = useNavBarContext();

    const {
        data: chapterUpdateData,
        loading: isLoading,
        error,
        fetchMore,
        refetch,
    } = requestManager.useGetRecentlyUpdatedChapters(undefined, {
        fetchPolicy: 'cache-and-network',
        notifyOnNetworkStatusChange: true,
    });
    const hasNextPage = !!chapterUpdateData?.chapters.pageInfo.hasNextPage;
    const endCursor = chapterUpdateData?.chapters.pageInfo.endCursor;
    const updateEntries = chapterUpdateData?.chapters.nodes ?? STABLE_EMPTY_ARRAY;

    const groupedUpdates = useMemo(() => {
        const byDay = Chapters.groupByDate(updateEntries, 'fetchedAt');

        return Object.entries(byDay).map(([group, items]) => {
            const byManga = new Map<ChapterUpdateListFieldsFragment['manga']['id'], ChapterUpdateListFieldsFragment[]>();

            items.forEach((chapter) => {
                const mangaId = chapter.manga.id;
                const current = byManga.get(mangaId);
                if (current) {
                    current.push(chapter);
                } else {
                    byManga.set(mangaId, [chapter]);
                }
            });

            const mangaGroups: MangaUpdateGroup[] = Array.from(byManga.entries())
                .map(([mangaId, chapters]) => {
                    const sorted = [...chapters].sort(
                        (a, b) => Number(b.fetchedAt ?? 0) - Number(a.fetchedAt ?? 0),
                    );
                    return { mangaId, chapters: sorted };
                })
                .sort((a, b) => {
                    // chapters[0] is already the latest after sorting above
                    const aLatest = Number(a.chapters[0].fetchedAt ?? 0);
                    const bLatest = Number(b.chapters[0].fetchedAt ?? 0);
                    return bLatest - aLatest;
                });

            return [group, mangaGroups] as const;
        });
    }, [updateEntries]);

    const groupCounts: number[] = useMemo(
        () => groupedUpdates.map((group) => group[VirtuosoUtil.ITEMS].length),
        [groupedUpdates],
    );

    const updateEntriesFlattened = useMemo(
        () => groupedUpdates.flatMap((group) => group[VirtuosoUtil.ITEMS]),
        [groupedUpdates],
    );

    const computeItemKey = VirtuosoUtil.useCreateGroupedComputeItemKey(
        groupCounts,
        useCallback((index: number) => groupedUpdates[index][VirtuosoUtil.GROUP], [groupedUpdates]),
        useCallback(
            (index: number) => {
                const item = updateEntriesFlattened[index];
                // Prefix with date slice to avoid key collisions when the same manga
                // appears in multiple day groups
                const datePrefix = item.chapters[0].fetchedAt?.toString().slice(0, 10) ?? 'unknown';
                return `${datePrefix}-${item.mangaId}`;
            },
            [updateEntriesFlattened],
        ),
    );

    const lastUpdateTimestampCompRef = useRef<HTMLElement>(null);
    const [lastUpdateTimestampCompHeight, setLastUpdateTimestampCompHeight] = useState(0);
    useLayoutEffect(() => {
        setLastUpdateTimestampCompHeight(lastUpdateTimestampCompRef.current?.clientHeight ?? 0);
    }, [lastUpdateTimestampCompRef.current]);

    const { data: lastUpdateTimestampData } = requestManager.useGetLastGlobalUpdateTimestamp({
        /**
         * The {@link UpdateChecker} is responsible for updating the timestamp
         */
        fetchPolicy: 'cache-only',
    });
    const lastUpdateTimestamp = lastUpdateTimestampData?.lastUpdateTimestamp.timestamp;
    const date = lastUpdateTimestamp ? dateTimeFormatter.format(+lastUpdateTimestamp) : '-';

    useAppTitleAndAction(t`Updates`, <UpdateChecker />);

    // Use a Set for O(1) lookup instead of an array with O(n) .includes()
    const [expandedMangaIds, setExpandedMangaIds] = useState<Set<ChapterUpdateListFieldsFragment['manga']['id']>>(
        () => new Set(),
    );

    const toggleExpanded = useCallback((mangaId: ChapterUpdateListFieldsFragment['manga']['id']) => {
        setExpandedMangaIds((prev) => {
            const next = new Set(prev);
            if (next.has(mangaId)) {
                next.delete(mangaId);
            } else {
                next.add(mangaId);
            }
            return next;
        });
    }, []);

    const loadMore = useCallback(() => {
        if (!hasNextPage) {
            return;
        }

        fetchMore({ variables: { offset: updateEntries.length } });
    }, [hasNextPage, endCursor]);

    if (error) {
        return (
            <EmptyViewAbsoluteCentered
                message={t`Unable to load data`}
                messageExtra={getErrorMessage(error)}
                retry={() => refetch().catch(defaultPromiseErrorHandler('Updates::refetch'))}
            />
        );
    }

    if (!isLoading && updateEntries.length === 0) {
        return <EmptyViewAbsoluteCentered message={t`You don't have any updates yet.`} />;
    }

    return (
        <>
            <Typography
                ref={lastUpdateTimestampCompRef}
                sx={{
                    position: 'sticky',
                    top: appBarHeight,
                    zIndex: GROUPED_VIRTUOSO_Z_INDEX,
                    backgroundColor: 'background.default',
                    marginLeft: '10px',
                    paddingTop: (theme) => ({ [theme.breakpoints.up('sm')]: { paddingTop: '6px' } }),
                }}
            >
                {t`Last update: ${date}`}
            </Typography>
            <StyledGroupedVirtuoso
                persistKey="updates"
                heightToSubtract={lastUpdateTimestampCompHeight}
                components={{
                    Footer: () => (isLoading ? <LoadingPlaceholder usePadding /> : null),
                }}
                overscan={window.innerHeight * 0.5}
                endReached={loadMore}
                groupCounts={groupCounts}
                groupContent={(index) => (
                    <StyledGroupHeader isFirstItem={index === 0}>
                        <Typography variant="h5" component="h2">
                            {groupedUpdates[index][VirtuosoUtil.GROUP]}
                        </Typography>
                    </StyledGroupHeader>
                )}
                computeItemKey={computeItemKey}
                itemContent={(index) => {
                    const item = updateEntriesFlattened[index];
                    // chapters are pre-sorted in the groupedUpdates memo — no sort needed here
                    const primaryChapter = item.chapters[0];
                    const extraChapters = item.chapters.slice(1);

                    const expanded = expandedMangaIds.has(item.mangaId);
                    const { manga } = primaryChapter;

                    return (
                        <StyledGroupItemWrapper>
                            <Card>
                                <CardActionArea
                                    component={Link}
                                    to={AppRoutes.reader.path(primaryChapter.manga.id, primaryChapter.sourceOrder)}
                                    state={Chapters.getReaderOpenChapterLocationState(primaryChapter)}
                                    sx={{
                                        color: (theme) =>
                                            theme.palette.text[primaryChapter.isRead ? 'disabled' : 'primary'],
                                    }}
                                >
                                    <ListCardContent sx={{ justifyContent: 'space-between' }}>
                                        <Box sx={{ display: 'flex', flexGrow: 1, gap: 1 }}>
                                            <ChapterCardThumbnail
                                                mangaId={manga.id}
                                                sourceId={manga.sourceId}
                                                mangaTitle={manga.title}
                                                thumbnailUrl={manga.thumbnailUrl}
                                                thumbnailUrlLastFetched={manga.thumbnailUrlLastFetched}
                                            />
                                            <ChapterCardMetadata title={manga.title} secondaryText={primaryChapter.name} />
                                        </Box>

                                        {extraChapters.length > 0 ? (
                                            <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    toggleExpanded(item.mangaId);
                                                }}
                                                aria-label="Toggle chapter list"
                                            >
                                                {expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                            </IconButton>
                                        ) : null}

                                        <DownloadStateIndicator chapterId={primaryChapter.id} />
                                        <ChapterDownloadRetryButton chapterId={primaryChapter.id} />
                                        <ChapterDownloadButton
                                            chapterId={primaryChapter.id}
                                            isDownloaded={primaryChapter.isDownloaded}
                                        />
                                    </ListCardContent>
                                </CardActionArea>

                                {extraChapters.length > 0 ? (
                                    <Collapse in={expanded} timeout="auto" unmountOnExit>
                                        {extraChapters.map((chapter) => (
                                            <CardActionArea
                                                key={chapter.id}
                                                component={Link}
                                                to={AppRoutes.reader.path(chapter.manga.id, chapter.sourceOrder)}
                                                state={Chapters.getReaderOpenChapterLocationState(chapter)}
                                                sx={{
                                                    color: (theme) =>
                                                        theme.palette.text[chapter.isRead ? 'disabled' : 'primary'],
                                                }}
                                            >
                                                <ListCardContent sx={{ justifyContent: 'space-between' }}>
                                                    <Box sx={{ display: 'flex', flexGrow: 1, gap: 1 }}>
                                                        {/* blank space where the image usually is */}
                                                        <Box sx={{ width: 40, minWidth: 40 }} />
                                                        {/* do not repeat manga title, only chapter name */}
                                                        <ChapterCardMetadata title="" secondaryText={chapter.name} />
                                                    </Box>
                                                    <DownloadStateIndicator chapterId={chapter.id} />
                                                    <ChapterDownloadRetryButton chapterId={chapter.id} />
                                                    <ChapterDownloadButton
                                                        chapterId={chapter.id}
                                                        isDownloaded={chapter.isDownloaded}
                                                    />
                                                </ListCardContent>
                                            </CardActionArea>
                                        ))}
                                    </Collapse>
                                ) : null}
                            </Card>
                        </StyledGroupItemWrapper>
                    );
                }}
            />
        </>
    );
};
