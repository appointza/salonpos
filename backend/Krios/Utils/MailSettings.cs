namespace Krios.Utils
{
    public class MailSettings
    {
        public string Host { get; set; } = "";
        public int Port { get; set; } = 587;
        public string User { get; set; } = "";
        public string Password { get; set; } = "";
        public string From { get; set; } = "";
        public string ChildSafetyTo { get; set; } = "vetriselvan_m@cloudrastiko.com";
        public bool EnableSsl { get; set; } = true;
    }
}
