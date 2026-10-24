/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Box from '@mui/material/Box';
import CardActionArea from '@mui/material/CardActionArea';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Link } from 'react-router-dom';
import { memo, useState } from 'react';
import { useLingui } from '@lingui/react/macro';
import { DownloadStateIndicatorCircular } from '@/base/components/downloads/DownloadStateIndicatorCircular.tsx';
import type { ChapterUpdateListFieldsFragment } from '@/lib/graphql/generated/graphql.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { ChapterCardThumbnail } from '@/features/chapter/components/cards/ChapterCardThumbnail.tsx';
import { ChapterCardMetadata } from '@/features/chapter/components/cards/ChapterCardMetadata.tsx';
import { ChapterDownloadButton } from '@/features/chapter/components/buttons/ChapterDownloadButton.tsx';
import { ChapterDownloadRetryButton } from '@/features/chapter/components/buttons/ChapterDownloadRetryButton.tsx';
import { Chapters } from '@/features/chapter/services/Chapters.ts';
import { ListCardContent } from '@/base/components/lists/cards/ListCardContent.tsx';
import Collapse from '@mui/material/Collapse';
import { STABLE_EMPTY_ARRAY } from '@/base/Base.constants.ts';
import { Virtuoso } from 'react-virtuoso';
import { ReaderService } from '@/features/reader/services/ReaderService.ts';

/**
 * fork: the other chapters of a manga are shown as compact rows (no thumbnail and title) below the first chapter
 */
const ChapterUpdateCardCompactRow = memo(({ chapter }: { chapter: ChapterUpdateListFieldsFragment }) => (
    <CardActionArea
        component={Link}
        to={AppRoutes.reader.path(chapter.manga.id, chapter.sourceOrder)}
        state={Chapters.getReaderOpenChapterLocationState(chapter)}
        onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            ReaderService.openReader(chapter);
        }}
        sx={{
            color: (theme) => theme.palette.text[chapter.isRead ? 'disabled' : 'primary'],
        }}
    >
        <ListCardContent sx={{ justifyContent: 'space-between' }}>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: '56px 1fr',
                    columnGap: 1,
                    flexGrow: 1,
                    alignItems: 'center',
                }}
            >
                <Box />
                <ChapterCardMetadata
                    title=""
                    secondaryText={chapter.name}
                    showUnreadDot={!chapter.isRead}
                    bookmarkColor={chapter.isBookmarked ? chapter.bookmarkColor : null}
                    disableTooltips
                />
            </Box>
            <DownloadStateIndicatorCircular chapterId={chapter.id} />
            <ChapterDownloadRetryButton chapterId={chapter.id} />
            <ChapterDownloadButton chapterId={chapter.id} isDownloaded={chapter.isDownloaded} />
        </ListCardContent>
    </CardActionArea>
));

export const ChapterUpdateCard = memo(
    ({
        chapter,
        otherChapters = STABLE_EMPTY_ARRAY,
    }: {
        chapter: ChapterUpdateListFieldsFragment;
        otherChapters?: ChapterUpdateListFieldsFragment[];
    }) => {
        const { t } = useLingui();
        const { manga } = chapter;

        const [isExpanded, setIsExpanded] = useState(false);

        const isGroup = !!otherChapters.length;

        return (
            <Card>
                <CardActionArea
                    component={Link}
                    to={AppRoutes.reader.path(chapter.manga.id, chapter.sourceOrder)}
                    state={Chapters.getReaderOpenChapterLocationState(chapter)}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        ReaderService.openReader(chapter);
                    }}
                    sx={{
                        color: (theme) => theme.palette.text[chapter.isRead ? 'disabled' : 'primary'],
                    }}
                >
                    <ListCardContent sx={{ justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', flexGrow: 1, gap: 1, alignItems: 'center' }}>
                            <ChapterCardThumbnail
                                mangaId={manga.id}
                                sourceId={manga.sourceId}
                                mangaTitle={manga.title}
                                thumbnailUrl={manga.thumbnailUrl}
                                thumbnailUrlLastFetched={manga.thumbnailUrlLastFetched}
                            />
                            <ChapterCardMetadata
                                title={manga.title}
                                secondaryText={chapter.scanlator}
                                ternaryText={chapter.name}
                                showUnreadDot={!chapter.isRead}
                                bookmarkColor={chapter.isBookmarked ? chapter.bookmarkColor : null}
                            />
                        </Box>
                        {isGroup && (
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsExpanded(!isExpanded);
                                }}
                                aria-label={t`Toggle chapter list`}
                            >
                                {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                            </IconButton>
                        )}
                        <DownloadStateIndicatorCircular chapterId={chapter.id} />
                        <ChapterDownloadRetryButton chapterId={chapter.id} />
                        <ChapterDownloadButton chapterId={chapter.id} isDownloaded={chapter.isDownloaded} />
                    </ListCardContent>
                </CardActionArea>
                {isGroup && (
                    <Collapse in={isExpanded} mountOnEnter unmountOnExit>
                        <Box sx={{ py: 0.5 }}>
                            <Virtuoso
                                useWindowScroll
                                data={otherChapters}
                                computeItemKey={(index) => otherChapters[index].id}
                                itemContent={(_index, otherChapter) => (
                                    <ChapterUpdateCardCompactRow chapter={otherChapter} />
                                )}
                            />
                        </Box>
                    </Collapse>
                )}
            </Card>
        );
    },
);
