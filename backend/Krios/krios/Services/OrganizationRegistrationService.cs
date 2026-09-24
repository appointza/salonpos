using System.Text.RegularExpressions;
using Krios.Models.Krios;
using Krios.Utils;

namespace Krios.Services.Krios
{
    public class OrganizationRegistrationService
    {
        private readonly IDbProvider dbprovider;
        private readonly CustomCryptography cryptography;

        public OrganizationRegistrationService(IDbProvider dbprovider, CustomCryptography cryptography)
        {
            this.dbprovider = dbprovider;
            this.cryptography = cryptography;
        }

        public async Task<OrganizationRegistrationRes> Register(OrganizationRegistrationReq req)
        {
            ValidateReq(req);

            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await db.BeginTransaction();

            try
            {
                if (await EmailExists(db, req.adminEmail))
                    throw new AppException(AppException.ErrorCodes.UsersDuplicate, "Admin email already registered.");

                string slugBase = NormalizeSlug(req.organizationName);
                string slug = await EnsureUniqueSlug(db, slugBase);

                long orgId = await InsertOrganization(db, req, slug);
                long locationId = await InsertLocation(db, req, orgId);
                await InsertMainFranchise(db, req, orgId, locationId);
                await SeedDefaultRoles(db, req, orgId);
                await SeedDefaultLoyalty(db, req, orgId);
                long userId = await InsertAdminUser(db, req, orgId, locationId);

                await db.CommitTransaction();

                return new OrganizationRegistrationRes
                {
                    organizationId = orgId,
                    adminUserId = userId,
                    locationId = locationId,
                    slug = slug,
                };
            }
            catch
            {
                await db.RollbackTransaction();
                throw;
            }
        }

        private static void ValidateReq(OrganizationRegistrationReq req)
        {
            if (string.IsNullOrWhiteSpace(req.organizationName))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Organization name is required.");
            if (string.IsNullOrWhiteSpace(req.adminName))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Admin name is required.");
            if (string.IsNullOrWhiteSpace(req.adminEmail))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Admin email is required.");
            if (string.IsNullOrWhiteSpace(req.adminPassword))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Admin password is required.");
        }

        private static string NormalizeSlug(string name)
        {
            var slug = Regex.Replace(name.ToLowerInvariant(), @"[^a-z0-9]+", "-").Trim('-');
            return string.IsNullOrWhiteSpace(slug) ? "salon" : slug;
        }

        private async Task<string> EnsureUniqueSlug(IDb db, string slugBase)
        {
            string slug = slugBase;
            int attempt = 1;
            while (await SlugExists(db, slug))
            {
                attempt += 1;
                slug = $"{slugBase}-{attempt}";
            }
            return slug;
        }

        private static async Task<bool> SlugExists(IDb db, string slug)
        {
            const string query = @"SELECT 1 FROM organizations WHERE slug = @slug AND status <> 'Inactive' LIMIT 1";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "slug", DbTypes.Types.String).Value = slug;
            using var reader = await db.Execute(cmd);
            return await reader.ReadAsync();
        }

        private static async Task<bool> EmailExists(IDb db, string email)
        {
            const string query = @"SELECT 1 FROM users WHERE lower(email) = lower(@email) AND status <> 'Inactive' LIMIT 1";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = email;
            using var reader = await db.Execute(cmd);
            return await reader.ReadAsync();
        }

        private async Task<long> InsertOrganization(IDb db, OrganizationRegistrationReq req, string slug)
        {
            const string query = @"
                INSERT INTO organizations (
                    ""orgId"", ""locationId"", name, slug, domain, website,
                    ""businessType"", ""brandColor"", status,
                    ""pointsPerRupee"", ""rupeesPerPoint"", ""earnUnitRupees"", ""pointsPerUnit"", ""loyaltyMinSpend"",
                    ""publicBookingShowPrizeWheel"", ""publicBookingShowScratchCard"",
                    createdby, createdon, updatedby, updatedon
                )
                VALUES (
                    0, 0, @name, @slug, @domain, @website,
                    @businessType, @brandColor, @status,
                    @pointsPerRupee, @rupeesPerPoint, @earnUnitRupees, @pointsPerUnit, @loyaltyMinSpend,
                    @publicBookingShowPrizeWheel, @publicBookingShowScratchCard,
                    @createdby, @createdon, @updatedby, @updatedon
                )
                RETURNING id;
            ";

            var today = DateTime.UtcNow.Date;
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = req.organizationName.Trim();
            db.AddParameter(cmd, "slug", DbTypes.Types.String).Value = slug;
            db.AddParameter(cmd, "domain", DbTypes.Types.String).Value = req.domain?.Trim() ?? "";
            db.AddParameter(cmd, "website", DbTypes.Types.String).Value = req.website?.Trim() ?? "";
            db.AddParameter(cmd, "businessType", DbTypes.Types.String).Value = req.businessType?.Trim() ?? "Salon & Spa";
            db.AddParameter(cmd, "brandColor", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(req.brandColor) ? "#2f5bff" : req.brandColor.Trim();
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = "Active";
            db.AddParameter(cmd, "pointsPerRupee", DbTypes.Types.Decimal).Value = 1;
            db.AddParameter(cmd, "rupeesPerPoint", DbTypes.Types.Decimal).Value = 1;
            db.AddParameter(cmd, "earnUnitRupees", DbTypes.Types.Decimal).Value = 100;
            db.AddParameter(cmd, "pointsPerUnit", DbTypes.Types.Decimal).Value = 1;
            db.AddParameter(cmd, "loyaltyMinSpend", DbTypes.Types.Decimal).Value = 500;
            db.AddParameter(cmd, "publicBookingShowPrizeWheel", DbTypes.Types.String).Value = "Yes";
            db.AddParameter(cmd, "publicBookingShowScratchCard", DbTypes.Types.String).Value = "Yes";
            db.AddParameter(cmd, "createdby", DbTypes.Types.String).Value = req.adminEmail.Trim();
            db.AddParameter(cmd, "createdon", DbTypes.Types.Date).Value = today;
            db.AddParameter(cmd, "updatedby", DbTypes.Types.String).Value = req.adminEmail.Trim();
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = today;

            long orgId;
            using (var reader = await db.Execute(cmd))
            {
                if (!await reader.ReadAsync())
                    throw new AppException(AppException.ErrorCodes.BadRequest, "Could not create organization.");
                orgId = Convert.ToInt64(reader["id"]);
            }

            var sync = db.GetCommand(@"UPDATE organizations SET ""orgId"" = @orgId WHERE id = @id");
            db.AddParameter(sync, "orgId", DbTypes.Types.Long).Value = orgId;
            db.AddParameter(sync, "id", DbTypes.Types.Long).Value = orgId;
            await db.ExecuteNonQuery(sync);
            return orgId;
        }

        private static string MainOutletName(OrganizationRegistrationReq req)
        {
            if (!string.IsNullOrWhiteSpace(req.outletName))
                return req.outletName.Trim();
            return req.organizationName.Trim();
        }

        private async Task<long> InsertLocation(IDb db, OrganizationRegistrationReq req, long orgId)
        {
            var outletName = MainOutletName(req);
            const string query = @"
                INSERT INTO locations (
                    ""orgId"", ""locationId"", name, code, city, address, phone, email, timezone, status,
                    lat, lng, ""placeId"", ""googleRating"", ""googleReviewCount"", ""googleSyncedAt"",
                    ""googleMapsUrl"", ""googleSyncSource"",
                    createdby, createdon, updatedby, updatedon
                )
                VALUES (
                    @orgId, 0, @name, @code, @city, @address, @phone, @email, @timezone, @status,
                    0, 0, '', 0, 0, '',
                    '', '',
                    @createdby, @createdon, @updatedby, @updatedon
                )
                RETURNING id;
            ";

            var today = DateTime.UtcNow.Date;
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = orgId;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = outletName;
            db.AddParameter(cmd, "code", DbTypes.Types.String).Value = "MAIN";
            db.AddParameter(cmd, "city", DbTypes.Types.String).Value = req.city?.Trim() ?? "";
            db.AddParameter(cmd, "address", DbTypes.Types.String).Value = req.address?.Trim() ?? "";
            db.AddParameter(cmd, "phone", DbTypes.Types.String).Value = req.phone?.Trim() ?? "";
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = req.adminEmail.Trim();
            db.AddParameter(cmd, "timezone", DbTypes.Types.String).Value = "Asia/Kolkata";
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = "Active";
            db.AddParameter(cmd, "createdby", DbTypes.Types.String).Value = req.adminEmail.Trim();
            db.AddParameter(cmd, "createdon", DbTypes.Types.Date).Value = today;
            db.AddParameter(cmd, "updatedby", DbTypes.Types.String).Value = req.adminEmail.Trim();
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = today;

            long locationId;
            using (var reader = await db.Execute(cmd))
            {
                if (!await reader.ReadAsync())
                    throw new AppException(AppException.ErrorCodes.BadRequest, "Could not create the first outlet.");
                locationId = Convert.ToInt64(reader["id"]);
            }

            var sync = db.GetCommand(@"UPDATE locations SET ""locationId"" = @locationId WHERE id = @id");
            db.AddParameter(sync, "locationId", DbTypes.Types.Long).Value = locationId;
            db.AddParameter(sync, "id", DbTypes.Types.Long).Value = locationId;
            await db.ExecuteNonQuery(sync);
            return locationId;
        }

        private const string StaffPaths =
            "/dashboard,/front-desk,/customers,/appointments,/pos,/walk-in,/services,/feedback,/memberships,/loyalty,/offers,/coupons,/prize-wheel,/scratch-card,/campaigns,/inventory,/vendors,/reports,/setup";

        private const string StylistPaths =
            "/dashboard,/front-desk,/appointments,/customers,/services,/feedback,/shifts,/attendance,/leaves,/commissions";

        private const string ReceptionistPaths =
            "/dashboard,/front-desk,/customers,/appointments,/pos,/walk-in,/services,/feedback";

        private async Task SeedDefaultRoles(IDb db, OrganizationRegistrationReq req, long orgId)
        {
            var today = DateTime.UtcNow.Date;
            var actor = req.adminEmail.Trim();
            var defaults = new (string name, string code, string description, string view, string edit)[]
            {
                ("Owner", "ADMIN", "Full access to all screens and settings.", "all", "all"),
                ("Outlet Manager", "STAFF", "Run day-to-day outlet operations.", StaffPaths, StaffPaths),
                ("Stylist", "STYLIST", "Own schedule, appointments and clients.", StylistPaths, StylistPaths),
                ("Receptionist", "STAFF", "Front desk, bookings and walk-ins.", ReceptionistPaths, ReceptionistPaths),
            };

            foreach (var role in defaults)
                await InsertRole(db, orgId, actor, today, role.name, role.code, role.description, role.view, role.edit);
        }

        private static async Task InsertRole(
            IDb db,
            long orgId,
            string actor,
            DateTime today,
            string name,
            string code,
            string description,
            string view,
            string edit)
        {
            const string query = @"
                INSERT INTO roles (
                    ""orgId"", ""locationId"", name, code, description, ""builtIn"", view, edit, status,
                    createdby, createdon, updatedby, updatedon
                )
                VALUES (
                    @orgId, 0, @name, @code, @description, @builtIn, @view, @edit, @status,
                    @createdby, @createdon, @updatedby, @updatedon
                );
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = orgId;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = name;
            db.AddParameter(cmd, "code", DbTypes.Types.String).Value = code;
            db.AddParameter(cmd, "description", DbTypes.Types.String).Value = description;
            db.AddParameter(cmd, "builtIn", DbTypes.Types.String).Value = "Yes";
            db.AddParameter(cmd, "view", DbTypes.Types.String).Value = view;
            db.AddParameter(cmd, "edit", DbTypes.Types.String).Value = edit;
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = "Active";
            db.AddParameter(cmd, "createdby", DbTypes.Types.String).Value = actor;
            db.AddParameter(cmd, "createdon", DbTypes.Types.Date).Value = today;
            db.AddParameter(cmd, "updatedby", DbTypes.Types.String).Value = actor;
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = today;
            await db.ExecuteNonQuery(cmd);
        }

        private async Task SeedDefaultLoyalty(IDb db, OrganizationRegistrationReq req, long orgId)
        {
            var today = DateTime.UtcNow.Date;
            var actor = req.adminEmail.Trim();
            const string query = @"
                INSERT INTO loyalty (
                    ""orgId"", ""locationId"", name, type, ""earnRate"", ""redeemValue"", tier, ""minSpend"", ""expiryMonths"",
                    ""qrEnabled"", status, createdby, createdon, updatedby, updatedon,
                    ""earnUnitRupees"", ""pointsPerUnit"", ""rupeesPerPoint"", ""rewardDescription"", ""stampsRequired"", ""spinsAllowed"", ""requiresCheckIn""
                )
                VALUES (
                    @orgId, 0, @name, @type, @earnRate, @redeemValue, @tier, @minSpend, @expiryMonths,
                    @qrEnabled, @status, @createdby, @createdon, @updatedby, @updatedon,
                    @earnUnitRupees, @pointsPerUnit, @rupeesPerPoint, @rewardDescription, @stampsRequired, @spinsAllowed, @requiresCheckIn
                );
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = orgId;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = "Points program";
            db.AddParameter(cmd, "type", DbTypes.Types.String).Value = "Points";
            db.AddParameter(cmd, "earnRate", DbTypes.Types.String).Value = "1 pt / ₹100";
            db.AddParameter(cmd, "redeemValue", DbTypes.Types.String).Value = "1 pt = ₹1";
            db.AddParameter(cmd, "tier", DbTypes.Types.String).Value = "All";
            db.AddParameter(cmd, "minSpend", DbTypes.Types.Decimal).Value = 500;
            db.AddParameter(cmd, "expiryMonths", DbTypes.Types.Long).Value = 12;
            db.AddParameter(cmd, "qrEnabled", DbTypes.Types.String).Value = "No";
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = "Active";
            db.AddParameter(cmd, "earnUnitRupees", DbTypes.Types.Decimal).Value = 100;
            db.AddParameter(cmd, "pointsPerUnit", DbTypes.Types.Decimal).Value = 1;
            db.AddParameter(cmd, "rupeesPerPoint", DbTypes.Types.Decimal).Value = 1;
            db.AddParameter(cmd, "rewardDescription", DbTypes.Types.String).Value = "Earn on every POS bill";
            db.AddParameter(cmd, "stampsRequired", DbTypes.Types.Long).Value = 0;
            db.AddParameter(cmd, "spinsAllowed", DbTypes.Types.String).Value = "";
            db.AddParameter(cmd, "requiresCheckIn", DbTypes.Types.String).Value = "";
            db.AddParameter(cmd, "createdby", DbTypes.Types.String).Value = actor;
            db.AddParameter(cmd, "createdon", DbTypes.Types.Date).Value = today;
            db.AddParameter(cmd, "updatedby", DbTypes.Types.String).Value = actor;
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = today;
            await db.ExecuteNonQuery(cmd);
        }

        private async Task InsertMainFranchise(IDb db, OrganizationRegistrationReq req, long orgId, long locationId)
        {
            var outletName = MainOutletName(req);
            const string query = @"
                INSERT INTO franchises (
                    ""orgId"", ""locationId"", name, type, city, owner, phone, gstin, royalty, ""goLive"", status,
                    createdby, createdon, updatedby, updatedon
                )
                VALUES (
                    @orgId, @locationId, @name, @type, @city, @owner, @phone, @gstin, @royalty, @goLive, @status,
                    @createdby, @createdon, @updatedby, @updatedon
                );
            ";

            var today = DateTime.UtcNow.Date;
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = locationId;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = outletName;
            db.AddParameter(cmd, "type", DbTypes.Types.String).Value = "Company Owned";
            db.AddParameter(cmd, "city", DbTypes.Types.String).Value = req.city?.Trim() ?? "";
            db.AddParameter(cmd, "owner", DbTypes.Types.String).Value = req.adminName.Trim();
            db.AddParameter(cmd, "phone", DbTypes.Types.String).Value = req.phone?.Trim() ?? "";
            db.AddParameter(cmd, "gstin", DbTypes.Types.String).Value = "";
            db.AddParameter(cmd, "royalty", DbTypes.Types.Decimal).Value = 0;
            db.AddParameter(cmd, "goLive", DbTypes.Types.Date).Value = today;
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = "Active";
            db.AddParameter(cmd, "createdby", DbTypes.Types.String).Value = req.adminEmail.Trim();
            db.AddParameter(cmd, "createdon", DbTypes.Types.Date).Value = today;
            db.AddParameter(cmd, "updatedby", DbTypes.Types.String).Value = req.adminEmail.Trim();
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = today;
            await db.ExecuteNonQuery(cmd);
        }

        private async Task<long> InsertAdminUser(IDb db, OrganizationRegistrationReq req, long orgId, long locationId)
        {
            const string query = @"
                INSERT INTO users (
                    ""orgId"", ""locationId"", name, email, role, outlet, permissions,
                    ""lastLogin"", status, passwordhash,
                    createdby, createdon, updatedby, updatedon
                )
                VALUES (
                    @orgId, @locationId, @name, @email, @role, @outlet, @permissions,
                    @lastLogin, @status, @passwordhash,
                    @createdby, @createdon, @updatedby, @updatedon
                )
                RETURNING id;
            ";

            var today = DateTime.UtcNow.Date;
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = locationId;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = req.adminName.Trim();
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = req.adminEmail.Trim();
            db.AddParameter(cmd, "role", DbTypes.Types.String).Value = "ADMIN";
            db.AddParameter(cmd, "outlet", DbTypes.Types.String).Value = MainOutletName(req);
            db.AddParameter(cmd, "permissions", DbTypes.Types.String).Value = "";
            db.AddParameter(cmd, "lastLogin", DbTypes.Types.String).Value = "";
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = "Active";
            db.AddParameter(cmd, "passwordhash", DbTypes.Types.String).Value = cryptography.CalculateSHA256Hash(req.adminPassword);
            db.AddParameter(cmd, "createdby", DbTypes.Types.String).Value = req.adminEmail.Trim();
            db.AddParameter(cmd, "createdon", DbTypes.Types.Date).Value = today;
            db.AddParameter(cmd, "updatedby", DbTypes.Types.String).Value = req.adminEmail.Trim();
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = today;

            using var reader = await db.Execute(cmd);
            if (!await reader.ReadAsync())
                throw new AppException(AppException.ErrorCodes.BadRequest, "Could not create admin user.");
            return Convert.ToInt64(reader["id"]);
        }
    }
}
