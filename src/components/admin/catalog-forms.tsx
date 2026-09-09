"use client";

import { useActionState } from "react";
import type { EditionStatus, PackageKind } from "@prisma/client";
import {
  archivePackageAction,
  createEditionAction,
  createPackageAction,
  createRaceAction,
  updateEditionAction,
  updatePackageAction,
  updateRaceAction,
  uploadRaceImageAction,
} from "@/app/actions/catalog";
import type { FormState } from "@/app/actions/marketing";
import { fromMinor } from "@/lib/money";
import { Button, Field, Notice, inputClass } from "@/components/ui";

const initial: FormState = { status: "idle" };

const EDITION_STATUSES: EditionStatus[] = [
  "DRAFT",
  "ANNOUNCED",
  "ON_SALE",
  "WAITLIST",
  "SOLD_OUT",
  "COMPLETED",
  "CANCELLED",
];

const PACKAGE_KINDS: PackageKind[] = [
  "SEAT",
  "TABLE",
  "SUITE",
  "PADDOCK",
  "ADD_ON",
  "TRANSFER",
  "ACCOMMODATION",
];

function Result({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <Notice tone={state.status === "error" ? "error" : "success"}>{state.message}</Notice>
  );
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function RaceForm({
  race,
}: {
  race?: {
    id: string;
    name: string;
    city: string;
    country: string;
    countryCode: string;
    circuit: string | null;
    timezone: string;
    summary: string | null;
  };
}) {
  const [state, action, pending] = useActionState(
    race ? updateRaceAction : createRaceAction,
    initial,
  );

  return (
    <form action={action} className="space-y-6 border border-paper/15 p-6">
      <p className="eyebrow text-paper/40">{race ? "Race details" : "New race"}</p>
      {race ? <input type="hidden" name="raceId" value={race.id} /> : null}
      <div className="grid gap-6 md:grid-cols-3">
        <Field label="Name" hint="e.g. Miami Grand Prix">
          <input className={inputClass} name="name" defaultValue={race?.name} required />
        </Field>
        <Field label="City">
          <input className={inputClass} name="city" defaultValue={race?.city} required />
        </Field>
        <Field label="Country">
          <input
            className={inputClass}
            name="country"
            defaultValue={race?.country}
            required
          />
        </Field>
        <Field label="Country code" hint="ISO alpha-2 or alpha-3.">
          <input
            className={inputClass}
            name="countryCode"
            defaultValue={race?.countryCode}
            maxLength={3}
            required
          />
        </Field>
        <Field label="Circuit">
          <input className={inputClass} name="circuit" defaultValue={race?.circuit ?? ""} />
        </Field>
        <Field label="Timezone" hint="IANA name, e.g. America/New_York.">
          <input
            className={inputClass}
            name="timezone"
            defaultValue={race?.timezone ?? "UTC"}
          />
        </Field>
      </div>
      <Field label="Summary">
        <input className={inputClass} name="summary" defaultValue={race?.summary ?? ""} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : race ? "Save race" : "Create race"}
      </Button>
      <Result state={state} />
    </form>
  );
}

export function RaceImageForm({
  raceId,
  heroImage,
}: {
  raceId: string;
  heroImage: string | null;
}) {
  const [state, action, pending] = useActionState(uploadRaceImageAction, initial);

  return (
    <form action={action} className="space-y-6 border border-paper/15 p-6">
      <p className="eyebrow text-paper/40">Race artwork</p>
      <p className="text-xs text-paper/40">
        {heroImage ? `Current: ${heroImage}` : "No custom image — a bundled photo is used."}
      </p>
      <input type="hidden" name="raceId" value={raceId} />
      <Field label="Image" hint="JPEG, PNG, WebP or AVIF, up to 12 MB.">
        <input
          className={inputClass}
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          required
        />
      </Field>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Uploading…" : "Upload"}
      </Button>
      <Result state={state} />
    </form>
  );
}

export function EditionForm({
  races,
  edition,
}: {
  races?: Array<{ id: string; name: string }>;
  edition?: {
    id: string;
    status: EditionStatus;
    startsAt: Date;
    endsAt: Date;
    currency: string;
    headline: string | null;
    body: string | null;
    capacity: number;
  };
}) {
  const [state, action, pending] = useActionState(
    edition ? updateEditionAction : createEditionAction,
    initial,
  );

  return (
    <form action={action} className="space-y-6 border border-paper/15 p-6">
      <p className="eyebrow text-paper/40">
        {edition ? "Edition details" : "New race edition"}
      </p>
      {edition ? <input type="hidden" name="editionId" value={edition.id} /> : null}
      <div className="grid gap-6 md:grid-cols-3">
        {races ? (
          <>
            <Field label="Race">
              <select className={`${inputClass} py-3`} name="raceId" required>
                {races.map((race) => (
                  <option key={race.id} value={race.id} className="bg-ink">
                    {race.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Season">
              <input
                className={inputClass}
                name="season"
                type="number"
                defaultValue={new Date().getFullYear() + 1}
                required
              />
            </Field>
          </>
        ) : null}
        <Field label="Status">
          <select
            className={`${inputClass} py-3`}
            name="status"
            defaultValue={edition?.status ?? "DRAFT"}
          >
            {EDITION_STATUSES.map((status) => (
              <option key={status} value={status} className="bg-ink">
                {status.replace("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Starts">
          <input
            className={inputClass}
            name="startsAt"
            type="date"
            defaultValue={edition ? isoDate(edition.startsAt) : ""}
            required
          />
        </Field>
        <Field label="Ends">
          <input
            className={inputClass}
            name="endsAt"
            type="date"
            defaultValue={edition ? isoDate(edition.endsAt) : ""}
            required
          />
        </Field>
        <Field label="Currency" hint="Prices for every package in this round.">
          <input
            className={inputClass}
            name="currency"
            maxLength={3}
            defaultValue={edition?.currency ?? "USD"}
            required
          />
        </Field>
        <Field label="Capacity" hint="Guests the venue can hold. 0 = unlimited.">
          <input
            className={inputClass}
            name="capacity"
            type="number"
            min={0}
            defaultValue={edition?.capacity ?? 0}
          />
        </Field>
      </div>
      <Field label="Headline">
        <input
          className={inputClass}
          name="headline"
          defaultValue={edition?.headline ?? ""}
        />
      </Field>
      <Field label="Body">
        <textarea
          className={`${inputClass} min-h-28`}
          name="body"
          defaultValue={edition?.body ?? ""}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : edition ? "Save edition" : "Create edition"}
      </Button>
      <Result state={state} />
    </form>
  );
}

type PackageValues = {
  id: string;
  sku: string;
  name: string;
  kind: PackageKind;
  description: string | null;
  priceMinor: number;
  seatsPerUnit: number;
  totalUnits: number;
  heldUnits: number;
  inviteOnly: boolean;
  active: boolean;
  sortOrder: number;
};

export function PackageForm({
  editionId,
  currency,
  pkg,
  committed,
}: {
  editionId: string;
  currency: string;
  pkg?: PackageValues;
  committed?: number;
}) {
  const [state, action, pending] = useActionState(
    pkg ? updatePackageAction : createPackageAction,
    initial,
  );

  return (
    <form action={action} className="space-y-6 border border-paper/15 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="eyebrow text-paper/40">{pkg ? pkg.name : "New package"}</p>
        {pkg ? (
          <span className="font-mono text-xs text-paper/40">{pkg.sku}</span>
        ) : null}
      </div>
      {pkg ? (
        <input type="hidden" name="packageId" value={pkg.id} />
      ) : (
        <input type="hidden" name="editionId" value={editionId} />
      )}
      <div className="grid gap-6 md:grid-cols-4">
        <Field label="Name">
          <input className={inputClass} name="name" defaultValue={pkg?.name} required />
        </Field>
        <Field label="Kind">
          <select
            className={`${inputClass} py-3`}
            name="kind"
            defaultValue={pkg?.kind ?? "SEAT"}
          >
            {PACKAGE_KINDS.map((kind) => (
              <option key={kind} value={kind} className="bg-ink">
                {kind.replace("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Price (${currency})`} hint="Per unit, in major units.">
          <input
            className={inputClass}
            name="price"
            type="number"
            step="0.01"
            min={0}
            defaultValue={pkg ? fromMinor(pkg.priceMinor, currency) : ""}
            required
          />
        </Field>
        <Field label="Guests per unit">
          <input
            className={inputClass}
            name="seatsPerUnit"
            type="number"
            min={1}
            defaultValue={pkg?.seatsPerUnit ?? 1}
            required
          />
        </Field>
        <Field
          label="Total units"
          hint={committed ? `${committed} already sold or held.` : undefined}
        >
          <input
            className={inputClass}
            name="totalUnits"
            type="number"
            min={0}
            defaultValue={pkg?.totalUnits ?? 0}
            required
          />
        </Field>
        <Field label="Withheld units" hint="Kept back for partners and comps.">
          <input
            className={inputClass}
            name="heldUnits"
            type="number"
            min={0}
            defaultValue={pkg?.heldUnits ?? 0}
          />
        </Field>
        <Field label="Sort order">
          <input
            className={inputClass}
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={pkg?.sortOrder ?? 0}
          />
        </Field>
        {pkg ? null : (
          <Field label="SKU" hint="Generated from the name when left blank.">
            <input className={inputClass} name="sku" />
          </Field>
        )}
      </div>
      <Field label="Description">
        <textarea
          className={`${inputClass} min-h-20`}
          name="description"
          defaultValue={pkg?.description ?? ""}
        />
      </Field>
      <div className="flex flex-wrap gap-6 text-sm text-paper/60">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="inviteOnly"
            defaultChecked={pkg ? pkg.inviteOnly : true}
          />
          Invite only (waitlist on the public page)
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" name="active" defaultChecked={pkg ? pkg.active : true} />
          Active
        </label>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : pkg ? "Save package" : "Add package"}
      </Button>
      <Result state={state} />
    </form>
  );
}

export function ArchivePackage({ packageId }: { packageId: string }) {
  const [state, action, pending] = useActionState(archivePackageAction, initial);

  return (
    <form action={action} className="flex items-center gap-3">
      <input type="hidden" name="packageId" value={packageId} />
      <Button type="submit" variant="ghost" disabled={pending}>
        {pending ? "…" : "Archive"}
      </Button>
      {state.message ? (
        <span className="text-xs text-paper/50">{state.message}</span>
      ) : null}
    </form>
  );
}
