using Krios.Middlewares;
using Krios.Utils;
using System.IO.Compression;
using Microsoft.AspNetCore.Hosting;

namespace Krios
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var app = CreateWebApplication(args);
            try
            {
                var preset = new Preset();
                await preset.Start(app);
                app.Run();
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
            }
            finally
            {
                Console.ReadKey();
            }
        }
        public static WebApplication CreateWebApplication(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Published exe does not use launchSettings.json; without this, Kestrel defaults to http://localhost:5000.
            // Prefer ASPNETCORE_URLS env; else Kestrel:Endpoints:Http:Url from appsettings; else 5050 (production default).
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

            builder.Services.AddScoped<Krios.Filters.BaseUrlViewDataFilter>();
            builder.Services.AddControllersWithViews(options =>
            {
                // Add base URL filter to inject base URL into all views
                options.Filters.AddService<Krios.Filters.BaseUrlViewDataFilter>();
            }).AddJsonOptions(jsonOptions =>
            {
                jsonOptions.JsonSerializerOptions.PropertyNamingPolicy = null;
            });

            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();
            
            // Add CORS services
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowSpecificOrigins", policy =>
                {
                    policy.WithOrigins(
                            "http://localhost:3000",      // React development server
                            "http://localhost:8080",      // Your current server port
                            "http://192.168.29.69:8080",  // Your current network IP
                            "http://192.168.31.122:8080", // Your network IP
                            "https://localhost:7117",  // Production domain
                            "https://kriosapp.com" ,      // Production domain without www
                            "http://localhost:5117",
                            "http://localhost:5050"
                        )
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials(); // Allow cookies and authentication headers
                });
            });
            
            // Add health checks (Npgsql registration throws if connection string is null)
            var healthChecks = builder.Services.AddHealthChecks();
            if (!string.IsNullOrWhiteSpace(appSettings?.postgresqlconnection))
                healthChecks.AddNpgSql(appSettings.postgresqlconnection, name: "postgresql");
            healthChecks.AddRedis(appSettings.redis?.connection_string ?? "localhost:6379", name: "redis");
            
            // Add caching services
            builder.Services.AddMemoryCache();
            builder.Services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = appSettings.redis?.connection_string ?? "localhost:6379";
                options.InstanceName = appSettings.redis?.instance_name ?? "Krios";
            });

            // Add response compression
            builder.Services.AddResponseCompression();
            builder.Services.AddSwaggerGen(options =>
            {
                //options.CustomSchemaIds(type => type.ToString());
                options.CustomSchemaIds(type => type.FullName.Replace("+", "."));
            });
            builder.Services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
            builder.Services.AddSingleton<AppState>();
            builder.Services.AddScoped<RequestState>();
            AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
            builder.Services.AddScoped<IDbProvider, PostgreSQLProvider>();
            builder.Services.AddCustomServices();
            
            // B2B Services
            builder.Services.AddHttpClient<kriosapp.comtegrations.Authentication.Services.IB2BClientService, kriosapp.comtegrations.Authentication.Services.B2BClientService>();
            builder.Services.Configure<CookiePolicyOptions>(options =>
            {
                options.MinimumSameSitePolicy = SameSiteMode.Unspecified;
                options.OnAppendCookie = cookieContext =>
                    cookieContext.CookieOptions.SameSite = SameSiteMode.None;
                options.OnDeleteCookie = cookieContext =>
                    cookieContext.CookieOptions.SameSite = SameSiteMode.None;
                options.Secure = CookieSecurePolicy.Always; // required for chromium-based browsers

            });
            var app = builder.Build();
            
            // Enable response compression
            app.UseResponseCompression();
            
            app.Use((context, next) =>
            {
                context.Response.Headers["X-Frame-Options"] = "ALLOWALL";
                return next.Invoke();
            });
            
            // Enable CORS - must be placed before other middleware
              app.UseCors(x => x
                .AllowAnyOrigin()
                .AllowAnyMethod()
                .AllowAnyHeader());
            //if (app.Environment.IsDevelopment())
            //{
            app.UseSwagger();
            app.UseSwaggerUI();

            app.UseExceptionHandler("/Home/Error");
            app.UseHsts();
            app.UseCookiePolicy();
            //app.UseHttpsRedirection();
            app.UseMiddleware<ErrorHandlerMiddleware>();
            app.UseWebSockets();
            //app.UseMiddleware<JwtMiddleware>();
            app.UseStaticFiles();
            app.UseMiddleware<MobileRedirectMiddleware>();
            
            // ✅ MIDDLEWARE FOR /api/b2b (B2B server-to-server authentication)
            app.UseMiddleware<kriosapp.comtegrations.Authentication.Middlewares.ServerToServerAuthMiddleware>();
        // Extract organization from subdomain
            app.UseRouting();
            
            // Map specific MVC routes that should be handled by controllers
            app.MapControllerRoute(
                name: "services",
                pattern: "services",
                defaults: new { controller = "Home", action = "Services" });

            app.MapControllerRoute(
                name: "explore-services",
                pattern: "explore-services",
                defaults: new { controller = "Home", action = "ExploreServices" });

            app.MapControllerRoute(
                name: "explore",
                pattern: "explore",
                defaults: new { controller = "Home", action = "Services" });

            // Map API routes - these should be handled by API controllers
            app.MapControllers();

            // Root "/" is served by MapFallback (wwwroot/index.html) when the SPA is published there.
            // A default Home/Index MVC route is omitted because no HomeController exists in this project.

            // Add health check endpoint
            app.MapHealthChecks("/health");

            // Custom fallback that serves index.html for all non-API, non-MVC routes
            // This ensures React Router can handle client-side routing
            app.MapFallback(async context =>
            {
                var path = context.Request.Path.Value?.ToLower() ?? "";
                
                // Skip fallback for API routes, static files, and health checks
                if (path.StartsWith("/api/") || 
                    path.StartsWith("/swagger") || 
                    path.StartsWith("/health") ||
                    path.StartsWith("/assets/") ||
                    path.StartsWith("/css/") ||
                    path.StartsWith("/js/") ||
                    path.StartsWith("/lib/") ||
                    path.StartsWith("/images/") ||
                    path.StartsWith("/lovable-uploads/") ||
                    path.EndsWith(".js") ||
                    path.EndsWith(".css") ||
                    path.EndsWith(".png") ||
                    path.EndsWith(".jpg") ||
                    path.EndsWith(".svg") ||
                    path.EndsWith(".ico") ||
                    path.EndsWith(".json") ||
                    path.EndsWith(".woff") ||
                    path.EndsWith(".woff2") ||
                    path.EndsWith(".ttf"))
                {
                    context.Response.StatusCode = 404;
                    await context.Response.WriteAsync("Not found");
                    return;
                }
                
                // Check if this is a subdomain pattern request
                var host = context.Request.Host.Host;
               
               
                
             
                    // For non-subdomain patterns (like localhost), serve index.html for React Router
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

