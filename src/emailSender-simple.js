const mjml2html = require('mjml');
const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

class SimpleEmailSender {
  constructor() {
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Debug: Show what's being loaded
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.mailgun.org',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Optional: Add custom headers for tracking
      headers: {
        'X-Mailgun-Tag': process.env.MAILGUN_TAG || 'hacktheeast',
        'X-Mailgun-Track': 'yes',
        'X-Mailgun-Track-Opens': 'yes',
        'X-Mailgun-Track-Clicks': 'yes',
      }
    };

    console.log('📧 SMTP Configuration:', {
      host: smtpConfig.host,
      port: smtpConfig.port,
      user: smtpConfig.auth.user,
      secure: smtpConfig.secure
    });

    this.transporter = nodemailer.createTransport(smtpConfig);

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('❌ SMTP connection failed:', error.message);
      } else {
        console.log('✅ SMTP server is ready');
      }
    });
  }

  async loadMjmlTemplate(templatePath) {
    try {
      const mjmlContent = await fs.readFile(templatePath, 'utf8');
      return mjmlContent;
    } catch (error) {
      console.error('Error loading MJML template:', error);
      throw error;
    }
  }

  compileMjmlToHtml(mjmlContent, variables = {}) {
    // Replace template variables
    let processedMjml = mjmlContent;

    Object.keys(variables).forEach(key => {
      const placeholder = `{{${key}}}`;
      processedMjml = processedMjml.replace(new RegExp(placeholder, 'g'), variables[key]);
    });

    // Compile MJML to HTML
    const htmlOutput = mjml2html(processedMjml, {
      minify: true,
      validationLevel: 'soft',
    });

    if (htmlOutput.errors && htmlOutput.errors.length > 0) {
      console.warn('MJML compilation warnings:', htmlOutput.errors);
    }

    return htmlOutput.html;
  }

  async sendEmail(options) {
    const {
      to,
      subject,
      html,
      from = `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      replyTo = process.env.REPLY_TO_EMAIL,
      attachments = [],
      tags = [],
    } = options;

    try {
      const mailOptions = {
        from,
        to,
        subject,
        html,
        replyTo,
        attachments,
        // Mailgun specific headers
        headers: {
          'X-Mailgun-Tag': tags.join(', '),
          'X-Mailgun-Variables': JSON.stringify({
            campaign: 'hacktheeast-2026',
            timestamp: new Date().toISOString(),
          }),
        },
      };

      const info = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected,
      };
    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendBulkEmails(recipients, subject, htmlContent, options = {}) {
    const results = [];
    const batchSize = options.batchSize || 10; // Send in batches to avoid rate limits
    const delayMs = options.delayMs || 1000; // Delay between batches

    console.log(`📨 Sending to ${recipients.length} recipients in batches of ${batchSize}...`);

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const batchPromises = batch.map(recipient => {
        return this.sendEmail({
          to: recipient,
          subject,
          html: htmlContent,
          ...options,
        });
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);

      console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} sent (${i + batch.length}/${recipients.length})`);

      // Delay between batches to respect rate limits
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // Summary
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    return {
      total: recipients.length,
      successful,
      failed,
      results,
    };
  }

  // Add basic tracking pixel (optional - Mailgun handles most tracking)
  addTrackingPixel(htmlContent, campaignId = 'hacktheeast') {
    const trackingPixel = `<img src="https://api.mailgun.net/v3/events/open?campaign=${campaignId}" width="1" height="1" style="display:none;" alt="" />`;
    return htmlContent.replace('</body>', `${trackingPixel}</body>`);
  }
}

module.exports = SimpleEmailSender;