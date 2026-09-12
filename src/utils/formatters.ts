export function formatKm(
  value: number | null | undefined,
) {
  if (value === null || value === undefined) {
    return '-';
  }

  return `${value.toLocaleString('pt-BR')} km`;
}

export function formatDateTime(
  value: string | null | undefined,
) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString(
    'pt-BR',
  );
}

export function formatPercentage(
  value: number | null | undefined,
) {
  if (value === null || value === undefined) {
    return '-';
  }

  return `${value.toFixed(1)}%`;
}

export function getTripStatusLabel(
  status: string,
) {
  switch (status) {
    case 'PLANNED':
      return 'Planejada';

    case 'IN_PROGRESS':
      return 'Em andamento';

    case 'COMPLETED':
      return 'Finalizada';

    case 'CANCELLED':
      return 'Cancelada';

    default:
      return status;
  }
}