import express from 'express';
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
    webpush.setVapidDetails('mailto:contato@notasvivas.com', process.env.VITE_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
}
// Supabase Client
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
// Middleware Auth
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
        return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user)
            return res.status(401).json({ error: 'Sessão inválida' });
        req.userId = user.id;
        req.userEmail = user.email;
        next();
    }
    catch {
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
        const { text, timeStr, language = 'pt-BR' } = req.body;
        if (!text)
            return res.status(400).json({ error: 'Texto necessário' });
        try {
            const model = ai.getGenerativeModel({
                model: 'gemini-flash-latest',
                generationConfig: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: SchemaType.OBJECT,
                        properties: {
                            type: { type: SchemaType.STRING },
                            title: { type: SchemaType.STRING },
                            items: {
                                type: SchemaType.ARRAY,
                                items: {
                                    type: SchemaType.OBJECT,
                                    properties: { text: { type: SchemaType.STRING } },
                                    required: ['text'],
                                },
                            },
                            checkInSeconds: { type: SchemaType.NUMBER },
                            urgency: { type: SchemaType.STRING },
                            followUpStrategy: { type: SchemaType.STRING },
                            summary: { type: SchemaType.STRING },
                            needsDeadline: { type: SchemaType.BOOLEAN },
                        },
                        required: ['type', 'title', 'items', 'checkInSeconds', 'urgency', 'followUpStrategy', 'summary', 'needsDeadline'],
                    },
                }
            });
            const prompt = `Analise: "${text}". Data/Hora: ${timeStr || new Date().toLocaleString()}. Idioma: ${language}.
      Classifique o tipo (Compras, Tarefa, Ideia, Lembrete, Outro). Forneça título inteligente e itens acionáveis.
      Urgência (low, medium, high, critical). Estratégia (app, notification, whatsapp, call).`;
            const response = await model.generateContent(prompt);
            const result = await response.response;
            const parsed = JSON.parse(result.text() || '{}');
            res.json({
                type: parsed.type || 'Outro',
                title: parsed.title || 'Nota',
                items: parsed.items || [],
                checkInSeconds: parsed.checkInSeconds || 1800,
                urgency: parsed.urgency || 'low',
                followUpStrategy: parsed.followUpStrategy || 'app',
                summary: parsed.summary || 'Processada.',
                needsDeadline: !!parsed.needsDeadline,
            });
        }
        catch (error) {
            console.error('Gemini Error:', error.message);
            res.status(500).json({ error: 'Erro IA' });
        }
    });
    // WHATSAPP
    app.post('/api/whatsapp', requireAuth, async (req, res) => {
        const { message } = req.body;
        if (!twilioClient)
            return res.status(503).json({ error: 'Twilio não configurado' });
        try {
            await twilioClient.messages.create({
                from: process.env.TWILIO_FROM_NUMBER || 'whatsapp:+14155238886',
                to: process.env.USER_WHATSAPP_NUMBER || '',
                body: message,
            });
            res.json({ success: true });
        }
        catch (error) {
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
        }
        catch {
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
        if (error || !data)
            return res.status(404).json({ error: 'Nota não encontrada' });
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
        if (error)
            return res.status(500).json({ error: 'Erro ao gerar compartilhamento' });
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
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
            success_url: `${process.env.VITE_APP_URL}/?upgrade=success`,
            cancel_url: `${process.env.VITE_APP_URL}/upgrade`,
            metadata: { userId: req.userId }
        });
        res.json({ url: session.url });
    });
    app.post('/api/stripe/create-portal', requireAuth, async (req, res) => {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
        const { customerId } = req.body;
        if (!customerId)
            return res.status(400).json({ error: 'Customer ID necessário' });
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
    }
    else {
        const d = path.join(process.cwd(), 'dist');
        app.use(express.static(d));
        app.get('*', (req, res) => res.sendFile(path.join(d, 'index.html')));
    }
    app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Servidor reconstruído na porta ${PORT}`));
}
startServer();
