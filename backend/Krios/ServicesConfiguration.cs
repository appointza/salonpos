using Krios.Utils;

namespace Krios
{
    public static class ServicesConfiguration
    {
        public static void AddCustomServices(this IServiceCollection services)
        {
            services.AddSingleton<IQueryBuilderProvider, QueryBuilderProvider>();
            services.AddTransient<CustomCryptography>();

            services.AddScoped<Krios.Services.Krios.OrganizationService>();
            services.AddScoped<Krios.Services.Krios.OrganizationRegistrationService>();
            services.AddScoped<Krios.Services.Krios.UserService>();
            services.AddScoped<Krios.Services.Krios.UserLoginService>();
            services.AddScoped<Krios.Services.Krios.LocationService>();
            services.AddScoped<Krios.Services.Krios.CustomerService>();
            services.AddScoped<Krios.Services.Krios.AppointmentService>();
            services.AddScoped<Krios.Services.Krios.InvoiceService>();
            services.AddScoped<Krios.Services.Krios.ServiceService>();
            services.AddScoped<Krios.Services.Krios.InventoryService>();
            services.AddScoped<Krios.Services.Krios.InventoryStockService>();
            services.AddScoped<Krios.Services.Krios.ExpenseService>();
            services.AddScoped<Krios.Services.Krios.StaffService>();
            services.AddScoped<Krios.Services.Krios.ShiftService>();
            services.AddScoped<Krios.Services.Krios.AttendanceService>();
            services.AddScoped<Krios.Services.Krios.LeaveService>();
            services.AddScoped<Krios.Services.Krios.PayrollService>();
            services.AddScoped<Krios.Services.Krios.CommissionService>();
            services.AddScoped<Krios.Services.Krios.FeedbackService>();
            services.AddScoped<Krios.Services.Krios.GoogleReviewService>();
            services.AddScoped<Krios.Services.Krios.LoyaltyService>();
            services.AddScoped<Krios.Services.Krios.WheelSegmentService>();
            services.AddScoped<Krios.Services.Krios.WheelSpinService>();
            services.AddScoped<Krios.Services.Krios.ScratchPrizeService>();
            services.AddScoped<Krios.Services.Krios.ScratchPlayService>();
            services.AddScoped<Krios.Services.Krios.QrCheckinService>();
            services.AddScoped<Krios.Services.Krios.QrOfferService>();
            services.AddScoped<Krios.Services.Krios.PartnershipService>();
            services.AddScoped<Krios.Services.Krios.QrOfferRedemptionService>();
            services.AddScoped<Krios.Services.Krios.PartnerCouponService>();
            services.AddScoped<Krios.Services.Krios.MembershipService>();
            services.AddScoped<Krios.Services.Krios.CampaignService>();
            services.AddScoped<Krios.Services.Krios.FranchiseService>();
            services.AddScoped<Krios.Services.Krios.BrandAppService>();
            services.AddScoped<Krios.Services.Krios.RoleService>();
            services.AddScoped<Krios.Services.Krios.ReferenceValueService>();
            services.AddScoped<Krios.Services.Krios.MembershipPlanService>();
            services.AddScoped<Krios.Services.Krios.LoyaltyTransactionService>();
            services.AddScoped<Krios.Services.Krios.MembershipUsageService>();
            services.AddScoped<Krios.Services.Krios.StockMovementService>();
            services.AddScoped<Krios.Services.Krios.ServiceProductService>();
            services.AddScoped<Krios.Services.Krios.CouponService>();
            services.AddScoped<Krios.Services.Krios.VoucherService>();
            services.AddScoped<Krios.Services.Krios.VendorService>();
        }
    }
}

