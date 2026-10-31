type DocLike = {
  _id: unknown;
  order: number;
  save: () => Promise<unknown>;
};

type FindOneResult = Promise<DocLike | null> & {
  sort: (s: Record<string, 1 | -1>) => Promise<DocLike | null>;
};

export type ModelLike = {
  findOne: (filter: Record<string, unknown>) => FindOneResult;
};

/**
 * Swaps an item's `order` with its nearest neighbor in one direction,
 * scoped to the given sibling filter (e.g. all chapters of one notebook).
 * Returns true when a swap happened, false when already at the edge.
 */
export async function swapOrder(
  model: ModelLike,
  filter: Record<string, unknown>,
  id: string,
  dir: "up" | "down",
): Promise<boolean> {
  const doc = await model.findOne({ ...filter, _id: id });
  if (!doc) return false;
  const neighbor = await model
    .findOne({
      ...filter,
      _id: { $ne: doc._id },
      order: dir === "up" ? { $lt: doc.order } : { $gt: doc.order },
    })
    .sort({ order: dir === "up" ? -1 : 1 });
  if (!neighbor) return false;
  const tmp = doc.order;
  doc.order = neighbor.order;
  neighbor.order = tmp;
  await doc.save();
  await neighbor.save();
  return true;
}
