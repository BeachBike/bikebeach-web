/// Shared UI primitives for the whole app. Use these instead of bespoke
/// per-screen components so cross-cutting rules from `tasks/lessons.md`
/// stay enforced.
export { ConfirmModal, type ConfirmTone } from './confirm-modal';
export { DoubleConsentModal } from './double-consent-modal';
export {
  InputDecimal,
  InputMoney,
  InputNumber,
  InputPercent,
} from './inputs';
export { Pagination, usePagination } from './pagination';
export type { UsePaginationResult } from './pagination';
export { ProtectedRoute } from './protected-route';
export {
  FriendBubble,
  FriendBubbleStack,
  FriendsListModal,
} from './friend-bubble';
export type { BubbleSize } from './friend-bubble';
export { HealthGateBanner } from './health-gate-banner';
