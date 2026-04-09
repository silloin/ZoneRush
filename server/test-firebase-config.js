const firebasePush = require('./utils/firebasePush');

async function testFirebaseConfig() {
  console.log('🔥 Testing Firebase Configuration...\n');
  
  // Test 1: Check if Firebase is configured
  console.log('Test 1: Checking Firebase initialization...');
  if (firebasePush.isConfigured) {
    console.log('✅ Firebase Admin initialized successfully!');
  } else {
    console.log('❌ Firebase not configured');
    console.log('\nTo configure Firebase:');
    console.log('1. Follow FIREBASE_SETUP_GUIDE.md');
    console.log('2. Add FIREBASE_SERVICE_ACCOUNT_KEY to server/.env');
    return;
  }
  
  // Test 2: Try to send a test notification
  console.log('\nTest 2: Testing push notification sending...');
  console.log('Note: This will fail if no users have registered FCM tokens');
  
  const testUserId = 1; // Test with user ID 1
  
  try {
    const result = await firebasePush.sendPushNotification(testUserId, {
      title: '🚨 SOS Test Alert',
      body: 'This is a test of the emergency notification system!',
      data: {
        type: 'test_sos',
        timestamp: new Date().toISOString(),
        message: 'If you receive this, Firebase is working!'
      }
    });
    
    console.log('\n📊 Result:', result);
    
    if (result.success && result.successCount > 0) {
      console.log(`✅ SUCCESS! Sent to ${result.successCount} device(s)`);
      console.log('\n✅ Push notifications are ready!');
    } else if (result.success) {
      console.log('⚠️  No devices to send to (this is normal for testing)');
      console.log('✅ Firebase is configured correctly!');
      console.log('   Users need to register their FCM tokens first.');
    } else {
      console.log('❌ Failed to send:', result.error || result.reason);
    }
    
  } catch (error) {
    console.log('❌ Error during test:', error.message);
  }
  
  console.log('\n========================================');
  console.log('Next Steps:');
  console.log('1. See FIREBASE_SETUP_GUIDE.md for mobile setup');
  console.log('2. Add FCM token registration to your app');
  console.log('3. Test with real devices');
  console.log('========================================\n');
}

testFirebaseConfig().catch(console.error);
