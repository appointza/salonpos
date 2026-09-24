using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;
using DbCommand = System.Data.Common.DbCommand;

namespace Krios.Services.Krios
{
    public class OrganizationService
    {
        private readonly IDbProvider dbprovider;
        private readonly IQueryBuilderProvider querybuilderprovider;
        private readonly RequestState requeststate;

        public OrganizationService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<Organization>> Select(OrganizationSelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await SelectTransaction(db, req);
        }

        public async Task<List<Organization>> SelectTransaction(IDb db, OrganizationSelectReq req)
        {
            const string query = @"
                SELECT
                    id, ""orgId"", ""locationId"", name, slug, domain, website,
                    ""businessType"", ""brandColor"", ""pointsPerRupee"", ""rupeesPerPoint"",
                    ""whatsappPhoneNumberId"", ""whatsappBusinessAccountId"", ""whatsappDisplayNumber"",
                    ""whatsappApiKey"", ""whatsappWebhookToken"", ""whatsappApiVersion"", ""whatsappConnected"",
                    status, createdby, createdon, updatedby, updatedon,
                    ""earnUnitRupees"", ""pointsPerUnit"", ""loyaltyMinSpend"",
                    ""rewardWheelWeights"", ""rewardScratchWeights"", ""rewardCustomerTierWeights"",
                    ""publicBookingShowPrizeWheel"", ""publicBookingShowScratchCard""
                FROM organizations
            ";

            var qb = querybuilderprovider.GetQueryBuilder(query);

            if (req.id > 0)
                qb.AddParameter("id", "=", "id", req.id, DbTypes.Types.Long);
            if (req.orgId > 0)
                qb.AddParameter(@"""orgId""", "=", "orgId", req.orgId, DbTypes.Types.Long);
            if (req.locationId > 0)
                qb.AddParameter(@"""locationId""", "=", "locationId", req.locationId, DbTypes.Types.Long);
            if (!string.IsNullOrWhiteSpace(req.slug))
                qb.AddParameter("slug", "=", "slug", req.slug, DbTypes.Types.String);
            if (!string.IsNullOrWhiteSpace(req.status))
                qb.AddParameter("status", "=", "status", req.status, DbTypes.Types.String);
            else
                qb.AddParameter("status", "<>", "status", "Inactive", DbTypes.Types.String);

            if (!string.IsNullOrWhiteSpace(req.search))
            {
                qb.AddParameter("name", "ILIKE", "name", $"%{req.search}%", DbTypes.Types.String);
            }

            qb.AddOrderBy(QueryBuilder.Order.ASC, "id");
            var command = qb.GetCommand(db);

            var result = new List<Organization>();
            using DbDataReader reader = await db.Execute(command);
            while (await reader.ReadAsync())
                result.Add(MapOrganization(reader));

            return result;
        }

        public async Task<Organization> Insert(Organization org)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await InsertTransaction(db, org);
            return org;
        }

        public async Task InsertTransaction(IDb db, Organization org)
        {
            const string query = @"
                INSERT INTO organizations (
                    ""orgId"", ""locationId"", name, slug, domain, website,
                    ""businessType"", ""brandColor"", ""pointsPerRupee"", ""rupeesPerPoint"",
                    ""whatsappPhoneNumberId"", ""whatsappBusinessAccountId"", ""whatsappDisplayNumber"",
                    ""whatsappApiKey"", ""whatsappWebhookToken"", ""whatsappApiVersion"", ""whatsappConnected"",
                    status, createdby, createdon, updatedby, updatedon,
                    ""earnUnitRupees"", ""pointsPerUnit"", ""loyaltyMinSpend"",
                    ""rewardWheelWeights"", ""rewardScratchWeights"", ""rewardCustomerTierWeights"",
                    ""publicBookingShowPrizeWheel"", ""publicBookingShowScratchCard""
                )
                VALUES (
                    @orgId, @locationId, @name, @slug, @domain, @website,
                    @businessType, @brandColor, @pointsPerRupee, @rupeesPerPoint,
                    @whatsappPhoneNumberId, @whatsappBusinessAccountId, @whatsappDisplayNumber,
                    @whatsappApiKey, @whatsappWebhookToken, @whatsappApiVersion, @whatsappConnected,
                    @status, @createdby, @createdon, @updatedby, @updatedon,
                    @earnUnitRupees, @pointsPerUnit, @loyaltyMinSpend,
                    @rewardWheelWeights, @rewardScratchWeights, @rewardCustomerTierWeights,
                    @publicBookingShowPrizeWheel, @publicBookingShowScratchCard
                )
                RETURNING id;
            ";

            var today = DateTime.UtcNow.Date;
            var actor = requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : "system";
            org.status = string.IsNullOrWhiteSpace(org.status) ? "Active" : org.status;
            org.createdon = today;
            org.updatedon = today;
            org.createdby = actor;
            org.updatedby = actor;

            var cmd = db.GetCommand(query);
            BindOrganizationParameters(cmd, db, org, includeId: false);

            using var reader = await db.Execute(cmd);
            if (await reader.ReadAsync())
            {
                org.id = Convert.ToInt64(reader["id"]);
                if (org.orgId <= 0)
                    org.orgId = org.id;
            }

            if (org.orgId <= 0)
            {
                var sync = db.GetCommand(@"UPDATE organizations SET ""orgId"" = @orgId WHERE id = @id");
                db.AddParameter(sync, "orgId", DbTypes.Types.Long).Value = org.id;
                db.AddParameter(sync, "id", DbTypes.Types.Long).Value = org.id;
                await db.ExecuteNonQuery(sync);
                org.orgId = org.id;
            }
        }

        public async Task<Organization> Update(Organization org)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UpdateTransaction(db, org);
            return org;
        }

        public async Task UpdateTransaction(IDb db, Organization org)
        {
            const string query = @"
                UPDATE organizations SET
                    ""orgId"" = @orgId,
                    ""locationId"" = @locationId,
                    name = @name,
                    slug = @slug,
                    domain = @domain,
                    website = @website,
                    ""businessType"" = @businessType,
                    ""brandColor"" = @brandColor,
                    ""pointsPerRupee"" = @pointsPerRupee,
                    ""rupeesPerPoint"" = @rupeesPerPoint,
                    ""whatsappPhoneNumberId"" = @whatsappPhoneNumberId,
                    ""whatsappBusinessAccountId"" = @whatsappBusinessAccountId,
                    ""whatsappDisplayNumber"" = @whatsappDisplayNumber,
                    ""whatsappApiKey"" = @whatsappApiKey,
                    ""whatsappWebhookToken"" = @whatsappWebhookToken,
                    ""whatsappApiVersion"" = @whatsappApiVersion,
                    ""whatsappConnected"" = @whatsappConnected,
                    status = @status,
                    updatedby = @updatedby,
                    updatedon = @updatedon,
                    ""earnUnitRupees"" = @earnUnitRupees,
                    ""pointsPerUnit"" = @pointsPerUnit,
                    ""loyaltyMinSpend"" = @loyaltyMinSpend,
                    ""rewardWheelWeights"" = @rewardWheelWeights,
                    ""rewardScratchWeights"" = @rewardScratchWeights,
                    ""rewardCustomerTierWeights"" = @rewardCustomerTierWeights,
                    ""publicBookingShowPrizeWheel"" = @publicBookingShowPrizeWheel,
                    ""publicBookingShowScratchCard"" = @publicBookingShowScratchCard
                WHERE id = @id
            ";

            org.updatedon = DateTime.UtcNow.Date;
            org.updatedby = requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : org.updatedby;

            var cmd = db.GetCommand(query);
            BindOrganizationParameters(cmd, db, org, includeId: true);
            await db.ExecuteNonQuery(cmd);
        }

        public async Task<bool> Delete(OrganizationDeleteReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await DeleteTransaction(db, req);
        }

        public async Task<bool> DeleteTransaction(IDb db, OrganizationDeleteReq req)
        {
            const string query = @"
                UPDATE organizations
                SET status = 'Inactive',
                    updatedby = @updatedby,
                    updatedon = @updatedon
                WHERE id = @id
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = req.id;
            db.AddParameter(cmd, "updatedby", DbTypes.Types.String).Value =
                requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : "system";
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = DateTime.UtcNow.Date;
            return await db.ExecuteNonQuery(cmd) > 0;
        }

        private static Organization MapOrganization(DbDataReader reader)
        {
            return new Organization
            {
                id = ReadLong(reader, "id"),
                orgId = ReadLong(reader, "orgId"),
                locationId = ReadLong(reader, "locationId"),
                name = reader["name"]?.ToString() ?? "",
                slug = reader["slug"]?.ToString() ?? "",
                domain = reader["domain"]?.ToString() ?? "",
                website = reader["website"]?.ToString() ?? "",
                businessType = reader["businessType"]?.ToString() ?? "",
                brandColor = reader["brandColor"]?.ToString() ?? "",
                pointsPerRupee = ReadDecimal(reader, "pointsPerRupee"),
                rupeesPerPoint = ReadDecimal(reader, "rupeesPerPoint"),
                whatsappPhoneNumberId = reader["whatsappPhoneNumberId"]?.ToString() ?? "",
                whatsappBusinessAccountId = reader["whatsappBusinessAccountId"]?.ToString() ?? "",
                whatsappDisplayNumber = reader["whatsappDisplayNumber"]?.ToString() ?? "",
                whatsappApiKey = reader["whatsappApiKey"]?.ToString() ?? "",
                whatsappWebhookToken = reader["whatsappWebhookToken"]?.ToString() ?? "",
                whatsappApiVersion = reader["whatsappApiVersion"]?.ToString() ?? "",
                whatsappConnected = reader["whatsappConnected"]?.ToString() ?? "",
                status = reader["status"]?.ToString() ?? "",
                createdby = reader["createdby"]?.ToString() ?? "",
                createdon = ReadDate(reader, "createdon"),
                updatedby = reader["updatedby"]?.ToString() ?? "",
                updatedon = ReadDate(reader, "updatedon"),
                earnUnitRupees = ReadDecimal(reader, "earnUnitRupees"),
                pointsPerUnit = ReadDecimal(reader, "pointsPerUnit"),
                loyaltyMinSpend = ReadDecimal(reader, "loyaltyMinSpend"),
                rewardWheelWeights = reader["rewardWheelWeights"]?.ToString() ?? "",
                rewardScratchWeights = reader["rewardScratchWeights"]?.ToString() ?? "",
                rewardCustomerTierWeights = reader["rewardCustomerTierWeights"]?.ToString() ?? "",
                publicBookingShowPrizeWheel = reader["publicBookingShowPrizeWheel"]?.ToString() ?? "",
                publicBookingShowScratchCard = reader["publicBookingShowScratchCard"]?.ToString() ?? "",
            };
        }

        private static void BindOrganizationParameters(DbCommand cmd, IDb db, Organization org, bool includeId)
        {
            if (includeId)
                db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = org.id;

            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = org.orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = org.locationId;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = org.name ?? "";
            db.AddParameter(cmd, "slug", DbTypes.Types.String).Value = org.slug ?? "";
            db.AddParameter(cmd, "domain", DbTypes.Types.String).Value = org.domain ?? "";
            db.AddParameter(cmd, "website", DbTypes.Types.String).Value = org.website ?? "";
            db.AddParameter(cmd, "businessType", DbTypes.Types.String).Value = org.businessType ?? "";
            db.AddParameter(cmd, "brandColor", DbTypes.Types.String).Value = org.brandColor ?? "";
            db.AddParameter(cmd, "pointsPerRupee", DbTypes.Types.Decimal).Value = org.pointsPerRupee;
            db.AddParameter(cmd, "rupeesPerPoint", DbTypes.Types.Decimal).Value = org.rupeesPerPoint;
            db.AddParameter(cmd, "whatsappPhoneNumberId", DbTypes.Types.String).Value = org.whatsappPhoneNumberId ?? "";
            db.AddParameter(cmd, "whatsappBusinessAccountId", DbTypes.Types.String).Value = org.whatsappBusinessAccountId ?? "";
            db.AddParameter(cmd, "whatsappDisplayNumber", DbTypes.Types.String).Value = org.whatsappDisplayNumber ?? "";
            db.AddParameter(cmd, "whatsappApiKey", DbTypes.Types.String).Value = org.whatsappApiKey ?? "";
            db.AddParameter(cmd, "whatsappWebhookToken", DbTypes.Types.String).Value = org.whatsappWebhookToken ?? "";
            db.AddParameter(cmd, "whatsappApiVersion", DbTypes.Types.String).Value = org.whatsappApiVersion ?? "";
            db.AddParameter(cmd, "whatsappConnected", DbTypes.Types.String).Value = org.whatsappConnected ?? "";
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = org.status ?? "";
            db.AddParameter(cmd, "createdby", DbTypes.Types.String).Value = org.createdby ?? "";
            db.AddParameter(cmd, "createdon", DbTypes.Types.Date).Value = org.createdon ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "updatedby", DbTypes.Types.String).Value = org.updatedby ?? "";
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = org.updatedon ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "earnUnitRupees", DbTypes.Types.Decimal).Value = org.earnUnitRupees;
            db.AddParameter(cmd, "pointsPerUnit", DbTypes.Types.Decimal).Value = org.pointsPerUnit;
            db.AddParameter(cmd, "loyaltyMinSpend", DbTypes.Types.Decimal).Value = org.loyaltyMinSpend;
            db.AddParameter(cmd, "rewardWheelWeights", DbTypes.Types.String).Value = org.rewardWheelWeights ?? "";
            db.AddParameter(cmd, "rewardScratchWeights", DbTypes.Types.String).Value = org.rewardScratchWeights ?? "";
            db.AddParameter(cmd, "rewardCustomerTierWeights", DbTypes.Types.String).Value = org.rewardCustomerTierWeights ?? "";
            db.AddParameter(cmd, "publicBookingShowPrizeWheel", DbTypes.Types.String).Value = org.publicBookingShowPrizeWheel ?? "";
            db.AddParameter(cmd, "publicBookingShowScratchCard", DbTypes.Types.String).Value = org.publicBookingShowScratchCard ?? "";
        }

        private static long ReadLong(DbDataReader reader, string column)
        {
            var value = reader[column];
            return value == DBNull.Value ? 0 : Convert.ToInt64(value);
        }

        private static decimal ReadDecimal(DbDataReader reader, string column)
        {
            var value = reader[column];
            return value == DBNull.Value ? 0 : Convert.ToDecimal(value);
        }

        private static DateTime? ReadDate(DbDataReader reader, string column)
        {
            var value = reader[column];
            return value == DBNull.Value ? null : Convert.ToDateTime(value);
        }
    }
}
