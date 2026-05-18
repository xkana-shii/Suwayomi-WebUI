/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeSanitize from 'rehype-sanitize';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { useTheme } from '@mui/material/styles';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MarkdownRendererProps = {
    /** Markdown source string. Renders nothing when falsy. */
    source?: string | null;
    className?: string;
    /** When false, inline images are replaced with a labelled placeholder icon. */
    loadImages?: boolean;
    maxHeight?: string | number;
};

// ---------------------------------------------------------------------------
// Sanitize schema
// ---------------------------------------------------------------------------

const SANITIZE_SCHEMA = {
    tagNames: [
        'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'blockquote', 'ul', 'ol', 'li',
        'pre', 'code', 'hr', 'br',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'a', 'strong', 'em', 'img', 'input',
    ],
    attributes: {
        a:     ['href', 'title'],
        img:   ['src', 'alt', 'title'],
        input: ['type', 'checked', 'disabled'],
        '*':   ['className', 'align'],
    },
    protocols: {
        href: ['http', 'https', 'mailto', 'tel'],
        src:  ['http', 'https', 'data'],
    },
};

// rehype-sanitize typing workaround for react-markdown/unified.
const REHYPE_PLUGINS = [[rehypeSanitize, SANITIZE_SCHEMA]] as any;
const REMARK_PLUGINS = [remarkGfm, remarkBreaks] as any[];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true when every child is empty whitespace or a <br /> element. */
function isParagraphEmpty(children: React.ReactNode): boolean {
    const childArray = React.Children.toArray(children);
    if (childArray.length === 0) {return true;}
    return childArray.every((c) => {
        if (typeof c === 'string') {return /^\s*$/.test(c);}
        if (React.isValidElement(c)) {
            const t = typeof c.type === 'string' ? c.type.toLowerCase() : '';
            return t === 'br';
        }
        return false;
    });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
    source,
    className,
    loadImages = true,
    maxHeight,
}) => {
    const theme = useTheme();

    if (!source) {return null;}

    const escapedSource = source.replaceAll('~~', '\\~\\~');

    // Komikku markdownPadding.block = 3.dp -> theme.spacing(3)
    const BLOCK_GAP = theme.spacing(1.5);

    return (
        <Box
            className={className}
            sx={{
                color: theme.palette.text.primary,
                '& h1, & h2, & h3, & h4, & h5, & h6': {
                    mt: theme.spacing(1),
                    mb: BLOCK_GAP,
                },
                '& p': {
                    mt: 0,
                    mb: BLOCK_GAP,
                    lineHeight: 1.45,
                },
                '& p + p': { mt: BLOCK_GAP },
                '& a': {
                    color: theme.palette.primary.main,
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                },
                '& img': { maxWidth: '100%', display: 'block' },
                maxHeight: maxHeight ?? 'auto',
                overflow: maxHeight ? 'auto' : undefined,
            }}
        >
            <ReactMarkdown
                remarkPlugins={REMARK_PLUGINS}
                rehypePlugins={REHYPE_PLUGINS}
                components={{
                    // --- Paragraph ---
                    p: ({ children, className: cls }: any) =>
                        isParagraphEmpty(children) ? (
                            <Box sx={{ height: BLOCK_GAP }} />
                        ) : (
                            <Typography component="p" variant="body2" className={cls}>
                                {children}
                            </Typography>
                        ),

                    // --- Links ---
                    a: ({ children, href, title, className: cls }: any) => {
                        const allowed = href && /^(https?:|mailto:|tel:|\/)/i.test(href);
                        const isInternal = href && (href.startsWith('/') || href.startsWith(window.location.origin));
                        const isBlank = !isInternal && allowed;
                        return (
                            <a
                                className={cls}
                                href={allowed ? href : undefined}
                                title={title}
                                target={isBlank ? '_blank' : undefined}
                                // noreferrer implies noopener; satisfies both react/jsx-no-target-blank
                                // and oxc's stricter jsx-no-target-blank rule.
                                rel={isBlank ? 'noreferrer' : undefined}
                            >
                                {children}
                            </a>
                        );
                    },

                    // --- Images ---
                    img: ({ src, alt, title, className: cls }: any) =>
                        loadImages ? (
                            // eslint-disable-next-line jsx-a11y/img-redundant-alt
                            <img
                                className={cls}
                                src={src}
                                alt={alt ?? ''}
                                title={title}
                                loading="lazy"
                                style={{ maxWidth: '100%', borderRadius: 4 }}
                            />
                        ) : (
                            <Box
                                component="span"
                                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                                className={cls}
                            >
                                <ImageOutlinedIcon fontSize="small" color="action" />
                                <Typography component="span" variant="body2" color="text.secondary">
                                    {alt ?? ''}
                                </Typography>
                            </Box>
                        ),

                    // --- Lists ---
                    ul: ({ children, className: cls }: any) => (
                        <Box component="ul" sx={{ pl: theme.spacing(3), mb: theme.spacing(1) }} className={cls}>
                            {children}
                        </Box>
                    ),
                    ol: ({ children, className: cls }: any) => (
                        <Box component="ol" sx={{ pl: theme.spacing(3), mb: theme.spacing(1) }} className={cls}>
                            {children}
                        </Box>
                    ),
                    li: ({ children, checked }: any) =>
                        typeof checked === 'boolean' ? (
                            <Box component="li" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <input type="checkbox" checked={checked} disabled aria-hidden className="task-checkbox" />
                                <Box component="span">{children}</Box>
                            </Box>
                        ) : (
                            <Box component="li">{children}</Box>
                        ),

                    // --- Code ---
                    // react-markdown v7+: detect inline by absence of a newline in content.
                    code: ({ node, children, className: cls }: any) => {
                        const isInline = !node?.position?.start?.line ||
                            node.position.start.line === node.position.end?.line;
                        return isInline ? (
                            <Box
                                component="code"
                                sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', px: 0.5 }}
                                className={cls}
                            >
                                {children}
                            </Box>
                        ) : (
                            <Box
                                component="pre"
                                sx={{
                                    whiteSpace: 'pre',
                                    p: theme.spacing(1),
                                    bgcolor: theme.palette.mode === 'dark'
                                        ? theme.palette.background.paper
                                        : 'action.hover',
                                    borderRadius: 1,
                                    overflow: 'auto',
                                    my: BLOCK_GAP,
                                }}
                                className={cls}
                            >
                                <Box component="code" sx={{ fontFamily: 'monospace' }}>
                                    {children}
                                </Box>
                            </Box>
                        );
                    },

                    // --- Tables ---
                    table: ({ children, className: cls }: any) => (
                        <TableContainer
                            component={Paper}
                            variant="outlined"
                            sx={{ width: '100%', my: BLOCK_GAP }}
                            className={cls}
                        >
                            <Table size="small">{children}</Table>
                        </TableContainer>
                    ),
                    thead: ({ children }: any) => <TableHead>{children}</TableHead>,
                    tbody: ({ children }: any) => <TableBody>{children}</TableBody>,
                    tr:    ({ children }: any) => <TableRow>{children}</TableRow>,
                    th:    ({ children }: any) => (
                        <TableCell component="th" sx={{ fontWeight: 'bold' }}>{children}</TableCell>
                    ),
                    td:    ({ children }: any) => <TableCell>{children}</TableCell>,

                    // --- Horizontal rule ---
                    hr: () => (
                        <Box
                            component="hr"
                            sx={{
                                border: 0,
                                borderTop: `1px solid ${theme.palette.divider}`,
                                height: 0,
                                my: BLOCK_GAP,
                            }}
                        />
                    ),

                    // --- Blockquote ---
                    blockquote: ({ children }: any) => (
                        <Box
                            sx={{
                                borderLeft: `4px solid ${theme.palette.action.selected}`,
                                pl: theme.spacing(2),
                                pr: theme.spacing(2),
                                '& p': { mt: 0, mb: 0 },
                            }}
                        >
                            <Typography
                                variant="body2"
                                sx={{ fontStyle: 'italic', py: theme.spacing(0.5) }}
                            >
                                {children}
                            </Typography>
                        </Box>
                    ),
                }}
            >
                {escapedSource}
            </ReactMarkdown>
        </Box>
    );
};
