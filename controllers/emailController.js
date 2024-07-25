const nodemailer = require('nodemailer');
const generateEmailTemplate = require('../utils/emailTemplate');
const adminTemplate = require('../utils/emailTemplate');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const sendContactEmail = async (req, res) => {
  const { name, email, message } = req.body;

  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Regarding Contact Request!',
    html: generateEmailTemplate(name, email, message),
  };

  const mailOptionsAdmin = {
    from: process.env.SMTP_FROM,
    to: process.env.SMTP_ADMIN,
    subject: 'New Contact Request!',
    html: adminTemplate(name, email, message),
  };
  try {
    await transporter.sendMail(mailOptions);
    await transporter.sendMail(mailOptionsAdmin);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending email', error: error.toString() });
  }
};

module.exports = { sendContactEmail };
