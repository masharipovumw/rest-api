const { convertPptxToPdf } = require('./services/pptxConverter');
const path = require('path');

const src = path.join(process.cwd(), 'uploads/presentations/1780379912931-Fakt_cheking.pptx');
const dst = path.join(process.cwd(), 'uploads/pdfs/test_output.pdf');

console.log('Source:', src);
console.log('Dest:', dst);

convertPptxToPdf(src, dst)
  .then(() => { console.log('SUCCESS - PDF created'); process.exit(0); })
  .catch(e => { console.error('FAILED:', e.message); process.exit(1); });
