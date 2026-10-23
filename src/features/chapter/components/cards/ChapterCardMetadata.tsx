/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Box from '@mui/material/Box';
import type { ComponentProps, ReactElement, ReactNode } from 'react';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import { TypographyMaxLines } from '@/base/components/texts/TypographyMaxLines.tsx';
import { CustomTooltip } from '@/base/components/CustomTooltip.tsx';
import { MUIUtil } from '@/lib/mui/MUI.util.ts';

const TOOLTIP_PREVENT_OVERFLOW = {
    slotProps: {
        popper: {
            modifiers: [
                {
                    name: 'preventOverflow',
                    options: {
                        boundary: 'viewport',
                        padding: 8,
                        mainAxis: true,
                        altAxis: true,
                        tether: false,
                    },
                },
            ],
        },
    },
};

const OptionalTooltip = ({
    title,
    disabled,
    children,
}: {
    title: string;
    disabled?: boolean;
    children: ReactElement;
}) => {
    if (disabled) {
        return children;
    }

    return (
        <CustomTooltip title={title} placement="right" {...TOOLTIP_PREVENT_OVERFLOW}>
            {children}
        </CustomTooltip>
    );
};

export const ChapterCardMetadata = ({
    title,
    secondaryText,
    ternaryText,
    infoIcons,
    showUnreadDot,
    disableTooltips,
    slotProps,
}: {
    title: string;
    secondaryText?: string | null;
    ternaryText?: string | null;
    infoIcons?: ReactNode;
    showUnreadDot?: boolean;
    disableTooltips?: boolean;
    slotProps?: {
        title?: ComponentProps<typeof TypographyMaxLines>;
        secondaryText?: ComponentProps<typeof TypographyMaxLines>;
        ternaryText?: ComponentProps<typeof TypographyMaxLines>;
    };
}) => {
    const theme = useTheme();
    const unreadDotSize = `calc(${theme.typography.caption.fontSize} * 0.6)`;
    // the dot is shown in front of the last text line (the chapter name in the updates and history lists)
    const unreadDotLine = ternaryText ? 'ternary' : 'secondary';
    const unreadDot = showUnreadDot && (
        <Box
            sx={{
                width: unreadDotSize,
                height: unreadDotSize,
                borderRadius: '50%',
                backgroundColor: 'primary.main',
                flex: '0 0 auto',
            }}
        />
    );

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                flexGrow: 1,
                flexShrink: 1,
                wordBreak: 'break-word',
            }}
        >
            <Stack
                sx={{
                    flexDirection: 'row',
                    gap: 0.5,
                    alignItems: 'center',
                }}
            >
                {infoIcons}
                <OptionalTooltip title={title} disabled={disableTooltips}>
                    <TypographyMaxLines variant="h6" component="h3" {...slotProps?.title}>
                        {title}
                    </TypographyMaxLines>
                </OptionalTooltip>
            </Stack>
            {secondaryText && (
                <Stack
                    sx={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 0.75,
                        minWidth: 0,
                    }}
                >
                    {unreadDotLine === 'secondary' && unreadDot}
                    <OptionalTooltip title={secondaryText} disabled={disableTooltips}>
                        <TypographyMaxLines
                            variant="caption"
                            lines={1}
                            {...slotProps?.secondaryText}
                            sx={MUIUtil.mergeSx(
                                {
                                    width: 'fit-content',
                                },
                                slotProps?.secondaryText?.sx,
                            )}
                        >
                            {secondaryText}
                        </TypographyMaxLines>
                    </OptionalTooltip>
                </Stack>
            )}
            {ternaryText && (
                <Stack
                    sx={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 0.75,
                        minWidth: 0,
                    }}
                >
                    {unreadDotLine === 'ternary' && unreadDot}
                    <OptionalTooltip title={ternaryText} disabled={disableTooltips}>
                        <TypographyMaxLines
                            variant="caption"
                            lines={1}
                            {...slotProps?.ternaryText}
                            sx={MUIUtil.mergeSx(
                                {
                                    width: 'fit-content',
                                },
                                slotProps?.ternaryText?.sx,
                            )}
                        >
                            {ternaryText}
                        </TypographyMaxLines>
                    </OptionalTooltip>
                </Stack>
            )}
        </Box>
    );
};
