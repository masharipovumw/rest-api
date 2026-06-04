require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const Material = require('./models/Material');
const { convertPptxToPdf } = require('./services/pptxConverter');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log('Connected to DB');

  const pptxMaterials = await Material.find({
    type: { $in: ['pptx', 'ppt', 'presentation'] },
    fileUrl: { $ne: null },
    convertedPdfUrl: null,
  });

  console.log(`Found ${pptxMaterials.length} PPTX materials to convert`);

  for (const mat of pptxMaterials) {
    const pptxAbsPath = path.join(process.cwd(), mat.fileUrl);
    const baseName = path.basename(mat.fileUrl, path.extname(mat.fileUrl));
    const pdfRelUrl = `/uploads/pdfs/${baseName}.pdf`;
    const pdfAbsPath = path.join(process.cwd(), pdfRelUrl);

    console.log(`\nConverting: ${mat.title} (${mat._id})`);
    try {
      await convertPptxToPdf(pptxAbsPath, pdfAbsPath);
      await Material.findByIdAndUpdate(mat._id, { convertedPdfUrl: pdfRelUrl });
      console.log(`  ✓ Done → ${pdfRelUrl}`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
    }
  }

  console.log('\nBackfill complete.');
  await mongoose.disconnect();
}

run().catch(console.error);
