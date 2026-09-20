using Krios.AwsS3;
using Krios.Services;
// using Krios.Authentication.Services;
// using Krios.FirebaseNotification.Services;
// using Krios.Sms.Services;
// using Krios.WhatsAppMsg.Services;
using Krios.Utils;

namespace Krios
{
    public static class ServicesConfiguration
    {
        public static void AddCustomServices(this IServiceCollection services)
        {
            // services.AddSingleton<UserSocketService>();
            services.AddSingleton<IQueryBuilderProvider, QueryBuilderProvider>();
            services.AddTransient<CustomCryptography>();

            // AWS S3
            services.AddSingleton<AwsS3Service>();

            // HTTP Client for Razorpay
            // services.AddHttpClient<Razorpay.RazorpayService>(client =>
            // {
            //     client.Timeout = TimeSpan.FromSeconds(30);
            //     client.DefaultRequestHeaders.Add("User-Agent", "Krios/1.0");
            // });
            // services.AddScoped<Razorpay.RazorpayService>();
            
            // HTTP Client for Firebase Notifications
            // services.AddHttpClient<FirebaseNotificationService>(client =>
            // {
            //     client.Timeout = TimeSpan.FromSeconds(30);
            //     client.DefaultRequestHeaders.Add("User-Agent", "Krios/1.0");
            // });
            // services.AddScoped<FirebaseNotificationService>();
            
            // Firebase Admin SDK for Notifications
            // services.AddScoped<FirebaseAdminNotificationService>();

            // HTTP Client for WhatsApp API
            // services.AddHttpClient<WhatsAppMsg.Services.WhatsAppService>(client =>
            // {
            //     client.Timeout = TimeSpan.FromSeconds(30);
            //     client.DefaultRequestHeaders.Add("User-Agent", "Krios/1.0");
            // });
            // services.AddScoped<WhatsAppMsg.Services.WhatsAppService>();

            // HTTP Client for Google Geocoding API
            // services.AddHttpClient<GoogleGeocodingService>(client =>
            // {
            //     client.Timeout = TimeSpan.FromSeconds(30);
            //     client.DefaultRequestHeaders.Add("User-Agent", "Krios/1.0");
            // });
            // services.AddScoped<GoogleGeocodingService>();

            // SMS Service
            // services.AddScoped<Sms.Services.SmsService>();

            //DB - Optimized service lifetimes
            //services.AddScoped<FilesService>(); // Changed from Transient to Scoped
          
            // services.AddScoped<OrganisationLocationService>(); // Changed from Transient to Scoped
            // services.AddScoped<OrganisationService>(); // Changed from Transient to Scoped
            // Changed from Transient to Scoped - moved to Authentication
            // services.AddScoped<Authentication.Services.AuthService>(); // Authentication service
            //services.AddScoped<ReferenceTypeService>(); // Changed from Transient to Scoped
            // services.AddScoped<ReferenceValueService>();
            // services.AddScoped<OrganisationServicesService>();
            // services.AddScoped<OrganisationServiceTimingService>();
            // services.AddScoped<AppoinmentService>();
            // services.AddScoped<StaffService>();
            // services.AddScoped<TimelineService>();
            // services.AddScoped<PaymentService>();
            // services.AddScoped<LeaveDatesService>();
            // services.AddScoped<OrganisationSiteService>();
            //services.AddScoped<QRCoderService>();
            // services.AddScoped<AdminService>();
            // services.AddScoped<AppointmentRecordService>();
            // services.AddScoped<EventService>();
            // services.AddScoped<EventBookingService>();
            // services.AddScoped<ReviewService>();
            // services.AddScoped<PaymentGatewayCredentialsService>();
            // services.AddScoped<ApplicationSettingsService>();
            // services.AddScoped<WebsiteService>();
            // services.AddScoped<EnquiryService>();
            //        services.AddScoped<OrganisationServiceTimingService>();

            // Krios Services
            services.AddScoped<Krios.Services.Krios.EmailService>();
            services.AddScoped<Krios.Services.Krios.StudentService>();
            services.AddScoped<Krios.Services.Krios.StaffService>();
            services.AddScoped<Krios.Services.Krios.ClassService>();
            services.AddScoped<Krios.Services.Krios.SubjectService>();
            services.AddScoped<Krios.Services.Krios.TermService>();
            services.AddScoped<Krios.Services.Krios.AssessmentService>();
            services.AddScoped<Krios.Services.Krios.GradeService>();
            services.AddScoped<Krios.Services.Krios.ClassConfigurationService>();
            services.AddScoped<Krios.Services.Krios.AttendanceService>();
            services.AddScoped<Krios.Services.Krios.FeeService>();
            services.AddScoped<Krios.Services.Krios.CertificateService>();
            services.AddScoped<Krios.Services.Krios.ReportService>();
            services.AddScoped<Krios.Services.Krios.SettingsService>();
            services.AddScoped<Krios.Services.Krios.DashboardService>();
            services.AddScoped<Krios.Services.Krios.OrganizationService>();
            services.AddScoped<Krios.Services.Krios.OrganizationRegistrationService>();
            services.AddScoped<Krios.Services.Krios.UserService>();
            services.AddScoped<Krios.Services.Krios.UserLoginService>();
            services.AddScoped<Krios.Services.Krios.ReferenceValueService>();
            services.AddScoped<Krios.Services.Krios.StaffScheduleService>();
            services.AddScoped<Krios.Services.Krios.GradePeriodService>();
            services.AddScoped<Krios.Services.Krios.StaffLeaveService>();
            services.AddScoped<Krios.Services.Krios.StaffReplacementService>();
            services.AddScoped<Krios.Services.Krios.StudentGradeService>();
            services.AddScoped<Krios.Services.Krios.DocumentRequirementStudentService>();
            services.AddScoped<Krios.Services.Krios.StudentPromotionService>();
            services.AddScoped<Krios.Services.Krios.StudentEnrollmentService>();
            services.AddScoped<Krios.Services.Krios.PageService>();

        }
    }
}
