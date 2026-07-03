import type { EventStatus } from '@prisma/client';

export const EDITABLE_EVENT_STATUSES: EventStatus[] = ['DRAFT', 'REJECTED'];
export const REVIEW_EVENT_STATUSES: EventStatus[] = ['SUBMITTED', 'IN_REVIEW', 'APPROVED'];
export const ARCHIVED_EVENT_STATUSES: EventStatus[] = ['ARCHIVED', 'CANCELLED', 'COMPLETED'];

const EVENT_STATUS_LABELS = {
  en: {
    DRAFT: 'Created',
    SUBMITTED: 'In review',
    IN_REVIEW: 'In review',
    APPROVED: 'In review',
    PUBLISHED: 'Published',
    REJECTED: 'Publication rejected',
    ARCHIVED: 'Archived',
    CANCELLED: 'Archived',
    COMPLETED: 'Archived',
  },
  es: {
    DRAFT: 'Creado',
    SUBMITTED: 'En moderación',
    IN_REVIEW: 'En moderación',
    APPROVED: 'En moderación',
    PUBLISHED: 'Publicado',
    REJECTED: 'Publicación rechazada',
    ARCHIVED: 'Archivado',
    CANCELLED: 'Archivado',
    COMPLETED: 'Archivado',
  },
} as const;

export type EventStatusLabelLocale = keyof typeof EVENT_STATUS_LABELS;

export function eventStatusLabel(status: string, locale: EventStatusLabelLocale = 'en'): string | null {
  const labels = EVENT_STATUS_LABELS[locale] ?? EVENT_STATUS_LABELS.en;
  switch (status) {
    case 'DRAFT':
      return labels.DRAFT;
    case 'SUBMITTED':
      return labels.SUBMITTED;
    case 'IN_REVIEW':
      return labels.IN_REVIEW;
    case 'APPROVED':
      return labels.APPROVED;
    case 'PUBLISHED':
      return labels.PUBLISHED;
    case 'REJECTED':
      return labels.REJECTED;
    case 'ARCHIVED':
      return labels.ARCHIVED;
    case 'CANCELLED':
      return labels.CANCELLED;
    case 'COMPLETED':
      return labels.COMPLETED;
    default:
      return null;
  }
}

export function isEventEditable(status: string): boolean {
  return EDITABLE_EVENT_STATUSES.includes(status as EventStatus);
}

export function isEventPublished(event: { status: string; isPublished: boolean }): boolean {
  return event.status === 'PUBLISHED' && event.isPublished;
}
