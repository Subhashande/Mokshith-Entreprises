import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { logger } from '../config/logger.js';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads', 'invoices');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const generatePDF = async (data) => {
  try {
    const filename = `invoice-${Date.now()}.pdf`;
    const filepath = path.join(uploadsDir, filename);

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(filepath);

    doc.pipe(writeStream);

    // Add content to PDF
    doc.fontSize(20).text(data.title || 'Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);

    // Add invoice details
    if (data.invoiceNumber) {
      doc.text(`Invoice Number: ${data.invoiceNumber}`);
    }
    if (data.date) {
      doc.text(`Date: ${new Date(data.date).toLocaleDateString()}`);
    }
    if (data.customer) {
      doc.moveDown();
      doc.text('Customer Details:', { underline: true });
      doc.text(`Name: ${data.customer.name || 'N/A'}`);
      doc.text(`Email: ${data.customer.email || 'N/A'}`);
    }

    // Add items table
    if (data.items && data.items.length > 0) {
      doc.moveDown();
      doc.text('Items:', { underline: true });
      data.items.forEach((item, index) => {
        doc.text(`${index + 1}. ${item.name} - Qty: ${item.quantity} - Price: ₹${item.price}`);
      });
    }

    // Add total
    if (data.total) {
      doc.moveDown();
      doc.fontSize(14).text(`Total: ₹${data.total}`, { align: 'right' });
    }

    doc.end();

    // Wait for PDF to be written
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    logger.info(`PDF generated: ${filename}`);

    return {
      url: `/uploads/invoices/${filename}`,
      filepath,
      filename
    };
  } catch (error) {
    logger.error('PDF generation failed:', error);
    throw error;
  }
};