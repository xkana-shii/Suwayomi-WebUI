/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import CheckIcon from '@mui/icons-material/Check';
import BookmarkRemoveIcon from '@mui/icons-material/BookmarkRemove';
import { useTheme } from '@mui/material/styles';
import { useLingui } from '@lingui/react/macro';
import { BOOKMARK_COLORS, getBookmarkCssColor } from '@/features/chapter/bookmark/BookmarkColor.ts';

export const BookmarkColorSwatch = ({ color, size = 18 }: { color: number; size?: number }) => {
    const theme = useTheme();

    return (
        <Box
            component="span"
            sx={{
                display: 'inline-block',
                width: size,
                height: size,
                borderRadius: '50%',
                backgroundColor: getBookmarkCssColor(color, theme),
                border: `1px solid ${theme.palette.divider}`,
                flex: '0 0 auto',
            }}
        />
    );
};

/**
 * fork (Komikku port of BookmarkColorDropdownMenu): every bookmark color with its name, a check on the current one,
 * and "remove bookmark" when the chapters are bookmarked. Keyboard navigable like every MUI menu.
 */
export const BookmarkColorMenu = ({
    anchorEl,
    open,
    onClose,
    currentColor,
    isBookmarked,
    onSelectColor,
    onRemoveBookmark,
}: {
    anchorEl: Element | null;
    open: boolean;
    onClose: () => void;
    /** the color shared by the chapters, null when they differ or are not bookmarked */
    currentColor: number | null;
    isBookmarked: boolean;
    onSelectColor: (color: number) => void;
    onRemoveBookmark: () => void;
}) => {
    const { t } = useLingui();

    return (
        <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
            onClick={(e) => e.stopPropagation()}
            slotProps={{ list: { 'aria-label': t`Bookmark color` } }}
        >
            {BOOKMARK_COLORS.map(({ id, label }) => (
                <MenuItem
                    key={id}
                    selected={currentColor === id}
                    onClick={() => {
                        onSelectColor(id);
                        onClose();
                    }}
                >
                    <ListItemIcon>
                        <BookmarkColorSwatch color={id} />
                    </ListItemIcon>
                    <ListItemText>{t(label)}</ListItemText>
                    {currentColor === id && <CheckIcon fontSize="small" sx={{ ml: 2 }} />}
                </MenuItem>
            ))}
            {isBookmarked && <Divider />}
            {isBookmarked && (
                <MenuItem
                    onClick={() => {
                        onRemoveBookmark();
                        onClose();
                    }}
                >
                    <ListItemIcon>
                        <BookmarkRemoveIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t`Remove bookmark`}</ListItemText>
                </MenuItem>
            )}
        </Menu>
    );
};
