import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ME-${year}${month}-${random}`;
};

export const createInvoicePDF = async (invoice, order, user) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const filename = `invoice-${invoice.invoiceNumber}.pdf`;
      const filePath = path.join('src/uploads/invoices', filename);
      
      // Ensure directory exists
      if (!fs.existsSync('src/uploads/invoices')) {
        fs.mkdirSync('src/uploads/invoices', { recursive: true });
      }

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      doc
        .fillColor('#444444')
        .fontSize(20)
        .text('MOKSHITH ENTERPRISES', 50, 50)
        .fontSize(10)
        .text('123 B2B Business Hub, Industrial Area', 50, 75)
        .text('Hyderabad, Telangana - 500001', 50, 90)
        .text('GSTIN: 36AAAAA0000A1Z5', 50, 105)
        .moveDown();

      // Invoice Details
      doc
        .fontSize(12)
        .text(`Invoice Number: ${invoice.invoiceNumber}`, 400, 50)
        .text(`Date: ${new Date().toLocaleDateString()}`, 400, 65)
        .text(`Order ID: ${order._id}`, 400, 80)
        .moveDown();

      // Bill To
      doc
        .fontSize(12)
        .text('BILL TO:', 50, 150)
        .fontSize(10)
        .text(user.name, 50, 165)
        .text(user.companyName || 'Individual Customer', 50, 180)
        .text(invoice.address || 'Address not provided', 50, 195)
        .moveDown();

      // Table Header
      const tableTop = 250;
      doc.font('Helvetica-Bold');
      doc.text('Item', 50, tableTop);
      doc.text('Qty', 220, tableTop);
      doc.text('Base', 280, tableTop);
      doc.text('GST %', 350, tableTop);
      doc.text('GST ₹', 420, tableTop);
      doc.text('Total', 490, tableTop);
      
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
      doc.font('Helvetica');

      // Table Items
      let currentHeight = tableTop + 30;
      const itemsToDisplay = order.itemDetails || order.items;
      itemsToDisplay.forEach(item => {
        const gstRate = item.gstRate || 18;
        const basePrice = item.basePrice || (item.price / 1.18);
        const taxPerUnit = item.taxPerUnit || (item.price - basePrice);

        doc.text(item.name.substring(0, 25), 50, currentHeight);
        doc.text(item.quantity.toString(), 220, currentHeight);
        doc.text(`₹${basePrice.toFixed(2)}`, 280, currentHeight);
        doc.text(`${gstRate}%`, 350, currentHeight);
        doc.text(`₹${(taxPerUnit * item.quantity).toFixed(2)}`, 420, currentHeight);
        doc.text(`₹${(item.price * item.quantity).toFixed(2)}`, 490, currentHeight);
        currentHeight += 20;
      });

      // Footer Calculations
      const footerTop = Math.max(currentHeight + 30, 450);
      doc.moveTo(50, footerTop).lineTo(550, footerTop).stroke();
      
      doc.text('Subtotal:', 350, footerTop + 15);
      doc.text(`₹${invoice.amount.toLocaleString()}`, 450, footerTop + 15);
      
      doc.text(`GST (${invoice.gst}%):`, 350, footerTop + 30);
      doc.text(`₹${invoice.taxAmount.toLocaleString()}`, 450, footerTop + 30);
      
      doc.font('Helvetica-Bold');
      doc.text('Grand Total:', 350, footerTop + 50);
      doc.text(`₹${invoice.totalAmount.toLocaleString()}`, 450, footerTop + 50);

      doc.fontSize(10).font('Helvetica').text('Thank you for your business!', 50, 700, { align: 'center', width: 500 });

      doc.end();
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
};
