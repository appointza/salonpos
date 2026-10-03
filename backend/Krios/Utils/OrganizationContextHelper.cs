using Krios.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Krios.Utils
{
    /// <summary>
    /// Helper class to access organization information from HttpContext
    /// </summary>
    public static class OrganizationContextHelper
    {
        /// <summary>
        /// Gets the current organization ID from the request context
        /// </summary>
        public static long GetCurrentOrganizationId(HttpContext context)
        {
            if (context?.Items?.ContainsKey("OrganizationId") == true)
            {
                return Convert.ToInt64(context.Items["OrganizationId"]);
            }
            return 0;
        }

        /// <summary>
        /// Gets the current organization name from the request context
        /// </summary>
        public static string GetCurrentOrganizationName(HttpContext context)
        {
            if (context?.Items?.ContainsKey("OrganizationName") == true)
            {
                return context.Items["OrganizationName"]?.ToString() ?? "";
            }
            return "";
        }

        /*
        /// <summary>
        /// Gets the current organization details from the request context
        /// </summary>
        public static OrganisationDetail GetCurrentOrganization(HttpContext context)
        {
            if (context?.Items?.ContainsKey("CurrentOrganization") == true)
            {
                return context.Items["CurrentOrganization"] as OrganisationDetail;
            }
            return null;
        }
        */

        /*
        /// <summary>
        /// Gets the location information from the request context
        /// </summary>
        public static LocationInfo GetLocationInfo(HttpContext context)
        {
            if (context?.Items?.ContainsKey("LocationInfo") == true)
            {
                return context.Items["LocationInfo"] as LocationInfo;
            }
            return new LocationInfo();
        }
        */

        /// <summary>
        /// Checks if the current request is for a specific organization
        /// </summary>
        public static bool HasOrganizationContext(HttpContext context)
        {
            return GetCurrentOrganizationId(context) > 0;
        }

        /// <summary>
        /// Public site URL for QR/links. localhost in config is ignored so EC2 (kros.com) uses the request host.
        /// </summary>
        public static string GetOrganizationBaseUrl(HttpContext context)
        {
            var appSettings = context.RequestServices.GetService<Microsoft.Extensions.Options.IOptions<ApplicationEnvironment>>();
            var configured = appSettings?.Value?.baseUrl?.Trim() ?? "";
            if (!string.IsNullOrEmpty(configured) &&
                !configured.Contains("localhost", StringComparison.OrdinalIgnoreCase) &&
                !configured.Contains("127.0.0.1", StringComparison.OrdinalIgnoreCase))
            {
                return configured.TrimEnd('/');
            }

            return $"{context.Request.Scheme}://{context.Request.Host}".TrimEnd('/');
        }
    }
}
