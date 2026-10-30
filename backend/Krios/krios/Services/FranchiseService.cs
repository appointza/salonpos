using System.Text.RegularExpressions;
using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;

namespace Krios.Services.Krios
{
    public class FranchiseService
    {
        private readonly IDbProvider dbprovider;
        private readonly IQueryBuilderProvider querybuilderprovider;
        private readonly RequestState requeststate;
        private readonly LocationService locationService;
        private static bool addressColumnReady;
        private static readonly HashSet<long> linkedOrgs = new();

        public FranchiseService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate,
            LocationService locationService)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
            this.locationService = locationService;
        }

        public async Task<List<Franchise>> Select(FranchiseSelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await SelectTransaction(db, req);
        }

        public async Task<List<Franchise>> SelectTransaction(IDb db, FranchiseSelectReq req)
        {
            await EnsureAddressColumn(db);
            if (req.orgId > 0)
                await EnsureOutletLocations(db, req.orgId);
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", name, type, address, city, owner, phone, gstin, royalty, ""goLive"", status, createdby, createdon, updatedby, updatedon
                FROM franchises
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

            var result = new List<Franchise>();
            using DbDataReader reader = await db.Execute(command);
            while (await reader.ReadAsync())
                result.Add(Map(reader));

            return result;
        }

        public async Task<Franchise> Insert(Franchise entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await InsertTransaction(db, entity);
            return entity;
        }

        public async Task InsertTransaction(IDb db, Franchise entity)
        {
            await EnsureAddressColumn(db);
            await CreateOutletLocation(db, entity);
            const string query = @"
                INSERT INTO franchises (
                    ""orgId"", ""locationId"", name, type, address, city, owner, phone, gstin, royalty, ""goLive"", status, createdby, createdon, updatedby, updatedon
                )
                VALUES (
                    @orgId, @locationId, @name, @type, @address, @city, @owner, @phone, @gstin, @royalty, @goLive, @status, @createdby, @createdon, @updatedby, @updatedon
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

        public async Task<Franchise> Update(Franchise entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UpdateTransaction(db, entity);
            return entity;
        }

        public async Task<bool> UpdateTransaction(IDb db, Franchise entity)
        {
            await EnsureAddressColumn(db);
            await SyncOutletLocation(db, entity);
            const string query = @"
                UPDATE franchises SET
                    ""orgId"" = @orgId,
                    ""locationId"" = @locationId,
                    name = @name,
                    type = @type,
                    address = @address,
                    city = @city,
                    owner = @owner,
                    phone = @phone,
                    gstin = @gstin,
                    royalty = @royalty,
                    ""goLive"" = @goLive,
                    status = @status,
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

        public async Task<bool> Delete(FranchiseDeleteReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await DeleteTransaction(db, req);
        }

        public async Task<bool> DeleteTransaction(IDb db, FranchiseDeleteReq req)
        {
            await DeactivateOutletLocation(db, req.id);
            const string query = @"
                UPDATE franchises
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

        private static Franchise Map(DbDataReader reader)
        {
            return new Franchise
            {
                id = ReadLong(reader, "id"),
                orgId = ReadLong(reader, "orgId"),
                locationId = ReadLong(reader, "locationId"),
                name = reader["name"]?.ToString() ?? "",
                type = reader["type"]?.ToString() ?? "",
                address = reader["address"]?.ToString() ?? "",
                city = reader["city"]?.ToString() ?? "",
                owner = reader["owner"]?.ToString() ?? "",
                phone = reader["phone"]?.ToString() ?? "",
                gstin = reader["gstin"]?.ToString() ?? "",
                royalty = ReadDecimal(reader, "royalty"),
                goLive = ReadDate(reader, "goLive"),
                status = reader["status"]?.ToString() ?? "",
                createdby = reader["createdby"]?.ToString() ?? "",
                createdon = ReadDate(reader, "createdon"),
                updatedby = reader["updatedby"]?.ToString() ?? "",
                updatedon = ReadDate(reader, "updatedon"),
            };
        }

        private static void Bind(DbCommand cmd, IDb db, Franchise entity, bool includeId)
        {
            if (includeId)
                db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = entity.id;
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = entity.orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = entity.locationId;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = entity.name ?? "";
            db.AddParameter(cmd, "type", DbTypes.Types.String).Value = entity.type ?? "";
            db.AddParameter(cmd, "address", DbTypes.Types.String).Value = entity.address ?? "";
            db.AddParameter(cmd, "city", DbTypes.Types.String).Value = entity.city ?? "";
            db.AddParameter(cmd, "owner", DbTypes.Types.String).Value = entity.owner ?? "";
            db.AddParameter(cmd, "phone", DbTypes.Types.String).Value = entity.phone ?? "";
            db.AddParameter(cmd, "gstin", DbTypes.Types.String).Value = entity.gstin ?? "";
            db.AddParameter(cmd, "royalty", DbTypes.Types.Decimal).Value = entity.royalty;
            db.AddParameter(cmd, "goLive", DbTypes.Types.Date).Value = entity.goLive ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = entity.status ?? "";
            db.AddParameter(cmd, "createdby", DbTypes.Types.String).Value = entity.createdby ?? "";
            db.AddParameter(cmd, "createdon", DbTypes.Types.Date).Value = entity.createdon ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "updatedby", DbTypes.Types.String).Value = entity.updatedby ?? "";
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = entity.updatedon ?? DateTime.UtcNow.Date;
        }

        private async Task EnsureOutletLocations(IDb db, long orgId)
        {
            lock (linkedOrgs)
            {
                if (linkedOrgs.Contains(orgId)) return;
            }

            var claimed = new HashSet<long>();
            var locIds = new HashSet<long>();
            var locCmd = db.GetCommand(@"SELECT id, ""locationId"" FROM locations WHERE ""orgId"" = @orgId");
            db.AddParameter(locCmd, "orgId", DbTypes.Types.Long).Value = orgId;
            using (var reader = await db.Execute(locCmd))
            {
                while (await reader.ReadAsync())
                {
                    var id = ReadLong(reader, "id");
                    var locationId = ReadLong(reader, "locationId");
                    if (id > 0) locIds.Add(id);
                    if (locationId > 0) locIds.Add(locationId);
                }
            }

            var rows = new List<Franchise>();
            var frCmd = db.GetCommand(@"
                SELECT id, ""orgId"", ""locationId"", name, type, address, city, owner, phone, gstin, royalty, ""goLive"", status, createdby, createdon, updatedby, updatedon
                FROM franchises
                WHERE ""orgId"" = @orgId AND status <> 'Inactive'
                ORDER BY id");
            db.AddParameter(frCmd, "orgId", DbTypes.Types.Long).Value = orgId;
            using (var reader = await db.Execute(frCmd))
            {
                while (await reader.ReadAsync())
                    rows.Add(Map(reader));
            }

            foreach (var row in rows)
            {
                var locId = row.locationId;
                if (locId > 0 && locIds.Contains(locId) && claimed.Add(locId))
                {
                    await PatchLocation(db, row);
                    continue;
                }
                await CreateOutletLocation(db, row);
                var upd = db.GetCommand(@"UPDATE franchises SET ""locationId"" = @locationId WHERE id = @id");
                db.AddParameter(upd, "locationId", DbTypes.Types.Long).Value = row.locationId;
                db.AddParameter(upd, "id", DbTypes.Types.Long).Value = row.id;
                await db.ExecuteNonQuery(upd);
                if (row.locationId > 0)
                {
                    locIds.Add(row.locationId);
                    claimed.Add(row.locationId);
                }
            }

            lock (linkedOrgs)
            {
                linkedOrgs.Add(orgId);
            }
        }

        private async Task CreateOutletLocation(IDb db, Franchise entity)
        {
            var defaults = await PeekLocationDefaults(db, entity.orgId);
            var location = new Location
            {
                orgId = entity.orgId,
                name = string.IsNullOrWhiteSpace(entity.name) ? "Outlet" : entity.name.Trim(),
                code = await UniqueLocationCode(db, entity.orgId, MakeCode(entity.name)),
                city = entity.city ?? "",
                address = entity.address ?? "",
                phone = entity.phone ?? "",
                email = defaults.email,
                timezone = string.IsNullOrWhiteSpace(defaults.timezone) ? "Asia/Kolkata" : defaults.timezone,
                status = LocationStatusFor(entity.status),
            };
            await locationService.InsertTransaction(db, location);
            entity.locationId = location.locationId > 0 ? location.locationId : location.id;
        }

        private async Task SyncOutletLocation(IDb db, Franchise entity)
        {
            if (entity.locationId <= 0)
            {
                await CreateOutletLocation(db, entity);
                return;
            }
            await PatchLocation(db, entity);
        }

        private async Task PatchLocation(IDb db, Franchise entity)
        {
            if (entity.locationId <= 0) return;
            var cmd = db.GetCommand(@"
                UPDATE locations SET
                    name = @name,
                    city = @city,
                    address = @address,
                    phone = @phone,
                    status = @status,
                    updatedon = @updatedon
                WHERE (id = @locationId OR ""locationId"" = @locationId) AND ""orgId"" = @orgId
            ");
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = entity.name ?? "";
            db.AddParameter(cmd, "city", DbTypes.Types.String).Value = entity.city ?? "";
            db.AddParameter(cmd, "address", DbTypes.Types.String).Value = entity.address ?? "";
            db.AddParameter(cmd, "phone", DbTypes.Types.String).Value = entity.phone ?? "";
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = LocationStatusFor(entity.status);
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = DateTime.UtcNow.Date;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = entity.locationId;
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = entity.orgId;
            await db.ExecuteNonQuery(cmd);
        }

        private async Task DeactivateOutletLocation(IDb db, long franchiseId)
        {
            var find = db.GetCommand(@"SELECT ""locationId"", ""orgId"" FROM franchises WHERE id = @id");
            db.AddParameter(find, "id", DbTypes.Types.Long).Value = franchiseId;
            long locationId = 0;
            long orgId = 0;
            using (var reader = await db.Execute(find))
            {
                if (await reader.ReadAsync())
                {
                    locationId = ReadLong(reader, "locationId");
                    orgId = ReadLong(reader, "orgId");
                }
            }
            if (locationId <= 0) return;

            var others = db.GetCommand(@"
                SELECT COUNT(*) FROM franchises
                WHERE ""orgId"" = @orgId AND ""locationId"" = @locationId AND id <> @id AND status <> 'Inactive'");
            db.AddParameter(others, "orgId", DbTypes.Types.Long).Value = orgId;
            db.AddParameter(others, "locationId", DbTypes.Types.Long).Value = locationId;
            db.AddParameter(others, "id", DbTypes.Types.Long).Value = franchiseId;
            var shared = 0L;
            using (var reader = await db.Execute(others))
            {
                if (await reader.ReadAsync())
                    shared = reader.IsDBNull(0) ? 0 : Convert.ToInt64(reader.GetValue(0));
            }
            if (shared > 0) return;

            var cmd = db.GetCommand(@"
                UPDATE locations
                SET status = 'Inactive', updatedon = @updatedon
                WHERE (id = @locationId OR ""locationId"" = @locationId) AND ""orgId"" = @orgId");
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = locationId;
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = orgId;
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = DateTime.UtcNow.Date;
            await db.ExecuteNonQuery(cmd);
        }

        private async Task<(string timezone, string email)> PeekLocationDefaults(IDb db, long orgId)
        {
            if (orgId <= 0) return ("Asia/Kolkata", "");
            var cmd = db.GetCommand(@"
                SELECT timezone, email FROM locations
                WHERE ""orgId"" = @orgId AND status <> 'Inactive'
                ORDER BY id
                LIMIT 1");
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = orgId;
            using var reader = await db.Execute(cmd);
            if (await reader.ReadAsync())
                return (reader["timezone"]?.ToString() ?? "Asia/Kolkata", reader["email"]?.ToString() ?? "");
            return ("Asia/Kolkata", "");
        }

        private async Task<string> UniqueLocationCode(IDb db, long orgId, string wanted)
        {
            var code = string.IsNullOrWhiteSpace(wanted) ? "OUTLET" : wanted;
            var taken = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var cmd = db.GetCommand(@"SELECT code FROM locations WHERE ""orgId"" = @orgId AND status <> 'Inactive'");
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = orgId;
            using (var reader = await db.Execute(cmd))
            {
                while (await reader.ReadAsync())
                {
                    var value = reader["code"]?.ToString() ?? "";
                    if (value.Length > 0) taken.Add(value);
                }
            }
            if (!taken.Contains(code)) return code;
            for (var i = 2; i < 100; i++)
            {
                var next = $"{code}{i}";
                if (next.Length > 24) next = next[..24];
                if (!taken.Contains(next)) return next;
            }
            return $"{code}{DateTime.UtcNow.Ticks % 1000}";
        }

        private static string MakeCode(string? name)
        {
            var raw = Regex.Replace((name ?? "").ToUpperInvariant(), "[^A-Z0-9]+", "");
            if (raw.Length == 0) return "OUTLET";
            return raw.Length <= 12 ? raw : raw[..12];
        }

        private static string LocationStatusFor(string? status)
        {
            var value = (status ?? "").Trim();
            if (value.Equals("Inactive", StringComparison.OrdinalIgnoreCase) ||
                value.Equals("Suspended", StringComparison.OrdinalIgnoreCase))
                return "Inactive";
            return "Active";
        }

        public static async Task EnsureAddressColumn(IDb db)
        {
            if (addressColumnReady) return;
            var cmd = db.GetCommand(@"ALTER TABLE franchises ADD COLUMN IF NOT EXISTS address TEXT;");
            await db.ExecuteNonQuery(cmd);
            addressColumnReady = true;
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
