import type { PrintDocument, Node, Style } from '@print-engine/schema';

const COL = {
  hour: '16mm',
  cadence: '16mm',
  note: '12mm',
} as const;

const cellBase: Style = { size: '8pt', align: 'center' };

const tableHeader: Node = {
  type: 'stack',
  direction: 'row',
  style: { background: '#bfbfbf', gap: '1mm', padding: '1px 2px', weight: 700 },
  children: [
    { type: 'text', value: 'Ora', style: { ...cellBase, width: COL.hour, weight: 700 } },
    { type: 'text', value: 'Cadenza', style: { ...cellBase, width: COL.cadence, weight: 700 } },
    { type: 'text', value: 'Destinazione', style: { ...cellBase, grow: 1, weight: 700 } },
    { type: 'text', value: 'Nota', style: { ...cellBase, width: COL.note, weight: 700 } },
  ],
};

const doc: PrintDocument = {
  schemaVersion: 1,
  page: { size: 'A4', orientation: 'portrait', margin: '10mm' },

  regions: {
    header: {
      type: 'stack',
      direction: 'column',
      style: { padding: '0 0 6px 0' },
      children: [
        {
          type: 'field',
          bind: '$.header.subtitle',
          style: { background: '#1565a8', color: '#ffffff', weight: 700, size: '11pt', padding: '4px 10px' },
        },
        {
          type: 'field',
          bind: '$.header.title',
          style: {
            background: '#1565a8', color: '#ffffff', weight: 700, size: '22pt',
            padding: '6px 10px', borderTop: '2px solid #ffffff',
          },
        },
      ],
    },
    footer: {
      type: 'stack',
      direction: 'column',
      style: { padding: '8px 0 0 0' },
      children: [
        {
          type: 'field',
          bind: '$.header.subtitle',
          style: { background: '#ffff00', color: '#c00000', weight: 700, size: '9pt', padding: '2px 10px', align: 'center' },
        },
        { type: 'text', value: 'I BIGLIETTI SONO ACQUISTABILI A BORDO CON UN SOVRAPPREZZO.', style: { size: '7pt', weight: 700 } },
      ],
    },
  },

  // ─── Corpo: intestazione tabella + un unico flusso a serpentina su 3 colonne ───
  body: {
    type: 'stack',
    direction: 'column',
    children: [
      tableHeader,
      {
        type: 'columns',
        mode: 'newspaper',
        count: 3,
        style: { gap: '4mm', padding: '4px 0 0 0' },
        // Un solo "figlio": il group. La sua interezza (header+righe per ogni
        // periodo) è il flusso che il giornale fa scorrere e spezzare a serpentina
        // — l'algoritmo scende dentro il group automaticamente quando non ci sta.
        children: [
          {
            type: 'group',
            dataSource: '$.runs',
            groupBy: '$item.period',
            groupHeader: {
              type: 'field',
              bind: '$group.key',
              style: {
                background: '#8db3e2',
                color: '#ffffff',
                weight: 700,
                size: '8pt',
                padding: '1px 6px',
                align: 'center',
              },
            },
            detail: {
              type: 'stack',
              direction: 'row',
              breakInside: 'avoid',
              style: {
                background: '#dce6f2',
                borderBottom: '1px solid #ffffff',
                gap: '1mm',
                padding: '1px 2px',
              },
              children: [
                { type: 'field', bind: '$item.hour', style: { ...cellBase, width: COL.hour, weight: 700 } },
                { type: 'field', bind: '$item.cadence', style: { ...cellBase, width: COL.cadence } },
                { type: 'field', bind: '$item.destination', style: { ...cellBase, grow: 1, weight: 700 } },
                { type: 'field', bind: '$item.note', style: { ...cellBase, width: COL.note, weight: 700 } },
              ],
            },
          },
        ],
      },
    ],
  },
};

// Genera N corse per un periodo — un flusso lungo, così si vede il serpente.
function runs(periods: string[], perPeriod: number, baseHour: number) {
  const out: Array<Record<string, string>> = [];
  for (const period of periods) {
    for (let i = 0; i < perPeriod; i++) {
      const h = baseHour + Math.floor(i / 4);
      const m = (i % 4) * 15;
      out.push({
        period,
        hour: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        cadence: i % 3 === 0 ? 'FEST' : 'SCOL',
        destination: 'COMO',
        note: '73',
      });
    }
  }
  return out;
}

const data = {
  header: { subtitle: 'GRI_14/03/2022', title: 'COMO - PECCO' },
  runs: runs(['test', 'test2', 'test3', 'test4', 'test5', 'test6'], 30, 6),
};

export function newspaperData() {
    return data;
};

export function newspaperDoc() {
    return doc;
};