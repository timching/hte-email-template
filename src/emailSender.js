const mjml2html = require('mjml');
const fs = require('fs').promises;
const path = require('path');
const mailchimp = require('@mailchimp/mailchimp_marketing');
const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailSender {
  constructor() {
    this.initializeMailchimp();
    this.initializeNodemailer();
  }

  initializeMailchimp() {
    mailchimp.setConfig({
      apiKey: process.env.MAILCHIMP_API_KEY,
      server: process.env.MAILCHIMP_SERVER_PREFIX,
    });

    this.mailchimpListId = process.env.MAILCHIMP_LIST_ID;
    this.mailchimpCampaignId = process.env.MAILCHIMP_CAMPAIGN_ID;
  }

  initializeNodemailer() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
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

  async compileMjmlToHtml(mjmlContent, variables = {}) {
    let processedMjml = mjmlContent;

    Object.keys(variables).forEach(key => {
      const placeholder = `{{${key}}}`;
      processedMjml = processedMjml.replace(new RegExp(placeholder, 'g'), variables[key]);
    });

    const htmlOutput = mjml2html(processedMjml, {
      minify: true,
      validationLevel: 'soft',
    });

    if (htmlOutput.errors && htmlOutput.errors.length > 0) {
      console.warn('MJML compilation warnings:', htmlOutput.errors);
    }

    return htmlOutput.html;
  }

  async createMailchimpCampaign(subject, htmlContent) {
    try {
      const campaign = await mailchimp.campaigns.create({
        type: 'regular',
        recipients: {
          list_id: this.mailchimpListId,
          segment_opts: {
            match: 'all',
            conditions: [],
          },
        },
        settings: {
          subject_line: subject,
          preview_text: 'The future is coded. Are you ready to hack it?',
          title: `HackTheEast 2025 - ${new Date().toISOString()}`,
          from_name: process.env.FROM_NAME,
          reply_to: process.env.REPLY_TO_EMAIL,
          use_conversation: false,
          to_name: '*|FNAME|*',
          folder_id: '',
          authenticate: true,
          auto_footer: false,
          inline_css: true,
          auto_tweet: false,
          fb_comments: false,
          timewarp: false,
        },
        tracking: {
          opens: true,
          html_clicks: true,
          text_clicks: true,
          goal_tracking: true,
          ecomm360: false,
          google_analytics: process.env.GOOGLE_ANALYTICS_CAMPAIGN || '',
          clicktale: '',
          salesforce: {
            campaign: false,
            notes: false,
          },
        },
      });

      await mailchimp.campaigns.setContent(campaign.id, {
        html: htmlContent,
      });

      return campaign;
    } catch (error) {
      console.error('Error creating Mailchimp campaign:', error);
      throw error;
    }
  }

  async sendTestEmail(campaign) {
    try {
      const testEmails = process.env.TEST_EMAIL_ADDRESSES ?
        process.env.TEST_EMAIL_ADDRESSES.split(',').map(email => email.trim()) :
        [];

      if (testEmails.length === 0) {
        console.warn('No test email addresses configured');
        return null;
      }

      const response = await mailchimp.campaigns.sendTestEmail(campaign.id, {
        test_emails: testEmails,
        send_type: 'html',
      });

      console.log('Test email sent to:', testEmails.join(', '));
      return response;
    } catch (error) {
      console.error('Error sending test email:', error);
      throw error;
    }
  }

  async sendCampaign(campaignId) {
    try {
      const response = await mailchimp.campaigns.send(campaignId);
      console.log('Campaign sent successfully:', response);
      return response;
    } catch (error) {
      console.error('Error sending campaign:', error);
      throw error;
    }
  }

  async getSubscriberCount() {
    try {
      const list = await mailchimp.lists.getList(this.mailchimpListId);
      return {
        total: list.stats.member_count,
        subscribed: list.stats.unsubscribe_count,
        unsubscribed: list.stats.unsubscribe_count,
        cleaned: list.stats.cleaned_count,
      };
    } catch (error) {
      console.error('Error getting subscriber count:', error);
      throw error;
    }
  }

  async getCampaignReport(campaignId) {
    try {
      const report = await mailchimp.reports.getCampaignReport(campaignId);
      return {
        opens: report.opens,
        clicks: report.clicks,
        subscriberActivity: {
          uniqueOpens: report.unique_opens,
          openRate: report.open_rate,
          clickRate: report.click_rate,
        },
      };
    } catch (error) {
      console.error('Error getting campaign report:', error);
      throw error;
    }
  }

  async sendDirectEmail(to, subject, htmlContent) {
    try {
      const mailOptions = {
        from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
        to: to,
        subject: subject,
        html: htmlContent,
        headers: {
          'X-MC-Track': 'opens,clicks',
          'X-MC-GoogleAnalytics': process.env.GOOGLE_ANALYTICS_CAMPAIGN || '',
          'X-MC-Tags': 'hackathon, hacktheeast2025',
        },
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Direct email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending direct email:', error);
      throw error;
    }
  }

  async addTrackingPixel(htmlContent) {
    const trackingPixel = `<img src="https://${process.env.MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/track/open.php?u=${process.env.MAILCHIMP_USER_ID}&id=${process.env.MAILCHIMP_CAMPAIGN_ID}" height="1" width="1" style="display:none;">`;
    return htmlContent.replace('</body>', `${trackingPixel}</body>`);
  }

  wrapLinksWithTracking(htmlContent, campaignId) {
    const baseTrackingUrl = `https://${process.env.MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/track/click`;

    return htmlContent.replace(
      /href="([^"]+)"/g,
      (match, url) => {
        if (url.startsWith('{{') || url.startsWith('http://localhost')) {
          return match;
        }
        const trackedUrl = `${baseTrackingUrl}?u=${process.env.MAILCHIMP_USER_ID}&id=${campaignId}&url=${encodeURIComponent(url)}`;
        return `href="${trackedUrl}"`;
      }
    );
  }
}

module.exports = EmailSender;