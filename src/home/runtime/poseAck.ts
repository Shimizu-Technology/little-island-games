/** F1: a native pose acknowledgement belongs to one mounted target pose in one actor's carry
 * overlay. Idle friends share drag slot 0, so the slot index can't name the owner: the key is the
 * overlay's actor plus the pose token, and the value is the mount that laid it out. A mount can
 * only clear the acknowledgement it wrote. */
export type PoseAcks = Record<string, number>;

export function poseAckKey(actor: string, token: string): string {
  "worklet";
  return `${actor}|${token}`;
}
export function poseLaidOut(acks: PoseAcks | undefined, actor: string, token: string): boolean {
  "worklet";
  return !!acks && acks[poseAckKey(actor, token)] !== undefined;
}
export function acknowledgePoseIn(acks: PoseAcks, actor: string, token: string, mount: number): PoseAcks {
  "worklet";
  acks[poseAckKey(actor, token)] = mount;
  return acks;
}
export function forgetPoseIn(acks: PoseAcks, actor: string, token: string, mount: number): PoseAcks {
  "worklet";
  const key = poseAckKey(actor, token);
  if (acks[key] === mount) delete acks[key];
  return acks;
}
let mounts = 0;
/** A fresh identity for each mounted target pose. */
export function nextPoseMount(): number {
  return ++mounts;
}
