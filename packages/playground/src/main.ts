import { resolve } from '@print-engine/core';
import { TsExpressionEngine } from '@print-engine/expr';
import { renderNode } from '@print-engine/adapter-html';
import type { PrintDocument, Node } from '@print-engine/schema';

// Una colonna = badge linea + direzione + corse raggruppate per periodo
function lineColumn(lineKey: string, dirKey: string, badgeColor: string): Node {
  return {
    type: 'stack',
    direction: 'column',
    style: { padding: '0 6px 0 0' },
    children: [
      // Direzione
      {
        type: 'field',
        bind: `$.${dirKey}`,
        style: {
          background: '#4a86c8',
          color: '#ffffff',
          weight: 700,
          size: '10pt',
          padding: '2px 6px',
          align: 'center',
        },
      },
      // Badge linea
      {
        type: 'field',
        bind: `$.${lineKey}.code`,
        style: {
          background: badgeColor,
          color: '#ffffff',
          weight: 700,
          size: '20pt',
          padding: '6px',
          align: 'center',
        },
      },
      // Corse del gruppo, raggruppate per periodo
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
            size: '9pt',
            padding: '1px 6px',
            align: 'center',
          },
        },
        detail: {
          type: 'stack',
          direction: 'row',
          style: {
            background: '#dce6f2',
            borderBottom: '1px solid #ffffff',
            padding: '1px 0',
          },
          children: [
            { type: 'field', bind: '$item.hour', style: { size: '9pt', weight: 700, align: 'center' } },
            { type: 'field', bind: '$item.cadence', style: { size: '9pt', align: 'center' } },
            { type: 'field', bind: '$item.destination', style: { size: '9pt', weight: 700, align: 'center' } },
            { type: 'field', bind: '$item.note', style: { size: '9pt', weight: 700, align: 'center' } },
          ],
        },
      },
    ],
  };
}

const doc: PrintDocument = {
  schemaVersion: 1,
  page: { size: 'A4', orientation: 'portrait', margin: '10mm' },
  body: {
    type: 'stack',
    direction: 'column',
    children: [
      // ─── Testata ───
      {
        type: 'stack',
        direction: 'column',
        style: { padding: '0 0 10px 0' },
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

      // ─── Due colonne affiancate ───
      {
        type: 'stack',
        direction: 'row',
        children: [
          lineColumn('lineA', 'directionA', '#d2691e'),
          lineColumn('lineB', 'directionB', '#29a3d5'),
        ],
      },

      // ─── Legenda ───
      {
        type: 'stack',
        direction: 'column',
        style: { padding: '24px 0 0 0' },
        children: [
          { type: 'text', value: "(G1) A Como transita nell'ordine da Staz. San Giovanni, P.zza Vittoria, Via Ambrosoli, Giovio, Magistri Comacini.", style: { size: '8pt' } },
          { type: 'text', value: '(73) In arrivo a Como transita da via Piave, via Ambrosoli, V.le G. Cesare, via Milano, Piazza Vittoria, via Battisti, via N. Sauro e Piazza Verdi.', style: { size: '8pt' } },
          { type: 'text', value: '(SCOL) Scolastici dal lunedì al sabato.', style: { size: '8pt' } },
        ],
      },

      // ─── Banda gialla + condizioni ───
      {
        type: 'stack',
        direction: 'column',
        style: { padding: '16px 0 0 0' },
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
          { type: 'text', value: 'I BIGLIETTI SONO ACQUISTABILI A BORDO CON UN SOVRAPPREZZO.', style: { size: '8pt', weight: 700 } },
          { type: 'text', value: 'EINZELFAHRSCHEINE SIND BEIM BUSFAHRER GEGEN AUFPREIS ERHÄLTLICH', style: { size: '8pt', weight: 700 } },
          { type: 'text', value: 'TICKETS CAN BE BOUGHT ON BOARD, EXTRA CHARGE APPLIED', style: { size: '8pt', weight: 700 } },
          { type: 'text', value: 'LES TICKETS PEUVENT ÊTRE ACHETÉS À BORD AVEC UN SUPPLÉMENT', style: { size: '8pt', weight: 700 } },
        ],
      },
    ],
  },
};

const data = {
  header: { subtitle: 'prova', title: 'COMO - VIA AMBROSOLI' },
  directionA: 'Dir. Lugano - Porlezza - MENAGGIO',
  directionB: 'Dir. Ponzate - Tavernerio - Lipomo - COMO',
  lineA: {
    code: 'C12',
    runs: [
      { period: 'test',  hour: '13:10', cadence: 'SCOL', destination: 'MENAGGIO', note: 'G1' },
      { period: 'test',  hour: '13:15', cadence: 'SCOL', destination: 'CARLAZZO', note: 'G1' },
      { period: 'test2', hour: '13:10', cadence: 'SCOL', destination: 'MENAGGIO', note: 'G1' },
      { period: 'test2', hour: '13:15', cadence: 'SCOL', destination: 'CARLAZZO', note: 'G1' },
      { period: 'test3', hour: '13:10', cadence: 'SCOL', destination: 'MENAGGIO', note: 'G1' },
      { period: 'test3', hour: '13:15', cadence: 'SCOL', destination: 'CARLAZZO', note: 'G1' },
    ],
  },
  lineB: {
    code: 'C43',
    runs: [
      { period: 'test',  hour: '07:37', cadence: 'SCOL', destination: 'COMO', note: '73' },
      { period: 'test',  hour: '07:37', cadence: 'SCOL', destination: 'COMO', note: '73' },
      { period: 'test2', hour: '07:37', cadence: 'SCOL', destination: 'COMO', note: '73' },
      { period: 'test2', hour: '07:37', cadence: 'SCOL', destination: 'COMO', note: '73' },
      { period: 'test3', hour: '07:37', cadence: 'SCOL', destination: 'COMO', note: '73' },
      { period: 'test3', hour: '07:37', cadence: 'SCOL', destination: 'COMO', note: '73' },
    ],
  },
};

const resolved = resolve(doc, data, new TsExpressionEngine());
const output = document.getElementById('output');
if (output) {
  output.innerHTML = renderNode(resolved);
}
// import { resolve } from '@print-engine/core';
// import { TsExpressionEngine } from '@print-engine/expr';
// import { renderNode } from '@print-engine/adapter-html';
// import type { PrintDocument } from '@print-engine/schema';

// const doc: PrintDocument = {
//   schemaVersion: 1,
//   page: { size: 'A4', orientation: 'portrait', margin: '15mm' },
//   body: {
//     type: 'stack',
//     direction: 'column',
//     children: [
//       // Titolo
//       {
//         type: 'stack',
//         direction: 'column',
//         style: { borderBottom: '2px solid #1a3a5c', padding: '0 0 8px 0' },
//         children: [
//           {
//             type: 'text',
//             value: 'Riepilogo Corse',
//             style: { size: '24pt', weight: 700, color: '#1a3a5c' },
//           },
//           {
//             type: 'field',
//             bind: '$.period',
//             prefix: 'Periodo: ',
//             style: { size: '11pt', color: '#888888' },
//           },
//         ],
//       },
//       // Corpo raggruppato per linea
//       {
//         type: 'group',
//         dataSource: '$.runs',
//         groupBy: '$item.line',
//         groupHeader: {
//           type: 'field',
//           bind: '$group.key',
//           prefix: 'Linea ',
//           style: {
//             background: '#eef4fa',
//             padding: '6px 10px',
//             weight: 700,
//             size: '13pt',
//             color: '#1a3a5c',
//           },
//         },
//         detail: {
//           type: 'stack',
//           direction: 'row',
//           style: { padding: '4px 10px' },
//           children: [
//             { type: 'field', bind: '$item.hour', style: { size: '11pt' } },
//             {
//               type: 'field',
//               bind: '$item.destination',
//               prefix: '  →  ',
//               style: { size: '11pt' },
//             },
//             {
//               type: 'field',
//               bind: '$item.passengers',
//               prefix: '  ·  ',
//               suffix: ' passeggeri',
//               style: { size: '11pt', color: '#666666' },
//             },
//           ],
//         },
//         groupFooter: {
//           type: 'field',
//           bind: 'SUM($group.items.passengers)',
//           prefix: 'Totale passeggeri: ',
//           style: {
//             borderTop: '1px solid #cccccc',
//             padding: '4px 10px 14px 10px',
//             weight: 700,
//             align: 'right',
//           },
//         },
//       },
//       // Riepilogo finale
//       {
//         type: 'stack',
//         direction: 'column',
//         style: { borderTop: '2px solid #1a3a5c', padding: '10px 0 0 0' },
//         children: [
//           {
//             type: 'field',
//             bind: 'COUNT($.runs)',
//             prefix: 'Corse totali: ',
//             style: { weight: 700 },
//           },
//           {
//             type: 'field',
//             bind: 'SUM($.runs.passengers)',
//             prefix: 'Passeggeri totali: ',
//             style: { weight: 700 },
//           },
//           {
//             type: 'field',
//             bind: 'AVG($.runs.passengers)',
//             prefix: 'Media per corsa: ',
//           },
//           {
//             type: 'field',
//             bind: 'MAX($.runs.passengers)',
//             prefix: 'Corsa più affollata: ',
//           },
//         ],
//       },
//     ],
//   },
// };

// const data = {
//   period: 'Gennaio 2026',
//   runs: [
//     { line: 'C50', hour: '06:15', destination: 'Senigallia Centro', passengers: 12 },
//     { line: 'C50', hour: '07:30', destination: 'Senigallia Centro', passengers: 34 },
//     { line: 'C50', hour: '08:45', destination: 'Senigallia Centro', passengers: 28 },
//     { line: 'C80', hour: '06:50', destination: 'Marzocca Mare', passengers: 8 },
//     { line: 'C80', hour: '08:10', destination: 'Marzocca Mare', passengers: 19 },
//     { line: 'R12', hour: '07:05', destination: 'Ancona Stazione', passengers: 41 },
//     { line: 'R12', hour: '09:20', destination: 'Ancona Stazione', passengers: 22 },
//     { line: 'R12', hour: '13:40', destination: 'Ancona Stazione', passengers: 15 },
//   ],
// };

// const resolved = resolve(doc, data, new TsExpressionEngine());
// const output = document.getElementById('output');
// if (output) {
//   output.innerHTML = renderNode(resolved);
// }