import { Fragment, type ReactNode } from "react";
import {
    FONT_SIZE_STEPS, FONT_FAMILY_MAP, SPACING_MAP, MARGIN_MAP, THEME_COLORS,
    type ReaderSettings,
} from "@/hooks/useReaderSettings";

const BASE_FONT_PX = 17;
const IMAGE_LINE = /^!\[(.*?)\]\((\S+)\)$/;
const INLINE_TOKEN = /\*\*(.+?)\*\*|_(.+?)_/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    let i = 0;
    let match: RegExpExecArray | null;
    while ((match = INLINE_TOKEN.exec(text)) !== null) {
        if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
        if (match[1] !== undefined) {
            nodes.push(<strong key={`${keyPrefix}-b-${i++}`}>{match[1]}</strong>);
        } else if (match[2] !== undefined) {
            nodes.push(<em key={`${keyPrefix}-i-${i++}`}>{match[2]}</em>);
        }
        lastIndex = INLINE_TOKEN.lastIndex;
    }
    if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
    return nodes;
}

export function countChapterWords(content: string): number {
    const trimmed = content.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function ChapterContent({ content, settings, className }: {
    content: string;
    settings: ReaderSettings;
    className?: string;
}) {
    const colors = THEME_COLORS[settings.theme];
    const blocks = content.split(/\n{2,}/);

    return (
        <div
            style={{
                color: colors.fg,
                fontFamily: FONT_FAMILY_MAP[settings.font],
                fontSize: `${Math.round((BASE_FONT_PX * FONT_SIZE_STEPS[settings.fontSizeIndex]) / 100)}px`,
                lineHeight: SPACING_MAP[settings.spacing],
                padding: `0 ${MARGIN_MAP[settings.margin]}`,
            }}
            className={className ?? "space-y-4 pb-16"}
        >
            {blocks.map((block, idx) => {
                const trimmed = block.trim();
                if (!trimmed) return null;

                const imageMatch = trimmed.match(IMAGE_LINE);
                if (imageMatch) {
                    return (
                        <img key={idx} src={imageMatch[2]} alt={imageMatch[1]} className="w-full rounded-2xl" />
                    );
                }

                const lines = trimmed.split("\n");
                return (
                    <p key={idx}>
                        {lines.map((line, li) => (
                            <Fragment key={li}>
                                {li > 0 && <br />}
                                {renderInline(line, `${idx}-${li}`)}
                            </Fragment>
                        ))}
                    </p>
                );
            })}
        </div>
    );
}
