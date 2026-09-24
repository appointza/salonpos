using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;

namespace Krios.Services.Krios
{
    public class GoogleReviewService
    {
        private readonly IDbProvider dbprovider;
        private readonly IQueryBuilderProvider querybuilderprovider;
        private readonly RequestState requeststate;

        public GoogleReviewService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<GoogleReview>> Select(GoogleReviewSelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await SelectTransaction(db, req);
        }

        public async Task<List<GoogleReview>> SelectTransaction(IDb db, GoogleReviewSelectReq req)
        {
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", outlet, author, rating, ""relativeTime"", date, comment, source, createdby, createdon, updatedby, updatedon
                FROM ""googleReviews""
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

            var result = new List<GoogleReview>();
            using DbDataReader reader = await db.Execute(command);
            while (await reader.ReadAsync())
                result.Add(Map(reader));

            return result;
        }

        public async Task<GoogleReview> Insert(GoogleReview entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await InsertTransaction(db, entity);
            return entity;
        }

        public async Task InsertTransaction(IDb db, GoogleReview entity)
        {
            const string query = @"
                INSERT INTO ""googleReviews"" (
                    ""orgId"", ""locationId"", outlet, author, rating, ""relativeTime"", date, comment, source, createdby, createdon, updatedby, updatedon
                )
                VALUES (
                    @orgId, @locationId, @outlet, @author, @rating, @relativeTime, @date, @comment, @source, @createdby, @createdon, @updatedby, @updatedon
                )
                RETURNING id;
            ";

            var today = DateTime.UtcNow.Date;
            var actor = requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : "system";
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

        public async Task<GoogleReview> Update(GoogleReview entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UpdateTransaction(db, entity);
            return entity;
        }

        public async Task<bool> UpdateTransaction(IDb db, GoogleReview entity)
        {
            const string query = @"
                UPDATE ""googleReviews"" SET
                    ""orgId"" = @orgId,
                    ""locationId"" = @locationId,
                    outlet = @outlet,
                    author = @author,
                    rating = @rating,
                    ""relativeTime"" = @relativeTime,
                    date = @date,
                    comment = @comment,
                    source = @source,
                    createdby = @createdby,
                    createdon = @createdon,
                    updatedby = @updatedby,
                    updatedon = @updatedon
                WHERE id = @id
            ";

            
            entity.updatedon = DateTime.UtcNow.Date;
            entity.updatedby = requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : entity.updatedby;
            var cmd = db.GetCommand(query);
            Bind(cmd, db, entity, includeId: true);
            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(GoogleReviewDeleteReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await DeleteTransaction(db, req);
        }

        public async Task<bool> DeleteTransaction(IDb db, GoogleReviewDeleteReq req)
        {
            const string query = @"DELETE FROM ""googleReviews"" WHERE id = @id";
            
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = req.id;
            return await db.ExecuteNonQuery(cmd) > 0;
        }

        private static GoogleReview Map(DbDataReader reader)
        {
            return new GoogleReview
            {
                id = ReadLong(reader, "id"),
                orgId = ReadLong(reader, "orgId"),
                locationId = ReadLong(reader, "locationId"),
                outlet = reader["outlet"]?.ToString() ?? "",
                author = reader["author"]?.ToString() ?? "",
                rating = ReadLong(reader, "rating"),
                relativeTime = reader["relativeTime"]?.ToString() ?? "",
                date = ReadDate(reader, "date"),
                comment = reader["comment"]?.ToString() ?? "",
                source = reader["source"]?.ToString() ?? "",
                createdby = reader["createdby"]?.ToString() ?? "",
                createdon = ReadDate(reader, "createdon"),
                updatedby = reader["updatedby"]?.ToString() ?? "",
                updatedon = ReadDate(reader, "updatedon"),
            };
        }

        private static void Bind(DbCommand cmd, IDb db, GoogleReview entity, bool includeId)
        {
            if (includeId)
                db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = entity.id;
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = entity.orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = entity.locationId;
            db.AddParameter(cmd, "outlet", DbTypes.Types.String).Value = entity.outlet ?? "";
            db.AddParameter(cmd, "author", DbTypes.Types.String).Value = entity.author ?? "";
            db.AddParameter(cmd, "rating", DbTypes.Types.Long).Value = entity.rating;
            db.AddParameter(cmd, "relativeTime", DbTypes.Types.String).Value = entity.relativeTime ?? "";
            db.AddParameter(cmd, "date", DbTypes.Types.Date).Value = entity.date ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "comment", DbTypes.Types.String).Value = entity.comment ?? "";
            db.AddParameter(cmd, "source", DbTypes.Types.String).Value = entity.source ?? "";
            db.AddParameter(cmd, "createdby", DbTypes.Types.String).Value = entity.createdby ?? "";
            db.AddParameter(cmd, "createdon", DbTypes.Types.Date).Value = entity.createdon ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "updatedby", DbTypes.Types.String).Value = entity.updatedby ?? "";
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = entity.updatedon ?? DateTime.UtcNow.Date;
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
