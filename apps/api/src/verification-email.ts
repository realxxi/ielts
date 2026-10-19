const BRAND = {
  green: '#245a3d',
  greenSoft: '#eaf1ec',
  greenBorder: '#a9c4b3',
  ink: '#18251e',
  muted: '#505a54',
  faint: '#909793',
  bg: '#f9faf7',
  line: '#e2e5e2',
};

export function buildVerificationEmail(code: string, expiresInMinutes = 10) {
  const subject = 'tilshunos: tasdiqlash kodingiz';

  const textContent =
    `Ro‘yxatdan o‘tishni yakunlash uchun tasdiqlash kodingiz: ${code}\n\n` +
    `Kod ${expiresInMinutes} daqiqa amal qiladi. ` +
    `Agar bu so‘rov sizniki bo‘lmasa, xabarni e’tiborsiz qoldiring.`;

  const htmlContent = `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    Tasdiqlash kodingiz: ${code}. Kod ${expiresInMinutes} daqiqa amal qiladi.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          <tr>
            <td align="left" style="padding:0 8px 20px 8px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="40" height="40" align="center" valign="middle" style="width:40px;height:40px;background-color:${BRAND.green};border-radius:11px;color:#ffffff;font-size:22px;font-weight:700;line-height:40px;">t.</td>
                  <td style="padding-left:12px;color:${BRAND.ink};font-size:22px;font-weight:700;letter-spacing:-0.3px;">tilshunos</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;border:1px solid ${BRAND.line};border-radius:16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:36px 32px 8px 32px;">
                    <h1 style="margin:0 0 12px 0;color:${BRAND.ink};font-size:22px;line-height:1.3;font-weight:700;">Emailingizni tasdiqlang</h1>
                    <p style="margin:0;color:${BRAND.muted};font-size:15px;line-height:1.6;">Ro‘yxatdan o‘tishni yakunlash uchun quyidagi tasdiqlash kodini ilovaga kiriting:</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:24px 32px;">
                    <div style="background-color:${BRAND.greenSoft};border:1.5px dashed ${BRAND.greenBorder};border-radius:12px;padding:20px 12px;">
                      <span style="font-family:'SFMono-Regular',Menlo,Consolas,'Courier New',monospace;font-size:38px;font-weight:700;letter-spacing:10px;color:${BRAND.green};padding-left:10px;">${code}</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 32px 28px 32px;">
                    <p style="margin:0;color:${BRAND.muted};font-size:14px;line-height:1.5;">Kod <strong style="color:${BRAND.ink};">${expiresInMinutes} daqiqa</strong> amal qiladi.</p>
                  </td>
                </tr>
                <tr><td style="padding:0 32px;"><div style="height:1px;background-color:${BRAND.line};"></div></td></tr>
                <tr>
                  <td style="padding:20px 32px 32px 32px;">
                    <p style="margin:0;color:${BRAND.faint};font-size:13px;line-height:1.6;">Agar bu so‘rov sizniki bo‘lmasa, xabarni e’tiborsiz qoldiring. Kodni hech kimga bermang.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 8px 0 8px;color:${BRAND.faint};font-size:12px;line-height:1.5;">© ${new Date().getFullYear()} tilshunos</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, htmlContent, textContent };
}
