const { Resend } = require('resend');

const resend = new Resend('re_eZ9krXjU_D8XWQ7v657cn6EMfh8K8oZ8h');

const sendEmail = async (options) => {
  await resend.emails.send({
    from: 'Ceylon Black Taxi <noreply@ceylonblacktaxi.com>',
    to: [options.email],
    subject: options.subject,
    html: options.message,
  });
};

module.exports = sendEmail;