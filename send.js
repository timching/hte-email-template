#!/usr/bin/env node

const SimpleEmailSender = require('./src/emailSender-simple');
const path = require('path');
const fs = require('fs').promises;

// Terminal colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function sendEmail(recipient, options = {}) {
  const sender = new SimpleEmailSender();

  try {
    // Determine template
    const template = options.template || 'hackathon-email-modern';
    const templatePath = path.join(__dirname, 'templates', `${template}.mjml`);

    log(`\n🚀 HackTheEast Email Sender`, 'cyan');
    log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'cyan');

    // Check if template exists
    try {
      await fs.access(templatePath);
    } catch {
      log(`\n❌ Template not found: ${template}`, 'red');
      log(`\nAvailable templates:`, 'yellow');
      log(`  • hackathon-email-modern (fumadocs style)`, 'green');
      log(`  • hackathon-email-black (monochrome glass)`, 'green');
      log(`  • hackathon-email-premium (gradient design)`, 'green');
      log(`  • hackathon-email (original cyberpunk)`, 'green');
      process.exit(1);
    }

    log(`\n📧 Template: ${template}`, 'blue');
    log(`📬 Recipient: ${recipient}`, 'blue');

    // Load and compile template
    log(`\n⚙️  Loading template...`, 'yellow');
    const mjmlContent = await sender.loadMjmlTemplate(templatePath);

    const variables = {
      REGISTRATION_URL: process.env.REGISTRATION_URL || 'https://hacktheeast.com/register',
      UNSUBSCRIBE_URL: process.env.UNSUBSCRIBE_URL || 'https://hacktheeast.com/unsubscribe',
      PREFERENCES_URL: process.env.PREFERENCES_URL || 'https://hacktheeast.com/preferences',
    };

    log(`⚙️  Compiling MJML...`, 'yellow');
    const htmlContent = sender.compileMjmlToHtml(mjmlContent, variables);

    // Send email
    log(`⚙️  Sending email...`, 'yellow');
    const result = await sender.sendEmail({
      to: recipient,
      subject: options.subject || 'HackTheEast 2026 - Build the Future | Registration Open',
      html: htmlContent,
      tags: ['hacktheeast', 'registration', template],
    });

    if (result.success) {
      log(`\n✅ Email sent successfully!`, 'green');
      log(`📧 Message ID: ${result.messageId}`, 'green');
      if (result.response) {
        log(`📡 Server response: ${result.response}`, 'cyan');
      }
    } else {
      log(`\n❌ Failed to send email`, 'red');
      log(`Error: ${result.error}`, 'red');
      process.exit(1);
    }

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function sendBulk(recipientsFile, options = {}) {
  const sender = new SimpleEmailSender();

  try {
    log(`\n🚀 HackTheEast Bulk Email Sender`, 'cyan');
    log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'cyan');

    // Read recipients file
    const recipientsContent = await fs.readFile(recipientsFile, 'utf8');
    const recipients = recipientsContent.split('\n')
      .map(line => line.trim())
      .filter(line => line && line.includes('@'));

    if (recipients.length === 0) {
      log(`\n❌ No valid email addresses found in ${recipientsFile}`, 'red');
      process.exit(1);
    }

    log(`\n📧 Found ${recipients.length} recipients`, 'blue');
    log(`📄 Template: ${options.template || 'hackathon-email-modern'}`, 'blue');

    // Confirm before sending
    if (!options.force) {
      log(`\n⚠️  You are about to send emails to ${recipients.length} recipients!`, 'yellow');
      log(`Press Ctrl+C within 5 seconds to cancel...`, 'yellow');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Load and compile template
    const template = options.template || 'hackathon-email-modern';
    const templatePath = path.join(__dirname, 'templates', `${template}.mjml`);

    log(`\n⚙️  Loading template...`, 'yellow');
    const mjmlContent = await sender.loadMjmlTemplate(templatePath);

    const variables = {
      REGISTRATION_URL: process.env.REGISTRATION_URL || 'https://hacktheeast.com/register',
      UNSUBSCRIBE_URL: process.env.UNSUBSCRIBE_URL || 'https://hacktheeast.com/unsubscribe',
      PREFERENCES_URL: process.env.PREFERENCES_URL || 'https://hacktheeast.com/preferences',
    };

    log(`⚙️  Compiling MJML...`, 'yellow');
    const htmlContent = sender.compileMjmlToHtml(mjmlContent, variables);

    // Send bulk emails
    log(`\n📨 Sending emails...`, 'yellow');
    const result = await sender.sendBulkEmails(
      recipients,
      options.subject || 'HackTheEast 2026 - Build the Future | Registration Open',
      htmlContent,
      {
        batchSize: parseInt(options.batch) || 10,
        delayMs: parseInt(options.delay) || 1000,
        tags: ['hacktheeast', 'bulk', template],
      }
    );

    log(`\n✅ Bulk sending completed!`, 'green');
    log(`📊 Results:`, 'cyan');
    log(`   • Total: ${result.total}`, 'blue');
    log(`   • Successful: ${result.successful}`, 'green');
    log(`   • Failed: ${result.failed}`, result.failed > 0 ? 'red' : 'green');

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// CLI argument parsing
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    log(`\nHackTheEast Email Sender CLI`, 'bright');
    log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`, 'cyan');

    log(`USAGE:`, 'yellow');
    log(`  node send.js <email@example.com> [options]`);
    log(`  node send.js --bulk <recipients.txt> [options]`);
    log(`  node send.js --test\n`);

    log(`OPTIONS:`, 'yellow');
    log(`  -t, --template <name>    Email template to use (default: hackathon-email-modern)`);
    log(`  -s, --subject <text>     Custom email subject`);
    log(`  -b, --bulk <file>        Send to multiple recipients from file`);
    log(`  --batch <size>           Batch size for bulk sending (default: 10)`);
    log(`  --delay <ms>             Delay between batches in ms (default: 1000)`);
    log(`  --force                  Skip confirmation for bulk sending`);
    log(`  --test                   Send test email to address in .env`);
    log(`  -h, --help               Show this help message\n`);

    log(`TEMPLATES:`, 'yellow');
    log(`  • hackathon-email-modern   Fumadocs-inspired modern design`);
    log(`  • hackathon-email-black    Monochrome liquid glass design`);
    log(`  • hackathon-email-premium  Premium gradient design`);
    log(`  • hackathon-email          Original cyberpunk design\n`);

    log(`EXAMPLES:`, 'yellow');
    log(`  # Send to single recipient`, 'green');
    log(`  node send.js john@example.com`);
    log(`  node send.js john@example.com -t hackathon-email-black`);
    log(`  node send.js john@example.com --subject "Special Invitation"\n`);

    log(`  # Send to multiple recipients`, 'green');
    log(`  node send.js --bulk recipients.txt`);
    log(`  node send.js -b emails.txt --batch 20 --delay 2000\n`);

    log(`  # Send test email`, 'green');
    log(`  node send.js --test\n`);

    log(`SETUP:`, 'yellow');
    log(`  1. Copy .env.mailgun to .env`, 'cyan');
    log(`  2. Add your Mailgun SMTP credentials`, 'cyan');
    log(`  3. Update FROM_EMAIL with your domain`, 'cyan');
    log(`  4. Run: npm install`, 'cyan');
    log(`  5. Start sending!\n`, 'cyan');

    process.exit(0);
  }

  // Parse arguments
  const options = {};
  let recipient = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--test') {
      recipient = process.env.TEST_EMAIL || 'test@example.com';
      log(`\n📧 Sending test email to: ${recipient}`, 'cyan');
    } else if (arg === '-t' || arg === '--template') {
      options.template = args[++i];
    } else if (arg === '-s' || arg === '--subject') {
      options.subject = args[++i];
    } else if (arg === '-b' || arg === '--bulk') {
      const file = args[++i];
      return await sendBulk(file, options);
    } else if (arg === '--batch') {
      options.batch = args[++i];
    } else if (arg === '--delay') {
      options.delay = args[++i];
    } else if (arg === '--force') {
      options.force = true;
    } else if (!recipient && arg.includes('@')) {
      recipient = arg;
    }
  }

  if (!recipient) {
    log(`\n❌ Error: No recipient email specified`, 'red');
    log(`Use --help for usage information`, 'yellow');
    process.exit(1);
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipient)) {
    log(`\n❌ Error: Invalid email format: ${recipient}`, 'red');
    process.exit(1);
  }

  await sendEmail(recipient, options);
}

// Run CLI
if (require.main === module) {
  main().catch(error => {
    log(`\n❌ Unexpected error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { sendEmail, sendBulk };