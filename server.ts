import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import dotenv from 'dotenv';
import twilio from 'twilio';
import path from 'path';
import { rateLimit } from 'express-rate-limit';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import webpush from 'web-push';
import crypto from 'crypto';
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

dotenv.config();

// Inicializa Sentry
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: 1.0,
  });
}

// ─── Gemini Client ────────────────────────────────────────────────────────
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Web Push Config
if (process.env.VITE_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:contato@notasvivas.com',
    process.env.VITE_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Supabase Client
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Middleware Auth
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Sessão inválida' });
    req.userId = user.id;
    req.userEmail = user.email;
    next();
  } catch {
    res.status(401).json({ error: 'Erro auth' });
  }
}

const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  // Sentry v10 handles tracing automatically if initialized early.
  // We don't need manual requestHandler/tracingHandler anymore.

  // API HEALTH
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // PARSE NOTE
  app.post('/api/parse-note', requireAuth, aiLimiter, async (req, res) => {
    const { text, nowTimestamp, language = 'pt-BR' } = req.body;
    if (!text) return res.status(400).json({ error: 'Texto necessário' });

      const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Analise a nota: "${text}"
      REFERÊNCIA (Unix ms): ${nowTimestamp || Date.now()}
      Idioma: ${language}

      Retorne APENAS um JSON plano com estas chaves:
      {
        "type": "Lembrete", "Tarefa", "Compras", "Ideia" ou "Outro",
        "title": "título curto",
        "items": [{"text": "item1"}, {"text": "item2"}],
        "urgency": "low", "medium", "high" ou "critical",
        "followUpStrategy": "notification",
        "summary": "resumo curto",
        "deadlineTimestamp": 1234567890 (ms ou 0)
      }`;

      const response = await model.generateContent(prompt);
      const result = await response.response;
      const responseText = result.text();
      
      // Limpa possíveis marcações de markdown da IA
      const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      console.log(`[AI PARSE] Nota: "${parsed.title}" | Deadline: ${parsed.deadlineTimestamp ? new Date(parsed.deadlineTimestamp).toLocaleString('pt-BR') : 'N/A'}`);

      res.json({
        type: parsed.type || 'Outro',
        title: parsed.title || 'Nota',
        items: parsed.items || [],
        checkInSeconds: parsed.checkInSeconds || 1800,
        urgency: parsed.urgency || 'low',
        followUpStrategy: parsed.followUpStrategy || 'notification',
        summary: parsed.summary || 'Processada.',
        needsDeadline: !!parsed.needsDeadline,
        deadlineTimestamp: parsed.deadlineTimestamp && parsed.deadlineTimestamp > 0 ? parsed.deadlineTimestamp : null,
      });
    } catch (error: any) {
      console.error('Gemini Error:', error.message);
      res.status(500).json({ error: 'Erro IA' });
    }
  });

  // WHATSAPP
  app.post('/api/whatsapp', requireAuth, async (req, res) => {
    const { message } = req.body;
    if (!twilioClient) return res.status(503).json({ error: 'Twilio não configurado' });
    try {
      await twilioClient.messages.create({
        from: process.env.TWILIO_FROM_NUMBER || 'whatsapp:+14155238886',
        to: process.env.USER_WHATSAPP_NUMBER || '',
        body: message,
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error('Twilio Error:', error.message);
      res.status(500).json({ error: 'Erro ao enviar WhatsApp' });
    }
  });

  // TRANSCRIBE
  app.post('/api/transcribe', requireAuth, aiLimiter, async (req, res) => {
    try {
      const { audio, mimeType } = req.body;
      const model = ai.getGenerativeModel({ model: 'gemini-flash-latest' });
      const resp = await model.generateContent([
        { inlineData: { mimeType: mimeType || 'audio/webm', data: audio } },
        { text: "Transcreva o áudio." }
      ]);
      const r = await resp.response;
      res.json({ transcription: r.text() || '' });
    } catch {
      res.status(500).json({ error: 'Erro transcrição' });
    }
  });

  // NOTES CRUD
  app.get('/api/notes', requireAuth, async (req, res) => {
    const { data, error } = await supabaseAdmin.from('notes').select('*').eq('user_id', req.userId).order('created_at', { ascending: false });
    res.json(data || []);
  });

  app.post('/api/notes', requireAuth, async (req, res) => {
    const { data, error } = await supabaseAdmin.from('notes').insert({ ...req.body, user_id: req.userId }).select().single();
    res.json(data);
  });

  app.patch('/api/notes/:id', requireAuth, async (req, res) => {
    const { data, error } = await supabaseAdmin.from('notes').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', req.params.id).eq('user_id', req.userId).select().single();
    res.json(data);
  });

  // PUBLIC SHARE
  app.get('/api/shared/:token', async (req, res) => {
    const { token } = req.params;
    const { data, error } = await supabaseAdmin
      .from('notes')
      .select('title, original_text, type, items, summary, urgency, created_at')
      .eq('share_token', token)
      .single();
    
    if (error || !data) return res.status(404).json({ error: 'Nota não encontrada' });
    
    // Map to camelCase for the frontend
    res.json({
      title: data.title,
      originalText: data.original_text,
      type: data.type,
      items: data.items,
      summary: data.summary,
      urgency: data.urgency,
      createdAt: data.created_at
    });
  });

  app.delete('/api/notes/:id', requireAuth, async (req, res) => {
    await supabaseAdmin.from('notes').delete().eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ success: true });
  });

  app.post('/api/notes/:id/share', requireAuth, async (req, res) => {
    // Implementação simplificada de compartilhamento via token
    const token = crypto.randomBytes(16).toString('hex');
    const { error } = await supabaseAdmin.from('notes').update({ share_token: token }).eq('id', req.params.id).eq('user_id', req.userId);
    if (error) return res.status(500).json({ error: 'Erro ao gerar compartilhamento' });
    res.json({ token });
  });

  app.get('/api/settings', requireAuth, async (req, res) => {
    const { data, error } = await supabaseAdmin.from('user_settings').select('*').eq('user_id', req.userId).single();
    if (error && error.code === 'PGRST116') {
      const { data: n } = await supabaseAdmin.from('user_settings').insert({ user_id: req.userId }).select().single();
      return res.json(n);
    }
    res.json(data);
  });

  app.put('/api/settings', requireAuth, async (req, res) => {
    const { data } = await supabaseAdmin.from('user_settings').upsert({ user_id: req.userId, ...req.body, updated_at: new Date().toISOString() }).select().single();
    res.json(data);
  });

  // STRIPE
  app.post('/api/stripe/create-checkout', requireAuth, async (req, res) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
      success_url: `${process.env.VITE_APP_URL}/?upgrade=success`,
      cancel_url: `${process.env.VITE_APP_URL}/upgrade`,
      metadata: { userId: req.userId! }
    });
    res.json({ url: session.url });
  });

  app.post('/api/stripe/create-portal', requireAuth, async (req, res) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });
    const { customerId } = req.body;
    if (!customerId) return res.status(400).json({ error: 'Customer ID necessário' });
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: process.env.VITE_APP_URL || process.env.APP_URL || 'http://localhost:3000',
    });
    res.json({ url: session.url });
  });

  // PUSH
  app.post('/api/push/subscribe', requireAuth, async (req, res) => {
    await supabaseAdmin.from('push_subscriptions').upsert({ user_id: req.userId, subscription: req.body });
    res.status(201).json({ success: true });
  });

  // FEEDBACK
  app.post('/api/feedback', requireAuth, async (req, res) => {
    const { type, content } = req.body;
    console.log(`[BETA FEEDBACK] User: ${req.userEmail} | Type: ${type} | Content: ${content}`);
    
    const { error } = await supabaseAdmin.from('feedback').insert({
      user_id: req.userId,
      user_email: req.userEmail,
      type,
      content,
      created_at: new Date().toISOString()
    });

    if (error) {
      console.warn('Feedback table might be missing, but logged to console above.');
      // Return 200 anyway because we logged it, to not show error to user if they just forgot to create the table
      return res.json({ success: true, logged: true });
    }
    
    res.json({ success: true });
  });

  if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const d = path.join(process.cwd(), 'dist');
    app.use(express.static(d));
    app.get('*', (req, res) => res.sendFile(path.join(d, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Servidor reconstruído na porta ${PORT}`));

  // ─── Agendador de Push em Memória (tarefa 3.4.5) ───────────────────────────
  const activeSchedules = new Map<string, NodeJS.Timeout>();

  const schedulePush = async (noteId: string, userId: string, title: string, body: string, triggerAt: number) => {
    const delay = triggerAt - Date.now();
    if (delay <= 0) return;

    // Limpa agendamento anterior se houver
    if (activeSchedules.has(noteId)) {
      clearTimeout(activeSchedules.get(noteId));
    }

    const timer = setTimeout(async () => {
      try {
        const { data: subData } = await supabaseAdmin
          .from('push_subscriptions')
          .select('subscription')
          .eq('user_id', userId)
          .single();

        if (subData?.subscription) {
          await webpush.sendNotification(
            subData.subscription,
            JSON.stringify({ title, body, url: '/' })
          );
          console.log(`[PUSH SCHEDULED] Enviado para user ${userId}: ${title}`);
        }
      } catch (err: any) {
        console.error(`[PUSH SCHEDULED] Erro ao enviar para user ${userId}:`, err.message);
      } finally {
        activeSchedules.delete(noteId);
      }
    }, delay);

    activeSchedules.set(noteId, timer);
  };

  app.post('/api/push/schedule', requireAuth, async (req, res) => {
    const { noteId, title, body, triggerAt } = req.body;
    if (!noteId || !triggerAt) return res.status(400).json({ error: 'Dados insuficientes' });

    await schedulePush(noteId, req.userId!, title, body, triggerAt);
    res.json({ success: true });
  });

  // ─── Job de Notificações em Segundo Plano (Monitoramento) ──────────────────
  setInterval(async () => {
    try {
      const now = Date.now();
      const tenMinutesFromNow = now + 10 * 60 * 1000;

      // Busca notas ativas que precisam de atenção (Deadline ou Check-in)
      const { data: upcomingNotes } = await supabaseAdmin
        .from('notes')
        .select('id, title, user_id, deadline, check_in_time, deadline_notified, check_in_prompted, urgency')
        .eq('status', 'active')
        .or(`deadline.lte.${tenMinutesFromNow},check_in_time.lte.${tenMinutesFromNow}`);

      if (!upcomingNotes || upcomingNotes.length === 0) return;

      for (const note of upcomingNotes) {
        // Lógica de Deadline
        const needsDeadlinePush = note.deadline && 
                                 !note.deadline_notified && 
                                 note.deadline <= tenMinutesFromNow && 
                                 note.deadline > now - 60000;

        // Lógica de Check-in
        const needsCheckInPush = note.check_in_time && 
                                !note.check_in_prompted && 
                                note.check_in_time <= tenMinutesFromNow && 
                                note.check_in_time > now - 60000;

        if (needsDeadlinePush || needsCheckInPush) {
          const { data: subData } = await supabaseAdmin
            .from('push_subscriptions')
            .select('subscription')
            .eq('user_id', note.user_id)
            .single();

          if (!subData?.subscription) continue;

          const title = needsDeadlinePush ? '⏰ Prazo Vencendo!' : '👋 Hora do Check-in';
          const body = `Nota: "${note.title}"`;

          try {
            await webpush.sendNotification(subData.subscription, JSON.stringify({ title, body, url: '/' }));
            
            // Marca como notificado no banco
            if (needsDeadlinePush) {
              await supabaseAdmin.from('notes').update({ deadline_notified: true }).eq('id', note.id);
            } else {
              await supabaseAdmin.from('notes').update({ check_in_prompted: true }).eq('id', note.id);
            }
          } catch (pushErr: any) {
            if (pushErr.statusCode === 410) {
              // Subscription expirada/removida pelo usuário
              await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', note.user_id);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('[PUSH JOB] Erro:', err.message);
    }
  }, 60 * 1000);
}

startServer();
