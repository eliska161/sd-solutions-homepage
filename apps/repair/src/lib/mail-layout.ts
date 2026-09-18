import { escapeHtml } from "@/lib/mail-html";
import { mailLogoSrc } from "@/lib/mail";

export function customerMailLayout(opts: {
  preheader: string;
  heading: string;
  ticketNumber: string;
  deviceLabel: string;
  bodyHtml: string;
  statusUrl: string;
  extraCtas?: { label: string; url: string }[];
}) {
  const heading = escapeHtml(opts.heading);
  const ticket = escapeHtml(opts.ticketNumber);
  const device = escapeHtml(opts.deviceLabel);
  const preheader = escapeHtml(opts.preheader);
  const statusUrl = escapeHtml(opts.statusUrl);
  const logo = escapeHtml(mailLogoSrc());
  const extraCtas = (opts.extraCtas ?? [])
    .map((cta) => {
      const href = escapeHtml(cta.url);
      const label = escapeHtml(cta.label);
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:10px;">
                        <tr>
                          <td style="background:#1b1e24;border-radius:4px;">
                            <a href="${href}" style="display:inline-block;padding:9px 14px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;">${label}</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:10px 0 0;font-size:12px;color:#6b7280;word-break:break-all;">${href}</p>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="nb">
  <body style="margin:0;padding:0;background:#e8eaee;color:#1f2430;font-family:'Segoe UI',Tahoma,sans-serif;font-size:14px;line-height:1.5;">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e8eaee;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;border-collapse:separate;">
            <tr>
              <td style="background:#1b1e24;padding:10px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <img src="${logo}" width="28" height="28" alt="SD Solutions" style="display:inline-block;border:0;outline:none;width:28px;height:28px;" />
                      <span style="display:inline-block;vertical-align:middle;margin-left:10px;color:#ffffff;font-size:13px;font-weight:600;letter-spacing:-0.01em;">SD Solutions</span>
                    </td>
                    <td align="right" style="vertical-align:middle;color:rgba(255,255,255,0.65);font-size:12px;">
                      Kundestatus
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;border:1px solid #d5d8de;border-top:0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#1b1e24;color:#ffffff;padding:10px 16px;font-size:13px;font-weight:600;">
                      ${heading}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px;">
                      <p style="margin:0 0 4px;font-size:12px;color:#6b7280;">${ticket}</p>
                      <p style="margin:0 0 16px;font-size:13px;color:#6b7280;">${device}</p>
                      ${opts.bodyHtml}
                      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                        <tr>
                          <td style="background:#2b6cb0;border-radius:4px;">
                            <a href="${statusUrl}" style="display:inline-block;padding:9px 14px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;">Åpne status</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:10px 0 0;font-size:12px;color:#6b7280;word-break:break-all;">${statusUrl}</p>
                      ${extraCtas}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 4px 0;font-size:12px;color:#6b7280;">
                SD Solutions · Slåttmyrvegen 49, 2406 Elverum
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
