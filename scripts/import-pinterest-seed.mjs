import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const seasons = ['summer', 'winter', 'spring', 'fall', 'all'];
const occasions = ['casual', 'work', 'date', 'streetwear', 'formal', 'athletic', 'travel', 'party'];

const RawItemSchema = z.object({
  id: z.string().min(1).optional(),
  imageUrl: z.string().url(),
  pinUrl: z.string().url(),
  vibeTags: z.array(z.string().min(1)).min(1).optional(),
  season: z.enum(seasons).optional(),
  occasion: z.enum(occasions).optional(),
  createdAt: z.string().min(1).optional(),
});

const RawArraySchema = z.array(RawItemSchema);

function parseArgs(argv) {
  const args = {
    gender: null,
    input: null,
    output: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--gender') {
      args.gender = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (value === '--input') {
      args.input = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (value === '--output') {
      args.output = argv[index + 1] ?? null;
      index += 1;
    }
  }

  if (args.gender !== 'men' && args.gender !== 'women') {
    throw new Error('Missing or invalid --gender. Use --gender men or --gender women.');
  }

  if (!args.input) {
    throw new Error(
      `Missing --input. Example: npm run import:pinterest:${args.gender} -- --input ./data/${args.gender}-pins.json`
    );
  }

  return args;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function buildItem(raw, gender, index) {
  const normalizedTags = (raw.vibeTags ?? ['minimal']).map((tag) => tag.trim().toLowerCase()).filter(Boolean);
  const firstTag = normalizedTags[0] ?? 'look';
  const baseId = raw.id?.trim() || `${gender}_${String(index + 1).padStart(3, '0')}_${slugify(firstTag)}`;

  return {
    id: baseId,
    gender,
    imageUrl: raw.imageUrl,
    pinUrl: raw.pinUrl,
    vibeTags: normalizedTags.length ? normalizedTags : ['minimal'],
    season: raw.season ?? 'all',
    occasion: raw.occasion ?? 'casual',
    createdAt: raw.createdAt ?? new Date().toISOString(),
    source: 'pinterest_seed',
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(process.cwd(), args.input);
  const outputPath = args.output
    ? path.resolve(process.cwd(), args.output)
    : path.join(rootDir, 'assets', 'data', `pinterest_seed_${args.gender}.json`);

  const rawText = await fs.readFile(inputPath, 'utf8');
  const rawJson = JSON.parse(rawText);
  const parsed = RawArraySchema.parse(rawJson);

  const items = [];
  const seenPinUrls = new Set();

  parsed.forEach((entry, index) => {
    if (seenPinUrls.has(entry.pinUrl)) {
      return;
    }
    seenPinUrls.add(entry.pinUrl);
    items.push(buildItem(entry, args.gender, index));
  });

  await fs.writeFile(outputPath, `${JSON.stringify(items, null, 2)}\n`, 'utf8');

  console.log(`Wrote ${items.length} ${args.gender} items to ${outputPath}`);
}

main().catch((error) => {
  console.error('[import-pinterest-seed] Failed:', error.message);
  process.exitCode = 1;
});
