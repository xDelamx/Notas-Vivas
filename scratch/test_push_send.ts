import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

webpush.setVapidDetails(
  'mailto:contato@notasvivas.com',
  process.env.VITE_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

async function sendTest() {
  const { data: subs } = await supabase.from('push_subscriptions').select('*').limit(1);
  if (!subs || subs.length === 0) {
    console.error('Nenhuma assinatura encontrada no banco.');
    return;
  }

  console.log('Enviando teste para:', subs[0].user_id);
  
  try {
    await webpush.sendNotification(
      subs[0].subscription,
      JSON.stringify({
        title: '🚀 Teste Notas Vivas',
        body: 'Se você recebeu isso, as notificações em background estão FUNCIONANDO!',
        url: '/'
      })
    );
    console.log('Sucesso! Verifique seu celular.');
  } catch (err: any) {
    console.error('Erro ao enviar:', err.message);
  }
}

sendTest();
