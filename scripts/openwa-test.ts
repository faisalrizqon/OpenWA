/**
 * OpenWA Integration Test Script
 * Run with: npx tsx scripts/openwa-test.ts
 */

import { sendTextMessage, sendMessageWithMedia, initializeOpenWA } from '../src/lib/openwa-api-client';

async function runTests() {
  console.log('🧪 Starting OpenWA Integration Tests...\n');
  
  // Test 1: Initialize Client
  console.log('Test 1: Initializing OpenWA client...');
  try {
    const client = await initializeOpenWA();
    console.log('✅ OpenWA client initialized successfully\n');
  } catch (error) {
    console.error('❌ Failed to initialize OpenWA:', error.message);
    return;
  }

  // Test 2: Send Text Message
  console.log('Test 2: Sending text message...');
  const TEST_PHONE = process.env.TEST_PHONE || '6281234567890';
  const TEST_MESSAGE = 'Test message from MudahSewa WhatsApp Integration';
  
  try {
    const result = await sendTextMessage(TEST_PHONE, TEST_MESSAGE);
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result && result.status === 'sent') {
      console.log('✅ Text message sent successfully\n');
    } else {
      console.log('⚠️  Message sent status unclear, check OpenWA dashboard\n');
    }
  } catch (error) {
    console.error('❌ Error sending text message:', error.message);
    console.log('ℹ️  This is expected if OpenWA is not running or phone is not valid\n');
  }

  // Test 3: Send Media Message
  console.log('Test 3: Sending media message...');
  const TEST_IMAGE_URL = 'https://via.placeholder.com/150';
  
  try {
    const result = await sendMessageWithMedia(
      TEST_PHONE,
      TEST_IMAGE_URL,
      'Test image message'
    );
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result && result.type === 'image') {
      console.log('✅ Media message sent successfully\n');
    } else {
      console.log('⚠️  Media message status unclear\n');
    }
  } catch (error) {
    console.error('❌ Error sending media message:', error.message);
    console.log('ℹ️  This may be expected if OpenWA is not running\n');
  }

  console.log('📊 Tests completed!');
  console.log('\nNext steps:');
  console.log('1. Check OpenWA dashboard at http://localhost:8080');
  console.log('2. Verify messages were received by testing phone');
  console.log('3. Update TEST_PHONE in .env file with your test number');
}

runTests().catch(console.error);
