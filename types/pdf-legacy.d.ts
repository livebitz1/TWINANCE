declare module 'pdfjs-dist/legacy/build/pdf.worker.entry' {
  const workerSrc: any;
  export default workerSrc;
}

declare module 'pdfjs-dist/legacy/build/pdf' {
  export * from 'pdfjs-dist';
}
