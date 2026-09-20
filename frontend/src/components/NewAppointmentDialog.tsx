import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { enrichAppointmentRow } from "@/lib/appointments/appointment-resolve";
import { useCollection, useData, type Row } from "@/lib/store";
import { useTenant } from "@/lib/tenant";

export function NewAppointmentDialog({
  customer,
  trigger,
}: {
  customer: Row;
  trigger?: ReactNode;
}) {
  const { create } = useCollection("appointments");
  const { allRows, orgId } = useData();
  const { org, location, locationId } = useTenant();
  const [open, setOpen] = useState(false);
  const [service, setService] = useState("");
  const [staff, setStaff] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00");

  const services = (allRows["services"] ?? []).filter((s) => String(s["orgId"]) === orgId);
  const staffRows = (allRows["staff"] ?? []).filter((s) => String(s["orgId"]) === orgId);
  const customers = (allRows["customers"] ?? []).filter((c) => String(c["orgId"]) === orgId);
  const outlet =
    location?.name ??
    org.locations.find((l) => l.locationId === (locationId === "all" ? customer["locationId"] : locationId))?.name ??
    String(customer["outlet"] ?? "");

  function save() {
    if (!service) return void toast.error("Select a service");
    if (!staff) return void toast.error("Select a stylist");
    const base: Row = {
      id: `A-${Math.floor(1000 + Math.random() * 9000)}`,
      customer: String(customer["name"]),
      customerId: String(customer.id),
      service,
      staff,
      outlet,
      date,
      time,
      duration: 60,
      status: "Confirmed",
      source: "Walk-in",
      orgId,
      locationId: locationId === "all" ? String(customer["locationId"] ?? org.locations[0]?.locationId ?? "") : locationId,
    };
    const row = enrichAppointmentRow(base, customers, services, staffRows);
    create(row);
    toast.success("Appointment booked", { description: `${service} · ${date} ${time}` });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm">New appointment</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book for {String(customer["name"])}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <Label className="mb-1.5">Service</Label>
            <Select value={service} onValueChange={setService}>
              <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={String(s.id)} value={String(s["name"])}>{String(s["name"])}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5">Stylist</Label>
            <Select value={staff} onValueChange={setStaff}>
              <SelectTrigger><SelectValue placeholder="Select stylist" /></SelectTrigger>
              <SelectContent>
                {staffRows.map((s) => (
                  <SelectItem key={String(s.id)} value={String(s["name"])}>{String(s["name"])}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5">Time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={save}>Create appointment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
