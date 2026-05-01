import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkStatus() {
  console.log('--- Verificando Subscriptions ---');
  const { data: subs, error: subError } = await supabase
    .from('push_subscriptions')
    .select('*');
  
  if (subError) console.error('Erro subs:', subError);
  else console.log('Assinaturas encontradas:', subs?.length);

  console.log('\n--- Verificando Notas Recentes ---');
  const { data: notes, error: noteError } = await supabase
    .from('notes')
    .select('title, deadline, deadline_notified, check_in_time, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (noteError) console.error('Erro notas:', noteError);
  else {
    notes?.forEach(n => {
      console.log(`Nota: ${n.title}`);
      console.log(`  Deadline: ${n.deadline ? new Date(n.deadline).toLocaleString('pt-BR') : 'N/A'}`);
      console.log(`  Notificada: ${n.deadline_notified}`);
      console.log(`  Criada em: ${new Date(n.created_at).toLocaleString('pt-BR')}`);
    });
  }
}

checkStatus();
