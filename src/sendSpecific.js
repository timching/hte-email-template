const EmailSender = require('./emailSender');
const path = require('path');

async function sendToSpecificEmail(emailAddress, templateName = 'hackathon-email-modern') {
  const sender = new EmailSender();

  try {
    console.log(`🚀 Sending ${templateName} to: ${emailAddress}\n`);

    // Load the MJML template
    const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.mjml`);
    console.log(`📧 Loading template: ${templatePath}`);

    const mjmlContent = await sender.loadMjmlTemplate(templatePath);

    // Template variables
    const variables = {
      REGISTRATION_URL: process.env.REGISTRATION_URL || 'https://hacktheeast2026.com/register',
      UNSUBSCRIBE_URL: '*|UNSUB|*',
      PREFERENCES_URL: '*|UPDATE_PROFILE|*',
    };

    // Compile MJML to HTML
    console.log('🔨 Compiling MJML to HTML...');
    let htmlContent = await sender.compileMjmlToHtml(mjmlContent, variables);

    // Add tracking pixel and wrap links
    htmlContent = await sender.addTrackingPixel(htmlContent);
    htmlContent = sender.wrapLinksWithTracking(htmlContent, 'direct-send');

    // Send email
    console.log(`📨 Sending email to ${emailAddress}...`);

    const subject = 'HackTheEast 2026 - Build the Future | Registration Open';
    await sender.sendDirectEmail(emailAddress, subject, htmlContent);

    console.log('✅ Email sent successfully!');
    console.log(`📊 Email delivered to: ${emailAddress}`);

  } catch (error) {
    console.error('\n❌ Error sending email:', error.message);
    process.exit(1);
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage:
  node src/sendSpecific.js <email@example.com>
  node src/sendSpecific.js <email@example.com> <template-name>

Examples:
  node src/sendSpecific.js john@example.com
  node src/sendSpecific.js john@example.com hackathon-email-modern
  node src/sendSpecific.js john@example.com hackathon-email-black
  node src/sendSpecific.js john@example.com hackathon-email-premium

Available templates:
  - hackathon-email-modern (default - fumadocs inspired)
  - hackathon-email-black (monochrome liquid glass)
  - hackathon-email-premium (purple gradients)
  - hackathon-email (original cyberpunk)
    `);
    process.exit(1);
  }

  const email = args[0];
  const template = args[1] || 'hackathon-email-modern';

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('❌ Invalid email format:', email);
    process.exit(1);
  }

  sendToSpecificEmail(email, template);
}

module.exports = sendToSpecificEmail;