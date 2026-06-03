/**
 * pptxConverter.js
 * Converts PPTX files to PDF using Microsoft PowerPoint COM automation via PowerShell.
 * Requires: Microsoft Office / PowerPoint installed on the server (Windows only).
 */

const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Convert a PPTX file to PDF.
 * @param {string} pptxAbsPath  - Absolute path to the source .pptx file
 * @param {string} pdfAbsPath   - Absolute path for the output .pdf file
 * @returns {Promise<void>}
 */
function convertPptxToPdf(pptxAbsPath, pdfAbsPath) {
  return new Promise((resolve, reject) => {
    // Ensure output directory exists
    const pdfDir = path.dirname(pdfAbsPath);
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    // PowerShell script using PowerPoint COM to export as PDF
    // ppSaveAsPDF = 32  (PowerPoint SaveAs format constant)
    // WithWindow = $false on Open() keeps it from creating a visible window
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
