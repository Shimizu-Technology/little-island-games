import { hasShippingApproval } from './approval.mjs';
/** Build admission never edits canonical reviews or implies approval. */
export function admittedItems(authored, { preview = false, fixtures = false } = {}) {
  return authored.filter((item) =>
    hasShippingApproval(item) || fixtures ||
    (preview && (item.review.status === 'approved' || (item.review.status === 'in-review' && typeof item.review.factualReviewer === 'string' && item.review.factualReviewer.trim()) || item.type === 'collection'))
  );
}
