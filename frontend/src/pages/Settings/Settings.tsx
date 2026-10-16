import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, Gift, ImagePlus, Languages, MapPin, MessageSquare, Palette, PlugZap, Scissors, Sparkles, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/utils";
import { useWhatsAppSettings, type WhatsAppSettings } from "@/pages/Campaigns/whatsapp";
import { earnPoints, pointsToRupees, useLoyaltySettings } from "@/pages/Loyalty/loyalty-settings";
import { applyTierGames, useRewardDistribution } from "@/pages/PrizeWheel/reward-distribution";
import { RewardDistributionPanel } from "@/components/RewardDistributionPanel";
import { useBookingRules, type BookingRules } from "@/pages/Book/booking-rules";
import {
  serviceDisplayPrices,
  useServiceDisplaySettings,
  type ServiceDisplaySettings,
} from "@/pages/Services/service-display-settings";
import { ServicePriceDisplay } from "@/components/ServicePriceDisplay";
import {
  resolveWalkInRewardMode,
  usePublicBookingSettings,
  type WalkInRewardMode,
} from "@/pages/Book/public-booking-settings";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenant } from "@/tenant";
import { useCollection, useData } from "@/store";
import { salonLogoUrl } from "@/brand";
import { ORG_LOGO_MAX_BYTES, readOrgLogoFile } from "@/pages/Settings/org-logo";
import { ReferralPanel } from "@/pages/Loyalty/ReferralPanel";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { useT } from "@/i18n/LanguageContext";

const FIELDS: { name: keyof WhatsAppSettings; label: string; placeholder: string }[] = [
  { name: "displayNumber", label: "WhatsApp business number", placeholder: "+91 90000 00000" },
  { name: "phoneNumberId", label: "Phone number ID", placeholder: "1098xxxxxxxxxxx" },
  { name: "businessAccountId", label: "WhatsApp business account ID", placeholder: "2299xxxxxxxxxxx" },
  { name: "apiKey", label: "Permanent access token", placeholder: "EAAG…" },
  { name: "webhookToken", label: "Webhook verify token", placeholder: "luxe-verify-token" },
  { name: "apiVersion", label: "Graph API version", placeholder: "v21.0" },
];

type SettingsId =
  | "language"
  | "assets"
  | "branding"
  | "loyalty"
  | "rewards"
  | "guest-game"
  | "referral"
  | "prices"
  | "booking"
  | "maps"
  | "whatsapp"
  | "messages";

const SETTINGS_NAV: {
  heading: string;
  items: { id: SettingsId; label: string; icon: typeof Gift }[];
}[] = [
  {
    heading: "Account",
    items: [
      { id: "language", label: "Language", icon: Languages },
      { id: "assets", label: "Assets", icon: ImagePlus },
      { id: "branding", label: "Logo & branding", icon: Palette },
    ],
  },
  {
    heading: "Loyalty",
    items: [
      { id: "loyalty", label: "Loyalty points", icon: Gift },
      { id: "rewards", label: "Reward tiers", icon: Gift },
      { id: "guest-game", label: "Guest game", icon: Sparkles },
      { id: "referral", label: "Referral", icon: UserPlus },
    ],
  },
  {
    heading: "Booking",
    items: [
      { id: "booking", label: "Appointment slots", icon: CalendarClock },
      { id: "prices", label: "Service prices", icon: Scissors },
    ],
  },
  {
    heading: "Outlets",
    items: [{ id: "maps", label: "Google Maps", icon: MapPin }],
  },
  {
    heading: "Messaging",
    items: [
      { id: "whatsapp", label: "WhatsApp API", icon: PlugZap },
      { id: "messages", label: "Message log", icon: MessageSquare },
    ],
  },
];

export function Page() {
  const t = useT();
  const { settings, save, isConfigured } = useWhatsAppSettings();
  const { settings: loyalty, save: saveLoyalty } = useLoyaltySettings();
  const { config: rewardConfig, save: saveRewards } = useRewardDistribution();
  const { rules, save: saveRules } = useBookingRules();
  const { settings: displaySettings, save: saveDisplaySettings } = useServiceDisplaySettings();
  const { settings: gameSettings, save: saveGames } = usePublicBookingSettings();
  const { org, orgId, upsertTenant } = useTenant();
  const { allRows, update: updateRow } = useData();
  const orgRow = (allRows["organizations"] ?? []).find((r) => String(r["orgId"]) === String(orgId));
  const { rows: messages } = useCollection("whatsappMessages");
  const { rows: locationRows, update: updateLocation } = useCollection("locations");
  const { rows: assetRows, create: createAsset, remove: removeAsset } = useCollection("assets", { refetchOnMount: true });
  const [placeIds, setPlaceIds] = useState<Record<string, string>>({});
  const [form, setForm] = useState(settings);
  const [loyaltyForm, setLoyaltyForm] = useState(loyalty);
  const [rewardForm, setRewardForm] = useState(rewardConfig);
  const [bookingForm, setBookingForm] = useState<BookingRules>(rules);
  const [displayForm, setDisplayForm] = useState<ServiceDisplaySettings>(displaySettings);
  const [guestGame, setGuestGame] = useState<WalkInRewardMode>(resolveWalkInRewardMode(gameSettings) ?? "wheel");
  const [section, setSection] = useState<SettingsId>("language");
  const [logoUrl, setLogoUrl] = useState(String(org.logo || orgRow?.["logo"] || ""));
  const [logoBusy, setLogoBusy] = useState(false);
  const [assetBusy, setAssetBusy] = useState(false);
  const assetInputRef = useRef<HTMLInputElement>(null);
  const orgAssets = assetRows.filter((a) => String(a["orgId"]) === String(orgId));

  useEffect(() => setForm(settings), [settings]);
  useEffect(() => setLoyaltyForm(loyalty), [loyalty]);
  useEffect(() => setRewardForm(rewardConfig), [rewardConfig]);
  useEffect(() => setBookingForm(rules), [rules]);
  useEffect(() => setDisplayForm(displaySettings), [displaySettings]);
  useEffect(() => setGuestGame(resolveWalkInRewardMode(gameSettings) ?? gameSettings.walkInReward), [gameSettings]);
  useEffect(() => {
    setLogoUrl(String(org.logo || orgRow?.["logo"] || ""));
  }, [org.logo, orgRow]);
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const loc of locationRows) next[String(loc.id)] = String(loc["placeId"] ?? "");
    setPlaceIds(next);
  }, [locationRows]);

  const previewSpend = 1000;
  const previewEarn = earnPoints(previewSpend, loyaltyForm);
  const previewPts = 100;
  const previewCash = pointsToRupees(previewPts, loyaltyForm);
  const previewCatalogPrice = 1000;
  const previewDisplay = serviceDisplayPrices(previewCatalogPrice, displayForm);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col lg:flex-row lg:items-stretch">
        <nav className="shrink-0 border-b border-border bg-card lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:w-56 lg:overflow-y-auto lg:border-r lg:border-b-0">
          <div className="flex gap-4 overflow-x-auto p-3 lg:flex-col lg:gap-0 lg:overflow-x-visible">
          {SETTINGS_NAV.map((group) => (
            <div key={group.heading} className="mb-0 flex shrink-0 items-center gap-1 lg:mb-3 lg:block lg:last:mb-0">
              <p className="hidden px-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase lg:block">
                {t(group.heading)}
              </p>
              <div className="flex gap-1 lg:block lg:space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = section === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSection(item.id)}
                      className={cn(
                        "flex shrink-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm whitespace-nowrap",
                        "lg:w-full",
                        active ? "bg-primary/10 font-medium text-primary" : "text-foreground hover:bg-muted",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {t(item.label)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          </div>
        </nav>

        <div className="min-w-0 flex-1">
      {section === "assets" ? (
      <section className="p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <ImagePlus className="size-5 text-primary" />
          <h2 className="font-display text-lg">{t("Assets")}</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("Upload any image. It is compressed to under 5 KB, stored as an asset, and given an id. Pick that id on Logo & branding to show it as the salon logo.")}
        </p>
        <Separator className="my-4" />
        <input
          ref={assetInputRef}
          id="org-asset-file"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            void (async () => {
              try {
                const dataUrl = await readOrgLogoFile(file);
                setAssetBusy(true);
                await createAsset({
                  orgId: Number(orgId),
                  kind: "image",
                  mimeType: "image/jpeg",
                  content: dataUrl,
                });
                toast.success("Asset compressed and uploaded");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not upload asset");
              } finally {
                setAssetBusy(false);
              }
            })();
          }}
        />
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button type="button" disabled={assetBusy} onClick={() => assetInputRef.current?.click()}>
            {assetBusy ? t("Uploading…") : t("Upload image")}
          </Button>
          <p className="text-xs text-muted-foreground">
            Compressed to {ORG_LOGO_MAX_BYTES / 1024} KB JPEG before save. PNG, JPG, GIF, WebP or SVG.
          </p>
        </div>
        {orgAssets.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("No assets yet. Upload an image to get an id.")}</p>
        ) : (
          <div className="flex flex-wrap gap-5">
            {orgAssets.map((asset) => {
              const id = String(asset.id);
              const inUse = logoUrl === id;
              return (
                <div
                  key={id}
                  className={cn(
                    "w-[11.5rem] rounded-2xl border bg-card p-4 shadow-sm",
                    inUse ? "border-primary/40 ring-2 ring-primary/15" : "border-border",
                  )}
                >
                  <div className="relative rounded-xl bg-muted/40 p-3">
                    <img
                      src={salonLogoUrl(id)}
                      alt=""
                      width={88}
                      height={88}
                      className="mx-auto size-[5.5rem] object-contain"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute top-2 right-2 size-8 rounded-full shadow-sm"
                      disabled={assetBusy}
                      aria-label={`Delete asset ${id}`}
                      onClick={() => {
                        void (async () => {
                          try {
                            setAssetBusy(true);
                            if (inUse && orgRow) {
                              await updateRow("organizations", String(orgRow.id), { ...orgRow, logo: "" });
                              upsertTenant({ ...org, logo: "" });
                              setLogoUrl("");
                            }
                            await removeAsset(id);
                            toast.success(`Asset ${id} deleted`);
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Could not delete asset");
                          } finally {
                            setAssetBusy(false);
                          }
                        })();
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <div className="mt-3 space-y-2">
                    <p className="truncate text-sm font-medium">Asset {id}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant={inUse ? "secondary" : "outline"}
                      className="h-8 w-full"
                      disabled={logoBusy || !orgRow || inUse}
                      onClick={() => {
                        if (!orgRow) return;
                        void (async () => {
                          try {
                            setLogoBusy(true);
                            await updateRow("organizations", String(orgRow.id), { ...orgRow, logo: id });
                            upsertTenant({ ...org, logo: id });
                            setLogoUrl(id);
                            toast.success(`Salon logo set to asset ${id}`);
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Could not set logo");
                          } finally {
                            setLogoBusy(false);
                          }
                        })();
                      }}
                    >
                      {inUse ? t("Current logo") : t("Use as logo")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      ) : null}
      {section === "branding" ? (
      <section className="p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Palette className="size-5 text-primary" />
          <h2 className="font-display text-lg">{t("Logo & branding")}</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("Choose an uploaded asset id as this salon’s logo. Upload files on the Assets screen.")}
        </p>
        <Separator className="my-4" />
        <div className="flex flex-wrap items-start gap-6">
          <img
            src={salonLogoUrl(logoUrl)}
            alt={org.name}
            width={96}
            height={96}
            className="size-24 rounded-lg border border-border bg-card object-contain p-1"
          />
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-sm">
              {/^\d+$/.test(logoUrl)
                ? `Using asset ${logoUrl}`
                : logoUrl
                  ? "A logo is set for this salon"
                  : "No custom logo yet — using the Krios mark"}
            </p>
            {orgAssets.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("No assets yet. Open Assets and upload an image first.")}</p>
            ) : (
              <div>
                <Label className="mb-1.5">{t("Logo asset")}</Label>
                <Select
                  value={/^\d+$/.test(logoUrl) ? logoUrl : undefined}
                  onValueChange={(id) => {
                    if (!orgRow) return toast.error("Organisation not loaded");
                    void (async () => {
                      try {
                        setLogoBusy(true);
                        await updateRow("organizations", String(orgRow.id), { ...orgRow, logo: id });
                        upsertTenant({ ...org, logo: id });
                        setLogoUrl(id);
                        toast.success(`Salon logo set to asset ${id}`);
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Could not set logo");
                      } finally {
                        setLogoBusy(false);
                      }
                    })();
                  }}
                  disabled={logoBusy}
                >
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder={t("Select asset id…")} />
                  </SelectTrigger>
                  <SelectContent>
                    {orgAssets.map((asset) => (
                      <SelectItem key={String(asset.id)} value={String(asset.id)}>
                        Asset {String(asset.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setSection("assets")}>
                {t("Open Assets")}
              </Button>
              {logoUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={logoBusy || !orgRow}
                  onClick={() => {
                    if (!orgRow) return;
                    void (async () => {
                      try {
                        setLogoBusy(true);
                        await updateRow("organizations", String(orgRow.id), { ...orgRow, logo: "" });
                        upsertTenant({ ...org, logo: "" });
                        setLogoUrl("");
                        toast.success("Salon logo removed");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Could not remove logo");
                      } finally {
                        setLogoBusy(false);
                      }
                    })();
                  }}
                >
                  {t("Remove")}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </section>
      ) : null}
      {section === "language" ? (
      <section className="p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Languages className="size-5 text-primary" />
          <h2 className="font-display text-lg">{t("Language")}</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("Choose the language for this user. Default is English. It applies on every screen after you save it here.")}
        </p>
        <Separator className="my-4" />
        <LanguageSwitcher notify />
      </section>
      ) : null}
      {section === "loyalty" ? (
      <section className="p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Gift className="size-5 text-primary" />
          <h2 className="font-display text-lg">Loyalty points</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Set how customers earn points on spend, and how those points convert back to rupees at billing.
        </p>
        <Separator className="my-4" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="earnUnitRupees" className="mb-1.5">
              Spend ₹ this many to earn points
            </Label>
            <Input
              id="earnUnitRupees"
              type="number"
              min={1}
              value={loyaltyForm.earnUnitRupees}
              onChange={(e) => setLoyaltyForm((p) => ({ ...p, earnUnitRupees: Number(e.target.value) }))}
            />
            <p className="mt-1 text-xs text-muted-foreground">Glow Rewards: 100 means 1 point per ₹100.</p>
          </div>
          <div>
            <Label htmlFor="pointsPerUnit" className="mb-1.5">
              Points earned per unit
            </Label>
            <Input
              id="pointsPerUnit"
              type="number"
              min={1}
              value={loyaltyForm.pointsPerUnit}
              onChange={(e) => setLoyaltyForm((p) => ({ ...p, pointsPerUnit: Number(e.target.value) }))}
            />
          </div>
          <div>
            <Label htmlFor="rupeesPerPoint" className="mb-1.5">
              ₹ value of 1 point (redeem)
            </Label>
            <Input
              id="rupeesPerPoint"
              type="number"
              min={0}
              step="0.01"
              value={loyaltyForm.rupeesPerPoint}
              onChange={(e) => setLoyaltyForm((p) => ({ ...p, rupeesPerPoint: Number(e.target.value) }))}
            />
          </div>
          <div>
            <Label htmlFor="minSpend" className="mb-1.5">
              Minimum eligible spend
            </Label>
            <Input
              id="minSpend"
              type="number"
              min={0}
              value={loyaltyForm.minSpend}
              onChange={(e) => setLoyaltyForm((p) => ({ ...p, minSpend: Number(e.target.value) }))}
            />
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <p>
            Spend ₹{previewSpend.toLocaleString("en-IN")} → earn <strong>{previewEarn}</strong> points
            {loyaltyForm.minSpend ? ` (min spend ₹${loyaltyForm.minSpend})` : ""}
          </p>
          <p className="mt-1">
            Redeem {previewPts} points → <strong>₹{previewCash.toLocaleString("en-IN")}</strong> off
          </p>
        </div>
        <Button
          className="mt-5"
          onClick={() => {
            void saveLoyalty(loyaltyForm);
          }}
        >
          <CheckCircle2 /> Save loyalty rates
        </Button>
      </section>
      ) : null}

      {section === "rewards" ? (
      <section className="p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Gift className="size-5 text-primary" />
          <h2 className="font-display text-lg">Reward tiers</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          For each tier (Bronze, Silver, Gold, Platinum) choose Scratch card, Prize wheel, or Both, plus how many
          prizes of that tier sit on each game. Offer validity (default 30 days) is how long a prize or issued offer
          stays usable at POS.
        </p>
        <Separator className="my-4" />
        <RewardDistributionPanel value={rewardForm} onChange={setRewardForm} />
        <Button
          className="mt-5"
          onClick={() => {
            saveRewards(applyTierGames(rewardForm));
            toast.success("Reward tiers saved");
          }}
        >
          <CheckCircle2 /> Save reward tiers
        </Button>
      </section>
      ) : null}

      {section === "guest-game" ? (
      <section className="p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <h2 className="font-display text-lg">Guest reward game</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the one game a customer plays on the public booking page and at walk-in. Prizes are the same list for
          both games — edit them on{" "}
          <Link to="/prize-wheel" className="text-primary underline-offset-4 hover:underline">
            Guest prizes
          </Link>
          . The prize stays pending and is the discount on their next POS bill.
        </p>
        <Separator className="my-4" />
        <div className="max-w-xs">
          <Label className="mb-1.5">Customer uses</Label>
          <Select value={guestGame} onValueChange={(value) => setGuestGame(value as WalkInRewardMode)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wheel">Spin wheel</SelectItem>
              <SelectItem value="scratch">Scratch card</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          className="mt-5"
          onClick={() => {
            saveGames({
              showPrizeWheel: guestGame === "wheel",
              showScratchCard: guestGame === "scratch",
              walkInReward: guestGame,
            });
            toast.success(guestGame === "wheel" ? "Customers will spin the wheel" : "Customers will scratch a card");
          }}
        >
          <CheckCircle2 /> Save guest game
        </Button>
      </section>
      ) : null}

      {section === "referral" ? <ReferralPanel /> : null}

      {section === "prices" ? (
      <section className="p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Scissors className="size-5 text-primary" />
          <h2 className="font-display text-lg">Service price display</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Show every service with a higher list price on public booking, nearby booking, and QR pages. Customers still
          pay the catalog price you set in Services — only the displayed comparison price changes.
        </p>
        <Separator className="my-4" />
        <div className="max-w-xs space-y-4">
          <div>
            <Label htmlFor="serviceMarkupPct" className="mb-1.5">
              List price markup (%)
            </Label>
            <Input
              id="serviceMarkupPct"
              type="number"
              min={0}
              max={100}
              value={displayForm.markupPct}
              onChange={(e) => setDisplayForm((p) => ({ ...p, markupPct: Number(e.target.value) }))}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Set to 0 to hide the higher price. Default is 10% — a ₹1,000 service shows as{" "}
              <span className="line-through">₹1,100</span> ₹1,000.
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Preview</p>
          <p className="mt-2 flex flex-wrap items-center gap-2">
            Haircut · 45 min · <ServicePriceDisplay price={previewCatalogPrice} settings={displayForm} />
          </p>
          {previewDisplay.markupPct > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Catalog price ₹{previewCatalogPrice.toLocaleString("en-IN")} → list ₹
              {previewDisplay.list.toLocaleString("en-IN")}{" "}
              {`(${previewDisplay.markupPct}% higher)`}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Markup off — customers see only the catalog price.</p>
          )}
        </div>
        <Button
          className="mt-5"
          onClick={() => {
            saveDisplaySettings(displayForm);
            toast.success(
              displayForm.markupPct > 0
                ? `Services will show ${displayForm.markupPct}% higher list price`
                : "Service list price markup turned off",
            );
          }}
        >
          <CheckCircle2 /> Save service display
        </Button>
      </section>
      ) : null}

      {section === "booking" ? (
      <section className="p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-5 text-primary" />
          <h2 className="font-display text-lg">Appointment slots & booking rules</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Opening hours, slot length, and how far ahead a guest can book. Turn a day off to mark it as leave — guests
          cannot book that weekday.
        </p>
        <Separator className="my-4" />
        <div className="divide-y divide-border rounded-lg border border-border">
          {bookingForm.hours.map((h, i) => (
            <div key={h.day} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Switch
                checked={h.open}
                onCheckedChange={(checked) =>
                  setBookingForm((p) => ({
                    ...p,
                    hours: p.hours.map((x, xi) => (xi === i ? { ...x, open: checked } : x)),
                  }))
                }
              />
              <span className="w-24 text-sm">{h.day}</span>
              {h.open ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    className="w-32"
                    value={h.from}
                    onChange={(e) =>
                      setBookingForm((p) => ({
                        ...p,
                        hours: p.hours.map((x, xi) => (xi === i ? { ...x, from: e.target.value } : x)),
                      }))
                    }
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="time"
                    className="w-32"
                    value={h.to}
                    onChange={(e) =>
                      setBookingForm((p) => ({
                        ...p,
                        hours: p.hours.map((x, xi) => (xi === i ? { ...x, to: e.target.value } : x)),
                      }))
                    }
                  />
                </div>
              ) : (
                <Badge variant="secondary">Leave</Badge>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="slotDuration" className="mb-1.5">Slot duration (minutes)</Label>
            <Input id="slotDuration" type="number" min={5} value={bookingForm.duration} onChange={(e) => setBookingForm((p) => ({ ...p, duration: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="slotBuffer" className="mb-1.5">Buffer between appointments (minutes)</Label>
            <Input id="slotBuffer" type="number" min={0} value={bookingForm.buffer} onChange={(e) => setBookingForm((p) => ({ ...p, buffer: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="maxPerSlot" className="mb-1.5">Max bookings per slot</Label>
            <Input id="maxPerSlot" type="number" min={1} value={bookingForm.maxPerSlot} onChange={(e) => setBookingForm((p) => ({ ...p, maxPerSlot: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="advanceDays" className="mb-1.5">How many days ahead can guests book?</Label>
            <Input
              id="advanceDays"
              type="number"
              min={0}
              value={bookingForm.advanceDays}
              onChange={(e) => setBookingForm((p) => ({ ...p, advanceDays: e.target.value }))}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              5 = today plus 5 days. 0 = any future day.
            </p>
          </div>
          <div>
            <Label htmlFor="minNotice" className="mb-1.5">Minimum booking notice (hours)</Label>
            <Input id="minNotice" type="number" min={0} value={bookingForm.minNotice} onChange={(e) => setBookingForm((p) => ({ ...p, minNotice: e.target.value }))} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Switch checked={bookingForm.onlineBooking} onCheckedChange={(checked) => setBookingForm((p) => ({ ...p, onlineBooking: checked }))} />
          <span className="text-sm">Allow customers to book online</span>
        </div>
        <Button
          className="mt-5"
          onClick={() => {
            saveRules(bookingForm);
            toast.success("Booking rules saved");
          }}
        >
          <CheckCircle2 /> Save booking rules
        </Button>
      </section>
      ) : null}

      {section === "maps" ? (
      <section className="p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <MapPin className="size-5 text-primary" />
          <h2 className="font-display text-lg">Google Maps listings</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          After the outlet is published on Google Maps, paste its Place ID. Feedback stores those comments and
          refreshes from Google when stale or when you click Refresh. Find a Place ID with Google&apos;s{" "}
          <a
            className="text-primary underline-offset-4 hover:underline"
            href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder"
            target="_blank"
            rel="noreferrer"
          >
            Place ID finder
          </a>
          . Live pull needs <code className="text-xs">VITE_GOOGLE_MAPS_API_KEY</code>.
        </p>
        <Separator className="my-4" />
        <div className="space-y-4">
          {locationRows.map((loc) => (
            <div key={String(loc.id)}>
              <Label htmlFor={`place-${loc.id}`} className="mb-1.5">
                {String(loc["name"])} — Place ID
              </Label>
              <Input
                id={`place-${loc.id}`}
                value={placeIds[String(loc.id)] ?? ""}
                placeholder="ChIJ…"
                onChange={(e) => setPlaceIds((p) => ({ ...p, [String(loc.id)]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <Button
          className="mt-5"
          onClick={() => {
            for (const loc of locationRows) {
              updateLocation(String(loc.id), { ...loc, placeId: placeIds[String(loc.id)] ?? "" });
            }
            toast.success("Google Place IDs saved");
          }}
        >
          <CheckCircle2 /> Save Place IDs
        </Button>
      </section>
      ) : null}

      {section === "whatsapp" ? (
      <section className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PlugZap className="size-5 text-primary" />
            <h2 className="font-display text-lg">Meta WhatsApp Business API</h2>
          </div>
          <Badge variant={isConfigured ? "default" : "secondary"}>
            {isConfigured ? "Connected" : "Not connected"}
          </Badge>
        </div>
        <Separator className="my-4" />
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.name}>
              <Label htmlFor={f.name} className="mb-1.5">
                {f.label}
              </Label>
              <Input
                id={f.name}
                value={String(form[f.name] ?? "")}
                placeholder={f.placeholder}
                type={f.name === "apiKey" ? "password" : "text"}
                onChange={(e) => setForm((p) => ({ ...p, [f.name]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              save({ ...form, connected: true });
              toast.success("WhatsApp API connected", { description: form.displayNumber || org.name });
            }}
          >
            <CheckCircle2 /> Save & connect
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              save({ ...form, connected: false });
              toast.message("Disconnected — messages will be queued");
            }}
          >
            Disconnect
          </Button>
        </div>
      </section>
      ) : null}

      {section === "messages" ? (
      <section>
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-display text-lg">Message log</h2>
          <Badge variant="secondary">{messages.length} messages</Badge>
        </div>
        {messages.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">No WhatsApp messages sent from this location yet.</p>
        )}
        {messages.length > 0 && (
          <ul className="divide-y divide-border">
            {messages.map((m) => (
              <li key={String(m.id)} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <div>
                  <p className="font-medium">
                    {String(m["recipient"])} · {String(m["to"])}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {String(m["kind"])} {String(m["reference"])} · {String(m["sentAt"])}
                  </p>
                </div>
                <Badge variant={String(m["status"]).startsWith("Sent") ? "default" : "secondary"}>
                  {String(m["status"])}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
      ) : null}
        </div>
    </div>
  );
}
