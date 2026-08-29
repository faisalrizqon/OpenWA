import { initializeOpenWA } from './lib/openwa-api-client';
import express from 'express';
import { startScheduleWorker } from './schedule/schedule-worker';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenWA WhatsApp integration
async function bootstrap() {
  try {
    console.log('🚀 Starting MudahSewa Application...');
    
    // Initialize OpenWA client
    const openwaClient = await initializeOpenWA();
    console.log('✅ OpenWA WhatsApp integration initialized');
    
    // Start schedule worker
    await startScheduleWorker(openwaClient);
    console.log('✅ Schedule worker started');
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`📱 MudahSewa WhatsApp Service running on port ${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
      console.log(`💬 Send message endpoint: POST http://localhost:${PORT}/api/messages/send`);
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    process.exit(1);
  }
}

bootstrap();
