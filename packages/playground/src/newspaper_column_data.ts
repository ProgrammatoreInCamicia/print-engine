import type { PrintDocument, Node, Style } from '@print-engine/schema';

const COL = {
  time: '16mm',
  priority: '16mm',
  code: '12mm',
} as const;

const cellBase: Style = { size: '8pt', align: 'center' };

const tableHeader: Node = {
  type: 'stack',
  direction: 'row',
  style: { background: '#bfbfbf', gap: '1mm', padding: '1px 2px', weight: 700 },
  children: [
    { type: 'text', value: 'Ora', style: { ...cellBase, width: COL.time, weight: 700 } },
    { type: 'text', value: 'Priorità', style: { ...cellBase, width: COL.priority, weight: 700 } },
    { type: 'text', value: 'Esame', style: { ...cellBase, grow: 1, weight: 700 } },
    { type: 'text', value: 'Cod.', style: { ...cellBase, width: COL.code, weight: 700 } },
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
        { type: 'text', value: 'I CAMPIONI DEVONO PERVENIRE IN LABORATORIO ENTRO 60 MINUTI DAL PRELIEVO.', style: { size: '7pt', weight: 700 } },
      ],
    },
  },

  // ─── Body: table header + a single snaking flow across 3 columns ───
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
        // A single "child": the group. Its whole extent (header + rows for each
        // shift) is the flow the newspaper mode scrolls and snakes through --
        // the algorithm descends into the group by itself when it does not fit.
        children: [
          {
            type: 'group',
            dataSource: '$.analyses',
            groupBy: '$item.shift',
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
                { type: 'field', bind: '$item.time', style: { ...cellBase, width: COL.time, weight: 700 } },
                { type: 'field', bind: '$item.priority', style: { ...cellBase, width: COL.priority } },
                { type: 'field', bind: '$item.exam', style: { ...cellBase, grow: 1, weight: 700 } },
                { type: 'field', bind: '$item.code', style: { ...cellBase, width: COL.code, weight: 700 } },
              ],
            },
          },
        ],
      },
    ],
  },
};

// Generates N analyses per shift -- a long flow, so the snake is visible.
function analyses(shifts: string[], perShift: number, baseHour: number) {
  const out: Array<Record<string, string>> = [];
  for (const shift of shifts) {
    for (let i = 0; i < perShift; i++) {
      const h = baseHour + Math.floor(i / 4);
      const m = (i % 4) * 15;
      out.push({
        shift,
        time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        priority: i % 3 === 0 ? 'URG' : 'ORD',
        exam: 'EMOCROMO',
        code: '73',
      });
    }
  }
  return out;
}

const data = {
  header: { subtitle: 'REV_14/03/2022', title: 'LABORATORIO ANALISI - DEGENZE' },
  analyses: analyses(['Turno 1', 'Turno 2', 'Turno 3', 'Turno 4', 'Turno 5', 'Turno 6'], 30, 6),
};

export function newspaperData() {
    return data;
};

export function newspaperDoc() {
    return doc;
};
