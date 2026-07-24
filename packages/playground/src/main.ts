import { resolve } from '@print-engine/core';
import { TsExpressionEngine } from '@print-engine/expr';
import { renderNode } from '@print-engine/adapter-html';
import type { PrintDocument } from '@print-engine/schema';

const doc: PrintDocument = {
  schemaVersion: 1,
  page: { size: 'A4', orientation: 'portrait', margin: '15mm' },
  body: {
    type: 'stack',
    direction: 'column',
    children: [
      // Titolo
      {
        type: 'stack',
        direction: 'column',
        style: { borderBottom: '2px solid #1a3a5c', padding: '0 0 8px 0' },
        children: [
          {
            type: 'text',
            value: 'Riepilogo Corse',
            style: { size: '24pt', weight: 700, color: '#1a3a5c' },
          },
          {
            type: 'field',
            bind: '$.period',
            prefix: 'Periodo: ',
            style: { size: '11pt', color: '#888888' },
          },
        ],
      },
      // Corpo raggruppato per linea
      {
        type: 'group',
        dataSource: '$.runs',
        groupBy: '$item.line',
        groupHeader: {
          type: 'field',
          bind: '$group.key',
          prefix: 'Linea ',
          style: {
            background: '#eef4fa',
            padding: '6px 10px',
            weight: 700,
            size: '13pt',
            color: '#1a3a5c',
          },
        },
        detail: {
          type: 'stack',
          direction: 'row',
          style: { padding: '4px 10px' },
          children: [
            { type: 'field', bind: '$item.hour', style: { size: '11pt' } },
            {
              type: 'field',
              bind: '$item.destination',
              prefix: '  →  ',
              style: { size: '11pt' },
            },
            {
              type: 'field',
              bind: '$item.passengers',
              prefix: '  ·  ',
              suffix: ' passeggeri',
              style: { size: '11pt', color: '#666666' },
            },
          ],
        },
        groupFooter: {
          type: 'field',
          bind: 'SUM($group.items.passengers)',
          prefix: 'Totale passeggeri: ',
          style: {
            borderTop: '1px solid #cccccc',
            padding: '4px 10px 14px 10px',
            weight: 700,
            align: 'right',
          },
        },
      },
      // Riepilogo finale
      {
        type: 'stack',
        direction: 'column',
        style: { borderTop: '2px solid #1a3a5c', padding: '10px 0 0 0' },
        children: [
          {
            type: 'field',
            bind: 'COUNT($.runs)',
            prefix: 'Corse totali: ',
            style: { weight: 700 },
          },
          {
            type: 'field',
            bind: 'SUM($.runs.passengers)',
            prefix: 'Passeggeri totali: ',
            style: { weight: 700 },
          },
          {
            type: 'field',
            bind: 'AVG($.runs.passengers)',
            prefix: 'Media per corsa: ',
          },
          {
            type: 'field',
            bind: 'MAX($.runs.passengers)',
            prefix: 'Corsa più affollata: ',
          },
        ],
      },
    ],
  },
};

const data = {
  period: 'Gennaio 2026',
  runs: [
    { line: 'C50', hour: '06:15', destination: 'Senigallia Centro', passengers: 12 },
    { line: 'C50', hour: '07:30', destination: 'Senigallia Centro', passengers: 34 },
    { line: 'C50', hour: '08:45', destination: 'Senigallia Centro', passengers: 28 },
    { line: 'C80', hour: '06:50', destination: 'Marzocca Mare', passengers: 8 },
    { line: 'C80', hour: '08:10', destination: 'Marzocca Mare', passengers: 19 },
    { line: 'R12', hour: '07:05', destination: 'Ancona Stazione', passengers: 41 },
    { line: 'R12', hour: '09:20', destination: 'Ancona Stazione', passengers: 22 },
    { line: 'R12', hour: '13:40', destination: 'Ancona Stazione', passengers: 15 },
  ],
};

const resolved = resolve(doc, data, new TsExpressionEngine());
const output = document.getElementById('output');
if (output) {
  output.innerHTML = renderNode(resolved);
}