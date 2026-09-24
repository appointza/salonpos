using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;

namespace Krios.Services.Krios
{
    public class LoyaltyService
    {
        private readonly IDbProvider dbprovider;
        private readonly IQueryBuilderProvider querybuilderprovider;
        private readonly RequestState requeststate;

        public LoyaltyService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<Loyalty>> Select(LoyaltySelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await SelectTransaction(db, req);
        }

        public async Task<List<Loyalty>> SelectTransaction(IDb db, LoyaltySelectReq req)
        {
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", name, type, ""earnRate"", ""redeemValue"", tier, ""minSpend"", ""expiryMonths"", ""qrEnabled"", status, createdby, createdon, updatedby, updatedon, ""earnUnitRupees"", ""pointsPerUnit"", ""rupeesPerPoint"", ""rewardDescription"", ""stampsRequired"", ""spinsAllowed"", ""requiresCheckIn""
                FROM loyalty
            ";

            var qb = querybuilderprovider.GetQueryBuilder(query);

            if (req.id > 0)
                qb.AddParameter("id", "=", "id", req.id, DbTypes.Types.Long);
            if (req.orgId > 0)
                qb.AddParameter(@"""orgId""", "=", "orgId", req.orgId, DbTypes.Types.Long);
            if (req.locationId > 0)
                qb.AddParameter(@"""locationId""", "=", "locationId", req.locationId, DbTypes.Types.Long);

            if (!string.IsNullOrWhiteSpace(req.status))
                qb.AddParameter("status", "=", "status", req.status, DbTypes.Types.String);
            else
                qb.AddParameter("status", "<>", "status", "Inactive", DbTypes.Types.String);
            if (!string.IsNullOrWhiteSpace(req.search))
                qb.AddParameter("name", "ILIKE", "search", "%" + req.search + "%", DbTypes.Types.String);
            qb.AddOrderBy(QueryBuilder.Order.ASC, "id");
            var command = qb.GetCommand(db);

            var result = new List<Loyalty>();
            using DbDataReader reader = await db.Execute(command);
            while (await reader.ReadAsync())
                result.Add(Map(reader));

            return result;
        }

        public async Task<Loyalty> Insert(Loyalty entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await InsertTransaction(db, entity);
            return entity;
        }

        public async Task InsertTransaction(IDb db, Loyalty entity)
        {
            const string query = @"
                INSERT INTO loyalty (
                    ""orgId"", ""locationId"", name, type, ""earnRate"", ""redeemValue"", tier, ""minSpend"", ""expiryMonths"", ""qrEnabled"", status, createdby, createdon, updatedby, updatedon, ""earnUnitRupees"", ""pointsPerUnit"", ""rupeesPerPoint"", ""rewardDescription"", ""stampsRequired"", ""spinsAllowed"", ""requiresCheckIn""
                )
                VALUES (
                    @orgId, @locationId, @name, @type, @earnRate, @redeemValue, @tier, @minSpend, @expiryMonths, @qrEnabled, @status, @createdby, @createdon, @updatedby, @updatedon, @earnUnitRupees, @pointsPerUnit, @rupeesPerPoint, @rewardDescription, @stampsRequired, @spinsAllowed, @requiresCheckIn
                )
                RETURNING id;
            ";

            var today = DateTime.UtcNow.Date;
            var actor = requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : "system";
            entity.status = string.IsNullOrWhiteSpace(entity.status) ? "Active" : entity.status;
            if (entity.createdon == null) entity.createdon = today;
            if (entity.updatedon == null) entity.updatedon = today;
            if (string.IsNullOrWhiteSpace(entity.createdby)) entity.createdby = actor;
            if (string.IsNullOrWhiteSpace(entity.updatedby)) entity.updatedby = actor;

            var cmd = db.GetCommand(query);
            Bind(cmd, db, entity, includeId: false);

            using var reader = await db.Execute(cmd);
            if (await reader.ReadAsync())
                entity.id = Convert.ToInt64(reader["id"]);
        }

        public async Task<Loyalty> Update(Loyalty entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UpdateTransaction(db, entity);
            return entity;
        }

        public async Task<bool> UpdateTransaction(IDb db, Loyalty entity)
        {
            const string query = @"
                UPDATE loyalty SET
                    ""orgId"" = @orgId,
                    ""locationId"" = @locationId,
                    name = @name,
                    type = @type,
                    ""earnRate"" = @earnRate,
                    ""redeemValue"" = @redeemValue,
                    tier = @tier,
                    ""minSpend"" = @minSpend,
                    ""expiryMonths"" = @expiryMonths,
                    ""qrEnabled"" = @qrEnabled,
                    status = @status,
                    createdby = @createdby,
                    createdon = @createdon,
                    updatedby = @updatedby,
                    updatedon = @updatedon,
                    ""earnUnitRupees"" = @earnUnitRupees,
                    ""pointsPerUnit"" = @pointsPerUnit,
                    ""rupeesPerPoint"" = @rupeesPerPoint,
                    ""rewardDescription"" = @rewardDescription,
                    ""stampsRequired"" = @stampsRequired,
                    ""spinsAllowed"" = @spinsAllowed,
                    ""requiresCheckIn"" = @requiresCheckIn
                WHERE id = @id
            ";

            
            entity.updatedon = DateTime.UtcNow.Date;
            entity.updatedby = requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : entity.updatedby;
            var cmd = db.GetCommand(query);
            Bind(cmd, db, entity, includeId: true);
            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(LoyaltyDeleteReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await DeleteTransaction(db, req);
        }

        public async Task<bool> DeleteTransaction(IDb db, LoyaltyDeleteReq req)
        {
            const string query = @"
                UPDATE loyalty
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

        private static Loyalty Map(DbDataReader reader)
        {
            return new Loyalty
            {
                id = ReadLong(reader, "id"),
                orgId = ReadLong(reader, "orgId"),
                locationId = ReadLong(reader, "locationId"),
                name = reader["name"]?.ToString() ?? "",
                type = reader["type"]?.ToString() ?? "",
                earnRate = reader["earnRate"]?.ToString() ?? "",
                redeemValue = reader["redeemValue"]?.ToString() ?? "",
                tier = reader["tier"]?.ToString() ?? "",
                minSpend = ReadDecimal(reader, "minSpend"),
                expiryMonths = ReadLong(reader, "expiryMonths"),
                qrEnabled = reader["qrEnabled"]?.ToString() ?? "",
                status = reader["status"]?.ToString() ?? "",
                createdby = reader["createdby"]?.ToString() ?? "",
                createdon = ReadDate(reader, "createdon"),
                updatedby = reader["updatedby"]?.ToString() ?? "",
                updatedon = ReadDate(reader, "updatedon"),
                earnUnitRupees = ReadDecimal(reader, "earnUnitRupees"),
                pointsPerUnit = ReadDecimal(reader, "pointsPerUnit"),
                rupeesPerPoint = ReadDecimal(reader, "rupeesPerPoint"),
                rewardDescription = reader["rewardDescription"]?.ToString() ?? "",
                stampsRequired = ReadLong(reader, "stampsRequired"),
                spinsAllowed = reader["spinsAllowed"]?.ToString() ?? "",
                requiresCheckIn = reader["requiresCheckIn"]?.ToString() ?? "",
            };
        }

        private static void Bind(DbCommand cmd, IDb db, Loyalty entity, bool includeId)
        {
            if (includeId)
                db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = entity.id;
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = entity.orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = entity.locationId;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = entity.name ?? "";
            db.AddParameter(cmd, "type", DbTypes.Types.String).Value = entity.type ?? "";
            db.AddParameter(cmd, "earnRate", DbTypes.Types.String).Value = entity.earnRate ?? "";
            db.AddParameter(cmd, "redeemValue", DbTypes.Types.String).Value = entity.redeemValue ?? "";
            db.AddParameter(cmd, "tier", DbTypes.Types.String).Value = entity.tier ?? "";
            db.AddParameter(cmd, "minSpend", DbTypes.Types.Decimal).Value = entity.minSpend;
            db.AddParameter(cmd, "expiryMonths", DbTypes.Types.Long).Value = entity.expiryMonths;
            db.AddParameter(cmd, "qrEnabled", DbTypes.Types.String).Value = entity.qrEnabled ?? "";
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = entity.status ?? "";
            db.AddParameter(cmd, "createdby", DbTypes.Types.String).Value = entity.createdby ?? "";
            db.AddParameter(cmd, "createdon", DbTypes.Types.Date).Value = entity.createdon ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "updatedby", DbTypes.Types.String).Value = entity.updatedby ?? "";
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = entity.updatedon ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "earnUnitRupees", DbTypes.Types.Decimal).Value = entity.earnUnitRupees;
            db.AddParameter(cmd, "pointsPerUnit", DbTypes.Types.Decimal).Value = entity.pointsPerUnit;
            db.AddParameter(cmd, "rupeesPerPoint", DbTypes.Types.Decimal).Value = entity.rupeesPerPoint;
            db.AddParameter(cmd, "rewardDescription", DbTypes.Types.String).Value = entity.rewardDescription ?? "";
            db.AddParameter(cmd, "stampsRequired", DbTypes.Types.Long).Value = entity.stampsRequired;
            db.AddParameter(cmd, "spinsAllowed", DbTypes.Types.String).Value = entity.spinsAllowed ?? "";
            db.AddParameter(cmd, "requiresCheckIn", DbTypes.Types.String).Value = entity.requiresCheckIn ?? "";
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

        private static bool ReadBool(DbDataReader reader, string column)
        {
            var value = reader[column];
            return value != DBNull.Value && Convert.ToBoolean(value);
        }
    }
}
