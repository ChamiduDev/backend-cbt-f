const sendEmail = require('./utils/sendEmail');

// Test Resend configuration with API key
const testEmail = async () => {
  try {
    console.log('🧪 Testing Resend configuration...');
    console.log('📧 Using API key: re_eZ9krXjU_D8XWQ7v657cn6EMfh8K8oZ8h');
    console.log('📦 Using Resend SDK v3.2.0');
    
    await sendEmail({
      email: 'test@example.com', // Can send to any email with Resend
      subject: 'Test Email from Ceylon Black Taxi',
      message: '<h2>Test Email</h2><p>This is a test email to verify Resend configuration is working correctly.</p><p>Sent from Ceylon Black Taxi backend.</p>',
    });
    
    console.log('✅ Email sent successfully! Resend configuration is working.');
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    console.error('Full error:', error);
  }
};

// Run the test
testEmail();
