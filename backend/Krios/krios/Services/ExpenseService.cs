using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;

namespace Krios.Services.Krios
{
    public class ExpenseService
    {
        private readonly IDbProvider dbprovider;
        private readonly IQueryBuilderProvider querybuilderprovider;
        private readonly RequestState requeststate;

        public ExpenseService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<Expense>> Select(ExpenseSelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await SelectTransaction(db, req);
        }

        public async Task<List<Expense>> SelectTransaction(IDb db, ExpenseSelectReq req)
        {
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", category, vendor, outlet, date, amount, payment, status, approver, notes, createdby, createdon, updatedby, updatedon, ""skuId"", sku, quantity, ""stockPosted""
                FROM expenses
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
            qb.AddOrderBy(QueryBuilder.Order.ASC, "id");
            var command = qb.GetCommand(db);

            var result = new List<Expense>();
            using DbDataReader reader = await db.Execute(command);
            while (await reader.ReadAsync())
                result.Add(Map(reader));

            return result;
        }

        public async Task<Expense> Insert(Expense entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await InsertTransaction(db, entity);
            return entity;
        }

        public async Task InsertTransaction(IDb db, Expense entity)
        {
            const string query = @"
                INSERT INTO expenses (
                    ""orgId"", ""locationId"", category, vendor, outlet, date, amount, payment, status, approver, notes, createdby, createdon, updatedby, updatedon, ""skuId"", sku, quantity, ""stockPosted""
                )
                VALUES (
                    @orgId, @locationId, @category, @vendor, @outlet, @date, @amount, @payment, @status, @approver, @notes, @createdby, @createdon, @updatedby, @updatedon, @skuId, @sku, @quantity, @stockPosted
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

        public async Task<Expense> Update(Expense entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UpdateTransaction(db, entity);
            return entity;
        }

        public async Task<bool> UpdateTransaction(IDb db, Expense entity)
        {
            const string query = @"
                UPDATE expenses SET
                    ""orgId"" = @orgId,
                    ""locationId"" = @locationId,
                    category = @category,
                    vendor = @vendor,
                    outlet = @outlet,
                    date = @date,
                    amount = @amount,
                    payment = @payment,
                    status = @status,
                    approver = @approver,
                    notes = @notes,
                    createdby = @createdby,
                    createdon = @createdon,
                    updatedby = @updatedby,
                    updatedon = @updatedon,
                    ""skuId"" = @skuId,
                    sku = @sku,
                    quantity = @quantity,
                    ""stockPosted"" = @stockPosted
                WHERE id = @id
            ";

            
            entity.updatedon = DateTime.UtcNow.Date;
            entity.updatedby = requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : entity.updatedby;
            var cmd = db.GetCommand(query);
            Bind(cmd, db, entity, includeId: true);
            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(ExpenseDeleteReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await DeleteTransaction(db, req);
        }

        public async Task<bool> DeleteTransaction(IDb db, ExpenseDeleteReq req)
        {
            const string query = @"
                UPDATE expenses
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

        private static Expense Map(DbDataReader reader)
        {
            return new Expense
            {
                id = ReadLong(reader, "id"),
                orgId = ReadLong(reader, "orgId"),
                locationId = ReadLong(reader, "locationId"),
                category = reader["category"]?.ToString() ?? "",
                vendor = reader["vendor"]?.ToString() ?? "",
                outlet = reader["outlet"]?.ToString() ?? "",
                date = ReadDate(reader, "date"),
                amount = ReadDecimal(reader, "amount"),
                payment = reader["payment"]?.ToString() ?? "",
                status = reader["status"]?.ToString() ?? "",
                approver = reader["approver"]?.ToString() ?? "",
                notes = reader["notes"]?.ToString() ?? "",
                createdby = reader["createdby"]?.ToString() ?? "",
                createdon = ReadDate(reader, "createdon"),
                updatedby = reader["updatedby"]?.ToString() ?? "",
                updatedon = ReadDate(reader, "updatedon"),
                skuId = ReadLong(reader, "skuId"),
                sku = reader["sku"]?.ToString() ?? "",
                quantity = ReadDecimal(reader, "quantity"),
                stockPosted = reader["stockPosted"]?.ToString() ?? "",
            };
        }

        private static void Bind(DbCommand cmd, IDb db, Expense entity, bool includeId)
        {
            if (includeId)
                db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = entity.id;
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = entity.orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = entity.locationId;
            db.AddParameter(cmd, "category", DbTypes.Types.String).Value = entity.category ?? "";
            db.AddParameter(cmd, "vendor", DbTypes.Types.String).Value = entity.vendor ?? "";
            db.AddParameter(cmd, "outlet", DbTypes.Types.String).Value = entity.outlet ?? "";
            db.AddParameter(cmd, "date", DbTypes.Types.Date).Value = entity.date ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "amount", DbTypes.Types.Decimal).Value = entity.amount;
            db.AddParameter(cmd, "payment", DbTypes.Types.String).Value = entity.payment ?? "";
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = entity.status ?? "";
            db.AddParameter(cmd, "approver", DbTypes.Types.String).Value = entity.approver ?? "";
            db.AddParameter(cmd, "notes", DbTypes.Types.String).Value = entity.notes ?? "";
            db.AddParameter(cmd, "createdby", DbTypes.Types.String).Value = entity.createdby ?? "";
            db.AddParameter(cmd, "createdon", DbTypes.Types.Date).Value = entity.createdon ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "updatedby", DbTypes.Types.String).Value = entity.updatedby ?? "";
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = entity.updatedon ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "skuId", DbTypes.Types.Long).Value = entity.skuId;
            db.AddParameter(cmd, "sku", DbTypes.Types.String).Value = entity.sku ?? "";
            db.AddParameter(cmd, "quantity", DbTypes.Types.Decimal).Value = entity.quantity;
            db.AddParameter(cmd, "stockPosted", DbTypes.Types.String).Value = entity.stockPosted ?? "";
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
