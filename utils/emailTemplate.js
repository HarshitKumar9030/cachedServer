const generateEmailTemplate = (name, email, message) => `
  <html>
  <body style=" background-color: #f7f7f7; margin: 0; padding: 0;">
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
      <div style="background-color: #007bff; color: #fff; text-align: center; padding: 15px; border-top-left-radius: 8px; border-top-right-radius: 8px;">
        <h2>Subliminal Notifications</h2>
      </div>
      <div style="padding: 20px;">
        <p style="font-size: 16px;">Hello ${name},</p>
        <p style="font-size: 16px;">This is an auto-generated email regarding your contact request with the message:</p>
        <blockquote style="background-color: #f1f1f1; padding: 15px; margin: 15px 0; border-left: 5px solid #007bff;">
          <p style="font-size: 16px; margin: 0;">"${message}"</p>
        </blockquote>
        <p style="font-size: 16px;">One of our team members will get back to you shortly.</p>
        <p style="font-size: 16px;">Meanwhile visit our site: <a href="https://www.hogwart.tech" style="color: #007bff;">https://www.hogwart.tech</a></p>
        <p style="font-size: 16px; margin-top: 20px;">Best regards,<br>Subliminal Downloader</p>
      </div>
      <div style="text-align: center; padding: 10px; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; background-color: #f0f0f0; color: #666; font-size: 12px;">
        <p>This email was sent to ${email}. Please do not reply to this email.</p>
      </div>
    </div>
  </body>
</html>
`;



module.exports = generateEmailTemplate;
