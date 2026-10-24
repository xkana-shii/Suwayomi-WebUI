/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import IconButton from '@mui/material/IconButton';
import { memo } from 'react';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import { useLingui } from '@lingui/react/macro';
import { CustomTooltip } from '@/base/components/CustomTooltip.tsx';
import type { TChapterReader } from '@/features/chapter/Chapter.types.ts';
import { CHAPTER_ACTION_TO_TRANSLATION } from '@/features/chapter/Chapter.constants.ts';
import { useBookmarkControl } from '@/features/chapter/bookmark/useBookmarkControl.tsx';
import { ChapterBookmarkIcon } from '@/features/chapter/bookmark/ChapterBookmarkIcon.tsx';

const BaseReaderBookmarkButton = ({
    id,
    isBookmarked,
    bookmarkColor,
}: Pick<TChapterReader, 'id' | 'isBookmarked' | 'bookmarkColor'>) => {
    const { t } = useLingui();

    // fork (Komikku port): click toggles the bookmark, long press / context menu picks its color
    const control = useBookmarkControl({
        chapters: [{ id, isBookmarked, bookmarkColor }],
        defaultAction: isBookmarked ? 'unbookmark' : 'bookmark',
    });

    return (
        <>
            <CustomTooltip
                title={`${t(CHAPTER_ACTION_TO_TRANSLATION[isBookmarked ? 'unbookmark' : 'bookmark'].action.single)} · ${t`Hold or right click for colors`}`}
            >
                <IconButton {...control.bindTrigger()} color="inherit">
                    {isBookmarked ? (
                        <ChapterBookmarkIcon bookmarkColor={bookmarkColor} defaultColor="currentColor" />
                    ) : (
                        <BookmarkBorderIcon />
                    )}
                </IconButton>
            </CustomTooltip>
            {control.menu}
        </>
    );
};

export const ReaderBookmarkButton = memo(BaseReaderBookmarkButton);
