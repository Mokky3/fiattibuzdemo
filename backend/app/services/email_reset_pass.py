# email_utils_dev.py
import os
import smtplib
from email.utils import formataddr, parseaddr
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST = os.getenv("SMTP_HOST", "localhost")
SMTP_PORT = int(os.getenv("SMTP_PORT", 1025))
SMTP_FROM = os.getenv("SMTP_FROM", "FIATTIB <dev@fiattib.test>")
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
SMTP_STARTTLS = os.getenv("SMTP_STARTTLS", "false").lower() in ("1","true","yes")

def send_email(to: str, subject: str, html: str, text_fallback: str | None = None):
    """Send email using SMTP with improved error handling."""
    from_name, from_addr = parseaddr(SMTP_FROM)
    _, to_addr = parseaddr(to)
    if not from_addr or "@" not in from_addr: 
        raise ValueError("Invalid SMTP_FROM")
    if not to_addr or "@" not in to_addr: 
        raise ValueError("Invalid recipient")

    if text_fallback is None:
        text_fallback = "Open this email in an HTML-capable client."

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = formataddr((from_name or "FIATTIB", from_addr))
    msg["To"] = to_addr
    msg.attach(MIMEText(text_fallback, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as s:
        if SMTP_STARTTLS: 
            s.starttls()
        if SMTP_USER and SMTP_PASS: 
            s.login(SMTP_USER, SMTP_PASS)
        s.sendmail(from_addr, [to_addr], msg.as_string())