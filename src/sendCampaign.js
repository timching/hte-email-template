const EmailSender = require('./emailSender');
const path = require('path');

async function main() {
  const sender = new EmailSender();

  try {
    console.log('🚀 Starting HackTheEast 2025 Email Campaign...\n');

    const templatePath = path.join(__dirname, '..', 'templates', 'hackathon-email.mjml');
    console.log('📧 Loading email template from:', templatePath);

    const mjmlContent = await sender.loadMjmlTemplate(templatePath);

    const variables = {
      REGISTRATION_URL: process.env.REGISTRATION_URL || 'https://hacktheeast2025.com/register',
      UNSUBSCRIBE_URL: '*|UNSUB|*',
      PREFERENCES_URL: '*|UPDATE_PROFILE|*',
    };

    console.log('🔨 Compiling MJML to HTML...');
    let htmlContent = await sender.compileMjmlToHtml(mjmlContent, variables);

    const subscriberCount = await sender.getSubscriberCount();
    console.log(`\n📊 Subscriber Statistics:`);
    console.log(`   Total subscribers: ${subscriberCount.total}`);
    console.log(`   Active: ${subscriberCount.subscribed}`);
    console.log(`   Unsubscribed: ${subscriberCount.unsubscribed}`);
    console.log(`   Cleaned: ${subscriberCount.cleaned}\n`);

    const campaignSubject = 'HackTheEast 2025: You\'ve Been Selected 🔓';

    console.log('📨 Creating Mailchimp campaign...');
    const campaign = await sender.createMailchimpCampaign(campaignSubject, htmlContent);
    console.log(`✅ Campaign created with ID: ${campaign.id}`);

    const args = process.argv.slice(2);
    const sendMode = args[0] || 'test';

    if (sendMode === 'test') {
      console.log('\n🧪 Sending test emails...');
      await sender.sendTestEmail(campaign);
      console.log('✅ Test emails sent successfully!');
      console.log('\n📝 To send to all subscribers, run: npm run send:production');
    } else if (sendMode === 'production') {
      console.log('\n⚠️  PRODUCTION MODE - Sending to all subscribers...');
      console.log('🚦 You have 5 seconds to cancel (Ctrl+C)...');

      await new Promise(resolve => setTimeout(resolve, 5000));

      console.log('\n🚀 Sending campaign to all subscribers...');
      await sender.sendCampaign(campaign.id);
      console.log('✅ Campaign sent successfully!');

      console.log('\n⏱️  Waiting 30 seconds before fetching initial report...');
      await new Promise(resolve => setTimeout(resolve, 30000));

      console.log('\n📈 Initial Campaign Report:');
      const report = await sender.getCampaignReport(campaign.id);
      console.log(`   Unique Opens: ${report.subscriberActivity.uniqueOpens}`);
      console.log(`   Open Rate: ${(report.subscriberActivity.openRate * 100).toFixed(2)}%`);
      console.log(`   Click Rate: ${(report.subscriberActivity.clickRate * 100).toFixed(2)}%`);
    } else if (sendMode === 'single') {
      const testEmail = process.env.TEST_EMAIL_ADDRESSES ?
        process.env.TEST_EMAIL_ADDRESSES.split(',')[0].trim() :
        'test@example.com';

      console.log(`\n📧 Sending single email to: ${testEmail}`);

      htmlContent = await sender.addTrackingPixel(htmlContent);
      htmlContent = sender.wrapLinksWithTracking(htmlContent, 'test-campaign');

      await sender.sendDirectEmail(testEmail, campaignSubject, htmlContent);
      console.log('✅ Single email sent successfully!');
    }

    console.log('\n🎉 Campaign process completed successfully!');

  } catch (error) {
    console.error('\n❌ Error in campaign process:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = main;