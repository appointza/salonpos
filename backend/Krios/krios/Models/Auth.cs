namespace Krios.Models.Krios
{
    public class AuthIdentifyReq
    {
        public string identifier { get; set; } = "";
    }

    public class AuthIdentifyRes
    {
        public string accountType { get; set; } = "";
        public bool hasPassword { get; set; }
        public string name { get; set; } = "";
        public string email { get; set; } = "";
        public string phone { get; set; } = "";
        public string maskedPhone { get; set; } = "";
        public long orgId { get; set; }
        public long organizationId { get; set; }
    }

    public class AuthSendOtpReq
    {
        public string identifier { get; set; } = "";
        public string phone { get; set; } = "";
        public string email { get; set; } = "";
    }

    public class AuthSendOtpRes
    {
        public bool sent { get; set; }
        public string maskedPhone { get; set; } = "";
        public string maskedEmail { get; set; } = "";
        public string hint { get; set; } = "";
        public string channel { get; set; } = "";
    }

    public class AuthUpdateLanguageReq
    {
        public long userId { get; set; }
        public string language { get; set; } = "en";
    }

    public class AuthUpdateLanguageRes
    {
        public string language { get; set; } = "en";
    }

    public class AuthSetupCustomerPasswordReq
    {
        public string phone { get; set; } = "";
        public string otp { get; set; } = "";
        public string password { get; set; } = "";
        public string name { get; set; } = "";
    }

    public class AuthCustomerLoginReq
    {
        public string phone { get; set; } = "";
        public string password { get; set; } = "";
    }

    public class AuthResetOrganizationPasswordReq
    {
        public string phone { get; set; } = "";
        public string email { get; set; } = "";
        public string otp { get; set; } = "";
        public string password { get; set; } = "";
    }
}
