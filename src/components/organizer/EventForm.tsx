'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { combineDateAndTime, splitDateTimeInput } from '@/lib/date-time-input';
import { Button, Field, Input, Select, Textarea } from '@/components/ui';
import { CoverImageUploader } from '@/components/events/CoverImageUploader';

export type EventFormValues = {
  title: string;
  shortDescription: string;
  description: string;
  category: string;
  venue: string;
  address: string;
  city: string;
  startsAt: string;
  endsAt: string;
  eventType: 'paid' | 'free';
  coverImage: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
};

const EMPTY: EventFormValues = {
  title: '',
  shortDescription: '',
  description: '',
  category: 'otros',
  venue: '',
  address: '',
  city: 'Santiago',
  startsAt: '',
  endsAt: '',
  eventType: 'paid',
  coverImage: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
};

const CATEGORIES = [
  'concierto',
  'festival',
  'exposicion',
  'charla',
  'obra-de-teatro',
  'evento-interactivo',
  'comedia',
  'fiesta-y-vida-nocturna',
  'networking',
  'negocios',
  'tecnologia',
  'gastronomia',
  'curso-taller',
  'salud-y-bienestar',
  'deportes',
  'familia',
  'cine',
  'beneficencia',
  'religion-espiritualidad',
  'otros',
];

type EventFormProps =
  | { mode: 'create'; eventId?: undefined; initial?: undefined }
  | { mode: 'edit'; eventId: string; initial: EventFormValues };

export function EventForm(props: EventFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<EventFormValues>(props.initial ?? EMPTY);
  const initialStart = splitDateTimeInput(values.startsAt);
  const initialEnd = splitDateTimeInput(values.endsAt);
  const [startDate, setStartDate] = useState(initialStart.date);
  const [startTime, setStartTime] = useState(initialStart.time);
  const [endDate, setEndDate] = useState(initialEnd.date);
  const [endTime, setEndTime] = useState(initialEnd.time);
  const [busy, setBusy] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      ...values,
      startsAt: combineDateAndTime(startDate, startTime),
      endsAt: combineDateAndTime(endDate, endTime),
    };

    try {
      const res = await fetch(
        props.mode === 'create' ? '/api/organizer/events' : `/api/organizer/events/${props.eventId}`,
        {
          method: props.mode === 'create' ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Could not save the event.');
      if (props.mode === 'create') {
        router.push(`/organizer/events/${data.event.id}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the event.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Title">
        <Input value={values.title} onChange={(e) => set('title', e.target.value)} required minLength={3} />
      </Field>

      <Field label="Short description (optional)">
        <Input
          value={values.shortDescription}
          onChange={(e) => set('shortDescription', e.target.value)}
          maxLength={280}
        />
      </Field>

      <Field label="Full description">
        <Textarea
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          rows={5}
          required
          minLength={10}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <Select value={values.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Event type">
          <Select
            value={values.eventType}
            onChange={(e) => set('eventType', e.target.value as 'paid' | 'free')}
          >
            <option value="paid">Paid (tickets via Stripe, scanner included)</option>
            <option value="free">Free (scanner is a paid add-on)</option>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Venue name">
          <Input value={values.venue} onChange={(e) => set('venue', e.target.value)} required />
        </Field>
        <Field label="City">
          <Input value={values.city} onChange={(e) => set('city', e.target.value)} required />
        </Field>
      </div>

      <Field label="Address">
        <Input value={values.address} onChange={(e) => set('address', e.target.value)} required />
      </Field>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
          <Field label="Start date">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </Field>
          <Field label="Start time">
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
          <Field label="End date">
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
          </Field>
          <Field label="End time">
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
          </Field>
        </div>
      </div>

      <CoverImageUploader
        value={values.coverImage}
        onChange={(value) => set('coverImage', value)}
        onUploadingChange={setCoverUploading}
        disabled={busy}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Contact name">
          <Input value={values.contactName} onChange={(e) => set('contactName', e.target.value)} required />
        </Field>
        <Field label="Contact email">
          <Input
            type="email"
            value={values.contactEmail}
            onChange={(e) => set('contactEmail', e.target.value)}
            required
          />
        </Field>
        <Field label="Contact phone (optional)">
          <Input value={values.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} />
        </Field>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Button type="submit" variant="primary" disabled={busy || coverUploading}>
        {coverUploading ? 'Uploading poster…' : busy ? 'Saving…' : props.mode === 'create' ? 'Save draft' : 'Save changes'}
      </Button>
    </form>
  );
}
