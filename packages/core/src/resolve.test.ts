import { describe, expect, it } from "vitest";
import { PrintDocument } from "@print-engine/schema";
import { applyFormat, resolve, ResolvedNode } from "./resolved";
import { TsExpressionEngine } from "@print-engine/expr";

it('expands a repeat into one node per record', () => {
  const doc: PrintDocument = {
    schemaVersion: 1,
    page: { size: 'A4' },
    body: {
      type: 'repeat',
      dataSource: '$.runs',
      template: { type: 'field', bind: '$item.hour' },
    },
  };
  const data = {
    runs: [{ hour: '08:00' }, { hour: '09:00' }, { hour: '08:30' }],
  };

  const result = resolve(doc, data, new TsExpressionEngine());

  expect(result).toEqual({
    body: {
      kind: 'block',
      direction: 'column',
      style: undefined,
      children: [
        { kind: 'text', value: '08:00', style: undefined },
        { kind: 'text', value: '09:00', style: undefined },
        { kind: 'text', value: '08:30', style: undefined },
      ],
    },
  });
});

it('groups records and computes subtotals', () => {
  const doc: PrintDocument = {
    schemaVersion: 1,
    page: { size: 'A4' },
    body: {
      type: 'group',
      dataSource: '$.runs',
      groupBy: '$item.line',
      groupHeader: { type: 'field', bind: '$group.key', prefix: 'Line ' },
      detail: { type: 'field', bind: '$item.hour' },
      groupFooter: { type: 'field', bind: 'SUM($group.items.passengers)', prefix: 'Total: ' },
    },
  };
  const data = {
    runs: [
      { line: 'C50', hour: '08:00', passengers: 12 },
      { line: 'C50', hour: '09:00', passengers: 8 },
      { line: 'C80', hour: '08:30', passengers: 20 },
    ],
  };

  const result = resolve(doc, data, new TsExpressionEngine());

  expect(result.body.kind).toBe('block');
  const children = (result.body as { children: ResolvedNode[] }).children;
  expect(children).toHaveLength(7);
  expect(children.map(c => (c as { value: string }).value)).toEqual([
    'Line C50',
    '08:00',
    '09:00',
    'Total: 20',
    'Line C80',
    '08:30',
    'Total: 20',
  ]);

});
it('formats numbers with italian locale', () => {
  expect(applyFormat(1234.5, 'number:0.00')).toBe('1234,50');
  expect(applyFormat(0, 'number:0.00')).toBe('0,00');       // lo zero passa
  expect(applyFormat(15.5, 'number:0.00')).toBe('15,50');
  expect(applyFormat(470, 'number:0')).toBe('470');
});

it('formats dates', () => {
  expect(applyFormat('2026-01-15', 'date:dd/MM/yyyy')).toBe('15/01/2026');
});

it('falls back to string when no format or invalid', () => {
  expect(applyFormat('ciao', undefined)).toBe('ciao');
  expect(applyFormat(null, 'number:0.00')).toBe('');
  expect(applyFormat('nan', 'number:0.00')).toBe('nan');    // non convertibile
});