export type StatusVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'premium'

export interface StatusConfig {
  label: string
  variant: StatusVariant
  icon: string
}

// ---------------------------------------------------------------------------
// Booking statuses
// ---------------------------------------------------------------------------
export const BOOKING_STATUS: Record<string, StatusConfig> = {
  scheduled: { label: 'Scheduled', variant: 'default', icon: 'Calendar' },
  confirmed: { label: 'Confirmed', variant: 'info', icon: 'CalendarCheck' },
  en_route: { label: 'En Route', variant: 'info', icon: 'Truck' },
  in_progress: { label: 'In Progress', variant: 'info', icon: 'Wrench' },
  completed: { label: 'Completed', variant: 'success', icon: 'CheckCircle' },
  cancelled: { label: 'Cancelled', variant: 'danger', icon: 'XCircle' },
  no_show: { label: 'No Show', variant: 'danger', icon: 'UserX' },
  'no-show': { label: 'No-Show', variant: 'danger', icon: 'UserX' },
  rescheduled: { label: 'Rescheduled', variant: 'warning', icon: 'CalendarClock' },
}

// ---------------------------------------------------------------------------
// Work order statuses
// ---------------------------------------------------------------------------
export const WORK_ORDER_STATUS: Record<string, StatusConfig> = {
  draft: { label: 'Draft', variant: 'default', icon: 'FileEdit' },
  pending: { label: 'Pending', variant: 'default', icon: 'Clock' },
  assigned: { label: 'Assigned', variant: 'info', icon: 'UserCheck' },
  in_progress: { label: 'In Progress', variant: 'info', icon: 'Wrench' },
  on_hold: { label: 'On Hold', variant: 'warning', icon: 'PauseCircle' },
  completed: { label: 'Completed', variant: 'success', icon: 'CheckCircle' },
  cancelled: { label: 'Cancelled', variant: 'danger', icon: 'XCircle' },
  needs_attention: { label: 'Needs Attention', variant: 'warning', icon: 'AlertTriangle' },
}

// ---------------------------------------------------------------------------
// Payment statuses
// ---------------------------------------------------------------------------
export const PAYMENT_STATUS: Record<string, StatusConfig> = {
  pending: { label: 'Pending', variant: 'default', icon: 'Clock' },
  invoiced: { label: 'Invoiced', variant: 'info', icon: 'FileText' },
  paid: { label: 'Paid', variant: 'success', icon: 'DollarSign' },
  partial: { label: 'Partial', variant: 'warning', icon: 'CircleDollarSign' },
  overdue: { label: 'Overdue', variant: 'warning', icon: 'AlertTriangle' },
  failed: { label: 'Failed', variant: 'danger', icon: 'XCircle' },
  refunded: { label: 'Refunded', variant: 'default', icon: 'RotateCcw' },
}

// ---------------------------------------------------------------------------
// Quote statuses
// ---------------------------------------------------------------------------
export const QUOTE_STATUS: Record<string, StatusConfig> = {
  draft: { label: 'Draft', variant: 'default', icon: 'FileEdit' },
  sent: { label: 'Sent', variant: 'info', icon: 'Send' },
  viewed: { label: 'Viewed', variant: 'info', icon: 'Eye' },
  accepted: { label: 'Accepted', variant: 'success', icon: 'CheckCircle' },
  declined: { label: 'Declined', variant: 'danger', icon: 'XCircle' },
  expired: { label: 'Expired', variant: 'warning', icon: 'Clock' },
}

// ---------------------------------------------------------------------------
// Contract statuses
// ---------------------------------------------------------------------------
export const CONTRACT_STATUS: Record<string, StatusConfig> = {
  draft: { label: 'Draft', variant: 'default', icon: 'FileEdit' },
  sent: { label: 'Sent', variant: 'info', icon: 'Send' },
  signed: { label: 'Signed', variant: 'premium', icon: 'FileSignature' },
  active: { label: 'Active', variant: 'success', icon: 'ShieldCheck' },
  completed: { label: 'Completed', variant: 'success', icon: 'CheckCircle' },
  cancelled: { label: 'Cancelled', variant: 'danger', icon: 'XCircle' },
  expired: { label: 'Expired', variant: 'warning', icon: 'Clock' },
  premium: { label: 'Premium', variant: 'premium', icon: 'Crown' },
}

// ---------------------------------------------------------------------------
// Priority levels
// ---------------------------------------------------------------------------
export const PRIORITY_LEVELS: Record<string, StatusConfig> = {
  low: { label: 'Low', variant: 'default', icon: 'ArrowDown' },
  normal: { label: 'Normal', variant: 'info', icon: 'ArrowRight' },
  medium: { label: 'Medium', variant: 'info', icon: 'ArrowRight' },
  high: { label: 'High', variant: 'warning', icon: 'ArrowUp' },
  urgent: { label: 'Urgent', variant: 'danger', icon: 'AlertOctagon' },
  critical: { label: 'Critical', variant: 'danger', icon: 'AlertOctagon' },
}

// ---------------------------------------------------------------------------
// Urgency levels
// ---------------------------------------------------------------------------
export const URGENCY_LEVELS: Record<string, StatusConfig> = {
  routine: { label: 'Routine', variant: 'default', icon: 'Clock' },
  soon: { label: 'Soon', variant: 'info', icon: 'Timer' },
  urgent: { label: 'Urgent', variant: 'warning', icon: 'AlertTriangle' },
  emergency: { label: 'Emergency', variant: 'danger', icon: 'Siren' },
}

// ---------------------------------------------------------------------------
// Call intent (inbound call classification)
// ---------------------------------------------------------------------------
export const CALL_INTENT: Record<string, StatusConfig> = {
  booking: { label: 'Booking', variant: 'info', icon: 'CalendarPlus' },
  inquiry: { label: 'Inquiry', variant: 'default', icon: 'MessageCircle' },
  complaint: { label: 'Complaint', variant: 'danger', icon: 'AlertTriangle' },
  follow_up: { label: 'Follow-Up', variant: 'info', icon: 'PhoneForwarded' },
  membership: { label: 'Membership', variant: 'premium', icon: 'Crown' },
  emergency: { label: 'Emergency', variant: 'danger', icon: 'Siren' },
}

// ---------------------------------------------------------------------------
// Call outcome
// ---------------------------------------------------------------------------
export const CALL_OUTCOME: Record<string, StatusConfig> = {
  resolved: { label: 'Resolved', variant: 'success', icon: 'CheckCircle' },
  booked: { label: 'Booked', variant: 'success', icon: 'CalendarCheck' },
  voicemail: { label: 'Voicemail', variant: 'default', icon: 'Voicemail' },
  transferred: { label: 'Transferred', variant: 'info', icon: 'PhoneForwarded' },
  callback: { label: 'Callback Needed', variant: 'warning', icon: 'PhoneCallback' },
  missed: { label: 'Missed', variant: 'danger', icon: 'PhoneMissed' },
}

// ---------------------------------------------------------------------------
// Domain registry (maps domain string to config object)
// ---------------------------------------------------------------------------
const STATUS_DOMAINS: Record<string, Record<string, StatusConfig>> = {
  booking: BOOKING_STATUS,
  work_order: WORK_ORDER_STATUS,
  payment: PAYMENT_STATUS,
  quote: QUOTE_STATUS,
  contract: CONTRACT_STATUS,
  priority: PRIORITY_LEVELS,
  urgency: URGENCY_LEVELS,
  call_intent: CALL_INTENT,
  call_outcome: CALL_OUTCOME,
}

/**
 * Look up the display config for a given domain + status key.
 *
 * @param domain  One of: booking, work_order, payment, quote, contract,
 *                priority, urgency, call_intent, call_outcome
 * @param status  The status key (e.g. "in_progress", "paid")
 * @returns       The matching StatusConfig, or a sensible fallback
 */
export function getStatusConfig(domain: string, status: string): StatusConfig {
  const domainConfig = STATUS_DOMAINS[domain]
  if (!domainConfig) {
    return { label: status, variant: 'default', icon: 'HelpCircle' }
  }

  const config = domainConfig[status]
  if (!config) {
    return { label: status, variant: 'default', icon: 'HelpCircle' }
  }

  return config
}
