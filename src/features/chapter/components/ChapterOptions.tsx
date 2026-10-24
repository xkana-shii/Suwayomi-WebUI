/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ComponentProps } from 'react';
import React, { useState } from 'react';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import { CheckboxInput } from '@/base/components/inputs/CheckboxInput.tsx';
import { BookmarkColorFilterDialog } from '@/features/chapter/bookmark/BookmarkColorFilterDialog.tsx';
import type { MessageDescriptor } from '@lingui/core';
import RadioGroup from '@mui/material/RadioGroup';
import { useLingui } from '@lingui/react/macro';
import { msg } from '@lingui/core/macro';
import { RadioInput } from '@/base/components/inputs/RadioInput.tsx';
import { SortRadioInput } from '@/base/components/inputs/SortRadioInput.tsx';
import { ThreeStateCheckboxInput } from '@/base/components/inputs/ThreeStateCheckboxInput.tsx';
import { OptionsTabs } from '@/base/components/modals/OptionsTabs.tsx';
import { CHAPTER_SORT_OPTIONS_TO_TRANSLATION } from '@/features/chapter/Chapter.constants.ts';
import type { ChapterListOptions } from '@/features/chapter/Chapter.types.ts';
import type { updateChapterListOptions } from '@/features/chapter/utils/ChapterList.util.tsx';
import { ChapterExcludeSanlatorsFilter } from '@/features/chapter/components/ChapterExcludeSanlatorsFilter.tsx';

interface IProps {
    open: boolean;
    onClose: () => void;
    options: ChapterListOptions;
    updateOption: ReturnType<typeof updateChapterListOptions>;
    mangaId: number;
    chapters: ComponentProps<typeof ChapterExcludeSanlatorsFilter>['chapters'];
}

const TITLES: { [key in 'filter' | 'sort' | 'display']: MessageDescriptor } = {
    filter: msg`Filter`,
    sort: msg`Sort`,
    display: msg`Display`,
};

export const ChapterOptions: React.FC<IProps> = ({ open, onClose, options, updateOption, mangaId, chapters }) => {
    const { t } = useLingui();
    const [isColorFilterOpen, setIsColorFilterOpen] = useState(false);
    const colorFilterCount = options.bookmarkColorsIncluded.length + options.bookmarkColorsExcluded.length;

    return (
        <OptionsTabs<'filter' | 'sort' | 'display'>
            open={open}
            onClose={onClose}
            minHeight={150}
            tabs={['filter', 'sort', 'display']}
            tabTitle={(key) => t(TITLES[key])}
            tabContent={(key) => {
                if (key === 'filter') {
                    return (
                        <>
                            <ThreeStateCheckboxInput
                                label={t`Unread`}
                                checked={options.unread}
                                onChange={(c) => updateOption('unread', c)}
                            />
                            <ThreeStateCheckboxInput
                                label={t`Downloaded`}
                                checked={options.downloaded}
                                onChange={(c) => updateOption('downloaded', c)}
                            />
                            <ThreeStateCheckboxInput
                                label={t`Bookmarked`}
                                checked={options.bookmarked}
                                onChange={(c) => updateOption('bookmarked', c)}
                            />
                            <ThreeStateCheckboxInput
                                label={t`Fillermarked`}
                                checked={options.fillermarked}
                                onChange={(c) => updateOption('fillermarked', c)}
                            />
                            {/* fork (Komikku port): bookmark color, blacklist and Smart Scanlator Merge filters */}
                            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                                <CheckboxInput
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setIsColorFilterOpen(true);
                                    }}
                                    label={
                                        colorFilterCount
                                            ? `${t`Bookmark colors`} (${colorFilterCount})`
                                            : t`Bookmark colors`
                                    }
                                    icon={<PaletteOutlinedIcon />}
                                    checkedIcon={<PaletteOutlinedIcon color="warning" />}
                                    checked={!!colorFilterCount}
                                />
                                <Button size="small" onClick={() => setIsColorFilterOpen(true)}>
                                    {t`Edit`}
                                </Button>
                            </Stack>
                            <BookmarkColorFilterDialog
                                open={isColorFilterOpen}
                                included={options.bookmarkColorsIncluded}
                                excluded={options.bookmarkColorsExcluded}
                                onClose={(filter) => {
                                    setIsColorFilterOpen(false);
                                    if (filter) {
                                        updateOption('bookmarkColorsIncluded', filter.included);
                                        updateOption('bookmarkColorsExcluded', filter.excluded);
                                    }
                                }}
                            />
                            <CheckboxInput
                                label={t`Show blacklisted chapters`}
                                checked={!options.hideBlacklistedChapters}
                                onChange={(_, checked) => updateOption('hideBlacklistedChapters', !checked)}
                            />
                            <CheckboxInput
                                label={t`Show merged duplicates`}
                                checked={options.showMergedChapters}
                                onChange={(_, checked) => updateOption('showMergedChapters', checked)}
                            />
                            <ChapterExcludeSanlatorsFilter
                                mangaId={mangaId}
                                chapters={chapters}
                                options={options}
                                updateOption={updateOption}
                            />
                        </>
                    );
                }
                if (key === 'sort') {
                    return Object.entries(CHAPTER_SORT_OPTIONS_TO_TRANSLATION).map(([mode, label]) => (
                        <SortRadioInput
                            key={mode}
                            label={t(label)}
                            checked={options.sortBy === mode}
                            sortDescending={options.reverse}
                            onClick={() =>
                                mode !== options.sortBy
                                    ? updateOption('sortBy', mode as keyof typeof CHAPTER_SORT_OPTIONS_TO_TRANSLATION)
                                    : updateOption('reverse', !options.reverse)
                            }
                        />
                    ));
                }
                if (key === 'display') {
                    return (
                        <RadioGroup
                            onChange={() => updateOption('showChapterNumber', !options.showChapterNumber)}
                            value={options.showChapterNumber}
                        >
                            <RadioInput label={t`Source title`} value={false} />
                            <RadioInput label={t`Chapter number`} value />
                        </RadioGroup>
                    );
                }
                return null;
            }}
        />
    );
};
