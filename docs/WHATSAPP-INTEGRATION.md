# OpenWA WhatsApp Integration Guide

## Overview

MudahSewa uses OpenWA as a WhatsApp Business API integration layer to enable automated messaging, notifications, and customer communication through WhatsApp.

## Prerequisites

- Node.js 18+ 
- Docker & Docker Compose
- Valid WhatsApp Business number
- Environment variables configured

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create or update your `.env` file with the following:

```bash
# OpenWA Configuration
OPENWA_API_URL=http://localhost:8080
OPENWA_AUTH_TOKEN=your_auth_token_here

# WhatsApp Configuration
WHATSAPP_PHONE_NUMBER=6281234567890

# Test Configuration (for development)
TEST_PHONE=6281234567890
TEST_IMAGE_URL=https://via.placeholder.com/150
```

### 3. Start OpenWA

```bash
docker-compose -f docker-compose.openwa.yml up -d
```

### 4. Get Authentication Token

1. Visit http://localhost:8080 in your browser
2. Scan the QR code displayed on screen using your WhatsApp app
3. Copy the authentication token from the dashboard
4. Update your `.env` file with the token

### 5. Run the Application

```bash
npm run openwa:start
```

Or for development mode:

```bash
npm run dev
```

### 6. Test the Integration

Run the test script:

```bash
npx tsx scripts/openwa-test.ts
```

Or run unit tests:

```bash
npm run openwa:test
```

## API Usage

### Send Text Message

```typescript
import { sendTextMessage } from '@/lib/openwa-api-client';

const result = await sendTextMessage('6281234567890', 'Hello, this is a test message!');
console.log(result);
```

Response format:
```json
{
  "status": "sent",
  "messageId": "3EB0...",
  "timestamp": "2026-08-27T04:21:35Z"
}
```

### Send Media Message (Image)

```typescript
import { sendMessageWithMedia } from '@/lib/openwa-api-client';

// From URL
const result = await sendMessageWithMedia(
  '6281234567890',
  'https://example.com/image.jpg',
  'Here is your receipt image'
);

// From local file path
const result = await sendMessageWithMedia(
  '6281234567890',
  '/path/to/local/file.png',
  'Receipt attachment'
);
```

### Check Contact Info

```typescript
import { getContactInfo } from '@/lib/openwa-api-client';

const contact = await getContactInfo('6281234567890');
console.log(contact);
```

## Schedule Integration

The OpenWA client integrates with the schedule system to send automated notifications:

### Payment Reminders

Schedule workers send payment reminders via WhatsApp based on configured schedules.

### Appointment Notifications

Automated appointment confirmations and reminders sent through WhatsApp.

### Document Delivery

Send rental agreements and documents directly to customers via WhatsApp.

## API Endpoints

### Health Check

```bash
GET /api/proxy/openwa-health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-08-27T04:21:35Z"
}
```

### Send Message (Internal API)

```bash
POST /api/messages/send
Content-Type: application/json

{
  "phone": "6281234567890",
  "message": "Your text message here",
  "mediaUrl": null
}
```

### Webhook Handlers (OpenWA)

Webhooks are received at OpenWA instance:
- `http://localhost:8080/webhook/messages` - Message events
- `http://localhost:8080/webhook/status` - Delivery status updates

## Testing

### Manual Testing

1. Use curl to test endpoints:

```bash
curl -X POST http://localhost:3000/api/messages/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"6281234567890","message":"Test message"}'
```

2. View OpenWA dashboard at http://localhost:8080

### Automated Testing

```bash
# Run all tests
npm test

# Run OpenWA specific tests only
npm run openwa:test

# Run functional test script
npx tsx scripts/openwa-test.ts
```

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to OpenWA

**Solution**:
1. Verify OpenWA container is running: `docker ps | grep openwa`
2. Check network connectivity: `curl http://localhost:8080`
3. Review logs: `docker logs openwa-server-1`

### Authentication Failures

**Problem**: Invalid token error

**Solution**:
1. Re-scan QR code in OpenWA dashboard
2. Ensure phone number is properly linked to WhatsApp Business
3. Clear cached tokens and regenerate

### Message Not Sending

**Problem**: Messages stuck in pending state

**Solution**:
1. Verify recipient phone number has valid WhatsApp account
2. Check message content (avoid prohibited content)
3. Review rate limits in OpenWA dashboard
4. Monitor delivery status webhooks

### Rate Limiting

WhatsApp imposes sending limits:
- New business accounts: ~500 messages/day
- Verified businesses: Higher limits apply

Monitor your quota in the OpenWA dashboard.

## Production Deployment

### Docker Compose (Production)

```yaml
version: '3.8'
services:
  openwa-server:
    image: rmyndharis/openwa-server:latest
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - AUTH_TOKEN=${OPENWA_AUTH_TOKEN}
    restart: always
    networks:
      - mudahsewa-network
```

### Nginx Reverse Proxy

Configure Nginx to route WhatsApp traffic:

```nginx
server {
    listen 80;
    server_name wa.mudahsewa.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Security Considerations

### Environment Variables

Never commit `.env` files to version control:

```bash
# .gitignore
.env
.env.local
.env.*.local
```

### Authentication Tokens

Rotate tokens periodically:
1. Generate new token in OpenWA dashboard
2. Update `.env` file
3. Restart application

### Webhook Verification

Implement webhook signature verification:
```typescript
import crypto from 'crypto';

const verifyWebhook = (payload, signature) => {
  const expected = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  return signature === expected;
};
```

## Best Practices

1. **Message Templates**: Use standardized templates for consistent communication
2. **Rate Limiting**: Implement queue-based sending to avoid API limits
3. **Error Handling**: Always handle API failures gracefully
4. **Logging**: Log all WhatsApp interactions for audit trails
5. **Testing**: Maintain test phone numbers for development/testing
6. **Monitoring**: Set up alerts for failed message deliveries

## Additional Resources

- [OpenWA Documentation](https://github.com/RmyNdharis/openwa-server)
- [WhatsApp Business API](https://business.facebook.com/docs/whatsapp)
- [本项目 README](./README.md)

## Support

For issues and questions:
- GitHub Issues: Report bugs
- Email: support@mudahsewa.com
- Documentation: See project wiki

---

Last Updated: August 27, 2026
