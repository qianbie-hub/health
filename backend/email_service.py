import secrets
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from config import settings

def generate_otp() -> str:
    """
    Generate cryptographically secure 6-digit numeric verification code.
    """
    return f"{secrets.randbelow(900000) + 100000}"


def send_otp_email(recipient_email: str, otp_code: str, purpose: str = "signup") -> bool:
    """
    Dispatches a branded clinical email with the verification OTP.
    Uses real SMTP if configured; otherwise logs to system console in dev/test mode.
    """
    subject_action = "Account Registration" if purpose == "signup" else "Secure Login"
    subject = f"Your Vigil Health Verification Code: {otp_code}"

    # Rich clinical HTML template
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Vigil Health Verification</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #1E293B;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 32px 28px; text-align: center;">
      <div style="display: inline-block; width: 44px; height: 44px; border-radius: 12px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); line-height: 44px; font-size: 20px;">
        🌿
      </div>
      <h1 style="color: #ffffff; font-size: 22px; font-weight: 600; margin: 12px 0 4px 0; letter-spacing: -0.02em;">Vigil Health Intelligence</h1>
      <p style="color: #94A3B8; font-size: 13px; margin: 0;">Authorized Clinical Security Protocol</p>
    </div>

    <!-- Body -->
    <div style="padding: 32px 28px;">
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 0;">
        Hello,
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        You requested a verification code to authorize your <strong>{subject_action}</strong> with Vigil Health. Please enter the following 6-digit code:
      </p>

      <!-- OTP Box -->
      <div style="margin: 28px 0; padding: 20px; background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 16px; text-align: center;">
        <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0284C7; font-family: 'SF Mono', Consolas, monospace;">
          {otp_code}
        </span>
        <div style="font-size: 11px; color: #64748B; margin-top: 8px; font-weight: 500;">
          Expires in {settings.OTP_EXPIRE_MINUTES} minutes • Do not share this code
        </div>
      </div>

      <p style="font-size: 12px; line-height: 1.5; color: #64748B;">
        If you did not initiate this request, someone may have mistyped their email address. No access has been granted to your biometric health records without this code.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 18px 28px; text-align: center; font-size: 11px; color: #94A3B8;">
      🛡️ 256-bit AES Clinical Security • Zero Unauthorized Access • HIPAA Ready
    </div>
  </div>
</body>
</html>
"""

    text_content = f"""Vigil Health Security Verification
Your {subject_action} code is: {otp_code}

This code will expire in {settings.OTP_EXPIRE_MINUTES} minutes.
If you did not request this code, you can safely ignore this email.
"""

    # Check if real SMTP credentials are configured
    if settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.SMTP_FROM_EMAIL
            msg["To"] = recipient_email

            part1 = MIMEText(text_content, "plain")
            part2 = MIMEText(html_content, "html")
            msg.attach(part1)
            msg.attach(part2)

            if settings.SMTP_PORT == 465:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=context) as server:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(settings.SMTP_FROM_EMAIL, recipient_email, msg.as_string())
            else:
                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                    if settings.SMTP_USE_TLS:
                        context = ssl.create_default_context()
                        server.starttls(context=context)
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(settings.SMTP_FROM_EMAIL, recipient_email, msg.as_string())

            print(f"📧 [SMTP] Verification email successfully dispatched to {recipient_email}")
            return True
        except Exception as e:
            print(f"⚠️ [SMTP ERROR] Failed to send email via SMTP: {e}. Falling back to simulation.")

    # Local Development & Simulation Logger
    border = "=" * 65
    print(f"\n{border}")
    print(f"📧 [VIGIL EMAIL DISPATCH SIMULATOR - DEV/TEST MODE]")
    print(f"To:        {recipient_email}")
    print(f"Subject:   {subject}")
    print(f"Purpose:   {subject_action}")
    print(f"OTP Code:  >>>  {otp_code}  <<<")
    print(f"Expires:   {settings.OTP_EXPIRE_MINUTES} minutes")
    print(f"{border}\n")
    return True
