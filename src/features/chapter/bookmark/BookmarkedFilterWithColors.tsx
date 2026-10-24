/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { useLingui } from '@lingui/react/macro';
import { ThreeStateCheckboxInput } from '@/base/components/inputs/ThreeStateCheckboxInput.tsx';
import { BookmarkColorFilterDialog } from '@/features/chapter/bookmark/BookmarkColorFilterDialog.tsx';

/**
 * fork (Komikku port): the Bookmarked tri-state filter with an Edit action for bookmark colors beside it, as in
 * Komikku's Library, Updates and chapter filters. The colors refine "Bookmarked" (include) only; with Bookmarked
 * off or excluded they do not apply.
 */
export const BookmarkedFilterWithColors = ({
    bookmarked,
    onBookmarkedChange,
    included,
    excluded,
    onColorsChange,
}: {
    bookmarked: NullAndUndefined<boolean>;
    onBookmarkedChange: (bookmarked: NullAndUndefined<boolean>) => void;
    included: number[];
    excluded: number[];
    onColorsChange: (included: number[], excluded: number[]) => void;
}) => {
    const { t } = useLingui();
    const [isOpen, setIsOpen] = useState(false);
    const colorCount = included.length + excluded.length;

    return (
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <ThreeStateCheckboxInput
                label={colorCount ? `${t`Bookmarked`} (${t`${colorCount} colors`})` : t`Bookmarked`}
                checked={bookmarked}
                onChange={onBookmarkedChange}
            />
            <Button size="small" onClick={() => setIsOpen(true)} aria-label={t`Edit bookmark colors`}>
                {t`Edit`}
            </Button>
            <BookmarkColorFilterDialog
                open={isOpen}
                included={included}
                excluded={excluded}
                onClose={(filter) => {
                    setIsOpen(false);
                    if (filter) {
                        onColorsChange(filter.included, filter.excluded);
                    }
                }}
            />
        </Stack>
    );
};
