const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

function convertPptxToPdf(pptxAbsPath, pdfAbsPath) {
  return new Promise((resolve, reject) => {

    const pdfDir = path.dirname(pdfAbsPath);
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const psScript = `
$ErrorActionPreference = 'Stop'
$pptxPath = '${pptxAbsPath.replace(/'/g, "''")}'
$pdfPath  = '${pdfAbsPath.replace(/'/g, "''")}'
$ppt = New-Object -ComObject PowerPoint.Application
try {
  $presentation = $ppt.Presentations.Open($pptxPath, $true, $false, $false)
  $presentation.SaveAs($pdfPath, 32)
  $presentation.Close()
  Write-Output 'SUCCESS'
} finally {
  $ppt.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null
  [System.GC]::Collect()
  [System.GC]::WaitForPendingFinalizers()
}
`.trim();

    execFile(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', psScript],
      { timeout: 60000 },
      (err, stdout, stderr) => {
        if (err) {
          console.error('[pptxConverter] PowerShell error:', stderr || err.message);
          return reject(new Error(`PPTX conversion failed: ${stderr || err.message}`));
        }
        if (!stdout.includes('SUCCESS')) {
          console.error('[pptxConverter] Unexpected output:', stdout, stderr);
          return reject(new Error('PPTX conversion did not complete successfully.'));
        }
        if (!fs.existsSync(pdfAbsPath)) {
          return reject(new Error('PDF output file was not created.'));
        }
        console.log(`[pptxConverter] Converted: ${path.basename(pptxAbsPath)} → ${path.basename(pdfAbsPath)}`);
        resolve();
      }
    );
  });
}

module.exports = { convertPptxToPdf };
