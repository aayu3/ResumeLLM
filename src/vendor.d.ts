declare module "pdfmake/build/pdfmake" {
  import type { TCreatedPdf, TDocumentDefinitions } from "pdfmake/interfaces";
  const pdfMake: {
    vfs: Record<string, string>;
    createPdf(docDefinition: TDocumentDefinitions): TCreatedPdf;
  };
  export default pdfMake;
}

declare module "pdfmake/build/vfs_fonts" {
  const vfsFonts: { pdfMake: { vfs: Record<string, string> } };
  export = vfsFonts;
}

declare module "html-to-pdfmake" {
  function htmlToPdfmake(
    html: string,
    options?: Record<string, unknown>
  ): unknown;
  export default htmlToPdfmake;
}
