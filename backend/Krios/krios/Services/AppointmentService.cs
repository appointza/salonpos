using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;

namespace Krios.Services.Krios
{
    public class AppointmentService
    {
        private readonly IDbProvider dbprovider;
        private readonly IQueryBuilderProvider querybuilderprovider;
        private readonly RequestState requeststate;

        public AppointmentService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<Appointment>> Select(AppointmentSelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await SelectTransaction(db, req);
        }

        public async Task<List<Appointment>> SelectTransaction(IDb db, AppointmentSelectReq req)
        {
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", ""customerId"", customer, ""serviceId"", service, ""staffId"", staff, outlet, date, time, duration, status, source, notes, createdby, createdon, updatedby, updatedon
                FROM appointments
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

            var result = new List<Appointment>();
            using DbDataReader reader = await db.Execute(command);
            while (await reader.ReadAsync())
                result.Add(Map(reader));

            return result;
        }

        public async Task<Appointment> Insert(Appointment entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await InsertTransaction(db, entity);
            return entity;
        }

        public async Task InsertTransaction(IDb db, Appointment entity)
        {
            const string query = @"
                INSERT INTO appointments (
                    ""orgId"", ""locationId"", ""customerId"", customer, ""serviceId"", service, ""staffId"", staff, outlet, date, time, duration, status, source, notes, createdby, createdon, updatedby, updatedon
                )
                VALUES (
                    @orgId, @locationId, @customerId, @customer, @serviceId, @service, @staffId, @staff, @outlet, @date, @time, @duration, @status, @source, @notes, @createdby, @createdon, @updatedby, @updatedon
                )
                RETURNING id;
            ";

            var today = DateTime.UtcNow.Date;
            var actor = requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : "system";
            entity.status = string.IsNullOrWhiteSpace(entity.status) ? "Active" : entity.status;
            await EnsureBookable(db, entity, excludeId: 0);
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

        public async Task<Appointment> Update(Appointment entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UpdateTransaction(db, entity);
            return entity;
        }

        public async Task<bool> UpdateTransaction(IDb db, Appointment entity)
        {
            const string query = @"
                UPDATE appointments SET
                    ""orgId"" = @orgId,
                    ""locationId"" = @locationId,
                    ""customerId"" = @customerId,
                    customer = @customer,
                    ""serviceId"" = @serviceId,
                    service = @service,
                    ""staffId"" = @staffId,
                    staff = @staff,
                    outlet = @outlet,
                    date = @date,
                    time = @time,
                    duration = @duration,
                    status = @status,
                    source = @source,
                    notes = @notes,
                    createdby = @createdby,
                    createdon = @createdon,
                    updatedby = @updatedby,
                    updatedon = @updatedon
                WHERE id = @id
            ";

            
            entity.updatedon = DateTime.UtcNow.Date;
            entity.updatedby = requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : entity.updatedby;
            await EnsureBookable(db, entity, excludeId: entity.id);
            var cmd = db.GetCommand(query);
            Bind(cmd, db, entity, includeId: true);
            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(AppointmentDeleteReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await DeleteTransaction(db, req);
        }

        public async Task<bool> DeleteTransaction(IDb db, AppointmentDeleteReq req)
        {
            const string query = @"
                UPDATE appointments
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

        private static Appointment Map(DbDataReader reader)
        {
            return new Appointment
            {
                id = ReadLong(reader, "id"),
                orgId = ReadLong(reader, "orgId"),
                locationId = ReadLong(reader, "locationId"),
                customerId = ReadLong(reader, "customerId"),
                customer = reader["customer"]?.ToString() ?? "",
                serviceId = ReadLong(reader, "serviceId"),
                service = reader["service"]?.ToString() ?? "",
                staffId = ReadLong(reader, "staffId"),
                staff = reader["staff"]?.ToString() ?? "",
                outlet = reader["outlet"]?.ToString() ?? "",
                date = ReadDate(reader, "date"),
                time = FormatTime(reader["time"]),
                duration = ReadLong(reader, "duration"),
                status = reader["status"]?.ToString() ?? "",
                source = reader["source"]?.ToString() ?? "",
                notes = reader["notes"]?.ToString() ?? "",
                createdby = reader["createdby"]?.ToString() ?? "",
                createdon = ReadDate(reader, "createdon"),
                updatedby = reader["updatedby"]?.ToString() ?? "",
                updatedon = ReadDate(reader, "updatedon"),
            };
        }

        private static void Bind(DbCommand cmd, IDb db, Appointment entity, bool includeId)
        {
            if (includeId)
                db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = entity.id;
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = entity.orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = entity.locationId;
            db.AddParameter(cmd, "customerId", DbTypes.Types.Long).Value = entity.customerId;
            db.AddParameter(cmd, "customer", DbTypes.Types.String).Value = entity.customer ?? "";
            db.AddParameter(cmd, "serviceId", DbTypes.Types.Long).Value = entity.serviceId;
            db.AddParameter(cmd, "service", DbTypes.Types.String).Value = entity.service ?? "";
            db.AddParameter(cmd, "staffId", DbTypes.Types.Long).Value = entity.staffId;
            db.AddParameter(cmd, "staff", DbTypes.Types.String).Value = entity.staff ?? "";
            db.AddParameter(cmd, "outlet", DbTypes.Types.String).Value = entity.outlet ?? "";
            db.AddParameter(cmd, "date", DbTypes.Types.Date).Value = entity.date ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "time", DbTypes.Types.Time).Value = AsTime(entity.time);
            db.AddParameter(cmd, "duration", DbTypes.Types.Integer).Value = AsInt(entity.duration);
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = entity.status ?? "";
            db.AddParameter(cmd, "source", DbTypes.Types.String).Value = entity.source ?? "";
            db.AddParameter(cmd, "notes", DbTypes.Types.String).Value = entity.notes ?? "";
            db.AddParameter(cmd, "createdby", DbTypes.Types.String).Value = entity.createdby ?? "";
            db.AddParameter(cmd, "createdon", DbTypes.Types.Date).Value = entity.createdon ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "updatedby", DbTypes.Types.String).Value = entity.updatedby ?? "";
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = entity.updatedon ?? DateTime.UtcNow.Date;
        }

        private async Task EnsureBookable(IDb db, Appointment entity, long excludeId)
        {
            var status = (entity.status ?? "").Trim().ToLowerInvariant();
            if (status is "cancelled" or "no-show" or "inactive") return;
            if (AsTime(entity.time) is not TimeSpan start)
                throw new AppException(AppException.ErrorCodes.BadRequest, "Choose a booking time");
            var minutes = entity.duration > 0 ? (int)Math.Min(entity.duration, 24 * 60) : 30;
            var end = start.Add(TimeSpan.FromMinutes(minutes));
            var day = (entity.date ?? DateTime.UtcNow).Date;

            var open = new TimeSpan(9, 0, 0);
            var close = new TimeSpan(20, 0, 0);
            if (entity.staffId > 0)
            {
                var shiftCmd = db.GetCommand(@"
                    SELECT ""startTime"", ""endTime""
                    FROM shifts
                    WHERE ""orgId"" = @orgId AND ""staffId"" = @staffId AND date = @date
                    ORDER BY id DESC
                    LIMIT 1");
                db.AddParameter(shiftCmd, "orgId", DbTypes.Types.Long).Value = entity.orgId;
                db.AddParameter(shiftCmd, "staffId", DbTypes.Types.Long).Value = entity.staffId;
                db.AddParameter(shiftCmd, "date", DbTypes.Types.Date).Value = day;
                using (var shiftReader = await db.Execute(shiftCmd))
                {
                    if (await shiftReader.ReadAsync()
                        && shiftReader["startTime"] is TimeSpan shiftStart
                        && shiftReader["endTime"] is TimeSpan shiftEnd
                        && shiftStart < shiftEnd)
                    {
                        open = shiftStart;
                        close = shiftEnd;
                    }
                }
            }
            if (start < open || end > close)
                throw new AppException(AppException.ErrorCodes.BadRequest, $"Bookings are only open {open:hh\\:mm}–{close:hh\\:mm}");

            var cmd = db.GetCommand(@"
                SELECT time, duration, staff, ""staffId"", status
                FROM appointments
                WHERE ""orgId"" = @orgId
                  AND date = @date
                  AND id <> @excludeId
                  AND COALESCE(status, '') NOT IN ('Cancelled', 'No-show', 'Inactive')");
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = entity.orgId;
            db.AddParameter(cmd, "date", DbTypes.Types.Date).Value = day;
            db.AddParameter(cmd, "excludeId", DbTypes.Types.Long).Value = excludeId;
            using var reader = await db.Execute(cmd);
            var staffName = (entity.staff ?? "").Trim();
            while (await reader.ReadAsync())
            {
                var otherStaffId = ReadLong(reader, "staffId");
                var otherName = reader["staff"]?.ToString()?.Trim() ?? "";
                var sameStaff = (entity.staffId > 0 && otherStaffId == entity.staffId)
                    || (staffName.Length > 0 && string.Equals(otherName, staffName, StringComparison.OrdinalIgnoreCase));
                if (!sameStaff) continue;
                if (reader["time"] is not TimeSpan otherStart) continue;
                var otherMinutes = ReadLong(reader, "duration");
                if (otherMinutes <= 0) otherMinutes = 30;
                var otherEnd = otherStart.Add(TimeSpan.FromMinutes(otherMinutes));
                if (start < otherEnd && otherStart < end)
                    throw new AppException(AppException.ErrorCodes.BadRequest, "That time is already booked");
            }
        }

        /// <summary>appointments.time is TIME. A varchar parameter is rejected (42804).</summary>
        private static object AsTime(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return DBNull.Value;
            if (TimeSpan.TryParse(value, out var parsed)) return parsed;
            if (DateTime.TryParse(value, out var clock)) return clock.TimeOfDay;
            throw new InvalidOperationException($"Appointment time '{value}' is not a valid time.");
        }

        private static string FormatTime(object? value)
        {
            if (value == null || value == DBNull.Value) return "";
            if (value is TimeSpan span) return span.ToString(@"hh\:mm");
            if (value is DateTime clock) return clock.ToString("HH:mm");
            var text = value.ToString() ?? "";
            return TimeSpan.TryParse(text, out var parsed) ? parsed.ToString(@"hh\:mm") : text;
        }

        private static int AsInt(long value)
        {
            if (value > int.MaxValue) return int.MaxValue;
            if (value < int.MinValue) return int.MinValue;
            return (int)value;
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

        public async Task<bool> CompleteForInvoiceTransaction(IDb db, long appointmentId, long invoiceId)
        {
            if (appointmentId <= 0) return false;
            var rows = await SelectTransaction(db, new AppointmentSelectReq { id = appointmentId });
            var appt = rows.FirstOrDefault();
            if (appt == null) return false;
            appt.status = "Completed";
            appt.notes = string.IsNullOrWhiteSpace(appt.notes)
                ? $"invoice:{invoiceId}"
                : $"{appt.notes} | invoice:{invoiceId}";
            return await UpdateTransaction(db, appt);
        }
    }
}
