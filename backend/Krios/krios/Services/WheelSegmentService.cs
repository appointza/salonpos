using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;

namespace Krios.Services.Krios
{
    public class WheelSegmentService
    {
        private readonly IDbProvider dbprovider;
        private readonly IQueryBuilderProvider querybuilderprovider;
        private readonly RequestState requeststate;

        public WheelSegmentService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<WheelSegment>> Select(WheelSegmentSelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await SelectTransaction(db, req);
        }

        public async Task<List<WheelSegment>> SelectTransaction(IDb db, WheelSegmentSelectReq req)
        {
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", ""programId"", label, ""rewardTier"", ""prizeType"", ""prizeValue"", ""winWeight"", ""colorHex"", active
                FROM ""wheelSegments""
            ";

            var qb = querybuilderprovider.GetQueryBuilder(query);

            if (req.id > 0)
                qb.AddParameter("id", "=", "id", req.id, DbTypes.Types.Long);
            if (req.orgId > 0)
                qb.AddParameter(@"""orgId""", "=", "orgId", req.orgId, DbTypes.Types.Long);
            if (req.locationId > 0)
                qb.AddParameter(@"""locationId""", "=", "locationId", req.locationId, DbTypes.Types.Long);

            qb.AddOrderBy(QueryBuilder.Order.ASC, "id");
            var command = qb.GetCommand(db);

            var result = new List<WheelSegment>();
            using DbDataReader reader = await db.Execute(command);
            while (await reader.ReadAsync())
                result.Add(Map(reader));

            return result;
        }

        public async Task<WheelSegment> Insert(WheelSegment entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await InsertTransaction(db, entity);
            return entity;
        }

        public async Task InsertTransaction(IDb db, WheelSegment entity)
        {
            const string query = @"
                INSERT INTO ""wheelSegments"" (
                    ""orgId"", ""locationId"", ""programId"", label, ""rewardTier"", ""prizeType"", ""prizeValue"", ""winWeight"", ""colorHex"", active
                )
                VALUES (
                    @orgId, @locationId, @programId, @label, @rewardTier, @prizeType, @prizeValue, @winWeight, @colorHex, @active
                )
                RETURNING id;
            ";

            var today = DateTime.UtcNow.Date;
            var actor = requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : "system";
            

            var cmd = db.GetCommand(query);
            Bind(cmd, db, entity, includeId: false);

            using var reader = await db.Execute(cmd);
            if (await reader.ReadAsync())
                entity.id = Convert.ToInt64(reader["id"]);
        }

        public async Task<WheelSegment> Update(WheelSegment entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UpdateTransaction(db, entity);
            return entity;
        }

        public async Task<bool> UpdateTransaction(IDb db, WheelSegment entity)
        {
            const string query = @"
                UPDATE ""wheelSegments"" SET
                    ""orgId"" = @orgId,
                    ""locationId"" = @locationId,
                    ""programId"" = @programId,
                    label = @label,
                    ""rewardTier"" = @rewardTier,
                    ""prizeType"" = @prizeType,
                    ""prizeValue"" = @prizeValue,
                    ""winWeight"" = @winWeight,
                    ""colorHex"" = @colorHex,
                    active = @active
                WHERE id = @id
            ";

            
            var cmd = db.GetCommand(query);
            Bind(cmd, db, entity, includeId: true);
            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(WheelSegmentDeleteReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await DeleteTransaction(db, req);
        }

        public async Task<bool> DeleteTransaction(IDb db, WheelSegmentDeleteReq req)
        {
            const string query = @"DELETE FROM ""wheelSegments"" WHERE id = @id";
            
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = req.id;
            return await db.ExecuteNonQuery(cmd) > 0;
        }

        private static WheelSegment Map(DbDataReader reader)
        {
            return new WheelSegment
            {
                id = ReadLong(reader, "id"),
                orgId = ReadLong(reader, "orgId"),
                locationId = ReadLong(reader, "locationId"),
                programId = ReadLong(reader, "programId"),
                label = reader["label"]?.ToString() ?? "",
                rewardTier = reader["rewardTier"]?.ToString() ?? "",
                prizeType = reader["prizeType"]?.ToString() ?? "",
                prizeValue = ReadLong(reader, "prizeValue"),
                winWeight = ReadDecimal(reader, "winWeight"),
                colorHex = reader["colorHex"]?.ToString() ?? "",
                active = reader["active"]?.ToString() ?? "",
            };
        }

        private static void Bind(DbCommand cmd, IDb db, WheelSegment entity, bool includeId)
        {
            if (includeId)
                db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = entity.id;
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = entity.orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = entity.locationId;
            db.AddParameter(cmd, "programId", DbTypes.Types.Long).Value = entity.programId;
            db.AddParameter(cmd, "label", DbTypes.Types.String).Value = entity.label ?? "";
            db.AddParameter(cmd, "rewardTier", DbTypes.Types.String).Value = entity.rewardTier ?? "";
            db.AddParameter(cmd, "prizeType", DbTypes.Types.String).Value = entity.prizeType ?? "";
            db.AddParameter(cmd, "prizeValue", DbTypes.Types.Long).Value = entity.prizeValue;
            db.AddParameter(cmd, "winWeight", DbTypes.Types.Decimal).Value = entity.winWeight;
            db.AddParameter(cmd, "colorHex", DbTypes.Types.String).Value = entity.colorHex ?? "";
            db.AddParameter(cmd, "active", DbTypes.Types.String).Value = entity.active ?? "";
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
