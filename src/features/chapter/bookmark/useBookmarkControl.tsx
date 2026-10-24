/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useCallback, useState } from 'react';
import { usePress } from '@/base/hooks/usePress.ts';
import { Chapters } from '@/features/chapter/services/Chapters.ts';
import { BookmarkColorMenu } from '@/features/chapter/bookmark/BookmarkColorMenu.tsx';
import { getSharedBookmarkColor } from '@/features/chapter/bookmark/BookmarkColor.ts';
import type { ChapterBookmarkColorInfo, ChapterIdInfo } from '@/features/chapter/Chapter.types.ts';
import {
    useMetadataServerSettings,
    createUpdateMetadataServerSettings,
} from '@/features/settings/services/ServerSettingsMetadata.ts';
import { defaultPromiseErrorHandler } from '@/lib/DefaultPromiseErrorHandler.ts';

/** fork: the color a normal click on a bookmark control applies */
export const useDefaultBookmarkColor = (): number => {
    const {
        settings: { defaultBookmarkColor, rememberLastBookmarkColor, lastBookmarkColor },
    } = useMetadataServerSettings();

    return rememberLastBookmarkColor ? lastBookmarkColor : defaultBookmarkColor;
};

const updateSetting = createUpdateMetadataServerSettings<'lastBookmarkColor'>();

/**
 * fork (Komikku port): one bookmark control for all screens. A normal click runs the default action (bookmark with the
 * default color, or remove the bookmark); a long press on touch devices or the context menu (right click, menu key,
 * shift+F10) opens the color menu. There is no separate palette button.
 */
export const useBookmarkControl = ({
    chapters,
    defaultAction,
    onDone,
}: {
    chapters: (ChapterIdInfo & ChapterBookmarkColorInfo)[];
    defaultAction: 'bookmark' | 'unbookmark';
    onDone?: () => void;
}) => {
    const defaultColor = useDefaultBookmarkColor();
    const [anchorEl, setAnchorEl] = useState<Element | null>(null);
    const ids = Chapters.getIds(chapters);
    const isBookmarked = chapters.length > 0 && chapters.every((chapter) => chapter.isBookmarked);

    const runDefaultAction = useCallback(() => {
        const action =
            defaultAction === 'bookmark'
                ? Chapters.setBookmarkColor(ids, defaultColor)
                : Chapters.performAction('unbookmark', ids, {});
        action.catch(defaultPromiseErrorHandler('useBookmarkControl::defaultAction'));
        onDone?.();
    }, [defaultAction, defaultColor, ids.join(), onDone]);

    const bindPress = usePress({
        onLongPress: (event) => {
            event.preventDefault?.();
            event.stopPropagation?.();
            setAnchorEl(event.currentTarget as Element);
        },
        onPress: (event) => {
            event.preventDefault();
            event.stopPropagation();
            runDefaultAction();
        },
    });

    const closeMenu = () => {
        setAnchorEl(null);
        onDone?.();
    };

    const menu = (
        <BookmarkColorMenu
            anchorEl={anchorEl}
            open={!!anchorEl}
            onClose={closeMenu}
            currentColor={getSharedBookmarkColor(chapters)}
            isBookmarked={isBookmarked}
            onSelectColor={(color) => {
                Chapters.setBookmarkColor(ids, color).catch(defaultPromiseErrorHandler('useBookmarkControl::color'));
                updateSetting('lastBookmarkColor', color);
            }}
            onRemoveBookmark={() =>
                Chapters.performAction('unbookmark', ids, {}).catch(
                    defaultPromiseErrorHandler('useBookmarkControl::remove'),
                )
            }
        />
    );

    return {
        bindTrigger: () => ({
            ...bindPress(),
            'aria-haspopup': 'menu' as const,
        }),
        menu,
        isMenuOpen: !!anchorEl,
    };
};
