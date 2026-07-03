export function combineDateAndTime(date: string, time: string): string {
  if (!date || !time) return '';
  return `${date}T${time}`;
}

export function splitDateTimeInput(value: string): { date: string; time: string } {
  if (!value) return { date: '', time: '' };
  const [date = '', rawTime = ''] = value.split('T');
  const time = rawTime.slice(0, 5);
  return { date, time };
}
