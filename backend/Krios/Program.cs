using System.Diagnostics;
using Krios.Middlewares;
using Krios.Utils;
using Microsoft.AspNetCore.HttpOverrides;

namespace Krios
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var app = CreateWebApplication(args);
            app.Run();
        }

        public static WebApplication CreateWebApplication(string[] args)
        {
            var contentRoot = AppContext.BaseDirectory;
            var wwwroot = Path.Combine(contentRoot, "wwwroot");
            var hasWwwroot = Directory.Exists(wwwroot);
            var builder = WebApplication.CreateBuilder(new WebApplicationOptions
            {
                Args = args,
                ContentRootPath = hasWwwroot ? contentRoot : Directory.GetCurrentDirectory(),
                WebRootPath = hasWwwroot ? wwwroot : "wwwroot",
            });

            var urls = KriosUrls.Load(contentRoot, hasWwwroot ? wwwroot : Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"));
            urls.BindKestrel(builder);

            builder.Services.Configure<ApplicationEnvironment>(builder.Configuration.GetSection("ApplicationSettings"));
            var appSettings = builder.Configuration.GetSection("ApplicationSettings").Get<ApplicationEnvironment>();
            var redisConnection = appSettings?.redis?.connection_string?.Trim() ?? "";
            var redisEnabled = !string.IsNullOrWhiteSpace(redisConnection);

            builder.Logging.ClearProviders();
            builder.Logging.AddConsole();
            builder.Logging.AddLog4Net("log4net.config");

            builder.Services.AddControllers().AddJsonOptions(jsonOptions =>
            {
                jsonOptions.JsonSerializerOptions.PropertyNamingPolicy = null;
                jsonOptions.JsonSerializerOptions.Converters.Add(new NullableDateTimeJsonConverter());
            });
            builder.Services.AddEndpointsApiExplorer();

            builder.Services.AddCors(options =>
            {
                options.AddDefaultPolicy(policy =>
                {
                    policy.AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader();
                });
            });

            var healthChecks = builder.Services.AddHealthChecks();
            if (!string.IsNullOrWhiteSpace(appSettings?.postgresqlconnection))
                healthChecks.AddNpgSql(appSettings.postgresqlconnection, name: "postgresql");
            if (redisEnabled)
                healthChecks.AddRedis(redisConnection, name: "redis");

            builder.Services.AddMemoryCache();
            if (redisEnabled)
            {
                builder.Services.AddStackExchangeRedisCache(options =>
                {
                    options.Configuration = redisConnection;
                    options.InstanceName = appSettings?.redis?.instance_name ?? "Krios";
                });
            }

            builder.Services.AddResponseCompression();
            builder.Services.AddSwaggerGen(options =>
            {
                options.CustomSchemaIds(type => type.FullName!.Replace("+", "."));
            });
            builder.Services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
            builder.Services.AddSingleton<AppState>();
            builder.Services.AddScoped<RequestState>();
            AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
            builder.Services.AddScoped<IDbProvider, PostgreSQLProvider>();
            builder.Services.AddCustomServices();
            builder.Services.Configure<ForwardedHeadersOptions>(options =>
            {
                options.ForwardedHeaders = ForwardedHeaders.XForwardedFor
                    | ForwardedHeaders.XForwardedProto
                    | ForwardedHeaders.XForwardedHost;
                options.KnownNetworks.Clear();
                options.KnownProxies.Clear();
            });

            var app = builder.Build();

            app.UseForwardedHeaders();
            app.UseResponseCompression();
            app.UseCors();
            app.UseSwagger();
            app.UseSwaggerUI();
            app.UseMiddleware<ErrorHandlerMiddleware>();
            app.UseDefaultFiles();
            app.UseStaticFiles();
            app.UseRouting();
            app.MapControllers();
            app.MapHealthChecks("/health");

            app.MapFallback(async context =>
            {
                var path = context.Request.Path.Value?.ToLower() ?? "";

                if (path.StartsWith("/api/") ||
                    path.StartsWith("/swagger") ||
                    path.StartsWith("/health") ||
                    path.StartsWith("/assets/") ||
                    path.EndsWith(".json") ||
                    path.EndsWith(".js") ||
                    path.EndsWith(".css") ||
                    path.EndsWith(".png") ||
                    path.EndsWith(".ico"))
                {
                    context.Response.StatusCode = 404;
                    await context.Response.WriteAsync("Not found");
                    return;
                }

                var webHostEnvironment = context.RequestServices.GetRequiredService<IWebHostEnvironment>();
                var webRoot = webHostEnvironment.WebRootPath
                    ?? Path.Combine(AppContext.BaseDirectory, "wwwroot");
                var indexPath = Path.Combine(webRoot, "index.html");

                if (File.Exists(indexPath))
                {
                    context.Response.ContentType = "text/html";
                    await context.Response.SendFileAsync(indexPath);
                }
                else
                {
                    context.Response.StatusCode = 404;
                    await context.Response.WriteAsync("Page not found");
                }
            });

            var uiUrl = $"http://localhost:{urls.Port}";
            app.Lifetime.ApplicationStarted.Register(() =>
            {
                app.Logger.LogInformation(
                    "Krios listening on {Listen}. Open {Url} (http). UI API base: {Api}",
                    urls.backendListen,
                    uiUrl,
                    string.IsNullOrEmpty(urls.frontendApiBaseUrl) ? "(same host as the page)" : urls.frontendApiBaseUrl);
                if (app.Configuration.GetValue("LaunchBrowser", false))
                    TryOpenBrowser(uiUrl);
            });

            return app;
        }

        private static void TryOpenBrowser(string url)
        {
            try
            {
                Process.Start(new ProcessStartInfo { FileName = url, UseShellExecute = true });
            }
            catch
            {
                // Headless/server hosts have no browser.
            }
        }
    }
}
