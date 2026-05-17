/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import type { AutocompleteRenderInputParams } from '@mui/material/Autocomplete';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Collapse from '@mui/material/Collapse';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useLingui } from '@lingui/react/macro';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { MangaStatus } from '@/lib/graphql/generated/graphql-base.types.ts';
import { makeToast } from '@/base/utils/Toast.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { Mangas } from '@/features/manga/services/Mangas.ts';
import { SpinnerImage } from '@/base/components/SpinnerImage.tsx';
import { MANGA_STATUS_TO_TRANSLATION } from '@/features/manga/Manga.constants.ts';
import type {
    MangaArtistInfo,
    MangaAuthorInfo,
    MangaDescriptionInfo,
    MangaGenreInfo,
    MangaIdInfo,
    MangaStatusInfo,
    MangaThumbnailInfo,
    MangaTitleInfo,
} from '@/features/manga/Manga.types.ts';

type MangaMetaEntry = {
    key: string;
    value: string;
};

type EditableManga = MangaIdInfo &
    MangaTitleInfo &
    MangaStatusInfo &
    MangaAuthorInfo &
    MangaArtistInfo &
    MangaDescriptionInfo &
    MangaGenreInfo &
    MangaThumbnailInfo & {
        meta?: MangaMetaEntry[] | null;
    };

interface SearchResult {
    externalId: string;
    title: string;
    author: string | null;
    coverUrl: string | null;
    year: number | null;
    description: string | null;
}

const STATUS_OPTIONS = [
    MangaStatus.Unknown,
    MangaStatus.Ongoing,
    MangaStatus.Completed,
    MangaStatus.Licensed,
    MangaStatus.PublishingFinished,
    MangaStatus.Cancelled,
    MangaStatus.OnHiatus,
];

const PROVIDERS = ['MangaBaka', 'MangaUpdates', 'MyAnimeList', 'Anilist'];

const PROVIDER_LABELS: Record<string, string> = {
    MangaBaka: 'MangaBaka',
    MangaUpdates: 'MangaUpdates',
    MyAnimeList: 'MyAnimeList',
    Anilist: 'AniList',
};

const PROVIDER_URLS: Record<string, string> = {
    MangaBaka: 'https://mangabaka.org',
    MangaUpdates: 'https://www.mangaupdates.com',
    MyAnimeList: 'https://myanimelist.net',
    Anilist: 'https://anilist.co',
};

const getProviderFaviconUrl = (provider: string): string => {
    const providerUrl = PROVIDER_URLS[provider];
    return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(
        providerUrl,
    )}&size=128`;
};

const previewTextFieldSx = {
    '& .MuiInputBase-input::placeholder': {
        opacity: 1,
        color: 'text.secondary',
    },
    '& textarea::placeholder': {
        opacity: 1,
        color: 'text.secondary',
    },
};

type PreviewTextFieldProps = {
    fieldLabel: string;
    previewValue: string;
    value: string;
    onChange: (value: string) => void;
    multiline?: boolean;
    minRows?: number;
    maxRows?: number;
};

const PreviewTextField = ({
    fieldLabel,
    previewValue,
    value,
    onChange,
    multiline = false,
    minRows,
    maxRows,
}: PreviewTextFieldProps) => {
    const [focused, setFocused] = useState(false);

    const showPreviewAsLabel = !focused && value.length === 0 && previewValue.length > 0;
    const shrink = focused || value.length > 0;

    // Use an any-typed props object to avoid complex MUI overload typing issues
    const textFieldProps: any = {
        label: showPreviewAsLabel ? previewValue : fieldLabel,
        value,
        placeholder: previewValue,
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
        onFocus: () => setFocused(true),
        onBlur: () => setFocused(false),
        fullWidth: true,
        size: 'small',
        variant: 'outlined',
        multiline,
        minRows,
        maxRows,
        InputLabelProps: { shrink },
        sx: previewTextFieldSx,
    };

    return <TextField {...textFieldProps} />;
};

// Cast Autocomplete to "any" at usage sites to avoid type incompatibilities across MUI versions
const AutocompleteAny = Autocomplete as unknown as React.ComponentType<any>;

const EditTab = ({ manga, onClose }: { manga: EditableManga; onClose: () => void }) => {
    const { t } = useLingui();

    const metaMap = useMemo(
        () => Object.fromEntries((manga.meta ?? []).map((entry) => [entry.key, entry.value])),
        [manga.meta],
    );

    const initialTitle = metaMap['metadata.override.title'] ?? '';
    const initialAuthor = metaMap['metadata.override.author'] ?? '';
    const initialArtist = metaMap['metadata.override.artist'] ?? '';
    const initialDescription = metaMap['metadata.override.description'] ?? '';

    const [title, setTitle] = useState(initialTitle);
    const [author, setAuthor] = useState(initialAuthor);
    const [artist, setArtist] = useState(initialArtist);
    const [description, setDescription] = useState(initialDescription);
    const [genre, setGenre] = useState<string[]>(manga.genre ?? []);
    const [status, setStatus] = useState<MangaStatus>(manga.status);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [resetCover, setResetCover] = useState(true);

    const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCoverFile(file);
            setCoverPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async () => {
        setIsSaving(true);
        try {
            const patch = {
                title: title !== initialTitle ? title : undefined,
                author: author !== initialAuthor ? author : undefined,
                artist: artist !== initialArtist ? artist : undefined,
                description: description !== initialDescription ? description : undefined,
                genre: JSON.stringify(genre) !== JSON.stringify(manga.genre ?? []) ? genre : undefined,
                status: status !== manga.status ? status : undefined,
            };

            const hasTextChanges = Object.values(patch).some((v) => v !== undefined);
            if (hasTextChanges) {
                await requestManager.updateMangaDetails(manga.id, patch).response;
            }

            if (coverFile) {
                await requestManager.uploadMangaCover(manga.id, coverFile).response;
            }

            makeToast(t`Metadata updated successfully`, 'success');
            onClose();
        } catch (e) {
            makeToast(t`Failed to update metadata`, 'error', getErrorMessage(e));
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = async () => {
        setIsResetting(true);
        try {
            await requestManager.resetMangaMetadataToSource(manga.id, resetCover).response;
            makeToast(t`Metadata reset to source`, 'success');
            onClose();
        } catch (e) {
            makeToast(t`Failed to reset metadata`, 'error', getErrorMessage(e));
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <>
            <DialogContent>
                <Stack sx={{ gap: 2, mt: 1 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                        <Box sx={{ position: 'relative', flexShrink: 0, width: 120 }}>
                            <SpinnerImage
                                src={coverPreview ?? Mangas.getThumbnailUrl(manga)}
                                alt={manga.title}
                                imgStyle={{
                                    width: 120,
                                    height: 180,
                                    objectFit: 'cover',
                                    borderRadius: 4,
                                }}
                            />
                            <IconButton
                                component="label"
                                sx={{
                                    position: 'absolute',
                                    bottom: 4,
                                    right: 4,
                                    bgcolor: 'background.paper',
                                    '&:hover': { bgcolor: 'action.hover' },
                                }}
                                size="small"
                            >
                                <PhotoCameraIcon fontSize="small" />
                                <input type="file" hidden accept="image/*" onChange={handleCoverSelect} />
                            </IconButton>
                        </Box>

                        <Stack sx={{ gap: 1, flex: 1 }}>
                            <PreviewTextField fieldLabel={t`Title`} previewValue={manga.title} value={title} onChange={setTitle} />
                            <PreviewTextField
                                fieldLabel={t`Author`}
                                previewValue={manga.author ?? ''}
                                value={author}
                                onChange={setAuthor}
                            />
                            <PreviewTextField
                                fieldLabel={t`Artist`}
                                previewValue={manga.artist ?? ''}
                                value={artist}
                                onChange={setArtist}
                            />
                        </Stack>
                    </Box>

                    <TextField
                        select
                        label={t`Status`}
                        value={status}
                        onChange={(e) => setStatus(e.target.value as MangaStatus)}
                        fullWidth
                        size="small"
                    >
                        {STATUS_OPTIONS.map((s) => (
                            <MenuItem key={s} value={s}>
                                {t(MANGA_STATUS_TO_TRANSLATION[s as MangaStatus])}
                            </MenuItem>
                        ))}
                    </TextField>

                    {/* Use an any-typed Autocomplete wrapper to avoid MUI typing mismatches for renderTags */}
                    <AutocompleteAny
                        multiple
                        freeSolo
                        options={[] as string[]}
                        value={genre}
                        onChange={(_: React.SyntheticEvent, newValue: string[]) => setGenre(newValue)}
                        renderTags={(value: string[], getTagProps: (params: { index: number }) => any) =>
                            value.map((option: string, index: number) => (
                                <Chip variant="outlined" label={option} size="small" {...getTagProps({ index })} key={option} />
                            ))
                        }
                        renderInput={(params: AutocompleteRenderInputParams) => (
                            <TextField {...params} label={t`Genres`} size="small" placeholder={t`Add genre`} />
                        )}
                    />

                    <PreviewTextField
                        fieldLabel={t`Description`}
                        previewValue={manga.description ?? ''}
                        value={description}
                        onChange={setDescription}
                        multiline
                        minRows={3}
                        maxRows={6}
                    />
                </Stack>
            </DialogContent>

            <DialogActions sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <FormControlLabel
                    control={<Checkbox checked={resetCover} onChange={(e) => setResetCover(e.target.checked)} />}
                    label={t`Reset cover too`}
                    sx={{ ml: 1 }}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button onClick={handleReset} color="warning" disabled={isResetting || isSaving}>
                        {isResetting ? t`Resetting...` : t`Reset to source`}
                    </Button>
                    <Button onClick={onClose} color="primary">
                        {t`Cancel`}
                    </Button>
                    <Button onClick={handleSubmit} color="primary" disabled={isSaving || isResetting}>
                        {isSaving ? t`Saving...` : t`Save`}
                    </Button>
                </Box>
            </DialogActions>
        </>
    );
};

const getResultExternalUrl = (resultProvider: string, result: SearchResult): string | null => {
    switch (resultProvider) {
        case 'MyAnimeList':
            return `https://myanimelist.net/manga/${result.externalId}`;
        case 'Anilist':
            return `https://anilist.co/manga/${result.externalId}`;
        case 'MangaUpdates':
            return `https://www.mangaupdates.com/series/${result.externalId}`;
        case 'MangaBaka':
            return `https://mangabaka.org/${result.externalId}`;
        default:
            return null;
    }
};

const MatchResultCard = ({
    result,
    provider,
    selected,
    expanded,
    onSelect,
    onToggleExpanded,
}: {
    result: SearchResult;
    provider: string;
    selected: boolean;
    expanded: boolean;
    onSelect: () => void;
    onToggleExpanded: () => void;
}) => {
    const { t } = useLingui();
    const externalUrl = getResultExternalUrl(provider, result);

    return (
        <Card variant="outlined">
            <CardActionArea onClick={onSelect}>
                <CardContent>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                        <Stack direction="row" spacing={2} sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ flexShrink: 0 }}>
                                {result.coverUrl ? (
                                    externalUrl ? (
                                        <a href={externalUrl} rel="noreferrer" target="_blank">
                                            <Box
                                                component="img"
                                                src={result.coverUrl}
                                                alt={result.title}
                                                draggable={false}
                                                sx={{
                                                    width: 80,
                                                    height: 120,
                                                    objectFit: 'cover',
                                                    borderRadius: 1,
                                                    display: 'block',
                                                }}
                                            />
                                        </a>
                                    ) : (
                                        <Box
                                            component="img"
                                            src={result.coverUrl}
                                            alt={result.title}
                                            draggable={false}
                                            sx={{
                                                width: 80,
                                                height: 120,
                                                objectFit: 'cover',
                                                borderRadius: 1,
                                                display: 'block',
                                            }}
                                        />
                                    )
                                ) : null}
                            </Box>

                            <Stack spacing={1} sx={{ minWidth: 0, flex: 1 }}>
                                {externalUrl ? (
                                    <a
                                        href={externalUrl}
                                        rel="noreferrer"
                                        target="_blank"
                                        style={{ color: 'inherit', textDecoration: 'none' }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography variant="h6" noWrap sx={{ minWidth: 0 }}>
                                                {result.title}
                                            </Typography>
                                            {selected && <CheckCircleIcon color="primary" />}
                                        </Stack>
                                    </a>
                                ) : (
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Typography variant="h6" noWrap sx={{ minWidth: 0 }}>
                                            {result.title}
                                        </Typography>
                                        {selected && <CheckCircleIcon color="primary" />}
                                    </Stack>
                                )}

                                <Stack direction="row" spacing={1}>
                                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 70 }}>
                                        {t`Author`}
                                    </Typography>
                                    <Typography variant="body2">{result.author ?? '-'}</Typography>
                                </Stack>

                                <Stack direction="row" spacing={1}>
                                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 70 }}>
                                        {t`Year`}
                                    </Typography>
                                    <Typography variant="body2">{result.year ?? '-'}</Typography>
                                </Stack>
                            </Stack>
                        </Stack>

                        {externalUrl ? (
                            <IconButton
                                size="small"
                                aria-label={t`Open in new tab`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    window.open(externalUrl, '_blank', 'noopener,noreferrer');
                                }}
                            >
                                <OpenInNewIcon fontSize="small" />
                            </IconButton>
                        ) : null}
                    </Box>

                    {result.description ? (
                        <>
                            <Collapse in={expanded} collapsedSize={50}>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        mt: 2,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                    }}
                                >
                                    {result.description}
                                </Typography>
                            </Collapse>
                            <Button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onToggleExpanded();
                                }}
                                sx={{ mt: 1, px: 0 }}
                            >
                                {expanded ? t`Show less` : t`Show more`}
                            </Button>
                        </>
                    ) : null}
                </CardContent>
            </CardActionArea>
        </Card>
    );
};

const MatchTab = ({ manga, onClose }: { manga: EditableManga; onClose: () => void }) => {
    const { t } = useLingui();

    const [provider, setProvider] = useState(PROVIDERS[0]);
    const [searchQuery, setSearchQuery] = useState(manga.title);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
    const [isSearching, setIsSearching] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [includeCover, setIncludeCover] = useState(true);
    const [isApplying, setIsApplying] = useState(false);

    const handleSearch = async (queryOverride?: string, providerOverride?: string) => {
        const query = (queryOverride ?? searchQuery).trim();
        const providerToUse = providerOverride ?? provider;

        if (!query) {
            return;
        }

        setIsSearching(true);
        setResults([]);
        setSelectedId(null);
        setExpandedIds({});
        try {
            const response = await requestManager.searchMetadataProvider(providerToUse, query).response;
            setResults(response.data?.searchMetadataProvider?.results ?? []);
        } catch (e) {
            makeToast(t`Search failed`, 'error', getErrorMessage(e));
        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
        handleSearch(manga.title, PROVIDERS[0]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        handleSearch(searchQuery, provider);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [provider]);

    const handleApply = async () => {
        if (!selectedId) {
            return;
        }
        setIsApplying(true);
        try {
            await requestManager.applyMetadataMatch(manga.id, provider, selectedId, includeCover).response;
            makeToast(t`Metadata applied successfully`, 'success');
            onClose();
        } catch (e) {
            makeToast(t`Failed to apply metadata`, 'error', getErrorMessage(e));
        } finally {
            setIsApplying(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <>
            <DialogContent dividers>
                <Stack sx={{ gap: 2 }}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {PROVIDERS.map((p) => {
                            const sel = provider === p;
                            return (
                                <Button
                                    key={p}
                                    variant={sel ? 'contained' : 'outlined'}
                                    onClick={() => setProvider(p)}
                                    startIcon={
                                        <Box
                                            component="img"
                                            src={getProviderFaviconUrl(p)}
                                            alt={PROVIDER_LABELS[p]}
                                            sx={{ width: 24, height: 24, borderRadius: 0.5 }}
                                        />
                                    }
                                    sx={{
                                        justifyContent: 'flex-start',
                                        minWidth: 180,
                                        borderRadius: 3,
                                        textTransform: 'none',
                                        px: 2,
                                        py: 1.25,
                                    }}
                                >
                                    {PROVIDER_LABELS[p]}
                                </Button>
                            );
                        })}
                    </Stack>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                            label={t`Search`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            fullWidth
                            size="small"
                        />
                        <IconButton onClick={() => handleSearch()} disabled={isSearching || !searchQuery.trim()} color="primary">
                            {isSearching ? <CircularProgress size={24} /> : <SearchIcon />}
                        </IconButton>
                    </Box>

                    {results.length > 0 && (
                        <Box component="ul" sx={{ gap: 2, p: 0, m: 0, listStyle: 'none' }}>
                            {results.map((result) => (
                                <li key={result.externalId} style={{ listStyle: 'none' }}>
                                    <MatchResultCard
                                        result={result}
                                        provider={provider}
                                        selected={selectedId === result.externalId}
                                        expanded={!!expandedIds[result.externalId]}
                                        onSelect={() => setSelectedId(result.externalId)}
                                        onToggleExpanded={() =>
                                            setExpandedIds((prev) => ({
                                                ...prev,
                                                [result.externalId]: !prev[result.externalId],
                                            }))
                                        }
                                    />
                                </li>
                            ))}
                        </Box>
                    )}

                    {!isSearching && results.length === 0 && searchQuery && (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                            {t`Search for manga to match metadata`}
                        </Typography>
                    )}
                </Stack>
            </DialogContent>

            <DialogActions>
                <FormControlLabel
                    control={<Checkbox checked={includeCover} onChange={(e) => setIncludeCover(e.target.checked)} />}
                    label={t`Include cover image`}
                    sx={{ mr: 'auto', ml: 1 }}
                />
                <Button onClick={onClose} color="primary">
                    {t`Cancel`}
                </Button>
                <Button onClick={handleApply} color="primary" disabled={!selectedId || isApplying}>
                    {isApplying ? t`Applying...` : t`Apply`}
                </Button>
            </DialogActions>
        </>
    );
};

export const EditMangaMetadataDialog = ({ manga, onClose }: { manga: EditableManga; onClose: () => void }) => {
    const { t } = useLingui();
    const [tab, setTab] = useState(0);

    return (
        <Dialog open onClose={onClose} maxWidth="md" fullWidth>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
                <Tab label={t`Edit`} />
                <Tab label={t`Match`} />
            </Tabs>
            {tab === 0 && <EditTab manga={manga} onClose={onClose} />}
            {tab === 1 && <MatchTab manga={manga} onClose={onClose} />}
        </Dialog>
    );
};
