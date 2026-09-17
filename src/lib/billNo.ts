import { supabase } from '@/lib/supabase';

export async function generateBillNo(): Promise<string> {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const prefix = `${day}${month}${year}`;

  const { data } = await supabase
    .from('deliveries')
    .select('bill_no')
    .like('bill_no', `${prefix}%`)
    .order('bill_no', { ascending: false })
    .limit(1);

  let seq = 1;
  if (data && data.length > 0 && data[0].bill_no) {
    const lastSeq = parseInt(data[0].bill_no.slice(-4), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}
