const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

(async () => {
  try {
    const pdfPath = process.argv[2] || path.resolve(__dirname, '..', 'docs', 'Project Log book.pdf');
    if (!fs.existsSync(pdfPath)) {
      console.error('PDF not found:', pdfPath);
      process.exit(1);
    }
    const bytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(bytes);

    // Try getting the form (AcroForm)
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    if (!fields || fields.length === 0) {
      console.log('No AcroForm fields found in the PDF. (Static PDF)');
      process.exit(0);
    }

    console.log(`Found ${fields.length} form field(s):`);
    for (const f of fields) {
      const type = f.constructor && f.constructor.name || 'Unknown';
      const name = f.getName();
      let value = '';
      try { value = f.getText ? f.getText() : ''; } catch (_) {}
      console.log(`- ${name} [${type}]${value ? ` = ${JSON.stringify(value)}` : ''}`);
    }
  } catch (err) {
    console.error('Error inspecting PDF:', err);
    process.exit(1);
  }
})();
