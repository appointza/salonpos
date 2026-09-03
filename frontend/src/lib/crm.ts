export const crmNav = [
  { to: "/crm", label: "CRM home", icon: "Contact" },
  { to: "/customers", label: "Customers", icon: "Users" },
  { to: "/memberships", label: "Memberships", icon: "CreditCard" },
  { to: "/loyalty", label: "Loyalty", icon: "Gift" },
  { to: "/campaigns", label: "Campaigns", icon: "Megaphone" },
  { to: "/feedback", label: "Feedback", icon: "MessageSquareHeart" },
] as const;

export function isCrmPath(pathname: string) {
  return crmNav.some((item) => item.to === pathname);
}
