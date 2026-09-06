// Deadlines are surfaced on several screens (the all-clients listing, the
// per-client view, the calendar) and the API returns them in insertion order,
// so ordering is applied client-side and kept in one place.

// Undated deadlines sink to the bottom rather than clustering at the top,
// which is where an epoch-0 fallback would put them.
const dueDateValue = (dueDate) => {
  if (!dueDate) return Number.POSITIVE_INFINITY;
  const time = new Date(dueDate).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
};

export const sortByDueDateAsc = (items, getDueDate = (item) => item?.due_date) =>
  [...(items ?? [])].sort((a, b) => dueDateValue(getDueDate(a)) - dueDateValue(getDueDate(b)));
