using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;

namespace Krios.Services.Krios
{
    public class EmailService
    {
        private readonly IConfiguration config;

        public EmailService(IConfiguration config)
        {
            this.config = config;
        }

        public bool IsConfigured()
        {
            return !string.IsNullOrWhiteSpace(config["Email:SmtpHost"])
                && !string.IsNullOrWhiteSpace(config["Email:Username"])
                && !string.IsNullOrWhiteSpace(config["Email:Password"])
                && !string.IsNullOrWhiteSpace(config["Email:FromEmail"]);
        }

        public async Task<bool> SendAsync(string toEmail, string subject, string htmlBody, string textBody = "")
        {
            if (!IsConfigured())
                return false;

            string host = config["Email:SmtpHost"] ?? "";
            int port = int.TryParse(config["Email:Port"], out int parsedPort) ? parsedPort : 587;
            bool enableSsl = !string.Equals(config["Email:EnableSsl"], "false", StringComparison.OrdinalIgnoreCase);
            string username = config["Email:Username"] ?? "";
            string password = config["Email:Password"] ?? "";
            string fromEmail = config["Email:FromEmail"] ?? "";
            string fromName = config["Email:FromName"] ?? "Krios";

            using var message = new MailMessage
            {
                From = new MailAddress(fromEmail, fromName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true
            };
            message.To.Add(toEmail);

            if (!string.IsNullOrWhiteSpace(textBody))
            {
                var plainView = AlternateView.CreateAlternateViewFromString(textBody, null, "text/plain");
                message.AlternateViews.Add(plainView);
            }

            using var client = new SmtpClient(host, port)
            {
                EnableSsl = enableSsl,
                Credentials = new NetworkCredential(username, password),
                DeliveryMethod = SmtpDeliveryMethod.Network
            };

            await client.SendMailAsync(message);
            return true;
        }
    }
}
