using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;

namespace Krios.Services.Krios
{
    public class VendorService
    {
        private readonly IDbProvider dbprovider;
        private readonly IQueryBuilderProvider querybuilderprovider;
        private readonly RequestState requeststate;

        public VendorService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<Vendor>> Select(VendorSelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await SelectTransaction(db, req);
        }

        public async Task<List<Vendor>> SelectTransaction(IDb db, VendorSelectReq req)
        {
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", name, contact, phone, email, gstin, outlet, category, status, notes, createdon
                FROM vendors
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

            var result = new List<Vendor>();
            using DbDataReader reader = await db.Execute(command);
            while (await reader.ReadAsync())
                result.Add(Map(reader));

            return result;
        }

        public async Task<Vendor> Insert(Vendor entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await InsertTransaction(db, entity);
            return entity;
        }

        public async Task InsertTransaction(IDb db, Vendor entity)
        {
            const string query = @"
                INSERT INTO vendors (
                    ""orgId"", ""locationId"", name, contact, phone, email, gstin, outlet, category, status, notes, createdon
                )
                VALUES (
                    @orgId, @locationId, @name, @contact, @phone, @email, @gstin, @outlet, @category, @status, @notes, @createdon
                )
                RETURNING id;
            ";

            var today = DateTime.UtcNow.Date;
            var actor = requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : "system";
            entity.status = string.IsNullOrWhiteSpace(entity.status) ? "Active" : entity.status;
            if (entity.createdon == null) entity.createdon = today;

            var cmd = db.GetCommand(query);
            Bind(cmd, db, entity, includeId: false);

            using var reader = await db.Execute(cmd);
            if (await reader.ReadAsync())
                entity.id = Convert.ToInt64(reader["id"]);
        }

        public async Task<Vendor> Update(Vendor entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UpdateTransaction(db, entity);
            return entity;
        }

        public async Task<bool> UpdateTransaction(IDb db, Vendor entity)
        {
            const string query = @"
                UPDATE vendors SET
                    ""orgId"" = @orgId,
                    ""locationId"" = @locationId,
                    name = @name,
                    contact = @contact,
                    phone = @phone,
                    email = @email,
                    gstin = @gstin,
                    outlet = @outlet,
                    category = @category,
                    status = @status,
                    notes = @notes,
                    createdon = @createdon
                WHERE id = @id
            ";

            
            var cmd = db.GetCommand(query);
            Bind(cmd, db, entity, includeId: true);
            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(VendorDeleteReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await DeleteTransaction(db, req);
        }

        public async Task<bool> DeleteTransaction(IDb db, VendorDeleteReq req)
        {
            const string query = @"
                UPDATE vendors
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

        private static Vendor Map(DbDataReader reader)
        {
            return new Vendor
            {
                id = ReadLong(reader, "id"),
                orgId = ReadLong(reader, "orgId"),
                locationId = ReadLong(reader, "locationId"),
                name = reader["name"]?.ToString() ?? "",
                contact = reader["contact"]?.ToString() ?? "",
                phone = reader["phone"]?.ToString() ?? "",
                email = reader["email"]?.ToString() ?? "",
                gstin = reader["gstin"]?.ToString() ?? "",
                outlet = reader["outlet"]?.ToString() ?? "",
                category = reader["category"]?.ToString() ?? "",
                status = reader["status"]?.ToString() ?? "",
                notes = reader["notes"]?.ToString() ?? "",
                createdon = ReadDate(reader, "createdon"),
            };
        }

        private static void Bind(DbCommand cmd, IDb db, Vendor entity, bool includeId)
        {
            if (includeId)
                db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = entity.id;
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = entity.orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = entity.locationId;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = entity.name ?? "";
            db.AddParameter(cmd, "contact", DbTypes.Types.String).Value = entity.contact ?? "";
            db.AddParameter(cmd, "phone", DbTypes.Types.String).Value = entity.phone ?? "";
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = entity.email ?? "";
            db.AddParameter(cmd, "gstin", DbTypes.Types.String).Value = entity.gstin ?? "";
            db.AddParameter(cmd, "outlet", DbTypes.Types.String).Value = entity.outlet ?? "";
            db.AddParameter(cmd, "category", DbTypes.Types.String).Value = entity.category ?? "";
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = entity.status ?? "";
            db.AddParameter(cmd, "notes", DbTypes.Types.String).Value = entity.notes ?? "";
            db.AddParameter(cmd, "createdon", DbTypes.Types.Date).Value = entity.createdon ?? DateTime.UtcNow.Date;
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
