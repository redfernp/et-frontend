import { createHash } from 'node:crypto';
import { parseDocument } from 'htmlparser2';

// These are deliberately partial editorial previews from the dated local snapshot.
// The source digest prevents later WordPress edits from silently shifting the selection.
const selections = {
  '/bet365-review-redesign': {
    databaseId: 89169,
    exclusionReason: 'uncrawled-inline-style',
    digest: 'd2d22614be75edee54688d8048f7cb77b0702e5474d56ca5e33d9373c97baf09',
    indices: [22, 23, 24, 25, 26, 27, 28, 29, 32, 33, 34, 35, 40, 41],
  },
  '/10bet-review': {
    databaseId: 89153,
    exclusionReason: 'uncrawled-builder',
    digest: '4476099a904ea7763e09b56d1d6bbf221bfcf004a8df5b78a6f72c7b50fbcafb',
    indices: [7, 9, 11, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 28, 29, 30, 31],
  },
  '/betwright-review': {
    databaseId: 89146,
    exclusionReason: 'uncrawled-builder',
    digest: '5a316a5eb39dad3080fb6b09f398f85b5c39b81c8c93f6f186f180674a6730d7',
    indices: [7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 28, 29, 30, 31],
  },
  '/netbet-review': {
    databaseId: 89145,
    exclusionReason: 'uncrawled-builder',
    digest: '4526df5801ac322ef4285fdd256d80d9b3b6122440ac9bb4dd8606607f3fc322',
    indices: [7, 11, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 28, 29, 30, 31],
  },
  '/spreadex-review': {
    databaseId: 89143,
    exclusionReason: 'uncrawled-builder',
    digest: '4eba00ff124fb6d56b9d5c88f656b558425a0046b03b34dbdeec8c9db85c0d0c',
    indices: [7, 8, 9, 11, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 28, 29, 30, 31],
  },
  '/how-to-lay-a-horse-to-lose-on-betfair.html': {
    databaseId: 12944,
    exclusionReason: 'unsafe-content:active-embed',
    digest: 'f294e0084bf0218bd7b4cc050a4397bbcf45313cb556652a02ce4265461c36f6',
    indices: [0, 1, 4, 5, 7, 8, 9, 10, 11, 12],
  },
  '/inform-racing-review.html': {
    databaseId: 10238,
    exclusionReason: 'unsafe-content:active-embed',
    digest: '3c7a05e9b6c0a26857911d8b03db8a023429e5caf55bfd8a3d5cd24bb9477030',
    indices: [0, 1, 2, 3, 6, 7, 8, 9, 10, 11, 12],
  },
  '/cheltenham-non-runner-no-bet.html': {
    databaseId: 8640,
    exclusionReason: 'unsafe-content:builder-markup',
    digest: 'a1e33a611d4d347ea600a1db9992545875c7921e9283577c2c173cecd7bee24f',
    indices: [0, 1, 2, 5, 6, 7, 8],
  },
  '/jason-weaver-horse-racing-tips.html': {
    databaseId: 73437,
    exclusionReason: 'unsafe-content:builder-markup+inline-style',
    digest: '019a937ade1bd8fdd37e2b959031bdc39871e152167cfc2f8d0a02251326ee9b',
    indices: [13, 14, 15, 16, 17, 18],
  },
  '/goals-galore-betfred-explained': {
    databaseId: 56067,
    exclusionReason: 'unsafe-content:builder-markup',
    digest: '6b0b5526d1c8a9dab12bdbb6edf92ead8e83754a0c0cc385c59b8812ca3209ac',
    indices: [7, 8, 9, 20, 21, 22, 24, 25, 33, 34, 35, 40, 42],
  },
  '/bet365-6-scores-challenge': {
    databaseId: 60493,
    exclusionReason: 'unsafe-content:builder-markup',
    digest: 'aa7fac16de62e907a3c620755c69774f51402afe605c69c7deece1aa843428f3',
    indices: [25, 26, 27, 37, 38, 39, 40, 41, 42, 43, 46],
  },
  '/bet365-6-horses-challenge.html': {
    databaseId: 83716,
    exclusionReason: 'unsafe-content:builder-markup',
    digest: '3f31fba1c3e06067e1e38cc7a5fa8f58d819ccf2a8261ec98d0a5edf8ef4c4b0',
    indices: [15, 16, 26, 27, 28, 29, 30, 46, 57, 58, 59, 60, 61, 62, 63],
  },
  '/false-favourites.html': {
    databaseId: 8307,
    exclusionReason: 'unsafe-content:active-embed',
    digest: 'fbba0f1d82cc545b3ca5da19069e4a55078bd241b669d61a400041e282816c36',
    indices: [2, 3, 7, 9, 10, 11, 15],
  },
};

export const curatedExactPaths = Object.freeze(Object.keys(selections));
export function curatedReasonMatches(path, reason) {
  return selections[path]?.exclusionReason === reason;
}

function plainText(node) {
  return node.type === 'text' ? node.data : (node.children ?? []).map(plainText).join('');
}

function sourceSections(content) {
  const output = [];
  function visit(node) {
    if (['p', 'h2', 'h3', 'li'].includes(node.name)) {
      const text = plainText(node).replace(/\s+/g, ' ').trim();
      if (text) output.push({ kind: node.name, text });
    }
    for (const child of node.children ?? []) visit(child);
  }
  visit(parseDocument(content));
  return output;
}

export function curatedPreviewSections(record) {
  const selection = selections[record?.uri];
  if (!selection) throw new Error(`No curated preview selection for ${record?.uri ?? 'unknown'}`);
  const digest = createHash('sha256').update(record.content ?? '').digest('hex');
  if (record.databaseId !== selection.databaseId || digest !== selection.digest) {
    throw new Error(`Curated source changed for ${record.uri}; re-review before regenerating`);
  }
  const available = sourceSections(record.content);
  const sections = selection.indices.map((index) => available[index]);
  if (sections.some((section) => !section)) throw new Error(`Curated source structure changed for ${record.uri}`);
  return sections;
}
