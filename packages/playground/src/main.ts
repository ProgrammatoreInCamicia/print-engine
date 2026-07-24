import { resolve, paginate } from '@print-engine/core';
import { TsExpressionEngine } from '@print-engine/expr';
import { renderPages, DomMeasurer } from '@print-engine/adapter-html';
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

function lineColumn(lineKey: string, dirKey: string, badgeColor: string): Node {
  return {
    type: 'stack',
    direction: 'column',
    style: { grow: 1, padding: '0 3px 0 0' },
    children: [
      {
        type: 'field',
        bind: `$.${dirKey}`,
        style: {
          background: '#4a86c8',
          color: '#ffffff',
          weight: 700,
          size: '9pt',
          padding: '2px 6px',
          align: 'center',
        },
      },
      {
        type: 'field',
        bind: `$.${lineKey}.code`,
        style: {
          background: badgeColor,
          color: '#ffffff',
          weight: 700,
          size: '20pt',
          padding: '4px',
          align: 'center',
        },
      },
      tableHeader,
      {
        type: 'group',
        dataSource: `$.${lineKey}.runs`,
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
  };
}

const doc: PrintDocument = {
  schemaVersion: 1,
  page: { size: 'A4', orientation: 'portrait', margin: '10mm' },

  // ─── Header e footer: ripetuti su OGNI pagina ───
  regions: {
    header: {
      type: 'stack',
      direction: 'column',
      style: { padding: '0 0 6px 0' },
      children: [
        {
          type: 'field',
          bind: '$.header.subtitle',
          style: {
            background: '#1565a8',
            color: '#ffffff',
            weight: 700,
            size: '11pt',
            padding: '4px 10px',
          },
        },
        {
          type: 'field',
          bind: '$.header.title',
          style: {
            background: '#1565a8',
            color: '#ffffff',
            weight: 700,
            size: '26pt',
            padding: '6px 10px',
            borderTop: '2px solid #ffffff',
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
          style: {
            background: '#ffff00',
            color: '#c00000',
            weight: 700,
            size: '9pt',
            padding: '2px 10px',
            align: 'center',
          },
        },
        { type: 'text', value: 'I BIGLIETTI SONO ACQUISTABILI A BORDO CON UN SOVRAPPREZZO.', style: { size: '7pt', weight: 700 } },
        { type: 'text', value: 'EINZELFAHRSCHEINE SIND BEIM BUSFAHRER GEGEN AUFPREIS ERHÄLTLICH', style: { size: '7pt', weight: 700 } },
        { type: 'text', value: 'TICKETS CAN BE BOUGHT ON BOARD, EXTRA CHARGE APPLIED', style: { size: '7pt', weight: 700 } },
        { type: 'text', value: 'LES TICKETS PEUVENT ÊTRE ACHETÉS À BORD AVEC UN SUPPLÉMENT', style: { size: '7pt', weight: 700 } },
      ],
    },
  },

  // ─── Corpo: quello che si spezza fra le pagine ───
  body: {
    type: 'stack',
    direction: 'column',
    children: [
      {
        type: 'stack',
        direction: 'row',
        style: { gap: '4mm' },
        children: [
          lineColumn('lineA', 'directionA', '#d2691e'),
          lineColumn('lineB', 'directionB', '#29a3d5'),
        ],
      },
      {
        type: 'stack',
        direction: 'column',
        style: { padding: '10px 0 0 0' },
        children: [
          { type: 'text', value: "(G1) A Como transita nell'ordine da Staz. San Giovanni, P.zza Vittoria, Via Ambrosoli, Giovio, Magistri Comacini.", style: { size: '8pt' } },
          { type: 'text', value: '(73) In arrivo a Como transita da via Piave, via Ambrosoli, V.le G. Cesare, via Milano, Piazza Vittoria, via Battisti, via N. Sauro e Piazza Verdi.', style: { size: '8pt' } },
          { type: 'text', value: '(SCOL) Scolastici dal lunedì al sabato.', style: { size: '8pt' } },
        ],
      },
    ],
  },
};

// Genera N corse per un periodo, così il contenuto sfora la pagina
function runs(
  periods: string[],
  perPeriod: number,
  baseHour: number,
  destinations: string[],
  note: string,
) {
  const out: Array<Record<string, string>> = [];
  for (const period of periods) {
    for (let i = 0; i < perPeriod; i++) {
      const h = baseHour + Math.floor(i / 4);
      const m = (i % 4) * 15;
      out.push({
        period,
        hour: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        cadence: i % 3 === 0 ? 'FEST' : 'SCOL',
        destination: destinations[i % destinations.length]!,
        note,
      });
    }
  }
  return out;
}

const data = {
  header: { subtitle: 'GRI_14/03/2022', title: 'COMO - VIA AMBROSOLI' },
  directionA: 'Dir. Lugano - Porlezza - MENAGGIO',
  directionB: 'Dir. Ponzate - Tavernerio - Lipomo - COMO',
  lineA: {
    code: 'C12',
    runs: runs(['test', 'test2', 'test3', 'test4'], 12, 6, ['MENAGGIO', 'CARLAZZO', 'SAN FERMO'], 'G1'),
  },
  lineB: {
    code: 'C43',
    runs: runs(['test', 'test2', 'test3', 'test4'], 12, 7, ['COMO', 'SAN FERMO DELLA'], '73'),
  },
};

const resolved = resolve(doc, data, new TsExpressionEngine());
const paginated = paginate(doc, resolved, new DomMeasurer());
const output = document.getElementById('output');
if (output) {
  output.innerHTML = renderPages(paginated, doc.page);
}