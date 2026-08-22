import { Node, PrintDocument, Style } from "@print-engine/schema";

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

function sectionColumn(sectionKey: string, subtitleKey: string, badgeColor: string): Node {
  return {
    type: 'columns',
    mode: 'independent',
    style: { grow: 1, padding: '0 3px 0 0', gap: '4mm' },
    children: [
      // --- Left column: round badge + the section "rail" ---
      {
        type: 'stack',
        direction: 'column',
        style: { width: '24mm' },
        children: [
          {
            type: 'field',
            bind: `$.${sectionKey}.code`,
            style: {
              background: badgeColor,
              color: '#ffffff',
              weight: 700,
              size: '20pt',
              padding: '8px',
              align: 'center',
              width: '20mm',
              borderRadius: '50%',
            },
          },
          {
            type: 'image',
            src: 'https://tuo-storage/section-rail.png',
            width: '4mm',
            style: { padding: '8px 0 0 10mm' },
          },
        ],
      },
      // --- Right column: subtitle + table with the groups ---
      {
        type: 'stack',
        direction: 'column',
        style: { grow: 1 },
        children: [
          {
            type: 'field',
            bind: `$.${subtitleKey}`,
            style: {
              background: '#4a86c8',
              color: '#ffffff',
              weight: 700,
              size: '9pt',
              padding: '2px 6px',
              align: 'center',
            },
          },
          tableHeader,
          {
            type: 'group',
            dataSource: `$.${sectionKey}.analyses`,
            groupBy: '$item.shift',
            groupHeader: {
              type: 'field',
              bind: '$group.key',
              style: {
                background: '=$group.items[0].color',
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
  };
}

const doc: PrintDocument = {
  schemaVersion: 1,
  page: { size: 'A4', orientation: 'portrait', margin: '10mm' },

  // --- Header and footer: repeated on EVERY page ---
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
        { type: 'text', value: 'I CAMPIONI DEVONO PERVENIRE IN LABORATORIO ENTRO 60 MINUTI DAL PRELIEVO.', style: { size: '7pt', weight: 700 } },
        { type: 'text', value: 'DIE PROBEN MÜSSEN INNERHALB VON 60 MINUTEN NACH DER ENTNAHME EINTREFFEN', style: { size: '7pt', weight: 700 } },
        { type: 'text', value: 'SAMPLES MUST REACH THE LAB WITHIN 60 MINUTES OF COLLECTION', style: { size: '7pt', weight: 700 } },
        { type: 'text', value: 'LES ÉCHANTILLONS DOIVENT ARRIVER AU LABORATOIRE DANS LES 60 MINUTES', style: { size: '7pt', weight: 700 } },
      ],
    },
  },

  // --- Body: what actually breaks across pages ---
  body: {
    type: 'stack',
    direction: 'column',
    children: [
      // {
      //   type: 'stack',
      //   direction: 'row',
      //   style: { gap: '4mm' },
      //   children: [
      //     sectionColumn('sectionA', 'subtitleA', '#d2691e'),
      //     sectionColumn('sectionB', 'subtitleB', '#29a3d5'),
      //   ],
      // },
      {
        type: 'columns',
        mode: 'independent',
        style: { gap: '4mm' },
        children: [
          sectionColumn('sectionA', 'subtitleA', '#d2691e'),
          sectionColumn('sectionB', 'subtitleB', '#29a3d5'),
        ],
      },
      {
        type: 'stack',
        direction: 'column',
        style: { padding: '10px 0 0 0', gap: '2px' },
        children: [
          {
            type: 'field',
            bind: 'SUM($.sectionA.analyses.samples)',
            prefix: 'Campioni sezione EMA: ',
            format: 'number:0',
            style: { size: '9pt', weight: 700 },
          },
          {
            type: 'field',
            bind: 'AVG($.sectionA.analyses.samples)',
            prefix: 'Media campioni per accettazione: ',
            format: 'number:0.00',
            style: { size: '9pt' },
          },
          {
            type: 'field',
            bind: '$.meta.generatedAt',
            prefix: 'Documento generato il ',
            format: 'date:dd/MM/yyyy',
            style: { size: '9pt', color: '#666666' },
          },
        ],
      },
      {
        type: 'stack',
        direction: 'column',
        style: { padding: '10px 0 0 0' },
        children: [
          { type: 'text', value: '(G1) Prelievo a digiuno da almeno 8 ore; sospendere gli integratori nelle 24 ore precedenti.', style: { size: '8pt' } },
          { type: 'text', value: '(73) Provetta con anticoagulante, da conservare a temperatura ambiente e consegnare in giornata.', style: { size: '8pt' } },
          { type: 'text', value: '(URG) Urgenze accettate dal lunedì al sabato.', style: { size: '8pt' } },
        ],
      },
    ],
  },
};

// Generates N analyses per shift, so the content overflows the page
function analyses(
  shifts: string[],
  shiftColors: string[],
  perShift: number,
  baseHour: number,
  exams: string[],
  code: string,
) {
  const out: Array<Record<string, string | number>> = [];
  let shiftIndex = 0;
  for (const shift of shifts) {
    for (let i = 0; i < perShift; i++) {
      const h = baseHour + Math.floor(i / 4);
      const m = (i % 4) * 15;
      out.push({
        shift,
        color: String(shiftColors[shiftIndex]),
        time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        priority: i % 3 === 0 ? 'URG' : 'ORD',
        exam: exams[i % exams.length]!,
        code,
        samples: 10 + (i % 20),
      });
    }
    shiftIndex ++;
  }
  return out;
}

const data = {
  header: { subtitle: 'REV_14/03/2022', title: 'LABORATORIO - RIEPILOGO TURNI' },
  subtitleA: 'Sez. Ematologia - Coagulazione',
  subtitleB: 'Sez. Biochimica clinica - Urine',
  sectionA: {
    code: 'EMA',
    analyses: analyses(['Turno 1', 'Turno 2', 'Turno 3', 'Turno 4'], ['#8db3e2', '#e2a8b3', '#e2d68d', 'green'], 12, 6, ['EMOCROMO', 'PT/INR', 'FIBRINOGENO'], 'G1'),
  },
  sectionB: {
    code: 'BIO',
    analyses: analyses(['Turno 1', 'Turno 2', 'Turno 3', 'Turno 4'],  ['#8db3e2', '#e2a8b3', '#e2d68d', 'green'], 12, 7, ['GLICEMIA', 'COLTURA URINE'], '73'),
  },
  meta: { generatedAt: '2026-01-15' },
};

export function independentData() {
    return data;
};

export function independentDoc() {
    return doc;
};
