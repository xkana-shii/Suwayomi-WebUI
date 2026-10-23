/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useCallback, useMemo, useState } from 'react';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useLocalStorage } from '@/base/hooks/useStorage.tsx';
import { useResizeObserver } from '@/base/hooks/useResizeObserver.tsx';
import type {
    MangaDescriptionInfo,
    MangaGenreInfo,
    MangaIdInfo,
    MangaLocationState,
    MangaMetaInfo,
    MangaSourceIdInfo,
} from '@/features/manga/Manga.types.ts';
import { SearchLink } from '@/features/manga/components/details/SearchLink.tsx';
import { MangaNotes } from '@/features/manga/components/details/MangaNotes.tsx';
import { useGetMangaMetadata } from '@/features/manga/services/MangaMetadata.ts';
import uniq from 'lodash/fp/uniq';
import Box from '@mui/material/Box';
import { MarkdownRenderer } from '@/base/components/MarkdownRenderer.tsx';

const OPEN_CLOSE_BUTTON_HEIGHT = '35px';
const DESCRIPTION_COLLAPSED_SIZE = 100;

// fork: the description is rendered with the fork's markdown renderer (GFM, line breaks, sanitized) after normalizing it
function normalizeDescription(input?: string | null): string | undefined {
    if (!input) {
        return undefined;
    }
    // Normalize CRLF -> LF
    let s = input.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
    // Replace non-breaking spaces with normal spaces
    s = s.replaceAll('\xA0', ' ');
    // Remove lines that are only horizontal-rule markers at the start or end
    s = s.replace(/^(?:\s*[-*_]{3,}\s*\n)+/, '');
    s = s.replace(/(?:\n\s*[-*_]{3,}\s*)+$/, '');
    // Remove trailing spaces at end of lines
    s = s.replaceAll(/[ \t]+(\n|$)/g, '\n');
    // Collapse runs of 2+ newlines into exactly two (preserve a single blank-line paragraph separation,
    // but normalize multiple empty lines down to one).
    s = s.replaceAll(/\n{2,}/g, '\n\n');
    // Trim leading/trailing whitespace and newlines
    s = s.trim();
    return s;
}

export const DescriptionGenre = ({
    manga,
    mode,
}: {
    manga: MangaDescriptionInfo & MangaGenreInfo & MangaIdInfo & MangaMetaInfo & MangaSourceIdInfo;
    mode: MangaLocationState['mode'];
}) => {
    const { description: rawDescription, genre: mangaGenres, sourceId } = manga;
    const description = useMemo(() => normalizeDescription(rawDescription), [rawDescription]);
    const { notes } = useGetMangaMetadata(manga);
    const hasNotes = notes.trim().length > 0;
    const hasCollapsibleContent = !!description || hasNotes;
    const [descriptionElement, setDescriptionElement] = useState<HTMLDivElement | null>(null);
    const [descriptionHeight, setDescriptionHeight] = useState<number>();
    useResizeObserver(
        descriptionElement,
        useCallback(() => setDescriptionHeight(descriptionElement?.clientHeight), [descriptionElement]),
    );

    const [isCollapsed, setIsCollapsed] = useLocalStorage('isDescriptionGenreCollapsed', true);

    const collapsedSize = hasCollapsibleContent
        ? Math.min(DESCRIPTION_COLLAPSED_SIZE, descriptionHeight ?? DESCRIPTION_COLLAPSED_SIZE)
        : 0;
    const genres = useMemo(() => uniq(((mangaGenres || []) as string[]).filter(Boolean)), [mangaGenres]);

    return (
        <>
            {hasCollapsibleContent ? (
                <Stack sx={{ position: 'relative' }}>
                    <Collapse collapsedSize={collapsedSize} in={!isCollapsed}>
                        <Stack
                            ref={setDescriptionElement}
                            sx={{
                                gap: 1,
                                mb: OPEN_CLOSE_BUTTON_HEIGHT,
                            }}
                        >
                            <MangaNotes manga={manga} showDivider={!!description} />
                            {description && (
                                <Box
                                    sx={{
                                        textAlign: 'justify',
                                        textJustify: 'inter-word',
                                        // ensure that markdown content's block elements wrap and do not overflow horizontally
                                        '& .manga-description': {
                                            wordBreak: 'break-word',
                                        },
                                        // make tables responsive inside the description
                                        '& .manga-description table': {
                                            width: '100%',
                                            borderCollapse: 'collapse',
                                        },
                                        '& .manga-description th, & .manga-description td': {
                                            border: (theme) => `1px solid ${theme.palette.divider}`,
                                            padding: 1,
                                        },
                                    }}
                                >
                                    <MarkdownRenderer source={description} className="manga-description" />
                                </Box>
                            )}
                        </Stack>
                    </Collapse>
                    <Stack
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        sx={{
                            justifyContent: 'flex-start',
                            alignItems: 'center',
                            cursor: 'pointer',
                            position: 'absolute',
                            width: '100%',
                            height: OPEN_CLOSE_BUTTON_HEIGHT,
                            bottom: 0,
                            background: (theme) =>
                                `linear-gradient(transparent -15px, ${theme.palette.background.default})`,
                        }}
                    >
                        <IconButton sx={{ color: (theme) => (theme.palette.mode === 'light' ? 'black' : 'text') }}>
                            {isCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                        </IconButton>
                    </Stack>
                </Stack>
            ) : (
                <MangaNotes manga={manga} showDivider={false} />
            )}
            <Stack
                sx={{
                    flexDirection: 'row',
                    flexWrap: isCollapsed ? 'no-wrap' : 'wrap',
                    gap: 1,
                    overflowX: isCollapsed ? 'auto' : null,
                }}
            >
                {genres.map((genre) => (
                    <SearchLink key={genre} query={genre} sourceId={sourceId} mode={mode}>
                        <Chip label={genre} variant="outlined" onClick={() => {}} />
                    </SearchLink>
                ))}
            </Stack>
        </>
    );
};
