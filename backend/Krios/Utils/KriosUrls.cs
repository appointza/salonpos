using System.Net;
using System.Text.Json;

namespace Krios.Utils
{
    public class KriosUrls
    {
        public string backendListen { get; set; } = "http://0.0.0.0:5050";
        public string frontendApiBaseUrl { get; set; } = "";

        public int Port => PortFromListenUrl(backendListen);

        public static KriosUrls Load(string contentRoot, string wwwroot)
        {
            foreach (var path in new[]
            {
                Path.Combine(wwwroot, "krios-urls.json"),
                Path.Combine(contentRoot, "krios-urls.json"),
            })
            {
                if (!File.Exists(path)) continue;
                try
                {
                    var parsed = JsonSerializer.Deserialize<KriosUrls>(File.ReadAllText(path), new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true,
                    });
                    if (parsed != null)
                    {
                        if (string.IsNullOrWhiteSpace(parsed.backendListen))
                            parsed.backendListen = "http://0.0.0.0:5050";
                        parsed.backendListen = parsed.backendListen.Trim();
                        parsed.frontendApiBaseUrl = (parsed.frontendApiBaseUrl ?? "").Trim().TrimEnd('/');
                        return parsed;
                    }
                }
                catch
                {
                    /* next file */
                }
            }

            return new KriosUrls();
        }

        public static int PortFromListenUrl(string? listenUrl)
        {
            var text = (listenUrl ?? "").Trim();
            var colon = text.LastIndexOf(':');
            if (colon >= 0 && int.TryParse(text[(colon + 1)..], out var port) && port > 0 && port < 65536)
                return port;
            return 5050;
        }

        public void BindKestrel(WebApplicationBuilder builder)
        {
            var port = Port;
            builder.WebHost.ConfigureKestrel(options =>
            {
                options.Listen(IPAddress.Any, port);
            });
        }
    }
}
