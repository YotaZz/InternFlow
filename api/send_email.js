// api/send_email.js
import nodemailer from 'nodemailer';
import path from 'path';

export default async function handler(req, res) {
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

  const { to, subject, html, replyTo, fromName, smtpUser, smtpPass } = req.body;

  const user = smtpUser || process.env.QQ_EMAIL;
  const pass = smtpPass || process.env.QQ_PASSWORD;

  if (!user || !pass) {
    return res.status(500).json({ error: 'Missing SMTP credentials (User/Pass)' });
  }

  // [新增] 邮箱地址标准化处理
  // 1. 将中文逗号(，)和分号(;)替换为英文逗号(,)
  // 2. 去除首尾空格
  const normalizeRecipients = (recipients) => {
      if (!recipients) return '';
      return recipients
        .replace(/，/g, ',') // 替换中文逗号
        .replace(/;/g, ',')  // 替换分号
        .replace(/\s*,\s*/g, ',') // 去除逗号周围的空格
        .trim();
  };

  const safeTo = normalizeRecipients(to);

  if (!safeTo) {
      return res.status(400).json({ error: 'No valid recipients parsed' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'qq', 
      auth: {
        user: user,
        pass: pass, 
      },
    });

    const resumePath = path.resolve(process.cwd(), 'resume.pdf');

    const info = await transporter.sendMail({
      from: `"${fromName || 'InternFlow AI'}" <${user}>`, 
      to: safeTo, // 使用清洗后的地址列表
      subject: subject,
      html: html,
      replyTo: replyTo || user,
      attachments: [
        {
            filename: `${subject}.pdf`, 
            path: resumePath
        }
      ]
    });

    console.log('Message sent: %s to %s', info.messageId, safeTo);
    return res.status(200).json({ success: true, messageId: info.messageId });

  } catch (error) {
    console.error('Email send error:', error);
    if (error.code === 'ENOENT') {
        return res.status(500).json({ error: 'Resume file (resume.pdf) not found in project root.' });
    }
    return res.status(500).json({ error: error.message || 'Failed to send email' });
  }
}