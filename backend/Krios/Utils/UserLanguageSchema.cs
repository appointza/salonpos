namespace Krios.Utils
{
    public static class UserLanguageSchema
    {
        private static bool columnReady;

        public static async Task EnsureColumn(IDb db)
        {
            if (columnReady) return;
            var cmd = db.GetCommand(@"ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(16) DEFAULT 'en';");
            await db.ExecuteNonQuery(cmd);
            columnReady = true;
        }

        public static string Normalize(string? value)
        {
            var lang = (value ?? "").Trim().ToLowerInvariant();
            return lang is "ta" or "hi" or "en" ? lang : "en";
        }
    }
}
