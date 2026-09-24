using Krios.Middlewares;
using Krios.Utils;
using Microsoft.AspNetCore.Hosting;

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
            var builder = WebApplication.CreateBuilder(args);

            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("ASPNETCORE_URLS")))
            {
                var listenUrl = builder.Configuration["Kestrel:Endpoints:Http:Url"];
                if (string.IsNullOrWhiteSpace(listenUrl))
                    listenUrl = "http://0.0.0.0:5050";
                builder.WebHost.UseUrls(listenUrl);
            }

            builder.Services.Configure<ApplicationEnvironment>(builder.Configuration.GetSection("ApplicationSettings"));
            var appSettings = builder.Configuration.GetSection("ApplicationSettings").Get<ApplicationEnvironment>();

            builder.Logging.ClearProviders();
            builder.Logging.AddConsole();
            builder.Logging.AddLog4Net("log4net.config");

            builder.Services.AddControllers().AddJsonOptions(jsonOptions =>
            {
                jsonOptions.JsonSerializerOptions.PropertyNamingPolicy = null;
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
            healthChecks.AddRedis(appSettings?.redis?.connection_string ?? "localhost:6379", name: "redis");

            builder.Services.AddMemoryCache();
            builder.Services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = appSettings?.redis?.connection_string ?? "localhost:6379";
                options.InstanceName = appSettings?.redis?.instance_name ?? "Krios";
            });

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

            var app = builder.Build();

            app.UseResponseCompression();
            app.UseCors();
            app.UseSwagger();
            app.UseSwaggerUI();
            app.UseMiddleware<ErrorHandlerMiddleware>();
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
                    path.StartsWith("/assets/"))
                {
                    context.Response.StatusCode = 404;
                    await context.Response.WriteAsync("Not found");
                    return;
                }

                var webHostEnvironment = context.RequestServices.GetRequiredService<IWebHostEnvironment>();
                var indexPath = Path.Combine(webHostEnvironment.WebRootPath, "index.html");

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

            return app;
        }
    }
}
