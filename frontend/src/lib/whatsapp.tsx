import { useCallback, useMemo } from "react";
import { useTenant } from "@/lib/tenant";
import { useCollection, useData, type Row } from "@/lib/store";

export type WhatsAppSettings = {
  phoneNumberId: string;
  businessAccountId: string;
  displayNumber: string;
  apiKey: string;
  webhookToken: string;
  apiVersion: string;
  connected: boolean;
};

export const emptySettings = (): WhatsAppSettings => ({
  phoneNumberId: "",
  businessAccountId: "",
  displayNumber: "",
  apiKey: "",
  webhookToken: "",
  apiVersion: "v21.0",
  connected: false,
});

function settingsFromOrg(row: Row | undefined): WhatsAppSettings {
  if (!row) return emptySettings();
  return {
    phoneNumberId: String(row["whatsappPhoneNumberId"] ?? ""),
    businessAccountId: String(row["whatsappBusinessAccountId"] ?? ""),
    displayNumber: String(row["whatsappDisplayNumber"] ?? ""),
    apiKey: String(row["whatsappApiKey"] ?? ""),
    webhookToken: String(row["whatsappWebhookToken"] ?? ""),
    apiVersion: String(row["whatsappApiVersion"] ?? "v21.0") || "v21.0",
    connected: String(row["whatsappConnected"] ?? "No") === "Yes",
  };
}

/** Meta WhatsApp credentials live on the organization row in salonData. */
export function useWhatsAppSettings() {
  const { orgId } = useTenant();
  const { allRows, update } = useData();

  const orgRow = useMemo(
    () => (allRows["organizations"] ?? []).find((r) => String(r["orgId"]) === orgId),
    [allRows, orgId],
  );

  const settings = useMemo(() => settingsFromOrg(orgRow), [orgRow]);

  const save = useCallback(
    (next: WhatsAppSettings) => {
      if (!orgRow) return;
      update("organizations", String(orgRow.id), {
        id: orgRow.id,
        whatsappPhoneNumberId: next.phoneNumberId,
        whatsappBusinessAccountId: next.businessAccountId,
        whatsappDisplayNumber: next.displayNumber,
        whatsappApiKey: next.apiKey,
        whatsappWebhookToken: next.webhookToken,
        whatsappApiVersion: next.apiVersion,
        whatsappConnected: next.connected ? "Yes" : "No",
      });
    },
    [orgRow, update],
  );

  return { settings, save, isConfigured: settings.connected && !!settings.apiKey && !!settings.phoneNumberId };
}

export const WHATSAPP_MESSAGES = "whatsappMessages";
export const WHATSAPP_TEMPLATES = "whatsappTemplates";

/** Appends an outbound WhatsApp message to the org/location scoped log. */
export function useWhatsAppSender() {
  const { create } = useCollection(WHATSAPP_MESSAGES);
  const { isConfigured, settings } = useWhatsAppSettings();

  const send = useCallback(
    (input: { to: string; recipient: string; body: string; kind: string; reference?: string }) => {
      const row: Row = {
        id: `WA-${Date.now().toString().slice(-8)}`,
        to: input.to,
        recipient: input.recipient,
        kind: input.kind,
        reference: input.reference ?? "",
        body: input.body,
        sentAt: new Date().toISOString().slice(0, 16).replace("T", " "),
        status: isConfigured ? "Sent" : "Queued (API not configured)",
        from: settings.displayNumber || "—",
      };
      create(row);
      return row;
    },
    [create, isConfigured, settings.displayNumber],
  );

  return { send, isConfigured };
}

export function fillTemplate(body: string, vars: Record<string, string>) {
  return body.replace(/\{\{(\w+)\}\}/g, (_m, name: string) => vars[name] ?? `{{${name}}}`);
}
