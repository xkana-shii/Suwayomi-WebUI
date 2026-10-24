/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import { useLingui } from '@lingui/react/macro';
import { plural } from '@lingui/core/macro';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { makeToast } from '@/base/utils/Toast.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { MediaQuery } from '@/base/utils/MediaQuery.tsx';
import { CustomTooltip } from '@/base/components/CustomTooltip.tsx';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { scanlatorSettingsWriter } from '@/features/chapter/services/SequentialWriter.ts';
import { SmartMergeMode } from '@/lib/graphql/generated/graphql-base.types.ts';
import type { ChapterListOptions } from '@/features/chapter/Chapter.types.ts';
import type { updateChapterListOptions } from '@/features/chapter/utils/ChapterList.util.tsx';
import type { ChapterType } from '@/lib/graphql/generated/graphql-base.types.ts';

type DialogChapter = Pick<ChapterType, 'id' | 'name' | 'scanlator' | 'chapterNumber' | 'isFillermarked'>;

type RangeRule = { from: number; to: number; scanlator: string };

type Draft = {
    priority: string[];
    rangeRules: RangeRule[];
    mode: SmartMergeMode;
};

const TENTHS = 10;

/** Komikku's scanlatorCoverage: the chapter number ranges a scanlator covers, e.g. "1–20, 25" */
const getCoverage = (numbers: number[], maxGroups = 10): string | null => {
    const scaled = [
        ...new Set(numbers.filter((n) => Number.isFinite(n) && n > 0).map((n) => Math.round(n * TENTHS))),
    ].sort((a, b) => a - b);
    if (!scaled.length) {
        return null;
    }

    const ranges: [number, number][] = [];
    scaled.forEach((n) => {
        const last = ranges[ranges.length - 1];
        if (last && n === last[1] + TENTHS) {
            last[1] = n;
        } else {
            ranges.push([n, n]);
        }
    });
    const label = (n: number) => (n % TENTHS === 0 ? `${n / TENTHS}` : `${Math.floor(n / TENTHS)}.${n % TENTHS}`);
    const shown = ranges
        .slice(0, maxGroups)
        .map(([start, end]) => (start === end ? label(start) : `${label(start)}–${label(end)}`));
    const hidden = ranges.length - maxGroups;

    return hidden > 0 ? `${shown.join(', ')} (+${hidden})` : shown.join(', ');
};

const moveItem = <T,>(items: T[], from: number, to: number): T[] => {
    const result = [...items];
    const [item] = result.splice(from, 1);
    result.splice(to, 0, item!);
    return result;
};

/**
 * fork (Komikku port of ScanlatorPreferencesDialog): the scanlator filter, Smart Scanlator Merge priority, range rules
 * and the chapter blacklist of a manga. There is no "Save": every change is written immediately (in order, through a
 * sequential queue) and shown optimistically; a failed write is reported and the editor returns to the saved state.
 */
export const ScanlatorSettingsDialog = ({
    open,
    onClose,
    mangaId,
    chapters,
    options,
    updateOption,
    initialTab = 'scanlators',
}: {
    open: boolean;
    onClose: () => void;
    mangaId: number;
    chapters: DialogChapter[];
    options: ChapterListOptions;
    updateOption: ReturnType<typeof updateChapterListOptions>;
    initialTab?: 'scanlators' | 'blacklist';
}) => {
    const { t } = useLingui();
    const isMobile = MediaQuery.useIsBelowWidth('sm');
    const [tab, setTab] = useState(initialTab);

    const { data, loading, error, refetch } = requestManager.useGetMangaScanlatorSettings(mangaId, { skip: !open });
    const settings = data?.manga.scanlatorSettings;

    const [draft, setDraft] = useState<Draft | null>(null);
    // the range input survives tab switches
    const [rangeInput, setRangeInput] = useState({ from: '', to: '', scanlator: '' });
    const failedRef = useRef(false);

    // follow the saved state while no write is pending (or after a failed write)
    useEffect(() => {
        if (!settings || (!scanlatorSettingsWriter.isIdle && !failedRef.current)) {
            return;
        }
        failedRef.current = false;
        setDraft({
            priority: settings.scanlatorPriority,
            rangeRules: settings.scanlatorRangeRules.map(({ from, to, scanlator }) => ({ from, to, scanlator })),
            mode: settings.smartMergeMode,
        });
    }, [settings]);

    useEffect(() => {
        if (open) {
            setTab(initialTab);
        }
    }, [open, initialTab]);

    const coverageByScanlator = useMemo(() => {
        const numbersByScanlator = Object.groupBy(chapters, (chapter) => chapter.scanlator ?? '');
        return Object.fromEntries(
            Object.entries(numbersByScanlator).map(([scanlator, scanlatorChapters]) => [
                scanlator,
                {
                    count: scanlatorChapters!.length,
                    coverage: getCoverage(scanlatorChapters!.map((chapter) => chapter.chapterNumber)),
                },
            ]),
        );
    }, [chapters]);

    const write = (
        change: Omit<Parameters<typeof requestManager.updateMangaScanlatorSettings>[0], 'mangaId'>,
        optimistic: Draft,
    ) => {
        setDraft(optimistic);
        scanlatorSettingsWriter
            .enqueue(() => requestManager.updateMangaScanlatorSettings({ ...change, mangaId }).response)
            .catch((e) => {
                failedRef.current = true;
                makeToast(t`Scanlator settings were not saved`, 'error', getErrorMessage(e));
                refetch().catch(() => {});
            });
    };

    const removeBlacklistEntries = (keys: string[]) => {
        scanlatorSettingsWriter
            .enqueue(
                () => requestManager.updateMangaScanlatorSettings({ mangaId, removeBlacklistEntries: keys }).response,
            )
            .catch((e) => makeToast(t`Scanlator settings were not saved`, 'error', getErrorMessage(e)));
    };

    const copyFillermarks = () => {
        scanlatorSettingsWriter
            .enqueue(() => requestManager.copyFillermarksToBlacklist(mangaId).response)
            .then(() => makeToast(t`Fillermarked chapters blacklisted`, 'success'))
            .catch((e) => makeToast(t`Scanlator settings were not saved`, 'error', getErrorMessage(e)));
    };

    const blacklist = settings?.blacklistedChapters ?? [];
    const hasFillermarks = chapters.some((chapter) => chapter.isFillermarked);

    const renderScanlators = (current: Draft) => {
        const isMergeActive =
            current.mode === SmartMergeMode.Enabled ||
            (current.mode === SmartMergeMode.Global && !!settings?.smartMergeEnabled);
        const addRule = () => {
            const from = Number(rangeInput.from);
            const to = Number(rangeInput.to || rangeInput.from);
            const rule = { from, to, scanlator: rangeInput.scanlator };
            // a new rule is appended last and so wins where it overlaps older ones
            write(
                { scanlatorRangeRules: [...current.rangeRules, rule] },
                { ...current, rangeRules: [...current.rangeRules, rule] },
            );
            setRangeInput({ from: '', to: '', scanlator: rangeInput.scanlator });
        };
        const rangeFrom = Number(rangeInput.from);
        const rangeTo = Number(rangeInput.to || rangeInput.from);
        const isRangeValid =
            rangeInput.from !== '' &&
            Number.isFinite(rangeFrom) &&
            Number.isFinite(rangeTo) &&
            rangeFrom <= rangeTo &&
            !!rangeInput.scanlator;

        return (
            <Stack sx={{ gap: 2 }}>
                <Stack sx={{ gap: 1 }}>
                    <Typography variant="subtitle2">{t`Smart Scanlator Merge`}</Typography>
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={current.mode}
                        onChange={(_, mode: SmartMergeMode | null) => {
                            if (mode) {
                                write({ smartMergeMode: mode }, { ...current, mode });
                            }
                        }}
                        aria-label={t`Smart Scanlator Merge`}
                    >
                        <ToggleButton value={SmartMergeMode.Global}>
                            {settings?.smartMergeMode === SmartMergeMode.Global && settings.smartMergeEnabled
                                ? t`Global (on)`
                                : t`Global`}
                        </ToggleButton>
                        <ToggleButton value={SmartMergeMode.Enabled}>{t`On`}</ToggleButton>
                        <ToggleButton value={SmartMergeMode.Disabled}>{t`Off`}</ToggleButton>
                    </ToggleButtonGroup>
                    <Typography variant="caption" color="text.secondary">
                        {t`Shows one release per chapter number: the scanlator of a matching range rule, else the first scanlator in the order below. Hidden duplicates are never deleted.`}
                    </Typography>
                </Stack>

                <Divider />

                <Stack>
                    <Typography variant="subtitle2">{t`Scanlators`}</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {isMergeActive
                            ? t`Most preferred first. Uncheck a scanlator to hide all its chapters.`
                            : t`Uncheck a scanlator to hide all its chapters. The order is used by Smart Scanlator Merge.`}
                    </Typography>
                    <List dense>
                        {current.priority.map((scanlator, index) => {
                            const info = coverageByScanlator[scanlator];
                            const isExcluded = options.excludedScanlators.includes(scanlator);
                            return (
                                <ListItem
                                    key={scanlator}
                                    disableGutters
                                    secondaryAction={
                                        <Stack direction="row">
                                            <CustomTooltip title={t`Move up`}>
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        disabled={index === 0}
                                                        aria-label={t`Move ${scanlator} up`}
                                                        onClick={() => {
                                                            const priority = moveItem(
                                                                current.priority,
                                                                index,
                                                                index - 1,
                                                            );
                                                            write(
                                                                { scanlatorPriority: priority },
                                                                { ...current, priority },
                                                            );
                                                        }}
                                                    >
                                                        <ArrowUpwardIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </CustomTooltip>
                                            <CustomTooltip title={t`Move down`}>
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        disabled={index === current.priority.length - 1}
                                                        aria-label={t`Move ${scanlator} down`}
                                                        onClick={() => {
                                                            const priority = moveItem(
                                                                current.priority,
                                                                index,
                                                                index + 1,
                                                            );
                                                            write(
                                                                { scanlatorPriority: priority },
                                                                { ...current, priority },
                                                            );
                                                        }}
                                                    >
                                                        <ArrowDownwardIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </CustomTooltip>
                                        </Stack>
                                    }
                                >
                                    <Checkbox
                                        edge="start"
                                        checked={!isExcluded}
                                        slotProps={{ input: { 'aria-label': t`Show ${scanlator}` } }}
                                        onChange={(_, checked) =>
                                            updateOption(
                                                'excludedScanlators',
                                                checked
                                                    ? options.excludedScanlators.filter((name) => name !== scanlator)
                                                    : [...options.excludedScanlators, scanlator],
                                            )
                                        }
                                    />
                                    <ListItemText
                                        sx={{ pr: 10, opacity: isExcluded ? 0.6 : undefined }}
                                        primary={`${index + 1}. ${scanlator}`}
                                        secondary={
                                            info
                                                ? `${plural(info.count, { one: '# chapter', other: '# chapters' })}${
                                                      info.coverage ? ` · ${info.coverage}` : ''
                                                  }`
                                                : undefined
                                        }
                                    />
                                </ListItem>
                            );
                        })}
                        {!current.priority.length && (
                            <Typography variant="body2" color="text.secondary">
                                {t`The chapters of this manga have no scanlators`}
                            </Typography>
                        )}
                    </List>
                </Stack>

                <Divider />

                <Stack sx={{ gap: 1 }}>
                    <Typography variant="subtitle2">{t`Range rules`}</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {t`Prefer a scanlator for a range of chapter numbers. Where rules overlap, the newer rule wins.`}
                    </Typography>
                    {current.rangeRules.map((rule, index) => (
                        <Stack
                            // oxlint-disable-next-line react/no-array-index-key
                            key={`${rule.from}-${rule.to}-${rule.scanlator}-${index}`}
                            direction="row"
                            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                        >
                            <Typography variant="body2">
                                {rule.from === rule.to ? `${rule.from}` : `${rule.from}–${rule.to}`} → {rule.scanlator}
                            </Typography>
                            <IconButton
                                size="small"
                                aria-label={t`Remove rule`}
                                onClick={() => {
                                    const rangeRules = current.rangeRules.filter((_, i) => i !== index);
                                    write({ scanlatorRangeRules: rangeRules }, { ...current, rangeRules });
                                }}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                    ))}
                    <Stack
                        direction={isMobile ? 'column' : 'row'}
                        sx={{ gap: 1, alignItems: isMobile ? 'stretch' : 'center' }}
                    >
                        <Stack direction="row" sx={{ gap: 1 }}>
                            <TextField
                                size="small"
                                type="number"
                                label={t`From`}
                                value={rangeInput.from}
                                onChange={(e) => setRangeInput({ ...rangeInput, from: e.target.value })}
                                sx={{ width: isMobile ? '50%' : 90 }}
                            />
                            <TextField
                                size="small"
                                type="number"
                                label={t`To`}
                                value={rangeInput.to}
                                onChange={(e) => setRangeInput({ ...rangeInput, to: e.target.value })}
                                sx={{ width: isMobile ? '50%' : 90 }}
                            />
                        </Stack>
                        <TextField
                            select
                            size="small"
                            label={t`Scanlator`}
                            value={rangeInput.scanlator}
                            onChange={(e) => setRangeInput({ ...rangeInput, scanlator: e.target.value })}
                            sx={{ minWidth: 160, flexGrow: 1 }}
                        >
                            {current.priority.map((scanlator) => (
                                <MenuItem key={scanlator} value={scanlator}>
                                    {scanlator}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Button variant="outlined" disabled={!isRangeValid} onClick={addRule}>
                            {t`Add`}
                        </Button>
                    </Stack>
                </Stack>
            </Stack>
        );
    };

    const renderBlacklist = () => (
        <Stack sx={{ gap: 2 }}>
            <FormControlLabel
                control={
                    <Switch
                        checked={options.hideBlacklistedChapters}
                        onChange={(_, checked) => updateOption('hideBlacklistedChapters', checked)}
                    />
                }
                label={t`Hide blacklisted chapters`}
            />
            <Typography variant="caption" color="text.secondary">
                {t`Blacklisted chapters are hidden everywhere: chapter list, reader, Updates, unread counts and downloads. Revealed chapters are marked in the chapter list and stay out of reading and downloads. Blacklist chapters from their menu or a selection.`}
            </Typography>
            {hasFillermarks && (
                <Button variant="outlined" onClick={copyFillermarks} sx={{ alignSelf: 'flex-start' }}>
                    {t`Blacklist fillermarked chapters`}
                </Button>
            )}
            <List dense>
                {blacklist.map((entry) => {
                    const isMissing = !entry.chapterIds.length;
                    const description = [
                        entry.chapterNumber != null ? t`Chapter ${entry.chapterNumber}` : null,
                        entry.scanlator,
                    ]
                        .filter(Boolean)
                        .join(' · ');
                    return (
                        <ListItem
                            key={entry.key}
                            disableGutters
                            secondaryAction={
                                <CustomTooltip title={t`Remove from blacklist`}>
                                    <IconButton
                                        aria-label={t`Remove from blacklist`}
                                        onClick={() => removeBlacklistEntries([entry.key])}
                                    >
                                        <SettingsBackupRestoreIcon />
                                    </IconButton>
                                </CustomTooltip>
                            }
                        >
                            <ListItemText
                                sx={{ pr: 6 }}
                                primary={entry.chapterNames.join(', ') || description || t`Unknown chapter`}
                                secondary={isMissing ? t`Not in the current chapter list` : description}
                            />
                        </ListItem>
                    );
                })}
                {!blacklist.length && (
                    <Typography variant="body2" color="text.secondary">
                        {t`No blacklisted chapters`}
                    </Typography>
                )}
            </List>
        </Stack>
    );

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
            <DialogTitle sx={{ pb: 0 }}>{t`Scanlators`}</DialogTitle>
            <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="fullWidth" sx={{ px: 2 }}>
                <Tab value="scanlators" label={t`Scanlators`} />
                <Tab
                    value="blacklist"
                    label={blacklist.length ? `${t`Blacklist`} (${blacklist.length})` : t`Blacklist`}
                />
            </Tabs>
            <DialogContent dividers>
                {error && <Alert severity="error">{getErrorMessage(error)}</Alert>}
                {!error && (loading || !draft) && <LoadingPlaceholder />}
                {!error && draft && tab === 'scanlators' && renderScanlators(draft)}
                {!error && draft && tab === 'blacklist' && renderBlacklist()}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t`Close`}</Button>
            </DialogActions>
        </Dialog>
    );
};
