/**
 * Technician Messages — conversation list contracts (T-G).
 *
 * There is NO "list my conversations" endpoint: conversations are 1:1
 * with service requests and are created lazily on first open
 * (docs/07_API.md §11). The list is composed from the technician's
 * role-scoped requests that already have an assigned technician
 * (i.e. non-pending ones). Opening a thread resolves the real
 * conversation through the shared chat adapter.
 *
 * The counterparty is the customer, whose identity the API deliberately
 * does not expose (privacy by contract) — the honest generic label is
 * used, never an invented name.
 */

export interface TechnicianConversationItem {
  /** The service-request id; also the chat key source. */
  readonly id: string;
  readonly peerNameAr: string;
  readonly initialsAr: string;
  readonly applianceAr: string;
  readonly lastMessageAr: string;
  readonly timeAr: string;
  readonly orderRefAr: string;
}

export interface TechnicianMessagesViewModel {
  readonly conversations: ReadonlyArray<TechnicianConversationItem>;
}

export interface TechnicianMessagesDataSource {
  getConversations(input: { role: 'technician' }): Promise<TechnicianMessagesViewModel>;
}
