const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate a stock recommendation PDF report
 * @param {Object} data - Report data
 * @param {string} data.stockSymbol - Stock symbol
 * @param {string} data.stockName - Stock name
 * @param {string} data.companyAbout - About the company
 * @param {number} data.ltp - Last traded price
 * @param {number} data.targetPrice - Target/selling price
 * @param {number} data.stopLoss - Stop loss price
 * @param {string} data.technicalReason - Technical analysis reason
 * @param {string} data.summary - Summary of recommendation
 * @param {string} data.disclaimer - Disclaimer text
 * @param {string} data.recommendationType - buy/sell/hold
 * @param {string} data.timeFrame - Investment timeframe
 * @param {string} data.riskLevel - Risk level
 * @returns {Promise<Buffer>} PDF buffer
 */
const generateStockReportPDF = async (data) => {
  return new Promise((resolve, reject) => {
    try {
      // Create a document with auto-sizing
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        autoFirstPage: true
      });

      // Buffer to store PDF
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Colors
      const primaryColor = '#2563eb';
      const secondaryColor = '#64748b';
      const successColor = '#059669';
      const dangerColor = '#dc2626';
      const warningColor = '#d97706';

      // Helper function to add a section
      const addSection = (title, content, yPosition) => {
        doc.fontSize(11)
           .fillColor(primaryColor)
           .font('Helvetica-Bold')
           .text(title, 50, yPosition);
        
        doc.fontSize(9)
           .fillColor('#1f2937')
           .font('Helvetica')
           .text(content, 50, yPosition + 18, {
             width: 495,
             align: 'left',
             lineGap: 2
           });
        
        return doc.y + 12;
      };

      // Header with logo placeholder and title
      doc.rect(0, 0, 595, 80).fill(primaryColor);
      
      doc.fontSize(24)
         .fillColor('white')
         .font('Helvetica-Bold')
         .text('InvestKaps', 50, 25);
      
      doc.fontSize(12)
         .fillColor('white')
         .font('Helvetica')
         .text('Stock Recommendation Report', 50, 55);

      // Stock Symbol and Name
      doc.fontSize(20)
         .fillColor(primaryColor)
         .font('Helvetica-Bold')
         .text(data.stockSymbol, 50, 100);
      
      doc.fontSize(14)
         .fillColor(secondaryColor)
         .font('Helvetica')
         .text(data.stockName, 50, 130);

      // Recommendation Badge
      let badgeColor = successColor;
      if (data.recommendationType === 'sell') badgeColor = dangerColor;
      if (data.recommendationType === 'hold') badgeColor = warningColor;

      doc.roundedRect(450, 100, 95, 30, 5)
         .fill(badgeColor);
      
      doc.fontSize(12)
         .fillColor('white')
         .font('Helvetica-Bold')
         .text(data.recommendationType.toUpperCase(), 450, 110, {
           width: 95,
           align: 'center'
         });

      // Price Information Box
      let yPos = 170;
      doc.rect(50, yPos, 495, 100)
         .strokeColor('#e5e7eb')
         .lineWidth(1)
         .stroke();

      doc.fontSize(11)
         .fillColor(secondaryColor)
         .font('Helvetica-Bold')
         .text('Price Information', 60, yPos + 10);

      // Price details in columns
      const priceY = yPos + 35;
      
      // LTP
      doc.fontSize(9)
         .fillColor(secondaryColor)
         .font('Helvetica')
         .text('Last Traded Price', 60, priceY);
      doc.fontSize(14)
         .fillColor('#1f2937')
         .font('Helvetica-Bold')
         .text(`₹${data.ltp}`, 60, priceY + 15);

      // Target Price
      doc.fontSize(9)
         .fillColor(secondaryColor)
         .font('Helvetica')
         .text('Target Price', 220, priceY);
      doc.fontSize(14)
         .fillColor(successColor)
         .font('Helvetica-Bold')
         .text(`₹${data.targetPrice}`, 220, priceY + 15);

      // Stop Loss
      doc.fontSize(9)
         .fillColor(secondaryColor)
         .font('Helvetica')
         .text('Stop Loss', 380, priceY);
      doc.fontSize(14)
         .fillColor(dangerColor)
         .font('Helvetica-Bold')
         .text(`₹${data.stopLoss}`, 380, priceY + 15);

      // Additional Info
      yPos = 285;
      doc.fontSize(9)
         .fillColor(secondaryColor)
         .font('Helvetica')
         .text(`Time Frame: ${data.timeFrame.replace('_', ' ').toUpperCase()}`, 60, yPos);

      // About the Company
      yPos = addSection('About the Company', data.companyAbout, 310);

      // Technical Reason
      yPos = addSection('Technical Analysis', data.technicalReason, yPos);

      // Summary
      yPos = addSection('Summary', data.summary, yPos);

      // Disclaimer
      doc.fontSize(8)
         .fillColor(dangerColor)
         .font('Helvetica-Bold')
         .text('DISCLAIMER', 50, yPos);
      
      doc.fontSize(7)
         .fillColor(secondaryColor)
         .font('Helvetica')
         .text(data.disclaimer, 50, yPos + 15, {
           width: 495,
           align: 'justify'
         });

      // Update yPos after disclaimer
      yPos = doc.y + 20;

      // Footer - dynamic position based on content
      doc.fontSize(8)
         .fillColor(secondaryColor)
         .font('Helvetica')
         .text('Generated by InvestKaps', 50, yPos);
      
      doc.fontSize(7)
         .text(`Report Date: ${new Date().toLocaleDateString('en-IN')}`, 50, yPos + 15);
      
      doc.fontSize(7)
         .text('www.investkaps.com', 400, yPos);

      // Finalize PDF
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateStockReportPDF
};
