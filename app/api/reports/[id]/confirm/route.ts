import { database, ensureDatabase, json, priorityScore } from '@/lib/civic-db';

export async function POST(_:Request,context:{params:Promise<{id:string}>}) {
  await ensureDatabase(); const {id}=await context.params;
  const report=await database().prepare('SELECT severity,affected_people AS affectedPeople,confirmations,category,landmark FROM reports WHERE id=?').bind(id).first<{severity:string;affectedPeople:number;confirmations:number;category:string;landmark:string|null}>();
  if(!report)return json({error:'Report not found.'},404);
  const confirmations=report.confirmations+1; const score=priorityScore({...report,confirmations});
  await database().prepare('UPDATE reports SET confirmations=?,priority_score=?,updated_at=? WHERE id=?').bind(confirmations,score,Date.now(),id).run();
  return json({ok:true,id,confirmations,priorityScore:score});
}
