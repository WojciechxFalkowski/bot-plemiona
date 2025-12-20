import { Logger } from '@nestjs/common';

export type ScheduledAttackType = 'off' | 'fake' | 'nobleman' | 'support';

export interface ParsedAttackBlock {
  readonly rawLineNumberStart: number;
  readonly sendTimeFrom: Date;
  readonly sendTimeTo: Date;
  readonly sourceCoordinates: string;
  readonly targetCoordinates: string;
  readonly attackUrl: string;
  readonly villageId: string;
  readonly targetId: string;
  readonly attackType: ScheduledAttackType;
  readonly description?: string;
  readonly metadata?: Record<string, unknown>;
}

interface NormalizedLine {
  readonly line: string;
  readonly index: number;
}

interface RawAttackBlock {
  readonly metaLine?: string;
  readonly timeLine: string;
  readonly coordsLine: string;
  readonly urlLine: string;
  readonly startIndex: number;
}

interface ParseAttackPlanDependencies {
  readonly logger: Logger;
}

export const parseAttackPlan = (rawPlan: string, deps: ParseAttackPlanDependencies): ParsedAttackBlock[] => {
  const normalizedLines = normalizeRawPlan(rawPlan, deps.logger);
  const rawBlocks = splitIntoBlocks(normalizedLines, deps.logger);
  return rawBlocks.map((block) => parseBlock(block, deps.logger)).filter((block): block is ParsedAttackBlock => block !== null);
};

const normalizeRawPlan = (rawPlan: string, logger: Logger): NormalizedLine[] => {
  const lines = rawPlan.split(/\r?\n/);
  const normalized: NormalizedLine[] = [];

  lines.forEach((originalLine, index) => {
    let line = originalLine.trim();

    if (!line) {
      return;
    }

    // Remove simple BBCode tags like [b], [/b], [color=#ff0000], [/color]
    line = line.replace(/\[(?:\/)?b\]/gi, '');
    line = line.replace(/\[color=[^\]]*\]/gi, '');
    line = line.replace(/\[\/color\]/gi, '');

    // Convert [url=LINK]TEXT[/url] to: LINK TEXT
    line = line.replace(/\[url=([^\]]+)\]([^\[]*)\[\/url\]/gi, (_match, url, text) => {
      const trimmedText = String(text ?? '').trim();
      if (!trimmedText) {
        return String(url);
      }
      return `${String(url)} ${trimmedText}`;
    });

    // Drop header-like separator lines
    if (/^-{3,}/.test(line)) {
      return;
    }

    const cleaned = line.trim();
    if (!cleaned) {
      return;
    }

    normalized.push({ line: cleaned, index });
  });

  logger.debug(`normalizeRawPlan: reduced ${lines.length} raw lines to ${normalized.length} normalized lines`);
  return normalized;
};

const splitIntoBlocks = (lines: NormalizedLine[], logger: Logger): RawAttackBlock[] => {
  const blocks: RawAttackBlock[] = [];
  let pendingMetaLine: string | undefined;

  const timeLineRegex = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s*-\s*\d{2}:\d{2}:\d{2}$/;
  const metaLineRegex = /^\d+\.\s+Wyślij\s+/i;

  let i = 0;
  while (i < lines.length) {
    const { line, index } = lines[i];

    if (metaLineRegex.test(line)) {
      pendingMetaLine = line;
      i += 1;
      continue;
    }

    if (timeLineRegex.test(line)) {
      const timeLine = line;
      const startIndex = typeof pendingMetaLine === 'string' ? index - 1 : index;

      const coordsEntry = lines[i + 1];
      const urlEntry = lines[i + 2];

      if (!coordsEntry || !urlEntry) {
        logger.warn(`splitIntoBlocks: incomplete block near line ${index}, skipping`);
        i += 1;
        pendingMetaLine = undefined;
        continue;
      }

      const coordsLine = coordsEntry.line;
      const urlLine = urlEntry.line;

      blocks.push({
        metaLine: pendingMetaLine,
        timeLine,
        coordsLine,
        urlLine,
        startIndex,
      });

      pendingMetaLine = undefined;
      i += 3;
      continue;
    }

    i += 1;
  }

  logger.debug(`splitIntoBlocks: created ${blocks.length} raw attack blocks`);
  return blocks;
};

const parseBlock = (block: RawAttackBlock, logger: Logger): ParsedAttackBlock | null => {
  const { metaLine, timeLine, coordsLine, urlLine, startIndex } = block;

  const timeParsed = parseTimeLine(timeLine);
  if (!timeParsed) {
    logger.warn(`parseBlock: failed to parse time line '${timeLine}' at index ${startIndex}`);
    return null;
  }

  const coordsParsed = parseCoordsLine(coordsLine);
  if (!coordsParsed) {
    logger.warn(`parseBlock: failed to parse coords line '${coordsLine}' at index ${startIndex}`);
    return null;
  }

  const urlParsed = parseUrlLine(urlLine);
  if (!urlParsed) {
    logger.warn(`parseBlock: failed to parse url line '${urlLine}' at index ${startIndex}`);
    return null;
  }

  const typeAndDescription = parseTypeAndDescription(metaLine, urlLine);

  return {
    rawLineNumberStart: startIndex,
    sendTimeFrom: timeParsed.sendTimeFrom,
    sendTimeTo: timeParsed.sendTimeTo,
    sourceCoordinates: coordsParsed.sourceCoordinates,
    targetCoordinates: coordsParsed.targetCoordinates,
    attackUrl: urlParsed.attackUrl,
    villageId: urlParsed.villageId,
    targetId: urlParsed.targetId,
    attackType: typeAndDescription.attackType,
    description: typeAndDescription.description,
    metadata: typeAndDescription.metadata,
  };
};

const parseTimeLine = (timeLine: string): { sendTimeFrom: Date; sendTimeTo: Date } | null => {
  const match = timeLine.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s*-\s*(\d{2}:\d{2}:\d{2})$/);
  if (!match) {
    return null;
  }

  const [, datePart, startTimePart, endTimePart] = match;
  const sendTimeFrom = new Date(`${datePart}T${startTimePart}`);
  let sendTimeTo = new Date(`${datePart}T${endTimePart}`);

  // If latest send time is earlier than earliest, we assume the window crosses midnight and belongs to the next day.
  if (sendTimeTo.getTime() < sendTimeFrom.getTime()) {
    sendTimeTo = new Date(sendTimeTo.getTime() + 24 * 60 * 60 * 1000);
  }

  return { sendTimeFrom, sendTimeTo };
};

const parseCoordsLine = (coordsLine: string): { sourceCoordinates: string; targetCoordinates: string } | null => {
  const parts = coordsLine.split('->');
  if (parts.length !== 2) {
    return null;
  }

  const sourceCoordinates = parts[0]?.trim() ?? '';
  const targetCoordinates = parts[1]?.trim() ?? '';

  if (!sourceCoordinates || !targetCoordinates) {
    return null;
  }

  return { sourceCoordinates, targetCoordinates };
};

const parseUrlLine = (urlLine: string): { attackUrl: string; villageId: string; targetId: string } | null => {
  const tokens = urlLine.split(/\s+/);
  const attackUrl = tokens.find((token) => token.startsWith('http')) ?? '';
  if (!attackUrl) {
    return null;
  }

  const url = new URL(attackUrl);
  const villageId = url.searchParams.get('village') ?? '';
  const targetId = url.searchParams.get('target') ?? '';

  if (!villageId || !targetId) {
    return null;
  }

  return { attackUrl, villageId, targetId };
};

const parseTypeAndDescription = (
  metaLine: string | undefined,
  urlLine: string,
): { attackType: ScheduledAttackType; description?: string; metadata?: Record<string, unknown> } => {
  const context = `${metaLine ?? ''} ${urlLine}`.toLowerCase();

  let attackType: ScheduledAttackType = 'off';
  if (context.includes('wyślij fejk') || context.includes('wyslij fejk')) {
    attackType = 'fake';
  } else if (context.includes('wyślij burzak') || context.includes('wyslij burzak') || context.includes('wyślij szlachcic') || context.includes('wyslij szlachcic')) {
    attackType = 'nobleman';
  } else if (context.includes('wyślij wsparcie') || context.includes('wyslij wsparcie') || context.includes('support')) {
    attackType = 'support';
  }

  let description: string | undefined;
  let metadata: Record<string, unknown> | undefined;

  if (metaLine) {
    const descMatch = metaLine.match(/\[(.+?)\]/);
    if (descMatch) {
      description = descMatch[1].trim();

      const buildingMatch = description.match(/na\s+([A-ZĄĆĘŁŃÓŚŹŻ]+)/i);
      const resourcesMatch = description.match(/(\d+)\s*k/i);

      const meta: Record<string, unknown> = {};
      if (buildingMatch) {
        meta.building = buildingMatch[1].toUpperCase();
      }
      if (resourcesMatch) {
        const value = Number.parseInt(resourcesMatch[1], 10);
        if (!Number.isNaN(value)) {
          meta.resources = value * 1000;
        }
      }

      if (Object.keys(meta).length > 0) {
        metadata = meta;
      }
    }
  }

  return { attackType, description, metadata };
};
