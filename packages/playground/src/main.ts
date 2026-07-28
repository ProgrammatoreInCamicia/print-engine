import { resolve, paginate } from '@print-engine/core';
import { Json, TsExpressionEngine } from '@print-engine/expr';
import { renderPages, DomMeasurer } from '@print-engine/adapter-html';
import { newspaperData, newspaperDoc } from './newspaper_column_data';
import { PrintDocument } from '@print-engine/schema';


const doc: PrintDocument = newspaperDoc();
const data: Json = newspaperData();
const resolved = resolve(doc, data, new TsExpressionEngine());
const paginated = paginate(doc, resolved, new DomMeasurer());
const output = document.getElementById('output');
if (output) {
  output.innerHTML = renderPages(paginated, doc.page);
}