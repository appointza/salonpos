/** Explicit screen labels for the app header breadcrumb — no nav map lookups. */
export function adminBreadcrumbLabel(pathname: string): string {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return "Dashboard";
  if (pathname === "/reports" || pathname.startsWith("/reports/")) return "Reports";
  if (pathname === "/setup" || pathname.startsWith("/setup/")) return "Easy setup";
  if (pathname === "/front-desk" || pathname.startsWith("/front-desk/")) return "Front desk";
  if (pathname === "/customers" || pathname.startsWith("/customers/")) return "Customers";
  if (pathname === "/appointments" || pathname.startsWith("/appointments/")) return "Appointments";
  if (pathname === "/pos" || pathname.startsWith("/pos/")) return "POS & Billing";
  if (pathname === "/services" || pathname.startsWith("/services/")) return "Services";
  if (pathname === "/feedback" || pathname.startsWith("/feedback/")) return "Feedback";
  if (pathname === "/inventory" || pathname.startsWith("/inventory/")) return "Inventory";
  if (pathname === "/vendors" || pathname.startsWith("/vendors/")) return "Vendors";
  if (pathname === "/expenses" || pathname.startsWith("/expenses/")) return "Expenses";
  if (pathname === "/staff" || pathname.startsWith("/staff/")) return "Staff";
  if (pathname === "/shifts" || pathname.startsWith("/shifts/")) return "Shifts";
  if (pathname === "/attendance" || pathname.startsWith("/attendance/")) return "Attendance";
  if (pathname === "/leaves" || pathname.startsWith("/leaves/")) return "Leaves";
  if (pathname === "/payroll" || pathname.startsWith("/payroll/")) return "Payroll";
  if (pathname === "/commissions" || pathname.startsWith("/commissions/")) return "Commissions";
  if (pathname === "/loyalty" || pathname.startsWith("/loyalty/")) return "Loyalty";
  if (pathname === "/offers" || pathname.startsWith("/offers/")) return "Offers";
  if (pathname === "/coupons" || pathname.startsWith("/coupons/")) return "Coupon management";
  if (pathname === "/prize-wheel" || pathname.startsWith("/prize-wheel/")) return "Prize wheel";
  if (pathname === "/scratch-card" || pathname.startsWith("/scratch-card/")) return "Scratch card";
  if (pathname === "/memberships" || pathname.startsWith("/memberships/")) return "Memberships";
  if (pathname === "/campaigns" || pathname.startsWith("/campaigns/")) return "Campaigns";
  if (pathname === "/franchises" || pathname.startsWith("/franchises/")) return "Franchises";
  if (pathname === "/brand-apps" || pathname.startsWith("/brand-apps/")) return "White-Label Apps";
  if (pathname === "/users" || pathname.startsWith("/users/")) return "Users";
  if (pathname === "/roles" || pathname.startsWith("/roles/")) return "Roles & permissions";
  if (pathname === "/subscription" || pathname.startsWith("/subscription/")) return "Subscription";
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return "Settings";
  return "Admin Overview";
}
