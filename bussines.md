# Salon POS — Business rules (screen-wise)

> **Source of truth for product logic and unit tests.**  
> Test fixtures live in `frontend/src/lib/business/business-fixtures.ts`.  
> Run tests: `cd frontend && npm test`

---

## 1. Tenancy model

| Scope | Field | Rule |
|-------|-------|------|
| Organisation | `orgId` | Every record belongs to one org. API loads data filtered by signed-in user's org. |
| Outlet | `locationId` + `outlet` (name) | Operational records are outlet-scoped unless marked org-wide. |
| Header switcher | Org + Outlet | Filters list views. **All outlets** shows org-wide rows for that collection. |

**Org-wide collections** (not filtered by outlet in UI store):  
`organizations`, `locations`, `membershipPlans`, `loyalty`, `inventory`, `stockMovements`, `serviceProducts`, `roles`

**Outlet-scoped collections** (filtered by `locationId` when outlet selected):  
`customers`, `staff`, `appointments`, `invoices`, `shifts`, `attendance`, `franchises`, `users`, …

---

## 2. Customer rules (critical)

### Identity
- A **customer profile = organisation + outlet + phone** (at service time).
- **Same phone at two outlets = two separate profiles** (separate points, wallet, visits).
- Phone uniqueness is **per outlet**, not per organisation.
- Fields: `orgId`, `locationId`, `outlet` (display name), `phone`, `name`, tier, points, wallet, etc.

### Lookup
- POS, walk-in, public booking, QR check-in: resolve customer by **phone + current outlet `locationId`**.
- Never merge loyalty/wallet across outlets for the same phone.

### List (`/customers`)
- Scoped by header: selected outlet → only that outlet's customers; **All outlets** → all customers in org.
- Create/edit: must pick **Outlet** (from `/franchises`).
- Save sets both `locationId` and `outlet` name.
- Reject duplicate phone at the same outlet.

### Services & sales
- Appointments, POS, invoices link to `customerId` at the **outlet where service happens**.
- **POS loyalty is server-side only** — no local fallback on checkout failure.

---

## 3. Loyalty & POS (`/settings`, `/pos`, `/customers/:id`)

### Settings (`/settings`)
- Fields: `earnUnitRupees`, `pointsPerUnit`, `rupeesPerPoint`, `minSpend`, `expiryMonths`.
- **Save → `POST /api/Loyalty/Save`** (Points program row in `loyalty` table).
- New org registration seeds a default **Points program** (₹100 → 1 pt, min spend ₹500, 1 pt = ₹1 off).

### POS quote & bill
1. **`POST /api/Invoice/Quote`** — preview totals + `pointsToEarn` using DB loyalty rules.
2. **`POST /api/Invoice/CompleteSale`** — in one transaction:
   - Insert paid invoice
   - Redeem points (if any) → `loyaltyTransactions` + update `customers.points`
   - Earn points from **taxable amount after all discounts** → ledger + update balance
   - Update customer `lastVisit`, `totalVisits`
   - Commissions, stock, appointment completion

### Earn formula (server)
```
eligible = taxable after membership, manual discount, rewards, coupons, point redemption
if eligible >= minSpend:
  pointsToEarn = floor(eligible / earnUnitRupees) * pointsPerUnit
```

### Rule resolution (server)
- Active `loyalty` row where `type = Points` and `status = Active`.
- Prefer outlet match (`locationId`) then tier match; else org defaults on `organizations`.

### After bill (frontend)
- Cache updated from API response (invoice row + customer `points` / visits).
- `/customers/1` shows updated points without manual refresh.

### Unit test fixtures (loyalty)
| Setting | Value |
|---------|-------|
| earnUnitRupees | 100 |
| pointsPerUnit | 1 |
| minSpend | 500 |
| rupeesPerPoint | 1 |

| Bill taxable | Expected earn |
|--------------|---------------|
| ₹400 | 0 (below min) |
| ₹500 | 5 pts |
| ₹1000 | 10 pts |

---

## 4. Screen-wise logic

### Register (`/register`)
1. Create organisation.
2. Create default location (`MAIN`).
3. Create main outlet row in `franchises`.
4. Seed default roles (Owner, Outlet Manager, Stylist, Receptionist).
5. Create admin user linked to org + location.

### Outlets (`/franchises`)
- Outlet = franchise row linked to `locationId`.
- UI label: **Outlets** (not Franchises / Location).

### Users (`/users`) & Roles (`/roles`)
- Users: assign **outlet** (name) + **role code** (`ADMIN`, `STAFF`, `STYLIST`).
- Login uses role **code**, UI shows role **name**.
- Empty roles table → `/roles` auto-seeds defaults once.

### Customers (`/customers`)
- See §2 above.
- Optional: membership link, tier, wallet (updated by POS).

### Staff (`/staff`)
- One **Outlet** field (via `locationId`); no duplicate outlet column.
- Staff tied to org + outlet for scheduling and payroll.

### Appointments (`/appointments`)
- Outlet-scoped booking: customer, service, staff, date/time at selected outlet.

### POS (`/pos`)
- Customer search at **current outlet** only.
- Completing sale: invoice + loyalty + stock + customer visit count.

### Walk-in / Public booking / QR
- Walk-in (`/walk-in`): check-in creates/updates customer at **selected outlet**.
- Public booking (`/book`): booking + customer upsert at **booked outlet**.
- QR location page: customer scoped to QR's outlet.

### Inventory & Expenses
- Stock movements can be org-wide catalog; consumption/sale tied to outlet context on POS.

### Loyalty / Memberships
- Loyalty programs may be org-wide config; **customer balances are per customer row (per outlet)**.
- Membership plans org-wide; enrollments per customer.

---

## 5. API payload rules (frontend → backend)

| Type | Rule |
|------|------|
| Numeric IDs | Empty string → `0` (`locationId`, `membershipId`, …) |
| Dates | Empty string → `null` (`lastVisit`, `birthday`, …) |
| Audit | `createdby` / `updatedby` always strings |
| New records | `id: 0` for insert; prefixed IDs like `C-1234` treated as new |

Request shape: `{ item: { ...entity } }`

---

## 6. Test fixtures

```json
{
  "orgId": 1,
  "outletA": { "locationId": 10, "name": "Main Outlet" },
  "outletB": { "locationId": 11, "name": "City Branch" },
  "phone": "9876543210",
  "customers": [
    { "id": 101, "orgId": 1, "locationId": 10, "phone": "9876543210", "name": "Priya Sharma", "points": 120 },
    { "id": 102, "orgId": 1, "locationId": 11, "phone": "9876543210", "name": "Priya S.", "points": 40 }
  ]
}
```

**Expected behaviour (unit tests):**
1. `customersForOutlet(org=1, outlet=10)` → 1 row (id 101).
2. `findCustomerByPhone(phone, outlet=10)` → id 101; outlet=11 → id 102.
3. `hasDuplicatePhoneAtOutlet(phone, org=1, outlet=10)` → true for new create.
4. Same phone allowed at outlet B while A has a profile.

---

## 7. Inventory & stock (server authority)

**Remaining balance** = sum of `stockMovements` (Opening + Purchase − Sale − Used − Wastage + Return ± Adjustment). If no movements exist for a SKU, falls back to `inventory.stock`.

| API | Purpose |
|-----|---------|
| `POST /api/Inventory/Remaining` | `{ orgId, locationId, skuId? }` → `{ rows: [{ skuId, remaining }] }` |
| `POST /api/Inventory/CheckAvailability` | Cart lines → `{ ok, missing[], errorMessage }` (products + service recipes) |
| `POST /api/StockMovement/Adjust` | Post adjustment movement + sync `inventory.stock` atomically |
| `POST /api/Invoice/CompleteSale` | Validates stock, posts Sale/Used movements, updates balances in one transaction |

**UI rule:** `/inventory` and `/pos` display remaining and shortages from these APIs — not client-side ledger math.

---

## 8. Unit test map

| File | Covers |
|------|--------|
| `frontend/src/lib/customers/customer-lookup.test.ts` | Phone normalize, outlet scoping, duplicate detection |
| `frontend/src/lib/business/business-fixtures.ts` | Shared fixture constants (sync with §5) |

**Add tests when changing:**
- Customer create/save on `/customers`
- Walk-in / booking customer upsert
- Store scoping (`ORG_WIDE` vs outlet filter)
- CrudPage outlet sync (`locationId` + `outlet` name)

---

## 9. Rewards, coupons, and claim

### Prize label
On `/scratch-card` and `/prize-wheel`, **Prize label** is the guest-facing name (from reference values). **Prize type** and **Value** are what POS applies. **Reward tier** tags the prize so Settings can decide which game draws it.

### Reward tiers (`/settings`)
For each tier (Bronze, Silver, Gold, Platinum) the salon chooses **Scratch card**, **Prize wheel**, or **Both**, plus how many prizes of that tier sit on each game. Walk-in (`/{slug}/walk-in`) and public booking (`/{slug}`) show only the game for that customer's tier.

### Claim
- Bonus points are added immediately.
- Discount, free service, and partner prizes stay **Pending**.
- Next visit: POS shows **Claim reward on this bill**. Completing the sale marks the prize Redeemed.
- Admin sees the same pending and redeemed prizes on `/coupons` (issued tab) and on the customer profile.

### Coupon save
`POST /api/Coupon/Save` writes integer columns as integers and blank happy-hour times as SQL NULL. A blank time string is not a valid `TIME` value.

## 10. Changelog (logic)

| Date | Change |
|------|--------|
| 2026-09-23 | Reward tiers choose scratch vs wheel per tier; pending prizes claimed on the next POS bill |
| 2026-09-23 | Coupon save binds integer and time columns to their PostgreSQL types |
| 2026-09-23 | Stock logic moved to backend: Remaining, CheckAvailability, Adjust, CompleteSale issues movements |
| 2026-09-23 | POS loyalty on server: Settings → Loyalty/Save; CompleteSale earns/redeems; customer cache sync |
| 2026-09-23 | Customer identity scoped to **org + outlet**; duplicate phone per outlet; fixtures + vitest added |
| 2026-09-22 | Customer API: numeric/date payload coercion; outlet from franchises |
| 2026-09-22 | Outlets terminology unified; roles seeded on register |
