import { createFileRoute } from "@tanstack/react-router";
import { CustomerDetailPage } from "@/pages/CustomerDetail/CustomerDetail";


export const Route = createFileRoute("/_app/customers/$customerId")({
  component: CustomerDetailPage,
});
