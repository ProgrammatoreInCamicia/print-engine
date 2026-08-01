import { resolve, paginate } from '@print-engine/core';
import { Json, TsExpressionEngine } from '@print-engine/expr';
import { renderPages, DomMeasurer } from '@print-engine/adapter-html';
import { newspaperData, newspaperDoc } from './newspaper_column_data';
import { PrintDocument } from '@print-engine/schema';
import { pivotData, pivotDoc } from './pivot-data';
import { type3Data, type3Doc } from './type3';


// const doc: PrintDocument = newspaperDoc();
// const data: Json = newspaperData();
const doc: PrintDocument = type3Doc();
const data: Json = type3Data();
const resolved = resolve(doc, data, new TsExpressionEngine());
const paginated = paginate(doc, resolved, new DomMeasurer());
const output = document.getElementById('output');
if (output) {
  output.innerHTML = renderPages(paginated, doc.page);
}