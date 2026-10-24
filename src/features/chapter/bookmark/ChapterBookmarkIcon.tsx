/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import BookmarkIcon from '@mui/icons-material/Bookmark';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import { useTheme } from '@mui/material/styles';
import { useLingui } from '@lingui/react/macro';
import { getBookmarkColorInfo, getBookmarkCssColor } from '@/features/chapter/bookmark/BookmarkColor.ts';

/**
 * fork (Komikku port): the bookmark indicator in its bookmark color, the same everywhere (chapter list, reader,
 * Updates, History). [defaultColor] replaces the theme color of the default bookmark, e.g. on a highlighted card.
 */
export const ChapterBookmarkIcon = ({
    bookmarkColor,
    defaultColor,
    sx,
    ...props
}: { bookmarkColor: number | null | undefined; defaultColor?: string } & Omit<SvgIconProps, 'color'>) => {
    const { t } = useLingui();
    const theme = useTheme();
    const color = bookmarkColor ?? 0;

    return (
        <BookmarkIcon
            {...props}
            titleAccess={t(getBookmarkColorInfo(color).label)}
            sx={[{ color: getBookmarkCssColor(color, theme, defaultColor) }, ...(Array.isArray(sx) ? sx : [sx])]}
        />
    );
};
