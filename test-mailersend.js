const sendEmail = require('./utils/sendEmail');

// Test MailerSend SDK configuration with API key
const testEmail = async () => {
  try {
    console.log('🧪 Testing MailerSend SDK configuration...');
    console.log('📧 Using API key: mlsn.3da9502495e19542642c5848b1198977d985b94993ec20b0d058f5a024d7c38c');
    console.log('📦 Using MailerSend SDK v2.0.0');
    
    await sendEmail({
      email: 'test@example.com', // Replace with a real email for testing
      subject: 'Test Email from Ceylon Black Taxi',
      message: '<h2>Test Email</h2><p>This is a test email to verify MailerSend SDK configuration is working correctly.</p><p>Sent from Ceylon Black Taxi backend.</p>',
    });
    
    console.log('✅ Email sent successfully! MailerSend SDK configuration is working.');
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    console.error('Full error:', error);
  }
};

// Run the test
testEmail();
