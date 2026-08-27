import { getDocument } from 'pdfjs-dist';
import type { PaperImage } from '@shared/api.interface';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const MIN_IMAGE_SIZE = 100;
const SKIP_TYPES = ['mask', 'smask'];

export async function extractImagesFromPdf(paperId: string, pdfUrl: string): Promise<PaperImage[]> {
  // 通过后端代理接口获取PDF，避免CORS跨域问题
  const proxyUrl = `/api/papers/${paperId}/file-proxy`;
  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error(`PDF文件获取失败: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const pdf = await getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const images: PaperImage[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const operatorList = await page.getOperatorList();
    const imageOpcodes = [pdfjsLib.OPS.paintImageXObject, pdfjsLib.OPS.paintJpegXObject];

    for (let i = 0; i < operatorList.fnArray.length; i++) {
      if (imageOpcodes.includes(operatorList.fnArray[i])) {
        const imageName = operatorList.argsArray[i][0];
        try {
          const image = await new Promise<any>((resolve, reject) => {
            (page as any).objs.get(imageName, (obj: any) => resolve(obj), (err: any) => reject(err));
          });
          if (image && image.width >= MIN_IMAGE_SIZE && image.height >= MIN_IMAGE_SIZE && !SKIP_TYPES.includes(image.kind)) {
            images.push({
              id: `${pageNum}-${imageName}-${Date.now()}`,
              url: image.bitmap ? URL.createObjectURL(new Blob([image.bitmap])) : image.data ? URL.createObjectURL(new Blob([image.data])) : '',
              description: '',
              chapter: `第${pageNum}页`,
              type: image.kind || 'image',
            });
          }
        } catch (e) {
          console.warn(`提取图片失败: ${imageName}`, e);
        }
      }
    }
  }
  return images.filter(img => img.url);
}
