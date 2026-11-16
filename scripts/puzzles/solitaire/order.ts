import{arrangeBy,kitOrder,worstBack,type Orderable}from'../order';
/** A refreshed pool may already be the exact gentle order selected from a wider pool. */
export function orderCandidates<C extends Orderable&{workload:number}>(pool:readonly C[],count:number):C[]{
 if(pool.length===count){
  const kit=kitOrder(pool),back=worstBack(pool.map(c=>c.workload));
  if(kit.length===pool.length&&kit.every((c,i)=>c===pool[i])&&back.worst<=back.allowed)return[...pool];
 }
 return arrangeBy(c=>c.workload,pool,count);
}
