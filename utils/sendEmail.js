const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.mailersend.net',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'MS_mOIKDB@test-zkq340exqnkgd796.mlsender.net',
      pass: 'mssp.LzHkEIH.3zxk54vkx9xljy6v.VtceXle',
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  const mailOptions = {
    from: 'MS_mOIKDB@test-zkq340exqnkgd796.mlsender.net',
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
