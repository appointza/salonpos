import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarCheck, MapPin, TicketPercent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OfferCard } from "@/components/OfferCard";
import { ReferralShareCard } from "@/components/ReferralShareCard";
import { toRow } from "@/entity-row";
import { useCustomerSession } from "@/pages/Login/customer-session";
import { listCustomerLocationOffers } from "@/pages/NearbyOffers/customer-offers";
import { saveBookingPick } from "@/pages/Nearby/nearby-utils";
import { useNearbyStudios } from "@/pages/Nearby/use-nearby-studios";
import { couponService } from "@/services/coupon.service";
import { customerService, mergePosLookup } from "@/services/customer.service";
import { organizationService } from "@/services/organization.service";
import { qrOfferService } from "@/services/qrOffer.service";
import { useData } from "@/store";
import { normalizePhone } from "@/pages/Customers/customer-lookup";

export function CustomerOffersPage() {
  const { customer } = useCustomerSession();
  const { allRows, applyCache } = useData();
  const { studios, loading: studiosLoading } = useNearbyStudios();
  const [loadingOffers, setLoadingOffers] = useState(true);

  const extras = useMemo(
    () =>
      studios.map((s) => ({
        orgId: s.org.orgId,
        locationId: s.loc.locationId,
        orgName: s.org.name,
        orgSlug: s.org.slug,
        locationName: s.loc.name,
        city: s.loc.city,
        address: s.loc.address,
      })),
    [studios],
  );

  const orgIds = useMemo(() => [...new Set(extras.map((e) => Number(e.orgId) || 0).filter(Boolean))], [extras]);

  useEffect(() => {
    if (orgIds.length === 0) {
      setLoadingOffers(false);
      return;
    }
    let cancelled = false;
    setLoadingOffers(true);
    void Promise.all(
      orgIds.map(async (orgId) => {
        const [offers, coupons, orgs] = await Promise.all([
          qrOfferService.selectPublic({ orgId }).catch(() => []),
          couponService.selectPublic({ orgId }).catch(() => []),
          organizationService.selectPublic({ orgId }).catch(() => []),
        ]);
        return { orgId, offers, coupons, orgs };
      }),
    )
      .then((batches) => {
        if (cancelled) return;
        applyCache((prev) => {
          let next = { ...prev };
          for (const batch of batches) {
            const oid = String(batch.orgId);
            next = {
              ...next,
              qrOffers: [
                ...(next["qrOffers"] ?? []).filter((r) => String(r["orgId"]) !== oid),
                ...batch.offers.map((item) => toRow(item as unknown as Record<string, unknown>)),
              ],
              coupons: [
                ...(next["coupons"] ?? []).filter((r) => String(r["orgId"]) !== oid),
                ...batch.coupons.map((item) => toRow(item as unknown as Record<string, unknown>)),
              ],
              organizations: [
                ...(next["organizations"] ?? []).filter((r) => String(r["orgId"]) !== oid),
                ...batch.orgs.map((item) => toRow(item as unknown as Record<string, unknown>)),
              ],
            };
          }
          return next;
        });
        setLoadingOffers(false);
      })
      .catch(() => {
        if (!cancelled) setLoadingOffers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orgIds, applyCache]);

  useEffect(() => {
    if (!customer?.phone || orgIds.length === 0) return;
    const digits = normalizePhone(customer.phone);
    if (digits.length < 10) return;
    let cancelled = false;
    void Promise.all(
      orgIds.map((orgId) => {
        const loc = extras.find((e) => Number(e.orgId) === orgId);
        return customerService
          .lookupAtPos(
            {
              orgId,
              locationId: Number(loc?.locationId) || 0,
              phone: digits,
            },
            true,
          )
          .catch(() => null);
      }),
    ).then((results) => {
      if (cancelled) return;
      applyCache((prev) => {
        let next = prev;
        for (const res of results) {
          if (res?.customer) next = mergePosLookup(next, res);
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [customer?.phone, orgIds, extras, applyCache]);

  const groups = useMemo(
    () => (customer ? listCustomerLocationOffers(allRows, customer.phone, extras) : []),
    [allRows, customer, extras],
  );

  if (!customer) return null;

  const loading = studiosLoading || loadingOffers;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="font-display text-2xl font-semibold">Offers by salon</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          See which outlet has which deal, and how many days the coupon stays valid. Your unused coupons are listed under
          each salon you have visited.
        </p>
      </section>

      {loading && groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading offers…</p>
      ) : groups.length === 0 ? (
        <section className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <TicketPercent className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 font-medium">No live offers yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Check nearby salons or visit a store to pick up coupons.</p>
          <Button className="mt-4" asChild>
            <Link to="/nearby">Find salons near me</Link>
          </Button>
        </section>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-semibold">{group.orgName}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0 text-primary" />
                  {group.locationName}
                  {group.city ? ` · ${group.city}` : ""}
                </p>
                {group.address ? <p className="mt-1 text-xs text-muted-foreground">{group.address}</p> : null}
              </div>
              <Badge variant="secondary">
                Coupons last {group.prizeValidityDays} day{group.prizeValidityDays === 1 ? "" : "s"} after you get them
              </Badge>
            </div>

            {group.referralCode && group.orgSlug ? (
              <ReferralShareCard
                className="mt-4"
                code={group.referralCode}
                salonName={group.orgName}
                orgSlug={group.orgSlug}
                locationId={group.locationId}
              />
            ) : null}

            {group.mine.length > 0 ? (
              <div className="mt-4">
                <p className="text-sm font-medium">Your coupons</p>
                <ul className="mt-2 space-y-2">
                  {group.mine.map((item) => (
                    <li key={item.id} className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                        {item.code ? ` · ${item.code}` : ""}
                      </p>
                      <p className="mt-1 text-xs font-medium text-primary">{item.validityLabel}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {group.live.length > 0 ? (
              <div className="mt-4">
                <p className="text-sm font-medium">Live at this outlet</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.live.map((item) =>
                    item.row ? (
                      <OfferCard
                        key={item.id}
                        offer={item.row}
                        outletName={group.locationName}
                        readOnly
                        validityLabel={item.validityLabel}
                      />
                    ) : (
                      <article key={item.id} className="rounded-xl border border-border bg-muted/20 p-4">
                        <Badge variant="outline">{item.kind === "coupon" ? "Coupon" : "Offer"}</Badge>
                        <h3 className="mt-2 font-display text-base">{item.title}</h3>
                        {item.code ? <p className="mt-1 font-mono text-xs">{item.code}</p> : null}
                        <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                        <p className="mt-2 text-xs font-medium text-primary">{item.validityLabel}</p>
                      </article>
                    ),
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">No campaign running at this outlet right now.</p>
            )}

            <Button className="mt-4" variant="outline" size="sm" asChild>
              <Link
                to="/nearby/booking"
                onClick={() => saveBookingPick({ orgId: group.orgId, locationId: group.locationId })}
              >
                <CalendarCheck />
                Book this salon
              </Link>
            </Button>
          </section>
        ))
      )}
    </div>
  );
}
