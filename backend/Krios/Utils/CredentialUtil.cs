using System.Text.RegularExpressions;

namespace Krios.Utils
{
    public static class CredentialUtil
    {
        private static readonly Regex Whitespace = new(@"\s+", RegexOptions.Compiled);

        public static string StripWhitespace(string? value)
        {
            if (string.IsNullOrEmpty(value)) return "";
            return Whitespace.Replace(value, "");
        }

        public static string NormalizeEmail(string? value)
        {
            return StripWhitespace(value);
        }

        public static string NormalizeIdentifier(string? value)
        {
            return StripWhitespace(value);
        }

        public static string NormalizeOtp(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return "";
            return new string(value.Where(char.IsDigit).ToArray());
        }

        public static string ValidateNewPassword(string? password, int minLength = 6, string? requiredMessage = null)
        {
            // Strip all whitespace so signup/login never store accidental spaces from mobile keyboards.
            var cleaned = StripWhitespace(password);
            if (string.IsNullOrEmpty(cleaned))
                throw new AppException(AppException.ErrorCodes.BadRequest, requiredMessage ?? $"Password must be at least {minLength} characters.");
            if (cleaned.Length < minLength)
                throw new AppException(AppException.ErrorCodes.BadRequest, $"Password must be at least {minLength} characters.");
            return cleaned;
        }

        public static bool PasswordMatches(CustomCryptography cryptography, string? storedHash, string? incomingPassword)
        {
            if (string.IsNullOrWhiteSpace(storedHash)) return false;
            var trimmed = (incomingPassword ?? "").Trim();
            if (string.IsNullOrEmpty(trimmed)) return false;

            var trimmedHash = cryptography.CalculateSHA256Hash(trimmed);
            if (string.Equals(storedHash, trimmedHash, StringComparison.OrdinalIgnoreCase))
                return true;

            var compact = StripWhitespace(trimmed);
            if (!string.Equals(compact, trimmed, StringComparison.Ordinal))
            {
                var compactHash = cryptography.CalculateSHA256Hash(compact);
                if (string.Equals(storedHash, compactHash, StringComparison.OrdinalIgnoreCase))
                    return true;
            }

            return false;
        }
    }
}
