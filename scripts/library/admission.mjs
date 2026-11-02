/** Build admission never edits canonical reviews or implies approval. */
export function admittedItems(authored, { preview = false, fixtures = false } = {}) {
  return authored.filter((item) =>
    item.review.status === 'approved' || fixtures ||
    (preview && ((item.review.status === 'in-review' && typeof item.review.factualReviewer === 'string' && item.review.factualReviewer.trim()) || item.type === 'collection'))
  );
}
