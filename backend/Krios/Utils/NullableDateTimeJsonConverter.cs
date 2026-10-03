using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Krios.Utils
{
    /// <summary>
    /// HTML date inputs send "" when empty; DateTime? cannot bind that.
    /// </summary>
    public sealed class NullableDateTimeJsonConverter : JsonConverter<DateTime?>
    {
        public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Null)
                return null;
            if (reader.TokenType == JsonTokenType.String)
            {
                var s = reader.GetString();
                if (string.IsNullOrWhiteSpace(s))
                    return null;
                if (DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var parsed))
                    return parsed;
                if (DateTime.TryParse(s, out parsed))
                    return parsed;
            }
            throw new JsonException($"The JSON value could not be converted to DateTime.");
        }

        public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
        {
            if (value == null)
                writer.WriteNullValue();
            else
                writer.WriteStringValue(value.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
        }
    }
}
