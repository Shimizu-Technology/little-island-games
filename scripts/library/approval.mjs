import { createHash } from 'node:crypto';
const text = value => typeof value === 'string' && value.trim().length > 0;
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
/** Review decisions bind all content and promotion metadata except the decision itself. */
export function contentHash(item) {
  const content = structuredClone(item);
  delete content.review.familyReviewer;
  delete content.review.familyDecision;
  return createHash('sha256').update(JSON.stringify(content)).digest('hex');
}
/** The shared fail-closed shipping/default-build boundary. Preview is a separate explicit policy. */
export function hasShippingApproval(item) {
  const review = item?.review, decision = review?.familyDecision;
  return review?.status === 'approved' &&
    text(review.reviewer) && date(review.date) && text(review.scope) &&
    text(review.factualReviewer) && text(review.familyReviewer) &&
    decision?.decision === 'Yes' && text(decision.reviewer) && date(decision.date) &&
    decision.reviewer === review.familyReviewer &&
    decision.audioAccepted === true && decision.pronunciationAccepted === true &&
    decision.contentSha256 === contentHash(item);
}
