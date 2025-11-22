# HackTheEast 2025 Email Campaign

Cyberpunk-themed email campaign system for HackTheEast 2025 hackathon with Mailchimp integration for tracking opens, clicks, and subscriber engagement.

## Features

- 🎨 Cyberpunk-themed MJML email template
- 📊 Mailchimp integration for tracking
- 📧 Direct SMTP sending capability
- 🔍 Open and click tracking
- 📈 Campaign analytics and reporting
- 🧪 Test email functionality

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

### 3. Mailchimp Setup

1. Create a Mailchimp account at [mailchimp.com](https://mailchimp.com)
2. Get your API key from Account → Extras → API keys
3. Create an audience (mailing list)
4. Note your server prefix (last part of API key, e.g., us1, us2)
5. Get your list ID from Audience → Settings → Audience name and defaults

## Usage

### Preview Email Template

```bash
npm run preview
```

### Send Test Email

Send to test email addresses configured in `.env`:

```bash
npm run send:test
```

### Send to Single Email

```bash
npm run send:single
```

### Send to All Subscribers (Production)

⚠️ **Warning**: This sends to all subscribers in your Mailchimp list!

```bash
npm run send:production
```

## Email Template Variables

The template supports these dynamic variables:
- `{{REGISTRATION_URL}}` - Registration link for the hackathon
- `{{UNSUBSCRIBE_URL}}` - Mailchimp unsubscribe link
- `{{PREFERENCES_URL}}` - Mailchimp preferences link

## Tracking Features

- **Open Tracking**: Automatic pixel insertion
- **Click Tracking**: All links wrapped with Mailchimp tracking
- **Campaign Reports**: View opens, clicks, and engagement rates
- **Google Analytics**: Optional GA campaign tracking

## Project Structure

```
email/
├── templates/
│   └── hackathon-email.mjml    # MJML email template
├── src/
│   ├── emailSender.js          # Core email sending class
│   └── sendCampaign.js         # Campaign execution script
├── dist/                       # Compiled HTML output
├── .env.example                # Environment variables template
├── package.json                # Dependencies and scripts
└── README.md                   # Documentation
```

## Customization

### Modifying the Template

Edit `templates/hackathon-email.mjml` to customize:
- Colors: Change `#00ff41` (green) and `#00ffff` (cyan)
- Content: Update text, dates, and event details
- Images: Replace placeholder image URLs
- Social links: Update social media URLs

### Adding New Tracking

The `EmailSender` class provides methods for:
- Custom tracking pixels
- UTM parameters
- A/B testing support
- Segment targeting

## Security Notes

- Never commit `.env` file to version control
- Use environment variables for all sensitive data
- Enable 2FA on your Mailchimp account
- Use app-specific passwords for SMTP

## License

MIT