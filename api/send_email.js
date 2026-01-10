import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // 设置 CORS 头（如果前后端分离部署需要，Vercel同域部署一般不需要，但加上保险）
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { to, subject, html, replyTo, fromName } = req.body;

  if (!process.env.QQ_EMAIL || !process.env.QQ_PASSWORD) {
    return res.status(500).json({ error: 'Server misconfigured: Missing QQ Mail credentials' });
  }

  try {
    // 配置 QQ 邮箱 SMTP
    const transporter = nodemailer.createTransport({
      service: 'qq', // 内置了 QQ 邮箱的配置 (smtp.qq.com, 465, secure)
      auth: {
        user: process.env.QQ_EMAIL,
        pass: process.env.QQ_PASSWORD, // 这里的密码是 QQ 邮箱的 "授权码"
      },
    });

    // 发送邮件
    const info = await transporter.sendMail({
      from: `"${fromName || 'InternFlow AI'}" <${process.env.QQ_EMAIL}>`, // 发件人必须与认证账户一致
      to: to,
      subject: subject,
      html: html,
      replyTo: replyTo, // 设置回复地址为用户的个人邮箱
    });

    console.log('Message sent: %s', info.messageId);
    return res.status(200).json({ success: true, messageId: info.messageId });

  } catch (error) {
    console.error('Email send error:', error);
    return res.status(500).json({ error: error.message || 'Failed to send email' });
  }
}