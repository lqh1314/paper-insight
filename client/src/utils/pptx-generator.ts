import PptxGenJS from 'pptxgenjs';
import type { PaperSlide } from '@shared/api.interface';

const THEME_COLORS = {
  primary: '2563EB',
  primaryDark: '1E40AF',
  primaryLight: 'DBEAFE',
  text: '1E293B',
  bgWhite: 'FFFFFF',
  bgLight: 'F8FAFC',
};

const SHAPES = {
  RECTANGLE: 'rect' as const,
  OVAL: 'ellipse' as const,
  ROUNDED_RECTANGLE: 'roundRect' as const,
};

type ShapeName = (typeof SHAPES)[keyof typeof SHAPES];

function addShape(slide: PptxGenJS.Slide, shape: ShapeName, opts: PptxGenJS.ShapeProps): void {
  (slide.addShape as (name: string, opts: PptxGenJS.ShapeProps) => void)(shape, opts);
}

function buildCoverSlide(pres: PptxGenJS, slide: PaperSlide): void {
  const s = pres.addSlide();
  s.background = { color: THEME_COLORS.primary };
  s.addText('Academic Presentation', {
    x: 0.5, y: 1.5, w: '90%', h: 0.4, fontSize: 14, color: 'FFFFFF', align: 'center', charSpacing: 8,
  });
  s.addText(slide.title, {
    x: 0.5, y: 2.2, w: '90%', h: 1.8, fontSize: 36, color: 'FFFFFF', align: 'center', bold: true, valign: 'middle',
  });
  if (slide.content.length > 0) {
    s.addText(slide.content[0], {
      x: 1, y: 4.3, w: '80%', h: 0.8, fontSize: 16, color: 'BFDBFE', align: 'center',
    });
  }
  addShape(s, SHAPES.RECTANGLE, { x: 4.5, y: 5.2, w: 1, h: 0.08, fill: { color: 'FFFFFF' } });
}

function buildTocSlide(pres: PptxGenJS, slide: PaperSlide): void {
  const s = pres.addSlide();
  s.background = { color: THEME_COLORS.bgWhite };
  s.addText(slide.title, { x: 0.6, y: 0.6, w: '85%', h: 0.7, fontSize: 28, color: THEME_COLORS.text, bold: true });
  addShape(s, SHAPES.RECTANGLE, { x: 0.6, y: 1.3, w: 1.2, h: 0.06, fill: { color: THEME_COLORS.primary } });
  const items = slide.content.slice(0, 8);
  items.forEach((item: string, idx: number) => {
    const y = 1.8 + idx * 0.55;
    addShape(s, SHAPES.OVAL, { x: 0.7, y: y + 0.08, w: 0.38, h: 0.38, fill: { color: THEME_COLORS.primaryLight } });
    s.addText(String(idx + 1), { x: 0.7, y: y + 0.08, w: 0.38, h: 0.38, fontSize: 14, color: THEME_COLORS.primary, align: 'center', bold: true, valign: 'middle' });
    s.addText(item, { x: 1.3, y, w: '75%', h: 0.55, fontSize: 18, color: THEME_COLORS.text, valign: 'middle' });
  });
}

function buildContentSlide(pres: PptxGenJS, slide: PaperSlide): void {
  const s = pres.addSlide();
  s.background = { color: THEME_COLORS.bgWhite };
  s.addText(slide.title, { x: 0.6, y: 0.5, w: '85%', h: 0.6, fontSize: 24, color: THEME_COLORS.text, bold: true });
  addShape(s, SHAPES.RECTANGLE, { x: 0.6, y: 1.1, w: 1.5, h: 0.05, fill: { color: THEME_COLORS.primary } });
  const items = slide.content.slice(0, 6);
  const startY = 1.5;
  const rowH = Math.min(0.65, (5.5 - startY) / Math.max(items.length, 1));
  items.forEach((item: string, idx: number) => {
    const y = startY + idx * rowH;
    addShape(s, SHAPES.OVAL, { x: 0.7, y: y + (rowH - 0.18) / 2, w: 0.18, h: 0.18, fill: { color: THEME_COLORS.primary } });
    s.addText(item, { x: 1.1, y, w: '80%', h: rowH, fontSize: 16, color: THEME_COLORS.text, valign: 'middle' });
  });
  if (slide.notes) s.addNotes(slide.notes);
}

function buildSummarySlide(pres: PptxGenJS, slide: PaperSlide): void {
  const s = pres.addSlide();
  s.background = { color: THEME_COLORS.bgLight };
  addShape(s, SHAPES.RECTANGLE, { x: 0, y: 0, w: 0.12, h: '100%', fill: { color: THEME_COLORS.primary } });
  s.addText(slide.title, { x: 0.5, y: 0.6, w: '85%', h: 0.6, fontSize: 26, color: THEME_COLORS.text, bold: true });
  addShape(s, SHAPES.RECTANGLE, { x: 0.5, y: 1.2, w: 1, h: 0.05, fill: { color: THEME_COLORS.primary } });
  const items = slide.content.slice(0, 5);
  const startY = 1.7;
  const rowH = Math.min(0.8, (5.3 - startY) / Math.max(items.length, 1));
  items.forEach((item: string, idx: number) => {
    const y = startY + idx * rowH;
    addShape(s, SHAPES.ROUNDED_RECTANGLE, { x: 0.5, y, w: '85%', h: rowH - 0.15, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: THEME_COLORS.primaryLight, width: 1 } });
    s.addText(item, { x: 0.8, y, w: '78%', h: rowH - 0.15, fontSize: 15, color: THEME_COLORS.text, valign: 'middle' });
  });
}

export async function generatePptxFile(slides: PaperSlide[], fileName: string): Promise<void> {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_16x9';
  pres.title = fileName;
  pres.author = '论文智析';
  pres.company = '论文智析';
  pres.subject = '学术论文演示文稿';

  slides.forEach((slide: PaperSlide) => {
    switch (slide.type) {
      case 'cover': buildCoverSlide(pres, slide); break;
      case 'toc': buildTocSlide(pres, slide); break;
      case 'content': buildContentSlide(pres, slide); break;
      case 'summary': buildSummarySlide(pres, slide); break;
      default: buildContentSlide(pres, slide); break;
    }
  });

  const safeName: string = fileName.replace(/[\\/:*?"<>|]/g, '_').trim() || '论文演示文稿';
  await pres.writeFile({ fileName: `${safeName}.pptx` });
}
