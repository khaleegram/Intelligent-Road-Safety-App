import type { AccidentRecord } from '../types';

const escapeCsv = (value: unknown): string => {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
};

export function accidentsToCsv(
  rows: AccidentRecord[],
  options?: { includeSensitive?: boolean }
): string {
  const includeSensitive = options?.includeSensitive === true;
  const baseColumns = [
    'id',
    'request_id',
    'created_at',
    'timestamp',
    'severity',
    'road_type',
    'weather',
    'vehicle_count',
    'casualty_count',
    'verified',
    'verified_by',
    'verified_at',
    'notes',
  ];
  const sensitiveColumns = ['latitude', 'longitude', 'reporter_uid'];
  const columns = includeSensitive ? [...baseColumns, ...sensitiveColumns] : baseColumns;
  const header = columns.join(',');

  const lines = rows.map((item) => {
    const values = [
      item.id ?? '',
      item.request_id ?? '',
      item.created_at ?? '',
      item.timestamp ?? '',
      item.severity,
      item.road_type,
      item.weather,
      item.vehicle_count,
      item.casualty_count,
      item.verified === true ? 'true' : 'false',
      item.verified_by ?? '',
      item.verified_at ?? '',
      item.notes ?? '',
      ...(includeSensitive ? [item.latitude, item.longitude, item.reporter_uid ?? ''] : []),
    ];
    return values.map(escapeCsv).join(',');
  });

  return [header, ...lines].join('\n');
}
