using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;

namespace Krios.Utils
{
    public class OtpMailer
    {
        private readonly MailSettings settings;
        private readonly ILogger<OtpMailer> logger;

        public OtpMailer(IOptions<MailSettings> options, ILogger<OtpMailer> logger)
        {
            settings = options.Value ?? new MailSettings();
            this.logger = logger;
        }

        public bool IsConfigured => !string.IsNullOrWhiteSpace(settings.Host);

        public async Task SendOtp(string toEmail, string otp)
        {
            if (!IsConfigured)
                throw new InvalidOperationException("Mail is not configured.");

            var from = string.IsNullOrWhiteSpace(settings.From)
                ? (string.IsNullOrWhiteSpace(settings.User) ? "noreply@localhost" : settings.User)
                : settings.From;

            using var message = new MailMessage(from, toEmail)
            {
                Subject = "Your Krios verification code",
                Body = $"Your verification code is {otp}. It expires in 5 minutes. If you did not request this, ignore this email.",
            };

            using var client = new SmtpClient(settings.Host, settings.Port)
            {
                EnableSsl = settings.EnableSsl,
            };
            if (!string.IsNullOrWhiteSpace(settings.User))
                client.Credentials = new NetworkCredential(settings.User, settings.Password);

            await client.SendMailAsync(message);
            logger.LogInformation("Sent password-reset OTP email to {Email}", MaskEmail(toEmail));
        }

        public static bool IsDeliverableEmail(string? email)
        {
            var value = (email ?? "").Trim();
            if (value.Length < 5 || value.IndexOf('@') < 1) return false;
            var lower = value.ToLowerInvariant();
            if (lower.EndsWith("@salon.staff") || lower.EndsWith("@salon.customer")) return false;
            return true;
        }

        public static string MaskEmail(string? email)
        {
            var value = (email ?? "").Trim();
            var at = value.IndexOf('@');
            if (at < 1) return value;
            var name = value[..at];
            var domain = value[(at + 1)..];
            var shown = name.Length <= 1 ? "*" : $"{name[0]}***";
            return $"{shown}@{domain}";
        }
    }
}
