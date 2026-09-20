using Krios.Models.Krios;
using Krios.Models;
using Krios.Utils;
using System.Data.Common;

namespace Krios.Services.Krios
{
    public class StaffReplacementService
    {
        IDbProvider dbprovider;
        IQueryBuilderProvider querybuilderprovider;
        RequestState requeststate;

        public StaffReplacementService(IDbProvider dbprovider, IQueryBuilderProvider querybuilderprovider, RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<StaffReplacement>> Select(StaffReplacementSelectReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await SelectTransaction(db, req);
            }
        }

        public async Task<List<StaffReplacement>> SelectTransaction(IDb db, StaffReplacementSelectReq req)
        {
            List<StaffReplacement> result = new List<StaffReplacement>();
            string query = @"
                SELECT
                    id, schedule_id, original_teacher_id, original_teacher_name,
                    replacement_teacher_id, replacement_teacher_name, date, reason,
                    assigned_by, assigned_date, status, organization_id, is_active
                FROM staff_replacements
            ";

            var queryBuilder = querybuilderprovider.GetQueryBuilder(query);

            if (!string.IsNullOrWhiteSpace(req.id))
                queryBuilder.AddParameter("id", "=", "id", req.id, DbTypes.Types.String);
            if (!string.IsNullOrWhiteSpace(req.scheduleid))
                queryBuilder.AddParameter("schedule_id", "=", "schedule_id", req.scheduleid, DbTypes.Types.String);
            if (!string.IsNullOrWhiteSpace(req.status))
                queryBuilder.AddParameter("status", "=", "status", req.status, DbTypes.Types.String);
            if (!string.IsNullOrWhiteSpace(req.organizationid))
                queryBuilder.AddParameter("organization_id", "=", "organization_id", req.organizationid, DbTypes.Types.String);

            queryBuilder.AddParameter("is_active", "=", "is_active", true, DbTypes.Types.Boolean);
            queryBuilder.AddOrderBy(QueryBuilder.Order.DESC, "assigned_date");

            var command = queryBuilder.GetCommand(db);
            using (DbDataReader reader = await db.Execute(command))
            {
                while (await reader.ReadAsync())
                {
                    StaffReplacement temp = new StaffReplacement();
                    temp.id = reader["id"]?.ToString() ?? "";
                    temp.scheduleid = reader["schedule_id"] == DBNull.Value ? "" : reader["schedule_id"].ToString();
                    temp.originalteacherid = reader["original_teacher_id"] == DBNull.Value ? "" : reader["original_teacher_id"].ToString();
                    temp.originalteachername = reader["original_teacher_name"] == DBNull.Value ? "" : reader["original_teacher_name"].ToString();
                    temp.replacementteacherid = reader["replacement_teacher_id"] == DBNull.Value ? "" : reader["replacement_teacher_id"].ToString();
                    temp.replacementteachername = reader["replacement_teacher_name"] == DBNull.Value ? "" : reader["replacement_teacher_name"].ToString();
                    temp.date = reader["date"] == DBNull.Value ? DateTime.MinValue : Convert.ToDateTime(reader["date"]);
                    temp.reason = reader["reason"] == DBNull.Value ? "" : reader["reason"].ToString();
                    temp.assignedby = reader["assigned_by"] == DBNull.Value ? "" : reader["assigned_by"].ToString();
                    temp.assigneddate = reader["assigned_date"] == DBNull.Value ? DateTime.MinValue : Convert.ToDateTime(reader["assigned_date"]);
                    temp.status = reader["status"] == DBNull.Value ? "" : reader["status"].ToString();
                    temp.organizationid = reader["organization_id"] == DBNull.Value ? "" : reader["organization_id"].ToString();
                    temp.isactive = reader["is_active"] != DBNull.Value && Convert.ToBoolean(reader["is_active"]);
                    result.Add(temp);
                }
            }

            return result;
        }

        public async Task<StaffReplacement> Insert(StaffReplacement replacement)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await InsertTransaction(db, replacement);
            }
            return replacement;
        }

        public async Task InsertTransaction(IDb db, StaffReplacement replacement)
        {
            if (string.IsNullOrWhiteSpace(replacement.organizationid) && requeststate.usercontext?.organisationid > 0)
                replacement.organizationid = requeststate.usercontext.organisationid.ToString();
            if (string.IsNullOrWhiteSpace(replacement.organizationid))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Organization ID is required.");

            replacement.id = string.IsNullOrWhiteSpace(replacement.id) ? Guid.NewGuid().ToString() : replacement.id;
            replacement.status = string.IsNullOrWhiteSpace(replacement.status) ? "active" : replacement.status;
            replacement.assignedby = string.IsNullOrWhiteSpace(replacement.assignedby) ? ResolveActor() : replacement.assignedby;
            replacement.assigneddate = replacement.assigneddate == default ? DateTime.UtcNow.Date : replacement.assigneddate;
            replacement.isactive = true;

            string query = @"
                INSERT INTO staff_replacements (
                    id, schedule_id, original_teacher_id, original_teacher_name,
                    replacement_teacher_id, replacement_teacher_name, date, reason,
                    assigned_by, assigned_date, status, organization_id, is_active
                )
                VALUES (
                    @id, @schedule_id, @original_teacher_id, @original_teacher_name,
                    @replacement_teacher_id, @replacement_teacher_name, @date, @reason,
                    @assigned_by, @assigned_date, @status, @organization_id, @is_active
                );
            ";

            DbCommand command = db.GetCommand(query);
            db.AddParameter(command, "id", DbTypes.Types.String).Value = replacement.id;
            db.AddParameter(command, "schedule_id", DbTypes.Types.String).Value = replacement.scheduleid ?? "";
            db.AddParameter(command, "original_teacher_id", DbTypes.Types.String).Value = replacement.originalteacherid ?? "";
            db.AddParameter(command, "original_teacher_name", DbTypes.Types.String).Value = replacement.originalteachername ?? "";
            db.AddParameter(command, "replacement_teacher_id", DbTypes.Types.String).Value = replacement.replacementteacherid ?? "";
            db.AddParameter(command, "replacement_teacher_name", DbTypes.Types.String).Value = replacement.replacementteachername ?? "";
            db.AddParameter(command, "date", DbTypes.Types.Date).Value = replacement.date.Date;
            db.AddParameter(command, "reason", DbTypes.Types.String).Value = replacement.reason ?? "";
            db.AddParameter(command, "assigned_by", DbTypes.Types.String).Value = replacement.assignedby ?? "";
            db.AddParameter(command, "assigned_date", DbTypes.Types.Date).Value = replacement.assigneddate.Date;
            db.AddParameter(command, "status", DbTypes.Types.String).Value = replacement.status ?? "active";
            db.AddParameter(command, "organization_id", DbTypes.Types.String).Value = replacement.organizationid ?? "";
            db.AddParameter(command, "is_active", DbTypes.Types.Boolean).Value = replacement.isactive;

            await db.ExecuteNonQuery(command);
        }

        public async Task<StaffReplacement> Update(StaffReplacement replacement)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await UpdateTransaction(db, replacement);
            }
            return replacement;
        }

        public async Task<bool> UpdateTransaction(IDb db, StaffReplacement replacement)
        {
            if (string.IsNullOrWhiteSpace(replacement.id))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Replacement id is required.");
            if (string.IsNullOrWhiteSpace(replacement.organizationid) && requeststate.usercontext?.organisationid > 0)
                replacement.organizationid = requeststate.usercontext.organisationid.ToString();
            if (string.IsNullOrWhiteSpace(replacement.organizationid))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Organization ID is required.");

            string query = @"
                UPDATE staff_replacements
                SET
                    schedule_id = @schedule_id,
                    original_teacher_id = @original_teacher_id,
                    original_teacher_name = @original_teacher_name,
                    replacement_teacher_id = @replacement_teacher_id,
                    replacement_teacher_name = @replacement_teacher_name,
                    date = @date,
                    reason = @reason,
                    assigned_by = @assigned_by,
                    assigned_date = @assigned_date,
                    status = @status,
                    organization_id = @organization_id
                WHERE id = @id AND is_active = true
            ";

            DbCommand command = db.GetCommand(query);
            db.AddParameter(command, "id", DbTypes.Types.String).Value = replacement.id ?? "";
            db.AddParameter(command, "schedule_id", DbTypes.Types.String).Value = replacement.scheduleid ?? "";
            db.AddParameter(command, "original_teacher_id", DbTypes.Types.String).Value = replacement.originalteacherid ?? "";
            db.AddParameter(command, "original_teacher_name", DbTypes.Types.String).Value = replacement.originalteachername ?? "";
            db.AddParameter(command, "replacement_teacher_id", DbTypes.Types.String).Value = replacement.replacementteacherid ?? "";
            db.AddParameter(command, "replacement_teacher_name", DbTypes.Types.String).Value = replacement.replacementteachername ?? "";
            db.AddParameter(command, "date", DbTypes.Types.Date).Value = replacement.date.Date;
            db.AddParameter(command, "reason", DbTypes.Types.String).Value = replacement.reason ?? "";
            db.AddParameter(command, "assigned_by", DbTypes.Types.String).Value = replacement.assignedby ?? "";
            db.AddParameter(command, "assigned_date", DbTypes.Types.Date).Value = replacement.assigneddate.Date;
            db.AddParameter(command, "status", DbTypes.Types.String).Value = replacement.status ?? "";
            db.AddParameter(command, "organization_id", DbTypes.Types.String).Value = replacement.organizationid ?? "";

            return await db.ExecuteNonQuery(command) > 0;
        }

        public async Task<bool> Delete(StaffReplacementDeleteReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await DeleteTransaction(db, req);
            }
        }

        public async Task<bool> DeleteTransaction(IDb db, StaffReplacementDeleteReq req)
        {
            if (string.IsNullOrWhiteSpace(req.id))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Replacement id is required.");

            string query = @"
                UPDATE staff_replacements
                SET is_active = false
                WHERE id = @id AND is_active = true
            ";

            var command = db.GetCommand(query);
            db.AddParameter(command, "id", DbTypes.Types.String).Value = req.id ?? "";

            return await db.ExecuteNonQuery(command) > 0;
        }

        private string ResolveActor()
        {
            var id = requeststate.usercontext?.userid ?? -1;
            return id > 0 ? id.ToString() : "system";
        }
    }
}
