import { useCallback, useEffect, useState } from "react";
import { useTenant } from "@/lib/tenant";
import { useCollection, type Row } from "@/lib/store";

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

const key = (orgId: string) => `salon-crm-whatsapp-${orgId}`;

/** Meta WhatsApp credentials, stored locally per organisation (demo, UI-only). */
export function useWhatsAppSettings() {
  const { orgId } = useTenant();
  const [settings, setSettings] = useState<WhatsAppSettings>(emptySettings);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(key(orgId));
      setSettings(saved ? ({ ...emptySettings(), ...JSON.parse(saved) } as WhatsAppSettings) : emptySettings());
    } catch {
      setSettings(emptySettings());
    }
  }, [orgId]);

  const save = useCallback(
    (next: WhatsAppSettings) => {
      setSettings(next);
      try {
        window.localStorage.setItem(key(orgId), JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [orgId],
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
