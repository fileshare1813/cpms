// Common date / currency helpers
export const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export const formatCurrency = (amount) =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
