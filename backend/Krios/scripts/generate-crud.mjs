/**
 * Generate C# Model + Service + Controller CRUD for salon tables.
 * Field shapes are read from frontend/src/model/*.ts (Res classes).
 * Skips organizations/users (hand-maintained) and non-table models.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const modelDir = path.join(root, "../../frontend/src/model");

const singularMap = {
  organizations: "Organization",
  locations: "Location",
  customers: "Customer",
  appointments: "Appointment",
  invoices: "Invoice",
  services: "Service",
  inventory: "Inventory",
  expenses: "Expense",
  staff: "Staff",
  shifts: "Shift",
  attendance: "Attendance",
  leaves: "Leave",
  payroll: "Payroll",
  commissions: "Commission",
  feedback: "Feedback",
  googleReviews: "GoogleReview",
  loyalty: "Loyalty",
  wheelSegments: "WheelSegment",
  wheelSpins: "WheelSpin",
  scratchPrizes: "ScratchPrize",
  scratchPlays: "ScratchPlay",
  qrCheckins: "QrCheckin",
  qrOffers: "QrOffer",
  partnerships: "Partnership",
  qrOfferRedemptions: "QrOfferRedemption",
  partnerCoupons: "PartnerCoupon",
  memberships: "Membership",
  campaigns: "Campaign",
  franchises: "Franchise",
  brandApps: "BrandApp",
  roles: "Role",
  users: "User",
  referenceValues: "ReferenceValue",
  membershipPlans: "MembershipPlan",
  loyaltyTransactions: "LoyaltyTransaction",
  membershipUsage: "MembershipUsage",
  stockMovements: "StockMovement",
  serviceProducts: "ServiceProduct",
  coupons: "Coupon",
  vouchers: "Voucher",
  vendors: "Vendor",
};

const SKIP_TABLES = new Set(["organizations", "users"]);
const HAND_MODELS = new Set(["Organization", "User", "OrganizationRegistration", "UserLogin"]);

const FALLBACK = {
  wheelSpins: {
    id: "number", orgId: "number", locationId: "number", customerId: "number", programId: "number",
    segmentId: "number", rewardType: "string", rewardValue: "number", label: "string", source: "string",
    referenceId: "string", checkinId: "number", status: "string", createdAt: "string",
    loyaltyTransactionId: "number", createdby: "string", createdon: "string", updatedby: "string", updatedon: "string",
  },
  scratchPlays: {
    id: "number", orgId: "number", locationId: "number", customerId: "number", programId: "number",
    prizeId: "number", rewardType: "string", rewardValue: "number", label: "string", source: "string",
    referenceId: "string", checkinId: "number", status: "string", createdAt: "string",
    loyaltyTransactionId: "number", createdby: "string", createdon: "string", updatedby: "string", updatedon: "string",
  },
};

function isIdField(key) {
  if (key === "id" || key === "orgId" || key === "locationId") return true;
  const external = new Set(["whatsappPhoneNumberId", "whatsappBusinessAccountId", "placeId", "bundleId"]);
  if (external.has(key)) return false;
  return /Id$/.test(key);
}

function fieldsFromModel(table) {
  const file = path.join(modelDir, `${table}.ts`);
  if (!fs.existsSync(file)) return {};
  const content = fs.readFileSync(file, "utf8");
  const match = content.match(/export class \w+Res \{([\s\S]*?)\n\}/);
  if (!match) return {};
  const types = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^\s+(\w+):\s*(\w+)/);
    if (!m) continue;
    const [, key, tsType] = m;
    if (isIdField(key)) types[key] = "number";
    else if (tsType === "number") types[key] = "number";
    else if (tsType === "boolean") types[key] = "boolean";
    else types[key] = "string";
  }
  return types;
}

function sqlType(key, tsType) {
  if (isIdField(key)) return "BIGINT";
  if (tsType === "number") {
    if (/lat|lng|Rate|price|Price|Amount|total|subtotal|discount|tax|Balance|Cost|Weight|royalty|budget|incentive|commission|wallet|unit|sell|earn|pointsPer|rupees|min|max|qty|quantity|visits/i.test(key))
      return "NUMERIC";
    return "INTEGER";
  }
  if (tsType === "boolean") return "BOOLEAN";
  if (/^(createdon|updatedon|date|fromDate|toDate|joinDate|payDate|lastVisit|birthday|anniversary|expiry|validityStart|validityEnd|goLive|usedOn|createdAt|expiresOn)$/i.test(key))
    return "DATE";
  if (/^(time|startTime|endTime|checkIn|checkOut|validTimeStart|validTimeEnd)$/i.test(key)) return "TIME";
  if (/notes|description|comment|address|items|permissions|weights|combo|Needs|slabs|eligible|target|benefits|view|edit/i.test(key))
    return "TEXT";
  return "VARCHAR";
}

function csharpType(key, tsType) {
  const sql = sqlType(key, tsType);
  if (sql === "BIGINT" || sql === "INTEGER") return "long";
  if (sql === "NUMERIC") return "decimal";
  if (sql === "BOOLEAN") return "bool";
  if (sql === "DATE") return "DateTime?";
  return "string";
}

function csharpDefault(csType) {
  if (csType === "long") return "0";
  if (csType === "decimal") return "0";
  if (csType === "bool") return "false";
  if (csType === "DateTime?") return "null";
  return '""';
}

function dbType(csType) {
  if (csType === "long") return "Long";
  if (csType === "decimal") return "Decimal";
  if (csType === "bool") return "Boolean";
  if (csType === "DateTime?") return "Date";
  return "String";
}

function quoteIdent(name) {
  if (/^[a-z_]+$/.test(name)) return name;
  return `"${name}"`;
}

function quoteTable(table) {
  return quoteIdent(table);
}

/** Quoted identifier safe inside C# @"..." verbatim strings (double the quotes). */
function quoteCsVerbatim(name) {
  if (/^[a-z_]+$/.test(name)) return name;
  return `""${name}""`;
}

function quoteTableCs(table) {
  return quoteCsVerbatim(table);
}

function emitModel(entity, fields) {
  const lines = [`namespace Krios.Models.Krios`, `{`, `    public class ${entity}`, `    {`];
  for (const [k, ts] of fields) {
    const cs = csharpType(k, ts);
    if (cs === "string") lines.push(`        public ${cs} ${k} { get; set; } = "";`);
    else lines.push(`        public ${cs} ${k} { get; set; }`);
  }
  lines.push(`    }`, ``);
  lines.push(`    public class ${entity}SelectReq`, `    {`);
  for (const [k, def] of [
    ["id", "long"],
    ["orgId", "long"],
    ["locationId", "long"],
    ["search", "string"],
    ["status", "string"],
  ]) {
    if (def === "string") lines.push(`        public ${def} ${k} { get; set; } = "";`);
    else lines.push(`        public ${def} ${k} { get; set; }`);
  }
  lines.push(`    }`, ``);
  lines.push(`    public class ${entity}DeleteReq`, `    {`);
  lines.push(`        public long id { get; set; }`);
  lines.push(`        public long orgId { get; set; }`);
  lines.push(`    }`);
  lines.push(`}`);
  return lines.join("\n");
}

function emitService(entity, table, fields, hasStatus, searchField, types) {
  const cols = fields.map(([k]) => k);
  const selectList = cols.map((k) => quoteCsVerbatim(k)).join(", ");
  const insertCols = cols.filter((k) => k !== "id");
  const insertParams = insertCols.map((k) => `@${k}`).join(", ");
  const insertColSql = insertCols.map((k) => quoteCsVerbatim(k)).join(", ");
  const updateSets = cols.filter((k) => k !== "id").map((k) => `${quoteCsVerbatim(k)} = @${k}`).join(",\n                    ");

  const deleteBlock = hasStatus
    ? `const string query = @"
                UPDATE ${quoteTableCs(table)}
                SET status = 'Inactive',
                    updatedby = @updatedby,
                    updatedon = @updatedon
                WHERE id = @id
            ";`
    : `const string query = @"DELETE FROM ${quoteTableCs(table)} WHERE id = @id";`;

  const deleteBody = hasStatus
    ? `
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = req.id;
            db.AddParameter(cmd, "updatedby", DbTypes.Types.String).Value =
                requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : "system";
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = DateTime.UtcNow.Date;
            return await db.ExecuteNonQuery(cmd) > 0;`
    : `
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = req.id;
            return await db.ExecuteNonQuery(cmd) > 0;`;

  const statusFilter = hasStatus
    ? `
            if (!string.IsNullOrWhiteSpace(req.status))
                qb.AddParameter("status", "=", "status", req.status, DbTypes.Types.String);
            else
                qb.AddParameter("status", "<>", "status", "Inactive", DbTypes.Types.String);`
    : "";

  const searchFilter = searchField
    ? `
            if (!string.IsNullOrWhiteSpace(req.search))
                qb.AddParameter("${searchField}", "ILIKE", "search", "%" + req.search + "%", DbTypes.Types.String);`
    : "";

  const hasCreatedOn = "createdon" in types;
  const hasUpdatedOn = "updatedon" in types;
  const hasCreatedBy = "createdby" in types;
  const hasUpdatedBy = "updatedby" in types;
  const auditOnInsert = [
    hasStatus ? `entity.status = string.IsNullOrWhiteSpace(entity.status) ? "Active" : entity.status;` : "",
    hasCreatedOn ? `if (entity.createdon == null) entity.createdon = today;` : "",
    hasUpdatedOn ? `if (entity.updatedon == null) entity.updatedon = today;` : "",
    hasCreatedBy ? `if (string.IsNullOrWhiteSpace(entity.createdby)) entity.createdby = actor;` : "",
    hasUpdatedBy ? `if (string.IsNullOrWhiteSpace(entity.updatedby)) entity.updatedby = actor;` : "",
  ].filter(Boolean).join("\n            ");

  const auditOnUpdate = hasUpdatedOn
    ? `
            entity.updatedon = DateTime.UtcNow.Date;
            entity.updatedby = requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : entity.updatedby;`
    : "";

  return `using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;

namespace Krios.Services.Krios
{
    public class ${entity}Service
    {
        private readonly IDbProvider dbprovider;
        private readonly IQueryBuilderProvider querybuilderprovider;
        private readonly RequestState requeststate;

        public ${entity}Service(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<${entity}>> Select(${entity}SelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await SelectTransaction(db, req);
        }

        public async Task<List<${entity}>> SelectTransaction(IDb db, ${entity}SelectReq req)
        {
            const string query = @"
                SELECT ${selectList}
                FROM ${quoteTableCs(table)}
            ";

            var qb = querybuilderprovider.GetQueryBuilder(query);

            if (req.id > 0)
                qb.AddParameter("id", "=", "id", req.id, DbTypes.Types.Long);
            if (req.orgId > 0)
                qb.AddParameter(@"""orgId""", "=", "orgId", req.orgId, DbTypes.Types.Long);
            if (req.locationId > 0)
                qb.AddParameter(@"""locationId""", "=", "locationId", req.locationId, DbTypes.Types.Long);
${statusFilter}${searchFilter}
            qb.AddOrderBy(QueryBuilder.Order.ASC, "id");
            var command = qb.GetCommand(db);

            var result = new List<${entity}>();
            using DbDataReader reader = await db.Execute(command);
            while (await reader.ReadAsync())
                result.Add(Map(reader));

            return result;
        }

        public async Task<${entity}> Insert(${entity} entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await InsertTransaction(db, entity);
            return entity;
        }

        public async Task InsertTransaction(IDb db, ${entity} entity)
        {
            const string query = @"
                INSERT INTO ${quoteTableCs(table)} (
                    ${insertColSql}
                )
                VALUES (
                    ${insertParams}
                )
                RETURNING id;
            ";

            var today = DateTime.UtcNow.Date;
            var actor = requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : "system";
            ${auditOnInsert}

            var cmd = db.GetCommand(query);
            Bind(cmd, db, entity, includeId: false);

            using var reader = await db.Execute(cmd);
            if (await reader.ReadAsync())
                entity.id = Convert.ToInt64(reader["id"]);
        }

        public async Task<${entity}> Update(${entity} entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UpdateTransaction(db, entity);
            return entity;
        }

        public async Task<bool> UpdateTransaction(IDb db, ${entity} entity)
        {
            const string query = @"
                UPDATE ${quoteTableCs(table)} SET
                    ${updateSets}
                WHERE id = @id
            ";

            ${auditOnUpdate}
            var cmd = db.GetCommand(query);
            Bind(cmd, db, entity, includeId: true);
            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(${entity}DeleteReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await DeleteTransaction(db, req);
        }

        public async Task<bool> DeleteTransaction(IDb db, ${entity}DeleteReq req)
        {
            ${deleteBlock}
            ${deleteBody}
        }

        private static ${entity} Map(DbDataReader reader)
        {
            return new ${entity}
            {
${fields.map(([k, ts]) => {
  const cs = csharpType(k, ts);
  if (cs === "long") return `                ${k} = ReadLong(reader, "${k}"),`;
  if (cs === "decimal") return `                ${k} = ReadDecimal(reader, "${k}"),`;
  if (cs === "DateTime?") return `                ${k} = ReadDate(reader, "${k}"),`;
  if (cs === "bool") return `                ${k} = ReadBool(reader, "${k}"),`;
  return `                ${k} = reader["${k}"]?.ToString() ?? "",`;
}).join("\n")}
            };
        }

        private static void Bind(DbCommand cmd, IDb db, ${entity} entity, bool includeId)
        {
            if (includeId)
                db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = entity.id;
${fields.filter(([k]) => k !== "id").map(([k, ts]) => {
  const cs = csharpType(k, ts);
  const dt = dbType(cs);
  if (cs === "DateTime?") {
    return `            db.AddParameter(cmd, "${k}", DbTypes.Types.${dt}).Value = entity.${k} ?? DateTime.UtcNow.Date;`;
  }
  if (cs === "string") {
    return `            db.AddParameter(cmd, "${k}", DbTypes.Types.${dt}).Value = entity.${k} ?? "";`;
  }
  return `            db.AddParameter(cmd, "${k}", DbTypes.Types.${dt}).Value = entity.${k};`;
}).join("\n")}
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
`;
}

function emitController(entity) {
  return `using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class ${entity}Controller : ControllerBase
    {
        ILogger<${entity}Controller> logger;
        ${entity}Service ${entity.toLowerCase()}Service;

        public ${entity}Controller(ILogger<${entity}Controller> logger, ${entity}Service ${entity.toLowerCase()}Service)
        {
            this.logger = logger;
            this.${entity.toLowerCase()}Service = ${entity.toLowerCase()}Service;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<${entity}>>> Entity()
        {
            ActionRes<${entity}> result = new ActionRes<${entity}>()
            {
               item = new ${entity}()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<${entity}>>>> Select(ActionReq<${entity}SelectReq> req)
        {
            ActionRes<List<${entity}>> result = new ActionRes<List<${entity}>>();

            result.item = await ${entity.toLowerCase()}Service.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<${entity}>>> Insert(ActionReq<${entity}> req)
        {
            ActionRes<${entity}> result = new ActionRes<${entity}>();

            result.item = await ${entity.toLowerCase()}Service.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<${entity}>>> Update(ActionReq<${entity}> req)
        {
            ActionRes<${entity}> result = new ActionRes<${entity}>();

            result.item = await ${entity.toLowerCase()}Service.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<${entity}>>> Save(ActionReq<${entity}> req)
        {
            ActionRes<${entity}> result = new ActionRes<${entity}>();

            if(req.item.id > 0){
                result.item = await ${entity.toLowerCase()}Service.Update(req.item);
            }else{
                result.item = await ${entity.toLowerCase()}Service.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<${entity}DeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await ${entity.toLowerCase()}Service.Delete(req.item);

            return Ok(result);
        }
    }
}
`;
}

const modelsDir = path.join(root, "krios/Models");
const servicesDir = path.join(root, "krios/Services");
const controllersDir = path.join(root, "krios/ApiControllers");

const generatedEntities = [];

for (const table of Object.keys(singularMap)) {
  if (SKIP_TABLES.has(table)) continue;

  let types = fieldsFromModel(table);
  if (Object.keys(types).length === 0 && FALLBACK[table]) types = { ...FALLBACK[table] };
  for (const k of Object.keys(types)) {
    if (isIdField(k)) types[k] = "number";
  }

  const entity = singularMap[table] || table;
  const fields = Object.entries(types);
  const hasStatus = "status" in types;
  const searchField = types.name ? "name" : types.phone ? "phone" : types.email ? "email" : types.title ? "title" : types.code ? "code" : null;

  fs.writeFileSync(path.join(modelsDir, `${entity}.cs`), emitModel(entity, fields));
  fs.writeFileSync(path.join(servicesDir, `${entity}Service.cs`), emitService(entity, table, fields, hasStatus, searchField, types));
  fs.writeFileSync(path.join(controllersDir, `${entity}Controller.cs`), emitController(entity));
  generatedEntities.push(entity);
}

generatedEntities.sort();

const configLines = [
  `using Krios.Utils;`,
  ``,
  `namespace Krios`,
  `{`,
  `    public static class ServicesConfiguration`,
  `    {`,
  `        public static void AddCustomServices(this IServiceCollection services)`,
  `        {`,
  `            services.AddSingleton<IQueryBuilderProvider, QueryBuilderProvider>();`,
  `            services.AddTransient<CustomCryptography>();`,
  ``,
  `            services.AddScoped<Krios.Services.Krios.OrganizationService>();`,
  `            services.AddScoped<Krios.Services.Krios.OrganizationRegistrationService>();`,
  `            services.AddScoped<Krios.Services.Krios.UserService>();`,
  `            services.AddScoped<Krios.Services.Krios.UserLoginService>();`,
  ...generatedEntities.map((e) => `            services.AddScoped<Krios.Services.Krios.${e}Service>();`),
  `        }`,
  `    }`,
  `}`,
  ``,
];

fs.writeFileSync(path.join(root, "ServicesConfiguration.cs"), configLines.join("\n"));

console.log(`Generated CRUD for ${generatedEntities.length} entities:`);
console.log(generatedEntities.join(", "));
