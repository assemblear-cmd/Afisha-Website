'use client';

import { useState } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { combineDateAndTime } from '@/lib/date-time-input';
import { Button, Card, Field, Input, Textarea, Select } from '@/components/ui';
import { CoverImageUploader } from '@/components/events/CoverImageUploader';

interface TicketRow {
  name: string;
  price: string;
  quantity: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  category?: string;
  venue?: string;
  city?: string;
  address?: string;
  startsAt?: string;
  endsAt?: string;
  tickets?: string;
  server?: string;
}

const DEFAULT_TICKET: TicketRow = { name: 'General Admission', price: '0', quantity: '100' };

export function CreateEventForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [tickets, setTickets] = useState<TicketRow[]>([{ ...DEFAULT_TICKET }]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  function addTicketRow() {
    setTickets((prev) => [...prev, { name: '', price: '0', quantity: '1' }]);
  }

  function removeTicketRow(index: number) {
    setTickets((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTicket(index: number, field: keyof TicketRow, value: string) {
    setTickets((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};
    const startsAt = combineDateAndTime(startDate, startTime);
    const endsAt = combineDateAndTime(endDate, endTime);

    if (!title.trim() || title.trim().length < 3) errs.title = 'Title must be at least 3 characters.';
    if (!description.trim() || description.trim().length < 10) errs.description = 'Description must be at least 10 characters.';
    if (!category) errs.category = 'Please select a category.';
    if (!venue.trim()) errs.venue = 'Venue is required.';
    if (!city.trim()) errs.city = 'City is required.';
    if (!address.trim()) errs.address = 'Address is required.';
    if (!startDate || !startTime) errs.startsAt = 'Start date and time are required.';
    if (!endDate || !endTime) errs.endsAt = 'End date and time are required.';
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      errs.endsAt = 'End date must be after start date.';
    }
    const validTickets = tickets.filter(
      (t) => t.name.trim() && parseInt(t.quantity, 10) >= 1
    );
    if (validTickets.length === 0) {
      errs.tickets = 'Add at least one ticket type with a name and quantity.';
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    const startsAt = combineDateAndTime(startDate, startTime);
    const endsAt = combineDateAndTime(endDate, endTime);

    const ticketTypes = tickets
      .filter((t) => t.name.trim() && parseInt(t.quantity, 10) >= 1)
      .map((t) => ({
        name: t.name.trim(),
        price: Number(t.price) || 0,
        quantity: parseInt(t.quantity, 10),
      }));

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          venue: venue.trim(),
          city: city.trim(),
          address: address.trim(),
          startsAt,
          endsAt,
          coverImage: coverImage.trim(),
          ticketTypes,
        }),
      });

      const data = (await res.json()) as { event?: { id: string }; error?: string };

      if (res.ok && data.event?.id) {
        window.location.href = '/dashboard/events/' + data.event.id;
      } else {
        setErrors({ server: data.error ?? 'Something went wrong. Please try again.' });
        setLoading(false);
      }
    } catch {
      setErrors({ server: 'Network error. Please try again.' });
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {errors.server && (
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {errors.server}
        </div>
      )}

      {/* Basic info */}
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-ink text-lg">Event details</h2>

        <Field label="Title" htmlFor="title" error={errors.title}>
          <Input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My awesome event"
          />
        </Field>

        <Field label="Description" htmlFor="description" error={errors.description}>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Tell people what your event is about…"
          />
        </Field>

        <Field label="Category" htmlFor="category" error={errors.category}>
          <Select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select a category…</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.emoji} {c.label}
              </option>
            ))}
          </Select>
        </Field>

        <CoverImageUploader
          value={coverImage}
          onChange={setCoverImage}
          onUploadingChange={setCoverUploading}
          disabled={loading}
        />
      </Card>

      {/* Location */}
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-ink text-lg">Location</h2>

        <Field label="Venue name" htmlFor="venue" error={errors.venue}>
          <Input
            id="venue"
            type="text"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="The Grand Hall"
          />
        </Field>

        <Field label="City" htmlFor="city" error={errors.city}>
          <Input
            id="city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="New York"
          />
        </Field>

        <Field label="Address" htmlFor="address" error={errors.address}>
          <Input
            id="address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St"
          />
        </Field>
      </Card>

      {/* Date & time */}
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-ink text-lg">Date &amp; time</h2>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
            <Field label="Start date" htmlFor="startDate" error={errors.startsAt}>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Field>
            <Field label="Start time" htmlFor="startTime">
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
            <Field label="End date" htmlFor="endDate" error={errors.endsAt}>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Field>
            <Field label="End time" htmlFor="endTime">
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </Field>
          </div>
        </div>
      </Card>

      {/* Tickets */}
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-ink text-lg">Tickets</h2>

        {errors.tickets && (
          <p role="alert" className="text-sm text-red-600">{errors.tickets}</p>
        )}

        <div className="space-y-3">
          {tickets.map((row, index) => (
            <div
              key={index}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-end"
            >
              <Field label="Ticket name" htmlFor={`tt-name-${index}`}>
                <Input
                  id={`tt-name-${index}`}
                  type="text"
                  value={row.name}
                  onChange={(e) => updateTicket(index, 'name', e.target.value)}
                  placeholder="General Admission"
                />
              </Field>

              <Field label="Price ($)" htmlFor={`tt-price-${index}`}>
                <Input
                  id={`tt-price-${index}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.price}
                  onChange={(e) => updateTicket(index, 'price', e.target.value)}
                  placeholder="0"
                  className="w-24"
                />
              </Field>

              <Field label="Qty" htmlFor={`tt-qty-${index}`}>
                <Input
                  id={`tt-qty-${index}`}
                  type="number"
                  min="1"
                  value={row.quantity}
                  onChange={(e) => updateTicket(index, 'quantity', e.target.value)}
                  placeholder="100"
                  className="w-24"
                />
              </Field>

              <div className="pb-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTicketRow(index)}
                  disabled={tickets.length === 1}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button type="button" variant="secondary" size="sm" onClick={addTicketRow}>
          + Add ticket type
        </Button>
      </Card>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={loading || coverUploading}
      >
        {coverUploading ? 'Uploading poster…' : loading ? 'Creating event…' : 'Create event'}
      </Button>
    </form>
  );
}
