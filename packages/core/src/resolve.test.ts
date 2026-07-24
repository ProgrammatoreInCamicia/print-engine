import { describe, expect, it } from "vitest";
import { PrintDocument } from "@print-engine/schema";
import { resolve, ResolvedNode } from "./resolved";
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
    kind: 'block',
    direction: 'column',
    style: undefined,
    children: [
      { kind: 'text', value: '08:00', style: undefined },
      { kind: 'text', value: '09:00', style: undefined },
      { kind: 'text', value: '08:30', style: undefined },
    ],
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

  expect(result.kind).toBe('block');
  const children = (result as { children: ResolvedNode[] }).children;
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