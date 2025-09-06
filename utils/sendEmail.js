const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.mailersend.net',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'api',
      pass: 'mlsn.3da9502495e19542642c5848b1198977d985b94993ec20b0d058f5a024d7c38c',
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  const mailOptions = {
    from: {
      name: 'Ceylon Black Taxi',
      address: 'noreply@ceylonblacktaxi.com'
    },
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
