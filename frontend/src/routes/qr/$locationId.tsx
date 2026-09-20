import { createFileRoute } from "@tanstack/react-router";
import { QrCheckinPage } from "@/pages/QrLocation/QrLocation";


export const Route = createFileRoute("/qr/$locationId")({
  head: () => ({
    meta: [
      { title: "Check in — Krios" },
      { name: "description", content: "Scan, verify on WhatsApp OTP, earn stamps or spin for a prize." },
    ],
  }),
  component: QrCheckinPage,
});
