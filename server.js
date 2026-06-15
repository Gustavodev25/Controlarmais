import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import admin from 'firebase-admin';
import fs from 'fs';
import pluggyRouter from './api/pluggy.js';
import stripeRouter, { handleStripeWebhook, isStripeReady, createRemarketingCheckoutSession, createUniquePromoCode } from './api/stripe.js';
import aiRouter from './api/ai.js';
import { sendUtmifySale } from './api/utmify.js';
import { sendEmail, sendOtpEmail, sendWelcomeEmail, sendPasswordResetEmail, sendAbandonedCartEmail } from './api/emails.js';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-02-25.clover',
}) : null;

// ─────────────────────────────────────────────
// FIREBASE ADMIN — Inicialização
// ─────────────────────────────────────────────
try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        console.log('✅ Firebase Admin inicializado via .env.');
    } else if (fs.existsSync('./serviceAccountKey.json')) {
        const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        console.log('✅ Firebase Admin inicializado via serviceAccountKey.json.');
    } else {
        console.warn('⚠️  Nenhuma credencial Firebase encontrada. Firestore desabilitado.');
    }
} catch (error) {
    console.error('❌ Erro ao inicializar Firebase Admin:', error.message);
}

const db = admin.apps.length ? admin.firestore() : null;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Atualiza o plano do usuário no Firestore de forma segura.
 * @param {string} uid         - UID do Firebase
 * @param {'pro'|'free'} plan  - Plano a definir
 * @param {'active'|'inactive'|'overdue'} status
 * @param {object} extra       - Campos adicionais opcionais
 */
async function updateUserPlan(uid, plan, status, extra = {}) {
    if (!db) {
        console.warn('⚠️  Firestore não disponível. Atualização ignorada.');
        return;
    }
    await db.collection('users').doc(uid).update({
        'subscription.plan': plan,
        'subscription.status': status,
        ...extra,
        updatedAt: new Date().toISOString()
    });
    console.log(`✅ Usuário ${uid} → plano: ${plan}, status: ${status}`);
}

/**
 * Busca o UID do Firebase a partir do ID de um cliente no Asaas.
 * @param {string} customerId
 * @returns {string|null}
 */
async function getUidFromAsaasCustomer(customerId) {
    if (!customerId) return null;
    const res = await axios.get(`${ASAAS_URL}/customers/${customerId}`, { headers: asaasHeaders });
    return res.data?.externalReference || null;
}

const SYNC_CREDIT_PREFIX = 'sync_credits';
const SYNC_CREDIT_COMBOS = Object.freeze([
    {
        id: 'combo_light',
        name: 'Light',
        amount: 4.90,
        credits: 7,
        description: '7 atualizacoes'
    },
    {
        id: 'combo_performance',
        name: 'Performance',
        amount: 14.90,
        credits: 28,
        description: '28 atualizacoes'
    },
    {
        id: 'combo_full',
        name: 'Full',
        amount: 49.90,
        credits: 9999,
        description: 'Ilimitado'
    }
]);
const SYNC_CREDIT_SETTLED_STATUSES = new Set(['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH']);
const SYNC_CREDIT_FAILED_STATUSES = new Set([
    'CANCELLED',
    'OVERDUE',
    'REFUNDED',
    'CHARGEBACK_REQUESTED',
    'CHARGEBACK_DISPUTE',
    'AWAITING_CHARGEBACK_REVERSAL',
]);

function roundCurrencyToCents(value) {
    return Math.round(Number(value || 0) * 100);
}

function parseMoneyValue(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }

    if (value === null || value === undefined) return 0;

    const rawValue = String(value).trim();
    if (!rawValue) return 0;

    let normalized = rawValue.replace(/[^\d,.-]/g, '');
    if (!normalized) return 0;

    const hasComma = normalized.includes(',');
    const hasDot = normalized.includes('.');

    if (hasComma && hasDot) {
        normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (hasComma) {
        normalized = normalized.replace(',', '.');
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

function isAnnualBillingCycle(value) {
    const cycle = String(value || '').trim().toLowerCase();
    return ['annual', 'year', 'yearly', 'anual'].includes(cycle);
}

function buildProviderError(provider, error) {
    const status = Number(error?.response?.status) || null;
    let message = error?.message || 'Falha ao consultar provedor externo.';

    if (provider === 'asaas' && status === 401) {
        message = 'Asaas recusou a chave de API ou o ambiente configurado.';
    } else if (status) {
        message = `${provider} respondeu com status ${status}.`;
    }

    return { provider, status, message };
}

function getSubscriptionMonthlyAmount(sub = {}, data = {}) {
    const rawAmount = [
        sub.nextAmount,
        sub.price,
        sub.amount,
        sub.value,
        data.planPrice,
        data.valor,
    ].map(parseMoneyValue).find((amount) => amount > 0) || 0;

    if (!rawAmount) return 0;
    return isAnnualBillingCycle(sub.billingCycle || sub.frequency || sub.interval)
        ? rawAmount / 12
        : rawAmount;
}

function formatStripeDateIso(value) {
    if (!value) return null;
    const date = value instanceof Date
        ? value
        : new Date(typeof value === 'number' ? value * 1000 : value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatStripeDateOnly(value) {
    const iso = formatStripeDateIso(value);
    return iso ? iso.split('T')[0] : null;
}

function normalizeStoredDate(value) {
    if (!value) return null;
    if (typeof value?.toDate === 'function') return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'number') {
        const timestampMs = value > 100000000000 ? value : value * 1000;
        return new Date(timestampMs).toISOString();
    }
    return String(value);
}

function buildStripeCancellationFields(subscription = {}) {
    const status = String(subscription?.status || '').toLowerCase();
    const hasCancellation = Boolean(
        subscription?.cancel_at_period_end ||
        subscription?.cancel_at ||
        subscription?.canceled_at ||
        subscription?.ended_at ||
        status === 'canceled'
    );
    const cancelAt = hasCancellation
        ? formatStripeDateIso(subscription?.cancel_at || subscription?.ended_at || subscription?.current_period_end)
        : null;
    const canceledAt = hasCancellation ? formatStripeDateIso(subscription?.canceled_at) : null;
    const endedAt = hasCancellation ? formatStripeDateIso(subscription?.ended_at) : null;

    return {
        cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
        canceledAt,
        canceledAtDate: canceledAt ? canceledAt.split('T')[0] : null,
        cancelAt,
        cancelAtDate: cancelAt ? cancelAt.split('T')[0] : null,
        endedAt,
        endedAtDate: endedAt ? endedAt.split('T')[0] : null,
        cancellationReason: subscription?.cancellation_details?.reason || null,
        cancellationFeedback: subscription?.cancellation_details?.feedback || null,
        cancellationComment: subscription?.cancellation_details?.comment || null,
    };
}

function findSyncCreditComboById(comboId) {
    return SYNC_CREDIT_COMBOS.find((combo) => combo.id === comboId) || null;
}

function findSyncCreditComboByCredits(credits) {
    return SYNC_CREDIT_COMBOS.find((combo) => combo.credits === credits) || null;
}

function buildSyncCreditExternalReference(uid, combo) {
    return `${SYNC_CREDIT_PREFIX}|${combo.id}|${combo.credits}|${uid}`;
}

function parseSyncCreditExternalReference(externalReference) {
    const parts = String(externalReference || '').split('|').filter(Boolean);
    if (parts[0] !== SYNC_CREDIT_PREFIX) return null;

    if (parts.length >= 4) {
        const combo = findSyncCreditComboById(parts[1]);
        const credits = Number(parts[2]);
        return {
            type: SYNC_CREDIT_PREFIX,
            comboId: parts[1],
            combo,
            credits,
            uid: parts[3] || null,
        };
    }

    if (parts.length >= 3) {
        const credits = Number(parts[1]);
        return {
            type: SYNC_CREDIT_PREFIX,
            comboId: null,
            combo: findSyncCreditComboByCredits(credits),
            credits,
            uid: parts[2] || null,
        };
    }

    return null;
}

function getSyncCreditPaymentRef(uid, paymentId) {
    return db.collection('users').doc(uid).collection('syncCreditPayments').doc(paymentId);
}

function getUserRef(uid) {
    return db.collection('users').doc(uid);
}

function normalizeExtraSyncCredits(value) {
    return Number.isFinite(value) ? Math.max(0, Number(value)) : 0;
}

const INVALID_CARD_TOKEN_PATTERNS = [
    'MANAGED_BY_ASAAS',
    'PLACEHOLDER',
    'NONE',
    'NULL',
    'UNDEFINED',
];

function isValidCreditCardToken(token) {
    if (!token || typeof token !== 'string') return false;
    const trimmed = token.trim();
    if (trimmed.length < 30) return false;
    const upper = trimmed.toUpperCase();
    return !INVALID_CARD_TOKEN_PATTERNS.some(p => upper.includes(p));
}

function getStoredCreditCardToken(userData = {}) {
    const raw = userData?.paymentMethodDetails?.token || userData?.subscription?.creditCardToken || null;
    return isValidCreditCardToken(raw) ? raw : null;
}

function isSettledSyncCreditStatus(status) {
    return SYNC_CREDIT_SETTLED_STATUSES.has(String(status || '').toUpperCase());
}

function isFailedSyncCreditStatus(status) {
    return SYNC_CREDIT_FAILED_STATUSES.has(String(status || '').toUpperCase());
}

async function verifyFirebaseRequest(req) {
    if (!admin.apps.length) {
        return { ok: false, status: 500, error: 'Firebase Admin nao configurado no servidor.' };
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { ok: false, status: 401, error: 'Token de autenticacao ausente.' };
    }

    try {
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        return { ok: true, uid: decodedToken.uid, user: decodedToken };
    } catch (error) {
        return { ok: false, status: 401, error: 'Token invalido ou expirado.' };
    }
}

async function requireAdminRequest(req, res) {
    const authResult = await verifyFirebaseRequest(req);
    if (!authResult.ok) {
        res.status(authResult.status).json({ error: authResult.error });
        return null;
    }

    if (!db) {
        res.status(500).json({ error: 'Firestore nao disponivel.' });
        return null;
    }

    const callerDoc = await db.collection('users').doc(authResult.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.isAdmin !== true) {
        res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
        return null;
    }

    return authResult;
}

async function ensureAsaasCustomerForUser({ uid, userData }) {
    const storedCustomerId = userData?.subscription?.asaasCustomerId || null;
    if (storedCustomerId) {
        return storedCustomerId;
    }

    const name = userData?.name || userData?.profile?.name || null;
    const email = userData?.email || userData?.profile?.email || null;
    const cpfCnpj = String(userData?.profile?.cpf || userData?.cpf || '').replace(/\D/g, '');
    const phone = String(userData?.profile?.phone || userData?.phone || '').replace(/\D/g, '');

    if (!name || !cpfCnpj) {
        throw {
            status: 400,
            message: 'Seu cadastro precisa ter nome e CPF para gerar a cobranca.',
        };
    }

    const response = await axios.post(`${ASAAS_URL}/customers`, {
        name,
        email,
        cpfCnpj,
        phone,
        externalReference: uid,
    }, { headers: asaasHeaders });

    const customerId = response.data?.id || null;
    if (!customerId) {
        throw {
            status: 502,
            message: 'Nao foi possivel criar o cliente no gateway.',
        };
    }

    await getUserRef(uid).set({
        subscription: {
            ...(userData?.subscription || {}),
            asaasCustomerId: customerId,
        },
        updatedAt: new Date().toISOString(),
    }, { merge: true });

    return customerId;
}

async function persistSyncCreditPayment({
    uid,
    combo,
    billingType,
    payment,
    customerId,
    eventName = null,
    credited = false,
    creditsGranted = 0,
    extraSyncCredits = null,
}) {
    if (!db || !uid || !payment?.id) return;

    const now = new Date().toISOString();
    await getSyncCreditPaymentRef(uid, payment.id).set({
        userId: uid,
        paymentId: payment.id,
        comboId: combo?.id || null,
        comboName: combo?.name || null,
        credits: combo?.credits ?? 0,
        amount: payment.value ?? combo?.amount ?? 0,
        billingType,
        customerId: customerId || payment.customer || null,
        externalReference: payment.externalReference || null,
        status: payment.status || 'PENDING',
        lastWebhookEvent: eventName,
        credited: Boolean(credited),
        creditsGranted: creditsGranted || 0,
        extraSyncCreditsAfterCredit: extraSyncCredits,
        createdAt: payment.dateCreated || now,
        updatedAt: now,
        creditedAt: credited ? now : null,
        confirmedDate: payment.confirmedDate || null,
        clientPaymentDate: payment.clientPaymentDate || null,
    }, { merge: true });
}

async function persistReusableCardSnapshot({ uid, userData, payment, submittedCard, submittedExpiry }) {
    if (!db || !uid || !submittedCard?.number) return;

    const cardLast4 = String(submittedCard.number).replace(/\D/g, '').slice(-4);
    const brand =
        payment?.creditCard?.creditCardBrand ||
        payment?.creditCardBrand ||
        userData?.paymentMethodDetails?.brand ||
        userData?.subscription?.creditCardBrand ||
        null;
    const token = payment?.creditCardToken || null;

    const payload = {
        paymentMethodDetails: {
            ...(userData?.paymentMethodDetails || {}),
            last4: cardLast4,
            expiry: submittedExpiry || userData?.paymentMethodDetails?.expiry || null,
            brand,
        },
        updatedAt: new Date().toISOString(),
    };

    if (token) {
        payload.paymentMethodDetails.token = token;
    }

    await getUserRef(uid).set(payload, { merge: true });
}

async function creditSyncCreditsFromPayment({ payment, eventName = null, source = 'unknown' }) {
    if (!db || !payment?.id) {
        return { handled: false, credited: false };
    }

    const parsedReference = parseSyncCreditExternalReference(payment.externalReference);
    if (!parsedReference?.uid) {
        return { handled: false, credited: false };
    }

    const combo =
        parsedReference.combo ||
        findSyncCreditComboByCredits(parsedReference.credits) ||
        null;
    const credits = combo?.credits ?? parsedReference.credits;
    if (!credits || !Number.isFinite(credits)) {
        return { handled: false, credited: false };
    }

    if (combo && roundCurrencyToCents(combo.amount) !== roundCurrencyToCents(payment.value)) {
        throw new Error('Valor da cobranca divergente para o pacote de creditos.');
    }

    const uid = parsedReference.uid;
    const paymentRef = getSyncCreditPaymentRef(uid, payment.id);
    const userRef = getUserRef(uid);
    const now = new Date().toISOString();
    let result = {
        handled: true,
        credited: false,
        creditsGranted: 0,
        extraSyncCredits: null,
        status: payment.status || null,
    };

    await db.runTransaction(async (transaction) => {
        const [paymentSnap, userSnap] = await Promise.all([
            transaction.get(paymentRef),
            transaction.get(userRef),
        ]);

        const paymentData = paymentSnap.exists ? (paymentSnap.data() || {}) : {};
        const userData = userSnap.exists ? (userSnap.data() || {}) : {};
        const wasCredited = paymentData.credited === true;
        const userExtraCredits = normalizeExtraSyncCredits(userData.extraSyncCredits);
        const shouldCredit = isSettledSyncCreditStatus(payment.status);
        const nextExtraCredits = shouldCredit && !wasCredited
            ? userExtraCredits + credits
            : userExtraCredits;

        transaction.set(paymentRef, {
            userId: uid,
            paymentId: payment.id,
            comboId: combo?.id || paymentData.comboId || null,
            comboName: combo?.name || paymentData.comboName || null,
            credits,
            amount: payment.value ?? paymentData.amount ?? 0,
            billingType: payment.billingType || paymentData.billingType || null,
            customerId: payment.customer || paymentData.customerId || null,
            externalReference: payment.externalReference || paymentData.externalReference || null,
            status: payment.status || paymentData.status || 'PENDING',
            lastWebhookEvent: eventName,
            lastStatusSource: source,
            updatedAt: now,
            confirmedDate: payment.confirmedDate || paymentData.confirmedDate || null,
            clientPaymentDate: payment.clientPaymentDate || paymentData.clientPaymentDate || null,
            credited: wasCredited || shouldCredit,
            creditsGranted: wasCredited ? (paymentData.creditsGranted || credits) : (shouldCredit ? credits : 0),
            creditedAt: wasCredited
                ? paymentData.creditedAt || now
                : (shouldCredit ? now : paymentData.creditedAt || null),
            extraSyncCreditsAfterCredit: shouldCredit ? nextExtraCredits : userExtraCredits,
            createdAt: paymentData.createdAt || payment.dateCreated || now,
        }, { merge: true });

        if (shouldCredit && !wasCredited) {
            transaction.set(userRef, {
                extraSyncCredits: nextExtraCredits,
                updatedAt: now,
                ...(payment.customer ? {
                    subscription: {
                        ...(userData.subscription || {}),
                        asaasCustomerId: payment.customer,
                    }
                } : {}),
            }, { merge: true });

            // Postback UTMify
            if (payment.value > 0) {
                sendUtmifySale({
                    orderId: payment.id,
                    email: userData.email || userData.profile?.email,
                    name: userData.name || userData.profile?.name,
                    phone: userData.phone || userData.profile?.phone,
                    value: payment.value,
                    productName: `Créditos Extras | ${combo?.name || 'Recarga'}`,
                    productId: combo?.id || 'sync_credits',
                    document: userData.cpf || userData.profile?.cpf
                });
            }
        }

        result = {
            handled: true,
            credited: shouldCredit,
            creditsGranted: shouldCredit && !wasCredited ? credits : 0,
            extraSyncCredits: nextExtraCredits,
            status: payment.status || paymentData.status || null,
        };
    });

    return result;
}

// ─────────────────────────────────────────────
// EXPRESS
// ─────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || process.env.BACKEND_PORT || 3000;

// Configuração robusta de CORS
const allowedOrigins = [
    'https://www.controlarmais.com.br',
    'https://controlarmais.com.br',
    'https://controlarmais.vercel.app',
    'https://burseraceous-adalynn-academically.ngrok-free.dev',
    'https://toney-nonreversing-cedrick.ngrok-free.dev',
    'https://angelina-unsalvageable-inconceivably.ngrok-free.dev',
    'http://localhost:5173',
    'http://localhost:3000',
];

app.use(cors({
    origin: function (origin, callback) {
        // Permite requisições sem origin (como mobile apps ou curl)
        if (!origin) return callback(null, true);
        // Permite qualquer URL ngrok automaticamente
        if (origin.includes('ngrok')) {
            return callback(null, true);
        }
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`[CORS] Origem bloqueada: ${origin}`);
            callback(new Error('Não permitido pelo CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
}));

// Responder a preflight requests globalmente (Express 5 compatível)
app.options('/{*splat}', cors());
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
app.use(express.json());

// Logger de requisições
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use('/api/pluggy', pluggyRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/ai', aiRouter);

// ─────────────────────────────────────────────
// EMAILS — Configuração (Importados de ./api/emails.js)
// ─────────────────────────────────────────────


/**
 * POST /api/send-otp
 * Envia código OTP por e-mail.
 */
app.post('/api/send-otp', async (req, res) => {
    const { email, otp, type } = req.body;
    try {
        const info = await sendOtpEmail({ email, otp, type });
        console.log('📧 OTP email enviado:', info?.id);
        return res.status(200).json({ success: true, messageId: info?.id });
    } catch (error) {
        console.error('❌ Erro ao enviar OTP:', error.message);
        return res.status(error.status || 500).json({ error: error.message || 'Falha ao enviar e-mail.' });
    }
});

// Removido endpoint local de boas-vindas. Disparado via Webhook Stripe.

/**
 * POST /api/request-password-reset
 * Inicia recuperação de senha gerando OTP no admin server e disparando e-mail.
 */
app.post('/api/request-password-reset', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email obrigatório.' });

    try {
        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(email);
        } catch (err) {
            // Se nao existe, finge que deu certo para segurança (evitar enumeracao de contas)
            return res.status(200).json({ success: true });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        await db.collection('users').doc(userRecord.uid).set({
            passwordResetCode: otp,
            passwordResetExpiry: expiresAt
        }, { merge: true });

        await sendPasswordResetEmail({ email, otp });


        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('❌ Erro request-password-reset:', error.message);
        // Mesmo no erro, devolve 200 pra n vazar info.
        return res.status(200).json({ success: true });
    }
});

/**
 * POST /api/confirm-password-reset
 * Valida o código OTP e altera a senha no Firebase Auth.
 */
app.post('/api/confirm-password-reset', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ error: 'Dados insuficientes.' });

    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        const userDoc = await db.collection('users').doc(userRecord.uid).get();
        const data = userDoc.data();

        if (!data?.passwordResetCode || data.passwordResetCode !== otp) {
            return res.status(400).json({ error: 'Código inválido ou incorreto.' });
        }
        if (new Date() > new Date(data.passwordResetExpiry)) {
            return res.status(400).json({ error: 'O código espirou. Solicite um novo.' });
        }

        await admin.auth().updateUser(userRecord.uid, { password: newPassword });
        await db.collection('users').doc(userRecord.uid).update({
            passwordResetCode: admin.firestore.FieldValue.delete(),
            passwordResetExpiry: admin.firestore.FieldValue.delete()
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('❌ Erro confirm-password-reset:', error.message);
        return res.status(400).json({ error: 'Erro ao redefinir a senha ou usuário não existe.' });
    }
});

// ─────────────────────────────────────────────
// ASAAS — Configuração
// ─────────────────────────────────────────────
function resolveAsaasMode() {
    const rawMode = String(process.env.ASAAS_MODE || '').trim().toLowerCase();
    if (['production', 'prod', 'live'].includes(rawMode)) return 'production';
    if (['sandbox', 'test', 'testing', 'development', 'dev'].includes(rawMode)) return 'sandbox';

    const railwayEnvironment = String(
        process.env.RAILWAY_ENVIRONMENT_NAME ||
        process.env.RAILWAY_ENVIRONMENT ||
        ''
    ).trim().toLowerCase();

    return process.env.NODE_ENV === 'production' || railwayEnvironment.includes('production')
        ? 'production'
        : 'sandbox';
}

function normalizeAsaasBaseUrl(value) {
    const baseUrl = String(value || '').trim().replace(/\/+$/, '');
    if (!baseUrl) return '';
    return /\/v3$/i.test(baseUrl) ? baseUrl : `${baseUrl}/v3`;
}

const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_MODE = resolveAsaasMode();
const ASAAS_URL = normalizeAsaasBaseUrl(process.env.ASAAS_BASE_URL) || (
    ASAAS_MODE === 'production'
        ? 'https://api.asaas.com/v3'
        : 'https://api-sandbox.asaas.com/v3'
);

const asaasHeaders = {
    'access_token': ASAAS_API_KEY,
    'Content-Type': 'application/json'
};

console.log(`[Asaas] Ambiente: ${ASAAS_MODE === 'production' ? 'PRODUCTION' : 'SANDBOX'} (${ASAAS_URL}) | API key ${ASAAS_API_KEY ? 'definida' : 'AUSENTE'}`);

// ─────────────────────────────────────────────
// ASAAS — Clientes
// ─────────────────────────────────────────────

/**
 * POST /api/asaas/create-customer
 * Cria um novo cliente no Asaas.
 */
app.post('/api/asaas/create-customer', async (req, res) => {
    const { name, email, cpfCnpj, phone, uid } = req.body;

    if (!name || !cpfCnpj) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes: name e cpfCnpj.' });
    }

    try {
        const response = await axios.post(`${ASAAS_URL}/customers`, {
            name,
            email,
            cpfCnpj,
            phone,
            externalReference: uid
        }, { headers: asaasHeaders });

        return res.status(200).json(response.data);
    } catch (error) {
        console.error('❌ Erro ao criar cliente:', error.response?.data || error.message);
        return res.status(400).json(error.response?.data || { error: 'Erro ao criar cliente.' });
    }
});

/**
 * PUT /api/asaas/update-customer/:customerId
 * Atualiza o externalReference (UID Firebase) de um cliente existente.
 * CORREÇÃO: método PUT (era POST incorretamente).
 */
app.put('/api/asaas/update-customer/:customerId', async (req, res) => {
    const { customerId } = req.params;
    const { uid, ...fieldsToUpdate } = req.body;

    if (!customerId) {
        return res.status(400).json({ error: 'customerId é obrigatório.' });
    }

    try {
        const response = await axios.put(
            `${ASAAS_URL}/customers/${customerId}`,
            { externalReference: uid, ...fieldsToUpdate },
            { headers: asaasHeaders }
        );

        return res.status(200).json(response.data);
    } catch (error) {
        console.error('❌ Erro ao atualizar cliente:', error.response?.data || error.message);
        return res.status(400).json(error.response?.data || { error: 'Erro ao atualizar cliente.' });
    }
});

// ─────────────────────────────────────────────
// ASAAS — Assinaturas
// ─────────────────────────────────────────────

/**
 * POST /api/asaas/create-subscription
 * Cria uma assinatura recorrente com cartão de crédito.
 */
app.post('/api/asaas/create-subscription', async (req, res) => {
    const {
        customer,
        value,
        cycle,
        description,
        creditCard,
        creditCardHolderInfo,
        remoteIp
    } = req.body;

    if (!customer || !creditCard || !creditCardHolderInfo || !remoteIp) {
        return res.status(400).json({
            error: 'Campos obrigatórios ausentes: customer, creditCard, creditCardHolderInfo, remoteIp.'
        });
    }

    // Data de início: amanhã
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 1);
    const nextDueDateStr = nextDueDate.toISOString().split('T')[0];

    try {
        const response = await axios.post(`${ASAAS_URL}/subscriptions`, {
            customer,
            billingType: 'CREDIT_CARD',
            value: value || 35.90, // Usa valor do body; fallback para o padrão do Plano Pro
            nextDueDate: nextDueDateStr,
            cycle: cycle || 'MONTHLY',
            description: description || 'Assinatura Plano Pro - Controlar+',
            creditCard,
            creditCardHolderInfo,
            remoteIp
        }, { headers: asaasHeaders });

        return res.status(200).json(response.data);
    } catch (error) {
        console.error('❌ Erro ao criar assinatura:', error.response?.data || error.message);
        return res.status(400).json(error.response?.data || { error: 'Erro ao criar assinatura.' });
    }
});

/**
 * POST /api/asaas/update-subscription-card/:subscriptionId
 * Atualiza o cartão de crédito de uma assinatura existente.
 */
app.post('/api/asaas/update-subscription-card/:subscriptionId', async (req, res) => {
    const { subscriptionId } = req.params;
    const { creditCard, creditCardHolderInfo, remoteIp } = req.body;

    if (!subscriptionId || !creditCard || !creditCardHolderInfo || !remoteIp) {
        return res.status(400).json({
            error: 'Campos obrigatórios ausentes: subscriptionId, creditCard, creditCardHolderInfo, remoteIp.'
        });
    }

    try {
        const response = await axios.post(`${ASAAS_URL}/subscriptions/${subscriptionId}`, {
            creditCard,
            creditCardHolderInfo,
            remoteIp
        }, { headers: asaasHeaders });

        return res.status(200).json(response.data);
    } catch (error) {
        console.error('❌ Erro ao atualizar cartão da assinatura:', error.response?.data || error.message);
        return res.status(400).json(error.response?.data || { error: 'Erro ao atualizar cartão.' });
    }
});

/**
 * DELETE /api/asaas/cancel-subscription/:subscriptionId
 * Cancela uma assinatura ativa.
 */
app.delete('/api/asaas/cancel-subscription/:subscriptionId', async (req, res) => {
    const { subscriptionId } = req.params;

    if (!subscriptionId) {
        return res.status(400).json({ error: 'subscriptionId é obrigatório.' });
    }

    try {
        const response = await axios.delete(
            `${ASAAS_URL}/subscriptions/${subscriptionId}`,
            { headers: asaasHeaders }
        );

        return res.status(200).json(response.data);
    } catch (error) {
        console.error('❌ Erro ao cancelar assinatura:', error.response?.data || error.message);
        return res.status(400).json(error.response?.data || { error: 'Erro ao cancelar assinatura.' });
    }
});

// ─────────────────────────────────────────────
// ASAAS — Cobranças Avulsas
// ─────────────────────────────────────────────

/**
 * POST /api/asaas/create-charge
 * Cria uma cobrança avulsa (Cartão ou PIX).
 * Se não houver customerId, tenta criar um novo cliente.
 */
app.post('/api/asaas/create-charge', async (req, res) => {
    const {
        customer,
        value,
        billingType,
        description,
        externalReference,
        creditCard,
        creditCardHolderInfo,
        remoteIp,
        customerName,
        customerCpfCnpj,
        customerEmail
    } = req.body;

    try {
        let finalCustomerId = customer;

        // 1. Se não temos customerId, criamos um
        if (!finalCustomerId && customerName && customerCpfCnpj) {
            console.log('[Asaas] Criando cliente sob demanda...');
            const custRes = await axios.post(`${ASAAS_URL}/customers`, {
                name: customerName,
                email: customerEmail,
                cpfCnpj: customerCpfCnpj,
                externalReference: externalReference?.split('|')?.[2] || null
            }, { headers: asaasHeaders });
            finalCustomerId = custRes.data.id;
        }

        if (!finalCustomerId) {
            throw new Error('Identificação do cliente é necessária.');
        }

        // 2. Criar Pagamento
        const paymentPayload = {
            customer: finalCustomerId,
            billingType,
            value,
            dueDate: new Date().toISOString().split('T')[0],
            description,
            externalReference
        };

        if (billingType === 'CREDIT_CARD') {
            paymentPayload.creditCard = creditCard;
            paymentPayload.creditCardHolderInfo = creditCardHolderInfo;
            paymentPayload.remoteIp = remoteIp;
        }

        const payRes = await axios.post(`${ASAAS_URL}/payments`, paymentPayload, { headers: asaasHeaders });
        const payment = payRes.data;

        // 3. Se for PIX, buscar QR Code
        if (billingType === 'PIX') {
            const qrRes = await axios.get(`${ASAAS_URL}/payments/${payment.id}/pixQrCode`, { headers: asaasHeaders });
            return res.status(200).json({ ...payment, pixQrCode: qrRes.data });
        }

        return res.status(200).json(payment);

    } catch (error) {
        console.error('❌ Erro create-charge:', error.response?.data || error.message);
        const errorData = error.response?.data || { error: error.message };
        return res.status(400).json(errorData);
    }
});

// ─────────────────────────────────────────────
// ASAAS — Webhook
// ─────────────────────────────────────────────

/**
 * POST /api/asaas/webhook
 * Recebe e processa eventos do Asaas para manter o Firestore sincronizado.
 *
 * Eventos tratados:
 *   ATIVAÇÃO:    PAYMENT_CONFIRMED | PAYMENT_RECEIVED | SUBSCRIPTION_CREATED
 *   RENOVAÇÃO:   SUBSCRIPTION_RENEWED
 *   SUSPENSÃO:   PAYMENT_OVERDUE
 *   CANCELAMENTO: SUBSCRIPTION_DELETED | PAYMENT_DELETED | PAYMENT_REFUNDED
 */
/**
 * POST /api/asaas/sync-credits/checkout
 * Cria uma cobranca validada no servidor para compra de creditos extras.
 */
app.post('/api/asaas/sync-credits/checkout', async (req, res) => {
    const authResult = await verifyFirebaseRequest(req);
    if (!authResult.ok) {
        return res.status(authResult.status).json({ error: authResult.error });
    }

    if (!db) {
        return res.status(500).json({ error: 'Firestore nao configurado no servidor.' });
    }

    const {
        comboId,
        billingType,
        cardMode = 'NEW',
        creditCard,
        creditCardHolderInfo,
        creditCardExpiry,
        remoteIp,
    } = req.body || {};
    const requestIp = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1')
        .split(',')[0]
        .trim()
        .replace(/^::ffff:/, '') || '127.0.0.1';

    const combo = findSyncCreditComboById(comboId);
    if (!combo) {
        return res.status(400).json({ error: 'Pacote de creditos invalido.' });
    }

    if (!['PIX', 'CREDIT_CARD'].includes(billingType)) {
        return res.status(400).json({ error: 'Metodo de pagamento invalido.' });
    }

    try {
        const userRef = getUserRef(authResult.uid);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return res.status(404).json({ error: 'Usuario nao encontrado.' });
        }

        const userData = userSnap.data() || {};
        const customerId = await ensureAsaasCustomerForUser({
            uid: authResult.uid,
            userData,
        });

        const paymentPayload = {
            customer: customerId,
            billingType,
            value: combo.amount,
            dueDate: new Date().toISOString().split('T')[0],
            description: `Controlar+ | ${combo.name}`,
            externalReference: buildSyncCreditExternalReference(authResult.uid, combo),
        };

        if (billingType === 'CREDIT_CARD') {
            if (cardMode === 'SAVED') {
                const storedToken = getStoredCreditCardToken(userData);
                if (!storedToken) {
                    return res.status(400).json({
                        error: 'Nenhum cartao reutilizavel foi encontrado. Informe os dados completos do cartao.',
                    });
                }

                paymentPayload.creditCardToken = storedToken;
            } else {
                if (!creditCard || !creditCardHolderInfo) {
                    return res.status(400).json({
                        error: 'Dados obrigatorios ausentes para pagamento com cartao.',
                    });
                }

                paymentPayload.creditCard = creditCard;
                paymentPayload.creditCardHolderInfo = creditCardHolderInfo;
                paymentPayload.remoteIp = remoteIp || requestIp;
            }
        }

        const payRes = await axios.post(`${ASAAS_URL}/payments`, paymentPayload, { headers: asaasHeaders });
        const payment = payRes.data;

        if (billingType === 'CREDIT_CARD' && cardMode !== 'SAVED') {
            await persistReusableCardSnapshot({
                uid: authResult.uid,
                userData,
                payment,
                submittedCard: creditCard,
                submittedExpiry: creditCardExpiry,
            });
        }

        await persistSyncCreditPayment({
            uid: authResult.uid,
            combo,
            billingType,
            payment,
            customerId,
        });

        let pixQrCode = null;
        if (billingType === 'PIX') {
            try {
                const qrRes = await axios.get(`${ASAAS_URL}/payments/${payment.id}/pixQrCode`, { headers: asaasHeaders });
                pixQrCode = qrRes.data;
            } catch (qrError) {
                const qrErrorPayload = qrError.response?.data || {};
                const sandboxPixHint =
                    process.env.ASAAS_MODE !== 'production' &&
                    (qrError.response?.status === 404 || qrErrorPayload?.status === 404);

                console.error('❌ Erro ao buscar QR PIX:', qrErrorPayload || qrError.message);

                return res.status(sandboxPixHint ? 422 : 400).json({
                    error: sandboxPixHint
                        ? 'No sandbox do Asaas, o QR Code PIX pode nao ser gerado sem uma chave PIX cadastrada. Cadastre uma chave PIX no sandbox e gere uma nova cobranca.'
                        : (qrErrorPayload.errors?.[0]?.description || qrErrorPayload.error || 'Nao foi possivel gerar o QR Code PIX.'),
                    paymentId: payment.id,
                    payment,
                });
            }
        }

        let creditResult = {
            handled: true,
            credited: false,
            creditsGranted: 0,
            extraSyncCredits: null,
            status: payment.status || null,
        };

        if (isSettledSyncCreditStatus(payment.status)) {
            creditResult = await creditSyncCreditsFromPayment({
                payment,
                source: 'checkout',
            });
        }

        return res.status(200).json({
            success: true,
            paymentId: payment.id,
            payment,
            status: payment.status || null,
            credited: Boolean(creditResult.credited),
            creditsAdded: creditResult.creditsGranted || 0,
            extraSyncCredits: creditResult.extraSyncCredits,
            pixQrCode,
        });
    } catch (error) {
        console.error('❌ Erro sync-credits/checkout:', error.response?.data || error.message);
        return res.status(error.status || 400).json(error.response?.data || { error: error.message || 'Erro ao gerar cobranca.' });
    }
});

/**
 * GET /api/asaas/sync-credits/payments/:paymentId
 * Consulta o status da cobranca de creditos e aplica o credito, se liquidado.
 */
app.get('/api/asaas/sync-credits/payments/:paymentId', async (req, res) => {
    const authResult = await verifyFirebaseRequest(req);
    if (!authResult.ok) {
        return res.status(authResult.status).json({ error: authResult.error });
    }

    const { paymentId } = req.params;
    if (!paymentId) {
        return res.status(400).json({ error: 'paymentId e obrigatorio.' });
    }

    try {
        const paymentRes = await axios.get(`${ASAAS_URL}/payments/${paymentId}`, { headers: asaasHeaders });
        const payment = paymentRes.data;
        const parsedReference = parseSyncCreditExternalReference(payment.externalReference);

        if (!parsedReference || parsedReference.uid !== authResult.uid) {
            return res.status(403).json({ error: 'Pagamento nao pertence ao usuario autenticado.' });
        }

        const creditResult = await creditSyncCreditsFromPayment({
            payment,
            source: 'status_check',
        });

        if (!creditResult.handled) {
            return res.status(404).json({ error: 'Pagamento nao encontrado para creditos sincronizados.' });
        }

        return res.status(200).json({
            success: true,
            paymentId,
            status: payment.status || null,
            credited: Boolean(creditResult.credited),
            creditsAdded: creditResult.creditsGranted || 0,
            extraSyncCredits: creditResult.extraSyncCredits,
            isFailed: isFailedSyncCreditStatus(payment.status),
            isSettled: isSettledSyncCreditStatus(payment.status),
            payment,
        });
    } catch (error) {
        console.error('❌ Erro sync-credits/payment-status:', error.response?.data || error.message);
        return res.status(400).json(error.response?.data || { error: error.message || 'Erro ao consultar pagamento.' });
    }
});

app.post('/api/asaas/webhook', async (req, res) => {
    // Validação do token de segurança
    const incomingToken = req.headers['asaas-access-token'];
    if (process.env.ASAAS_WEBHOOK_TOKEN && incomingToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
        console.warn(`[Webhook] Token inválido recebido: ${incomingToken}`);
        return res.status(401).send('Unauthorized');
    }

    const { event, payment, subscription } = req.body;
    console.log(`[Webhook] Evento: ${event}`);

    const syncCreditReference = parseSyncCreditExternalReference(payment?.externalReference);

    // Mapeia eventos para ações
    const ACTIVATION_EVENTS = [
        'PAYMENT_CONFIRMED',
        'PAYMENT_RECEIVED',
        'SUBSCRIPTION_CREATED',
        'SUBSCRIPTION_RENEWED' // ← ADICIONADO: cobre renovações mensais
    ];

    const SUSPENSION_EVENTS = [
        'PAYMENT_OVERDUE' // ← ADICIONADO: suspende acesso em inadimplência
    ];

    const CANCELLATION_EVENTS = [
        'SUBSCRIPTION_DELETED', // ← ADICIONADO: cancelamento de assinatura
        'PAYMENT_DELETED',      // ← ADICIONADO: cobrança removida
        'PAYMENT_REFUNDED'      // ← ADICIONADO: estorno
    ];

    try {
        if (payment?.id && syncCreditReference?.uid) {
            try {
                const creditResult = await creditSyncCreditsFromPayment({
                    payment,
                    eventName: event,
                    source: 'webhook',
                });

                console.log(
                    `[Webhook] Sync credits | payment=${payment.id} | status=${payment.status} | ` +
                    `credited=${creditResult.credited} | added=${creditResult.creditsGranted || 0}`
                );
            } catch (creditError) {
                console.error('❌ Erro ao creditar sync credits:', creditError.message);
            }

            return res.status(200).send('OK');
        }

        const customerId = payment?.customer || subscription?.customer;

        if (!customerId) {
            console.warn('[Webhook] customerId não encontrado no payload.');
            return res.status(200).send('OK'); // Retorna 200 para evitar reenvios do Asaas
        }

        const uid = await getUidFromAsaasCustomer(customerId);

        if (!uid) {
            console.warn(`[Webhook] UID não encontrado para customerId: ${customerId}`);
            return res.status(200).send('OK');
        }

        const subscriptionId = payment?.subscription || subscription?.id;
        const isSubscriptionEvent = Boolean(subscriptionId || String(event || '').startsWith('SUBSCRIPTION_'));
        if (!isSubscriptionEvent) {
            console.log(`[Webhook] Evento ${event} ignorado por nao estar vinculado a assinatura.`);
            return res.status(200).send('OK');
        }

        const baseExtra = {
            'subscription.asaasCustomerId': customerId,
            'subscription.asaasSubscriptionId': subscriptionId
        };

        if (ACTIVATION_EVENTS.includes(event)) {
            await updateUserPlan(uid, 'pro', 'active', baseExtra);

            // Postback Utmify para novas vendas/ativações
            if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED' || event === 'SUBSCRIPTION_CREATED') {
                const userSnap = await db.collection('users').doc(uid).get();
                const userData = userSnap.data() || {};
                const requestIp = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();

                sendUtmifySale({
                    orderId: payment?.id || subscriptionId,
                    email: userData.email || userData.profile?.email,
                    name: userData.name || userData.profile?.name,
                    phone: userData.phone || userData.profile?.phone,
                    value: payment?.value || subscription?.value || 35.90,
                    ip: requestIp,
                    document: userData.cpf || userData.profile?.cpf
                });
            }

        } else if (SUSPENSION_EVENTS.includes(event)) {
            await updateUserPlan(uid, 'pro', 'overdue', baseExtra);

        } else if (CANCELLATION_EVENTS.includes(event)) {
            await updateUserPlan(uid, 'free', 'inactive', {
                'subscription.asaasCustomerId': customerId,
                'subscription.asaasSubscriptionId': null
            });

        } else {
            console.log(`[Webhook] Evento "${event}" não tratado — ignorado.`);
        }

        return res.status(200).send('OK');
    } catch (error) {
        console.error('❌ Erro ao processar webhook:', error.message);
        // Retorna 200 mesmo em erro interno para evitar reenvios em loop do Asaas
        return res.status(200).send('OK');
    }
});

// ─────────────────────────────────────────────
// ASAAS — Sincronizar Assinatura (Usuários Legados)
// ─────────────────────────────────────────────

/**
 * POST /api/asaas/sync-subscription
 * Consulta o Asaas diretamente e atualiza o status da assinatura no Firestore.
 * Usado para usuários legados que assinaram pelo Asaas no sistema antigo.
 */
app.post('/api/asaas/sync-subscription', async (req, res) => {
    const authResult = await verifyFirebaseRequest(req);
    if (!authResult.ok) {
        return res.status(authResult.status).json({ error: authResult.error });
    }

    const uid = authResult.uid;

    if (!db) {
        return res.status(500).json({ error: 'Firestore nao disponivel.' });
    }

    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'Usuario nao encontrado.' });
        }

        const userData = userDoc.data();

        // Lê campos em todos os lugares possíveis onde o sistema antigo pode ter salvo
        const subscriptionId = userData?.subscription?.asaasSubscriptionId
            || userData?.asaasSubscriptionId;
        let customerId = userData?.subscription?.asaasCustomerId
            || userData?.asaasCustomerId;

        const userEmail = userData?.email || userData?.profile?.email
            || authResult.user?.email || null;
        const userCpfCnpj = String(
            userData?.profile?.cpf || userData?.cpf
            || userData?.profile?.cpfCnpj || userData?.cpfCnpj || ''
        ).replace(/\D/g, '') || null;

        console.log(`[AsaasSync] uid=${uid} | subscriptionId=${subscriptionId} | customerId=${customerId} | email=${userEmail} | cpfCnpj=${userCpfCnpj} | subscription:`, JSON.stringify(userData?.subscription || {}));

        let asaasSubscription = null;
        let foundAsaasCustomer = null; // qualquer customer Asaas que case com este usuario

        // 1. Busca direto pelo subscriptionId
        if (subscriptionId) {
            try {
                const subRes = await axios.get(`${ASAAS_URL}/subscriptions/${subscriptionId}`, { headers: asaasHeaders });
                asaasSubscription = subRes.data;
                if (asaasSubscription?.customer) {
                    foundAsaasCustomer = { id: asaasSubscription.customer };
                }
            } catch (err) {
                console.warn(`[AsaasSync] subscriptionId ${subscriptionId} nao encontrado.`);
            }
        }

        // 2. Fallback: busca pelo customerId
        if (!asaasSubscription && customerId) {
            try {
                const listRes = await axios.get(`${ASAAS_URL}/subscriptions`, {
                    headers: asaasHeaders,
                    params: { customer: customerId, limit: 10 }
                });
                const items = listRes.data?.data || [];
                asaasSubscription = items.find(s => s.status === 'ACTIVE')
                    || items.find(s => s.status === 'OVERDUE')
                    || items[0]
                    || null;
                foundAsaasCustomer = { id: customerId };
            } catch (err) {
                console.warn(`[AsaasSync] Erro ao buscar por customerId ${customerId}.`);
            }
        }

        // Helper: busca customers Asaas por um filtro (email ou cpfCnpj) e seleciona
        // a melhor sub priorizando ACTIVE > OVERDUE > qualquer outra status.
        const lookupByCustomerFilter = async (filterParams, label) => {
            try {
                const custRes = await axios.get(`${ASAAS_URL}/customers`, {
                    headers: asaasHeaders,
                    params: { ...filterParams, limit: 5 }
                });
                const customers = custRes.data?.data || [];
                if (customers.length === 0) {
                    console.log(`[AsaasSync] Nenhum customer encontrado por ${label}.`);
                    return null;
                }

                const allMatches = [];
                for (const cust of customers) {
                    if (!foundAsaasCustomer) foundAsaasCustomer = cust;
                    try {
                        const subRes = await axios.get(`${ASAAS_URL}/subscriptions`, {
                            headers: asaasHeaders,
                            params: { customer: cust.id, limit: 10 }
                        });
                        const items = subRes.data?.data || [];
                        for (const sub of items) {
                            allMatches.push({ sub, customer: cust });
                        }
                    } catch (subErr) {
                        console.warn(`[AsaasSync] Erro ao listar subs do customer ${cust.id}.`);
                    }
                }

                const priorityOf = (s) => s === 'ACTIVE' ? 3 : s === 'OVERDUE' ? 2 : 1;
                allMatches.sort((a, b) => priorityOf(b.sub.status) - priorityOf(a.sub.status));
                const best = allMatches[0];

                if (best) {
                    console.log(`[AsaasSync] Sub por ${label}: customerId=${best.customer.id} status=${best.sub.status}`);

                    // Auto-recuperacao: corrige externalReference se estiver errado/legado
                    const currentExternalRef = best.customer.externalReference || '';
                    if (currentExternalRef !== uid) {
                        try {
                            await axios.put(
                                `${ASAAS_URL}/customers/${best.customer.id}`,
                                { externalReference: uid },
                                { headers: asaasHeaders }
                            );
                            console.log(`[AsaasSync] externalReference corrigido: "${currentExternalRef}" -> "${uid}"`);
                        } catch (refErr) {
                            console.warn(`[AsaasSync] Falha ao corrigir externalReference do customer ${best.customer.id}:`, refErr.message);
                        }
                    }
                    return best;
                }
                return null;
            } catch (err) {
                console.warn(`[AsaasSync] Erro ao buscar por ${label}: ${err.message}`);
                return null;
            }
        };

        // 3. Fallback: busca cliente pelo email
        if (!asaasSubscription && userEmail) {
            const best = await lookupByCustomerFilter({ email: userEmail }, `email=${userEmail}`);
            if (best) {
                asaasSubscription = best.sub;
                customerId = best.customer.id;
                foundAsaasCustomer = best.customer;
            }
        }

        // 4. Fallback: busca cliente pelo CPF/CNPJ
        if (!asaasSubscription && userCpfCnpj) {
            const best = await lookupByCustomerFilter({ cpfCnpj: userCpfCnpj }, `cpfCnpj=${userCpfCnpj}`);
            if (best) {
                asaasSubscription = best.sub;
                customerId = best.customer.id;
                foundAsaasCustomer = best.customer;
            }
        }

        if (!asaasSubscription) {
            console.log(`[AsaasSync] uid=${uid} — nenhuma assinatura encontrada no Asaas. customerEncontrado=${Boolean(foundAsaasCustomer)}`);

            // Se ao menos um customer Asaas foi achado pelo e-mail, salva o customerId
            // no Firestore. Assim o proximo login encaminha pra LegacyAsaasCheckout em
            // vez de jogar pro Stripe (isLegacyAsaasManagedUser passa a retornar true).
            if (foundAsaasCustomer?.id) {
                try {
                    await db.collection('users').doc(uid).set({
                        subscription: {
                            provider: 'asaas',
                            asaasCustomerId: foundAsaasCustomer.id,
                        },
                        updatedAt: new Date().toISOString(),
                    }, { merge: true });
                } catch (saveErr) {
                    console.warn(`[AsaasSync] Falha ao salvar asaasCustomerId:`, saveErr.message);
                }
            }

            // Nao sobrescreve um plano 'pro' ja existente — pode ser falha temporaria
            // do Asaas, IDs nao salvos, ou e-mail divergente. Preserva o estado atual
            // e deixa o frontend decidir pelo plano salvo no Firestore.
            const currentPlan = String(userData?.subscription?.plan || userData?.plan || 'free').toLowerCase();
            const currentStatus = String(userData?.subscription?.status || 'inactive').toLowerCase();
            return res.status(200).json({
                success: true,
                synced: false,
                status: currentStatus,
                plan: currentPlan,
                hasAsaasCustomer: Boolean(foundAsaasCustomer?.id),
                asaasCustomerId: foundAsaasCustomer?.id || null,
                message: 'Nenhuma assinatura encontrada no Asaas; plano atual preservado.',
            });
        }

        // Mapeia status do Asaas para status interno
        const asaasStatus = String(asaasSubscription.status || '').toUpperCase();
        let internalStatus;
        let internalPlan;

        if (asaasStatus === 'ACTIVE') {
            internalStatus = 'active';
            internalPlan = 'pro';
        } else if (asaasStatus === 'OVERDUE') {
            internalStatus = 'overdue';
            internalPlan = 'pro';
        } else {
            // INACTIVE, EXPIRED, etc.
            internalStatus = 'inactive';
            internalPlan = 'free';
        }

        const extraFields = {
            'subscription.provider': 'asaas',
            'subscription.asaasSubscriptionId': asaasSubscription.id,
        };

        if (customerId) extraFields['subscription.asaasCustomerId'] = customerId;
        if (asaasSubscription.nextDueDate) extraFields['subscription.nextBillingDate'] = asaasSubscription.nextDueDate;
        if (asaasSubscription.value) extraFields['subscription.price'] = String(asaasSubscription.value).replace('.', ',');
        if (asaasSubscription.creditCard?.creditCardBrand) {
            extraFields['subscription.creditCardBrand'] = asaasSubscription.creditCard.creditCardBrand;
        }
        if (asaasSubscription.creditCard?.creditCardNumber) {
            // Asaas retorna os últimos 4 dígitos
            extraFields['subscription.creditCardLast4'] = asaasSubscription.creditCard.creditCardNumber;
        }

        await updateUserPlan(uid, internalPlan, internalStatus, extraFields);

        console.log(`[AsaasSync] uid=${uid} | asaasStatus=${asaasStatus} → interno: plano=${internalPlan}, status=${internalStatus}`);

        return res.status(200).json({
            success: true,
            synced: true,
            asaasStatus,
            status: internalStatus,
            plan: internalPlan,
            nextBillingDate: asaasSubscription.nextDueDate || null,
            subscriptionId: asaasSubscription.id,
            hasAsaasCustomer: true,
            asaasCustomerId: customerId || null,
        });

    } catch (error) {
        console.error('❌ Erro ao sincronizar assinatura Asaas:', error.response?.data || error.message);
        return res.status(500).json({ error: error.message || 'Erro ao sincronizar assinatura.' });
    }
});

// ADMIN — Visão Geral de Assinaturas
// ─────────────────────────────────────────────

/**
 * GET /api/admin/subscriptions
 * Lista todos os usuários com assinatura (pro/overdue) e verifica status no Asaas e Stripe.
 * Requer autenticação e isAdmin === true no Firestore.
 */
app.get('/api/admin/users', async (req, res) => {
    const authResult = await verifyFirebaseRequest(req);
    if (!authResult.ok) {
        return res.status(authResult.status).json({ error: authResult.error });
    }

    if (!db) {
        return res.status(500).json({ error: 'Firestore nao disponivel.' });
    }

    // Verifica se o usuário logado é admin
    const callerDoc = await db.collection('users').doc(authResult.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.isAdmin !== true) {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }

    try {
        // Busca todos os usuários no Auth para pegar data de criação real e emails
        let authUsers = new Map();
        try {
            let listUsersResult = await admin.auth().listUsers(1000);
            listUsersResult.users.forEach(u => authUsers.set(u.uid, u));
            while (listUsersResult.pageToken) {
                listUsersResult = await admin.auth().listUsers(1000, listUsersResult.pageToken);
                listUsersResult.users.forEach(u => authUsers.set(u.uid, u));
            }
        } catch (e) {
            console.warn('Nao foi possivel buscar auth users:', e.message);
        }

        // Busca todos os usuários do Firestore
        const snap = await db.collection('users').get();
        const results = [];

        // Adiciona usuários do Firestore (e mescla com Auth)
        const processedUids = new Set();

        for (const doc of snap.docs) {
            const uid = doc.id;
            processedUids.add(uid);

            const data = doc.data();
            const sub = data.subscription || {};
            const profile = data.profile || {};
            const authUser = authUsers.get(uid);

            const email = data.email || profile.email || authUser?.email || 'N/A';
            const name = data.name || profile.name || authUser?.displayName || email || uid;
            const disabled = Boolean(authUser?.disabled || data.disabled || data.isBlocked || data.blockedAt);

            const provider = sub.provider || (sub.asaasCustomerId ? 'asaas' : sub.stripeCustomerId ? 'stripe' : 'unknown');
            const plan = sub.plan || data.plan || 'free';
            const status = sub.status || 'unknown';
            const billingCycle = sub.billingCycle || sub.frequency || sub.interval || 'mensal';
            const subscriptionAmount = [
                sub.nextAmount,
                sub.price,
                sub.amount,
                sub.value,
                data.planPrice,
                data.valor,
            ].map(parseMoneyValue).find((amount) => amount > 0) || 0;
            const subscriptionMonthlyAmount = getSubscriptionMonthlyAmount(sub, data);
            const canceledAt = normalizeStoredDate(sub.canceledAt || sub.canceledAtDate);
            const cancelAt = normalizeStoredDate(sub.cancelAt || sub.cancelAtDate);
            const endedAt = normalizeStoredDate(sub.endedAt || sub.endedAtDate);
            const currentPeriodEnd = normalizeStoredDate(sub.currentPeriodEnd || sub.nextBillingDate);

            let createdAt = data.createdAt || authUser?.metadata?.creationTime || null;
            if (createdAt && typeof createdAt.toDate === 'function') {
                createdAt = createdAt.toDate().toISOString();
            } else if (createdAt && createdAt instanceof Date) {
                createdAt = createdAt.toISOString();
            } else if (createdAt && typeof createdAt === 'number') {
                createdAt = new Date(createdAt).toISOString();
            }

            let lastLogin = data.lastLogin || authUser?.metadata?.lastSignInTime || null;
            if (lastLogin && typeof lastLogin.toDate === 'function') {
                lastLogin = lastLogin.toDate().toISOString();
            } else if (lastLogin instanceof Date) {
                lastLogin = lastLogin.toISOString();
            }

            results.push({
                uid,
                name,
                email,
                provider,
                plan,
                status,
                billingCycle,
                subscriptionAmount,
                subscriptionMonthlyAmount,
                cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
                autoRenew: sub.autoRenew ?? null,
                canceledAt,
                canceledAtDate: sub.canceledAtDate || (canceledAt ? canceledAt.split('T')[0] : null),
                cancelAt,
                cancelAtDate: sub.cancelAtDate || (cancelAt ? cancelAt.split('T')[0] : null),
                endedAt,
                endedAtDate: sub.endedAtDate || (endedAt ? endedAt.split('T')[0] : null),
                currentPeriodEnd,
                nextBillingDate: sub.nextBillingDate || (currentPeriodEnd ? currentPeriodEnd.split('T')[0] : null),
                cancellationReason: sub.cancellationReason || null,
                cancellationFeedback: sub.cancellationFeedback || null,
                cancellationComment: sub.cancellationComment || null,
                isAdmin: data.isAdmin || false,
                disabled,
                isBlocked: disabled,
                blockedAt: normalizeStoredDate(data.blockedAt || null),
                blockedBy: data.blockedBy || null,
                abandonedHandled: data.abandonedHandled || false,
                remarketingStage: data.remarketingStage || 0,
                remarketingOpenD1: data.remarketingOpenD1 || null,
                remarketingOpenD2: data.remarketingOpenD2 || null,
                remarketingOpenD3: data.remarketingOpenD3 || null,
                remarketingClickD1: data.remarketingClickD1 || null,
                remarketingClickD2: data.remarketingClickD2 || null,
                remarketingClickD3: data.remarketingClickD3 || null,
                createdAt,
                lastLogin,
                activeDaysCount: data.activeDaysCount || 0
            });
        }

        // Opcional: Adicionar usuários que só existem no Auth (e não no Firestore)
        for (const [uid, authUser] of authUsers.entries()) {
            if (!processedUids.has(uid)) {
                results.push({
                    uid,
                    name: authUser.displayName || authUser.email || uid,
                    email: authUser.email || 'N/A',
                    provider: 'unknown',
                    plan: 'free',
                    status: 'unknown',
                    isAdmin: false,
                    disabled: Boolean(authUser.disabled),
                    isBlocked: Boolean(authUser.disabled),
                    blockedAt: null,
                    blockedBy: null,
                    createdAt: authUser.metadata?.creationTime || null,
                    lastLogin: authUser.metadata?.lastSignInTime || null,
                    activeDaysCount: 0
                });
            }
        }

        // Ordena por data de criacao (mais novos primeiro)
        results.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });
        return res.status(200).json({ total: results.length, users: results });
    } catch (error) {
        console.error('❌ Erro ao listar assinaturas admin:', error.message);
        return res.status(500).json({ error: error.message || 'Erro interno.' });
    }
});

/**
 * [ADMIN] Envia e-mail de teste de remarketing
 */
app.post('/api/admin/test-remarketing', async (req, res) => {
    const authResult = await verifyFirebaseRequest(req);
    if (!authResult.ok) return res.status(authResult.status).json({ error: authResult.error });

    const { email, name, day } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mail obrigatório.' });

    try {
        const d = parseInt(day) || 1;
        let couponCode = null;
        let expiresAt = null;
        let checkoutUrl = 'https://www.controlarmais.com.br/';

        // Tentar encontrar usuário para criar sessão real no Stripe
        const userSnap = await db.collection('users').where('email', '==', email).limit(1).get();
        const userData = userSnap.empty ? null : userSnap.docs[0].data();
        const uid = userSnap.empty ? null : userSnap.docs[0].id;

        if (uid && (d === 2 || d === 3)) {
            // Gerar cupom único NAME1234
            const promoData = await createUniquePromoCode(name || userData?.name || 'AMIGO');
            couponCode = promoData.code;
            expiresAt = promoData.expiresAt;

            // Criar sessão de checkout já com o cupom aplicado
            const session = await createRemarketingCheckoutSession({
                uid,
                promoCode: couponCode
            });
            checkoutUrl = session.url;
        }

        await sendAbandonedCartEmail({
            uid,
            email,
            name: name || userData?.name || 'Gustavo',
            day: d,
            couponCode,
            checkoutUrl,
            expiresAt
        });

        // Registrar o estágio no banco mesmo no teste para aparecer na tabela
        await db.collection('users').doc(uid).update({
            remarketingStage: d,
            lastRemarketingSentAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.status(200).json({
            success: true,
            message: `E-mail D+${d} enviado para ${email}. ${couponCode ? `Cupom: ${couponCode}` : ''}`
        });
    } catch (error) {
        console.error('❌ Erro ao enviar remarketing teste:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * [ADMIN] Marca carrinho como finalizado/ignorado (remove da lista)
 */
app.post('/api/admin/users/:uid/abandoned-handled', async (req, res) => {
    const authResult = await verifyFirebaseRequest(req);
    if (!authResult.ok) return res.status(authResult.status).json({ error: authResult.error });

    const callerDoc = await db.collection('users').doc(authResult.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.isAdmin !== true) {
        return res.status(403).json({ error: 'Acesso negado.' });
    }

    const { uid } = req.params;
    try {
        await db.collection('users').doc(uid).set({
            abandonedHandled: true
        }, { merge: true });
        return res.status(200).json({ success: true, message: 'Carrinho marcado como tratado.' });
    } catch (error) {
        console.error('❌ Erro ao tratar carrinho:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * [ADMIN] Verifica pagamento ativo no provedor
 */
app.get('/api/admin/users/:uid/verify-payment', async (req, res) => {
    try {
        const decodedToken = await admin.auth().verifyIdToken(req.headers.authorization?.split('Bearer ')[1]);
        if (!decodedToken) return res.status(401).json({ error: 'Não autorizado.' });

        const adminDoc = await db.collection('users').doc(decodedToken.uid).get();
        if (!adminDoc.exists || !adminDoc.data().isAdmin) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const targetUid = req.params.uid;
        const targetDoc = await db.collection('users').doc(targetUid).get();
        if (!targetDoc.exists) return res.status(404).json({ error: 'Usuário não encontrado.' });

        const data = targetDoc.data();
        const sub = data.subscription || {};
        let verified = false;
        let paying = false;
        let providerStatus = null;
        let providerMonthlyAmount = 0;
        let providerBillingCycle = null;
        let providerCancellationFields = {};

        if ((sub.provider === 'stripe' || sub.stripeCustomerId) && stripe && sub.stripeCustomerId) {
            const stripeSubs = await stripe.subscriptions.list({ customer: sub.stripeCustomerId, status: 'all' });
            const liveSub = stripeSubs.data.find(s => ['active', 'trialing'].includes(s.status));
            verified = Boolean(liveSub);
            const activeSub = stripeSubs.data.find(s => s.status === 'active');
            paying = Boolean(activeSub);
            const ref = activeSub || liveSub;
            if (ref) {
                providerStatus = ref.status;
                const item = ref.items?.data?.[0];
                const price = item?.price;
                const unitAmount = (price?.unit_amount ?? 0) / 100;
                const interval = price?.recurring?.interval || null;
                providerBillingCycle = interval;
                if (unitAmount > 0) {
                    providerMonthlyAmount = interval === 'year' ? unitAmount / 12 : unitAmount;
                }
            }
            const cancellationRef = ref || stripeSubs.data[0] || null;
            if (cancellationRef) {
                providerCancellationFields = buildStripeCancellationFields(cancellationRef);
            }
        } else if ((sub.provider === 'asaas' || sub.asaasCustomerId) && ASAAS_API_KEY && sub.asaasCustomerId) {
            const response = await axios.get(`${ASAAS_URL}/subscriptions`, {
                headers: asaasHeaders,
                params: { customer: sub.asaasCustomerId }
            });
            const activeSub = response.data.data.find(s => s.status === 'ACTIVE');
            verified = Boolean(activeSub);
            paying = Boolean(activeSub);
            if (activeSub) {
                providerStatus = activeSub.status;
                const rawValue = parseMoneyValue(activeSub.value);
                const cycle = String(activeSub.cycle || '').toUpperCase();
                providerBillingCycle = cycle;
                if (rawValue > 0) {
                    providerMonthlyAmount = cycle === 'YEARLY' ? rawValue / 12 : rawValue;
                }
            }
        }

        return res.status(200).json({
            verified,
            paying,
            status: providerStatus,
            monthlyAmount: providerMonthlyAmount,
            billingCycle: providerBillingCycle,
            ...providerCancellationFields
        });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Erro ao verificar pagamento.' });
    }
});

/**
 * POST /api/admin/users/:uid/toggle-admin
 * Alterna o status de administrador de um usuário.
 */
app.post('/api/admin/users/:uid/toggle-admin', async (req, res) => {
    const authResult = await verifyFirebaseRequest(req);
    if (!authResult.ok) return res.status(authResult.status).json({ error: authResult.error });

    if (!db) return res.status(500).json({ error: 'Firestore nao disponivel.' });

    const callerDoc = await db.collection('users').doc(authResult.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.isAdmin !== true) {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }

    const targetUid = req.params.uid;
    const { isAdmin } = req.body;

    try {
        await db.collection('users').doc(targetUid).set({ isAdmin: Boolean(isAdmin) }, { merge: true });
        return res.status(200).json({ success: true, isAdmin: Boolean(isAdmin) });
    } catch (error) {
        console.error(`❌ Erro ao alterar admin para ${targetUid}:`, error.message);
        return res.status(500).json({ error: 'Erro ao atualizar status de administrador.' });
    }
});

/**
 * DELETE /api/admin/users/:uid
 * Exclui um usuário do Authentication e do Firestore.
 */
app.delete('/api/admin/users/:uid', async (req, res) => {
    const authResult = await verifyFirebaseRequest(req);
    if (!authResult.ok) return res.status(authResult.status).json({ error: authResult.error });

    if (!db) return res.status(500).json({ error: 'Firestore nao disponivel.' });

    const callerDoc = await db.collection('users').doc(authResult.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.isAdmin !== true) {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }

    const targetUid = req.params.uid;
    if (targetUid === authResult.uid) {
        return res.status(400).json({ error: 'Voce nao pode excluir a si mesmo.' });
    }

    try {
        // Exclui do Firebase Auth
        try {
            await admin.auth().deleteUser(targetUid);
        } catch (authErr) {
            console.warn(`[admin/users] delete fallback: (uid=${targetUid}) não achado no auth. ${authErr.message}`);
        }

        // Exclui do Firestore
        await db.collection('users').doc(targetUid).delete();

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error(`❌ Erro ao excluir usuário ${targetUid}:`, error.message);
        return res.status(500).json({ error: 'Erro ao excluir usuário.' });
    }
});

/**
 * GET /api/admin/stats
 * Estatísticas em tempo real do painel administrativo:
 *   - assinantes ativos (status active no Stripe ou Asaas)
 *   - MRR (soma das mensalidades reais)
 *   - média de dias de uso entre os assinantes ativos
 */
app.get('/api/admin/stats', async (req, res) => {
    const authResult = await verifyFirebaseRequest(req);
    if (!authResult.ok) return res.status(authResult.status).json({ error: authResult.error });
    if (!db) return res.status(500).json({ error: 'Firestore nao disponivel.' });

    const callerDoc = await db.collection('users').doc(authResult.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.isAdmin !== true) {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }

    try {
        // 1) Carrega usuários do Firestore e cria índices por customerId
        const usersSnap = await db.collection('users').get();
        const usersByUid = new Map();
        const usersByStripeCustomerId = new Map();
        const usersByAsaasCustomerId = new Map();

        for (const doc of usersSnap.docs) {
            const data = doc.data();
            const sub = data.subscription || {};
            const user = {
                uid: doc.id,
                activeDaysCount: Number(data.activeDaysCount) || 0,
                stripeCustomerId: sub.stripeCustomerId || null,
                asaasCustomerId: sub.asaasCustomerId || null,
            };
            usersByUid.set(doc.id, user);
            if (user.stripeCustomerId) usersByStripeCustomerId.set(user.stripeCustomerId, user);
            if (user.asaasCustomerId) usersByAsaasCustomerId.set(user.asaasCustomerId, user);
        }

        // payingByUid: uid -> { provider, status, monthlyAmount }
        const payingByUid = new Map();
        const providerErrors = [];

        const addPaying = (uid, provider, status, monthly, extra = {}) => {
            if (!uid) return;
            if (!usersByUid.has(uid)) return; // ignora subs orfãs (usuario deletado)
            if (payingByUid.has(uid)) return; // dedupe entre provedores
            payingByUid.set(uid, {
                uid,
                provider,
                status,
                monthlyAmount: Number((monthly || 0).toFixed(2)),
                ...extra,
            });
        };

        // 2) Assinaturas ativas no Stripe (active + trialing — mesmo criterio do verify-payment)
        if (stripe) {
            try {
                for (const targetStatus of ['active', 'trialing']) {
                    let hasMore = true;
                    let startingAfter = undefined;
                    while (hasMore) {
                        const params = { limit: 100, status: targetStatus, expand: ['data.customer'] };
                        if (startingAfter) params.starting_after = startingAfter;

                        const stripeSubs = await stripe.subscriptions.list(params);

                        for (const sub of stripeSubs.data) {
                            const customer = sub.customer;
                            const customerId = typeof customer === 'string' ? customer : customer?.id;

                            let uid = null;
                            if (typeof customer === 'object' && customer?.metadata?.firebaseUID) {
                                uid = customer.metadata.firebaseUID;
                            }
                            if (!uid && customerId) {
                                const u = usersByStripeCustomerId.get(customerId);
                                if (u) uid = u.uid;
                            }
                            if (!uid) continue;
                            if (payingByUid.has(uid)) continue;

                            const item = sub.items?.data?.[0];
                            const price = item?.price;
                            const unitAmount = (price?.unit_amount ?? 0) / 100;
                            const interval = price?.recurring?.interval || null;
                            const monthly = unitAmount > 0
                                ? (interval === 'year' ? unitAmount / 12 : unitAmount)
                                : 0;

                            addPaying(uid, 'stripe', sub.status, monthly, {
                                ...buildStripeCancellationFields(sub),
                                currentPeriodEnd: formatStripeDateIso(sub?.current_period_end),
                                nextBillingDate: formatStripeDateOnly(sub?.current_period_end),
                            });
                        }

                        hasMore = stripeSubs.has_more;
                        if (hasMore && stripeSubs.data.length > 0) {
                            startingAfter = stripeSubs.data[stripeSubs.data.length - 1].id;
                        }
                    }
                }
            } catch (error) {
                providerErrors.push(buildProviderError('stripe', error));
                console.error('[admin/stats] Falha ao consultar Stripe:', error.response?.data || error.message);
            }
        }

        // 3) Assinaturas ativas no Asaas
        if (ASAAS_API_KEY) {
            try {
                const pageLimit = 100;
                let offset = 0;
                let hasMore = true;
                const maxIterations = 200;
                let iterations = 0;

                while (hasMore && iterations < maxIterations) {
                    iterations++;
                    const response = await axios.get(`${ASAAS_URL}/subscriptions`, {
                        headers: asaasHeaders,
                        params: { status: 'ACTIVE', limit: pageLimit, offset }
                    });
                    const list = response.data?.data || [];

                    for (const sub of list) {
                        const customerId = sub.customer;
                        if (!customerId) continue;
                        const u = usersByAsaasCustomerId.get(customerId);
                        if (!u) continue;
                        if (payingByUid.has(u.uid)) continue;

                        const rawValue = parseMoneyValue(sub.value);
                        const cycle = String(sub.cycle || '').toUpperCase();
                        const monthly = rawValue > 0
                            ? (cycle === 'YEARLY' ? rawValue / 12 : rawValue)
                            : 0;

                        addPaying(u.uid, 'asaas', 'active', monthly);
                    }

                    hasMore = response.data?.hasMore === true && list.length > 0;
                    offset += pageLimit;
                }

                if (hasMore) {
                    providerErrors.push({
                        provider: 'asaas',
                        status: null,
                        message: 'Limite de paginacao do Asaas atingido; dados podem estar parciais.',
                    });
                }
            } catch (error) {
                providerErrors.push(buildProviderError('asaas', error));
                console.error('[admin/stats] Falha ao consultar Asaas:', error.response?.data || error.message);
            }
        } else if (usersByAsaasCustomerId.size > 0) {
            providerErrors.push({
                provider: 'asaas',
                status: null,
                message: 'ASAAS_API_KEY ausente; assinaturas Asaas nao foram verificadas.',
            });
        }

        // 4) Média de dias de uso entre os assinantes ativos + MRR
        let totalDays = 0;
        let totalMrr = 0;
        let canceledStripeInMrrCount = 0;
        for (const [uid, info] of payingByUid) {
            const u = usersByUid.get(uid);
            if (!u) continue;
            totalDays += u.activeDaysCount;
            totalMrr += info.monthlyAmount;
            if (info.provider === 'stripe' && (info.cancelAtPeriodEnd || info.cancelAt || info.canceledAt)) {
                canceledStripeInMrrCount++;
            }
        }
        const avgActiveDays = payingByUid.size > 0
            ? totalDays / payingByUid.size
            : 0;

        return res.status(200).json({
            activeSubscribersCount: payingByUid.size,
            mrr: Number(totalMrr.toFixed(2)),
            avgActiveDaysOfPaying: Number(avgActiveDays.toFixed(1)),
            totalUsers: usersByUid.size,
            canceledStripeInMrrCount,
            payingUsers: Array.from(payingByUid.values()),
            providerErrors,
            isPartial: providerErrors.length > 0,
            generatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('❌ Erro em /api/admin/stats:', error.response?.data || error.message);
        return res.status(500).json({ error: error.message || 'Erro ao calcular estatísticas.' });
    }
});

const DEFAULT_ADMIN_CONFIG = Object.freeze({
    pluggy: {
        allowNewConnections: true,
        syncStatusWindowHours: 48,
        showSandboxConnectors: false,
    },
    automaticRules: {
        detectSubscriptionsFromPluggy: true,
        categorizeTransactions: true,
        preserveCustomCategories: true,
    },
    globalSettings: {
        maintenanceMode: false,
        supportEmail: '',
        adminNotice: '',
    },
});

function mergeAdminConfig(raw = {}) {
    return {
        pluggy: {
            ...DEFAULT_ADMIN_CONFIG.pluggy,
            ...(raw.pluggy || {}),
        },
        automaticRules: {
            ...DEFAULT_ADMIN_CONFIG.automaticRules,
            ...(raw.automaticRules || {}),
        },
        globalSettings: {
            ...DEFAULT_ADMIN_CONFIG.globalSettings,
            ...(raw.globalSettings || {}),
        },
        updatedAt: normalizeStoredDate(raw.updatedAt || null),
        updatedBy: raw.updatedBy || null,
    };
}

function buildAdminConfigPatch(input = {}) {
    const patch = {};
    const pluggy = input.pluggy && typeof input.pluggy === 'object' ? input.pluggy : {};
    const automaticRules = input.automaticRules && typeof input.automaticRules === 'object' ? input.automaticRules : {};
    const globalSettings = input.globalSettings && typeof input.globalSettings === 'object' ? input.globalSettings : {};

    if (Object.prototype.hasOwnProperty.call(pluggy, 'allowNewConnections')) {
        patch['pluggy.allowNewConnections'] = Boolean(pluggy.allowNewConnections);
    }
    if (Object.prototype.hasOwnProperty.call(pluggy, 'syncStatusWindowHours')) {
        const hours = Number(pluggy.syncStatusWindowHours);
        patch['pluggy.syncStatusWindowHours'] = Number.isFinite(hours)
            ? Math.max(1, Math.min(720, Math.round(hours)))
            : DEFAULT_ADMIN_CONFIG.pluggy.syncStatusWindowHours;
    }
    if (Object.prototype.hasOwnProperty.call(pluggy, 'showSandboxConnectors')) {
        patch['pluggy.showSandboxConnectors'] = Boolean(pluggy.showSandboxConnectors);
    }

    if (Object.prototype.hasOwnProperty.call(automaticRules, 'detectSubscriptionsFromPluggy')) {
        patch['automaticRules.detectSubscriptionsFromPluggy'] = Boolean(automaticRules.detectSubscriptionsFromPluggy);
    }
    if (Object.prototype.hasOwnProperty.call(automaticRules, 'categorizeTransactions')) {
        patch['automaticRules.categorizeTransactions'] = Boolean(automaticRules.categorizeTransactions);
    }
    if (Object.prototype.hasOwnProperty.call(automaticRules, 'preserveCustomCategories')) {
        patch['automaticRules.preserveCustomCategories'] = Boolean(automaticRules.preserveCustomCategories);
    }

    if (Object.prototype.hasOwnProperty.call(globalSettings, 'maintenanceMode')) {
        patch['globalSettings.maintenanceMode'] = Boolean(globalSettings.maintenanceMode);
    }
    if (Object.prototype.hasOwnProperty.call(globalSettings, 'supportEmail')) {
        patch['globalSettings.supportEmail'] = String(globalSettings.supportEmail || '').trim().slice(0, 160);
    }
    if (Object.prototype.hasOwnProperty.call(globalSettings, 'adminNotice')) {
        patch['globalSettings.adminNotice'] = String(globalSettings.adminNotice || '').trim().slice(0, 500);
    }

    return patch;
}

function getAccountUserId(accountDoc, data) {
    return data.userId || accountDoc.ref.parent?.parent?.id || null;
}

function getAccountLastSync(data = {}) {
    return normalizeStoredDate(
        data.lastSync ||
        data.lastSyncedAt ||
        data.syncedAt ||
        data.updatedAt ||
        data.lastSyncStartedAt ||
        data.transactionsSyncCursorAt ||
        null
    );
}

function getInstitutionName(data = {}) {
    return (
        data.institution?.name ||
        data.connector?.name ||
        data.bankData?.name ||
        data.bankData?.bankName ||
        data.bankName ||
        data.institutionName ||
        'Banco nao identificado'
    );
}

function getAccountErrorMessage(data = {}) {
    return (
        data.errorMessage ||
        data.lastErrorMessage ||
        data.lastError?.message ||
        data.error?.message ||
        data.lastSyncError ||
        null
    );
}

function classifyPluggyConnection({ rawStatus, errorMessage, lastSync }, staleAfterMs) {
    const status = String(rawStatus || '').toUpperCase();
    if (errorMessage || status.includes('ERROR') || status.includes('FAILED') || status.includes('LOGIN') || status.includes('INVALID')) {
        return 'error';
    }
    if (status.includes('UPDAT') || status.includes('PROCESS') || status.includes('PENDING')) {
        return 'updating';
    }
    if (!lastSync) {
        return 'no_sync';
    }
    const lastSyncMs = new Date(lastSync).getTime();
    if (Number.isFinite(lastSyncMs) && Date.now() - lastSyncMs > staleAfterMs) {
        return 'stale';
    }
    return 'ok';
}

async function getAdminConfigDoc() {
    const snap = await db.collection('admin').doc('globalConfig').get();
    return mergeAdminConfig(snap.exists ? snap.data() : {});
}

app.get('/api/admin/config', async (req, res) => {
    const authResult = await requireAdminRequest(req, res);
    if (!authResult) return;

    try {
        const config = await getAdminConfigDoc();
        return res.status(200).json({ config });
    } catch (error) {
        console.error('[admin/config] erro:', error.message);
        return res.status(500).json({ error: 'Erro ao carregar configuracoes.' });
    }
});

app.patch('/api/admin/config', async (req, res) => {
    const authResult = await requireAdminRequest(req, res);
    if (!authResult) return;

    try {
        const patch = buildAdminConfigPatch(req.body || {});
        patch.updatedAt = new Date().toISOString();
        patch.updatedBy = authResult.uid;

        await db.collection('admin').doc('globalConfig').set(patch, { merge: true });
        const config = await getAdminConfigDoc();
        return res.status(200).json({ success: true, config });
    } catch (error) {
        console.error('[admin/config] erro ao salvar:', error.message);
        return res.status(500).json({ error: 'Erro ao salvar configuracoes.' });
    }
});

app.get('/api/admin/pluggy-sync', async (req, res) => {
    const authResult = await requireAdminRequest(req, res);
    if (!authResult) return;

    try {
        const config = await getAdminConfigDoc();
        const staleAfterHours = Number(config.pluggy?.syncStatusWindowHours) || DEFAULT_ADMIN_CONFIG.pluggy.syncStatusWindowHours;
        const staleAfterMs = staleAfterHours * 60 * 60 * 1000;

        const [canonicalSnap, legacySnap] = await Promise.all([
            db.collectionGroup('accounts').get(),
            db.collection('accounts').get().catch(() => ({ docs: [] })),
        ]);

        const accountMap = new Map();
        const upsertAccount = (docSnap, source) => {
            const data = docSnap.data() || {};
            const uid = getAccountUserId(docSnap, data);
            if (!uid) return;

            const accountId = data.id || docSnap.id;
            const itemId = data.itemId || data.pluggyItemId || data.item?.id || accountId;
            const key = `${uid}:${accountId}`;
            const lastSync = getAccountLastSync(data);
            const rawStatus = data.itemStatus || data.executionStatus || data.status || data.connectionStatus || null;
            const errorMessage = getAccountErrorMessage(data);

            const current = accountMap.get(key);
            if (current && current.source === 'canonical') return;

            accountMap.set(key, {
                uid,
                accountId,
                itemId,
                source,
                accountName: data.name || 'Conta sem nome',
                accountType: data.type || data.subtype || null,
                institutionName: getInstitutionName(data),
                lastSync,
                rawStatus,
                errorMessage,
            });
        };

        canonicalSnap.docs.forEach((docSnap) => upsertAccount(docSnap, 'canonical'));
        legacySnap.docs.forEach((docSnap) => upsertAccount(docSnap, 'legacy'));

        const usersByUid = new Map();
        const accountUids = Array.from(new Set(Array.from(accountMap.values()).map((acc) => acc.uid)));
        await Promise.all(accountUids.map(async (uid) => {
            const userSnap = await db.collection('users').doc(uid).get();
            const data = userSnap.exists ? userSnap.data() || {} : {};
            usersByUid.set(uid, {
                uid,
                name: data.name || data.profile?.name || data.email || uid,
                email: data.email || data.profile?.email || null,
            });
        }));

        const connectionsByKey = new Map();
        for (const account of accountMap.values()) {
            const connectionKey = `${account.uid}:${account.itemId}`;
            const existing = connectionsByKey.get(connectionKey);
            const userInfo = usersByUid.get(account.uid) || { uid: account.uid, name: account.uid, email: null };
            if (!existing) {
                connectionsByKey.set(connectionKey, {
                    uid: account.uid,
                    name: userInfo.name,
                    email: userInfo.email,
                    itemId: account.itemId,
                    bankNames: new Set([account.institutionName]),
                    accountCount: 1,
                    lastSync: account.lastSync,
                    rawStatus: account.rawStatus,
                    errors: account.errorMessage ? [account.errorMessage] : [],
                    sources: new Set([account.source]),
                });
                continue;
            }

            existing.accountCount += 1;
            existing.bankNames.add(account.institutionName);
            existing.sources.add(account.source);
            if (account.errorMessage) existing.errors.push(account.errorMessage);
            if (account.lastSync && (!existing.lastSync || account.lastSync > existing.lastSync)) {
                existing.lastSync = account.lastSync;
            }
            if (!existing.rawStatus && account.rawStatus) {
                existing.rawStatus = account.rawStatus;
            }
        }

        const rows = Array.from(connectionsByKey.values()).map((row) => {
            const errorMessage = row.errors[0] || null;
            const status = classifyPluggyConnection({
                rawStatus: row.rawStatus,
                errorMessage,
                lastSync: row.lastSync,
            }, staleAfterMs);

            return {
                uid: row.uid,
                name: row.name,
                email: row.email,
                itemId: row.itemId,
                banks: Array.from(row.bankNames).filter(Boolean),
                accountCount: row.accountCount,
                lastSync: row.lastSync,
                status,
                rawStatus: row.rawStatus || null,
                errorMessage,
                source: Array.from(row.sources).join('+'),
            };
        });

        const statusRank = { error: 0, stale: 1, no_sync: 2, updating: 3, ok: 4 };
        rows.sort((a, b) => {
            const rankDiff = (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9);
            if (rankDiff !== 0) return rankDiff;
            const dateA = a.lastSync ? new Date(a.lastSync).getTime() : 0;
            const dateB = b.lastSync ? new Date(b.lastSync).getTime() : 0;
            return dateA - dateB;
        });

        const summary = rows.reduce((acc, row) => {
            acc.connectedAccounts += row.accountCount;
            acc.connectedConnections += 1;
            acc.connectedUsers.add(row.uid);
            if (row.status === 'error') acc.errorConnections += 1;
            if (row.status === 'stale') acc.staleConnections += 1;
            if (row.lastSync && (!acc.latestSync || row.lastSync > acc.latestSync)) acc.latestSync = row.lastSync;
            row.banks.forEach((bank) => acc.banks.add(bank));
            return acc;
        }, {
            connectedAccounts: 0,
            connectedConnections: 0,
            connectedUsers: new Set(),
            errorConnections: 0,
            staleConnections: 0,
            latestSync: null,
            banks: new Set(),
        });

        return res.status(200).json({
            summary: {
                connectedAccounts: summary.connectedAccounts,
                connectedConnections: summary.connectedConnections,
                connectedUsers: summary.connectedUsers.size,
                errorConnections: summary.errorConnections,
                staleConnections: summary.staleConnections,
                latestSync: summary.latestSync,
                bankCount: summary.banks.size,
                staleAfterHours,
            },
            rows,
            generatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[admin/pluggy-sync] erro:', error.message);
        return res.status(500).json({ error: 'Erro ao carregar monitoramento Pluggy.' });
    }
});

app.patch('/api/admin/users/:uid/access', async (req, res) => {
    const authResult = await requireAdminRequest(req, res);
    if (!authResult) return;

    const targetUid = req.params.uid;
    const disabled = Boolean(req.body?.disabled ?? req.body?.isBlocked);
    if (!targetUid) return res.status(400).json({ error: 'UID obrigatorio.' });
    if (targetUid === authResult.uid && disabled) {
        return res.status(400).json({ error: 'Voce nao pode bloquear a si mesmo.' });
    }

    try {
        try {
            await admin.auth().updateUser(targetUid, { disabled });
        } catch (authError) {
            console.warn(`[admin/users/access] Auth nao atualizado para ${targetUid}: ${authError.message}`);
        }

        const ref = db.collection('users').doc(targetUid);
        const patch = disabled
            ? {
                disabled: true,
                isBlocked: true,
                blockedAt: new Date().toISOString(),
                blockedBy: authResult.uid,
                updatedAt: new Date().toISOString(),
            }
            : {
                disabled: false,
                isBlocked: false,
                blockedAt: admin.firestore.FieldValue.delete(),
                blockedBy: admin.firestore.FieldValue.delete(),
                updatedAt: new Date().toISOString(),
            };

        await ref.set(patch, { merge: true });
        return res.status(200).json({ success: true, disabled });
    } catch (error) {
        console.error('[admin/users/access] erro:', error.message);
        return res.status(500).json({ error: 'Erro ao atualizar acesso do usuario.' });
    }
});

app.patch('/api/admin/users/:uid/plan', async (req, res) => {
    const authResult = await requireAdminRequest(req, res);
    if (!authResult) return;

    const targetUid = req.params.uid;
    const plan = String(req.body?.plan || '').toLowerCase();
    const status = String(req.body?.status || (plan === 'pro' ? 'active' : 'inactive')).toLowerCase();
    const allowedPlans = new Set(['free', 'pro']);
    const allowedStatuses = new Set(['active', 'inactive', 'overdue', 'trialing', 'canceled']);

    if (!allowedPlans.has(plan)) {
        return res.status(400).json({ error: 'Plano invalido.' });
    }
    if (!allowedStatuses.has(status)) {
        return res.status(400).json({ error: 'Status invalido.' });
    }

    try {
        await db.collection('users').doc(targetUid).set({
            plan,
            subscription: {
                plan,
                status,
                adminManaged: true,
                adminManagedAt: new Date().toISOString(),
                adminManagedBy: authResult.uid,
            },
            updatedAt: new Date().toISOString(),
        }, { merge: true });

        return res.status(200).json({ success: true, plan, status });
    } catch (error) {
        console.error('[admin/users/plan] erro:', error.message);
        return res.status(500).json({ error: 'Erro ao atualizar plano do usuario.' });
    }
});

app.post('/api/admin/users/:uid/reset-access', async (req, res) => {
    const authResult = await requireAdminRequest(req, res);
    if (!authResult) return;

    const targetUid = req.params.uid;

    try {
        const [targetDoc, authUser] = await Promise.all([
            db.collection('users').doc(targetUid).get(),
            admin.auth().getUser(targetUid).catch(() => null),
        ]);
        const data = targetDoc.exists ? targetDoc.data() || {} : {};
        const email = data.email || data.profile?.email || authUser?.email || null;
        if (!email) {
            return res.status(400).json({ error: 'Usuario sem e-mail para reset de acesso.' });
        }

        const passwordResetLink = await admin.auth().generatePasswordResetLink(email);
        await db.collection('users').doc(targetUid).set({
            accessResetRequestedAt: new Date().toISOString(),
            accessResetRequestedBy: authResult.uid,
            updatedAt: new Date().toISOString(),
        }, { merge: true });

        return res.status(200).json({ success: true, email, passwordResetLink });
    } catch (error) {
        console.error('[admin/users/reset-access] erro:', error.message);
        return res.status(500).json({ error: 'Erro ao gerar reset de acesso.' });
    }
});

/**
 * Helper: calcula o conjunto de UIDs com assinatura ativa (active/trialing no Stripe
 * ou ACTIVE no Asaas) cruzando subs ao vivo dos provedores com os usuarios do Firestore.
 */
async function computeActivePayingUids() {
    if (!db) throw new Error('Firestore nao disponivel.');

    const usersSnap = await db.collection('users').get();
    const usersByUid = new Map();
    const usersByStripeCustomerId = new Map();
    const usersByAsaasCustomerId = new Map();

    for (const doc of usersSnap.docs) {
        const data = doc.data();
        const sub = data.subscription || {};
        const user = {
            uid: doc.id,
            stripeCustomerId: sub.stripeCustomerId || null,
            asaasCustomerId: sub.asaasCustomerId || null,
        };
        usersByUid.set(doc.id, user);
        if (user.stripeCustomerId) usersByStripeCustomerId.set(user.stripeCustomerId, user);
        if (user.asaasCustomerId) usersByAsaasCustomerId.set(user.asaasCustomerId, user);
    }

    const payingUids = new Set();

    if (stripe) {
        for (const targetStatus of ['active', 'trialing']) {
            let hasMore = true;
            let startingAfter = undefined;
            while (hasMore) {
                const params = { limit: 100, status: targetStatus, expand: ['data.customer'] };
                if (startingAfter) params.starting_after = startingAfter;
                const stripeSubs = await stripe.subscriptions.list(params);
                for (const sub of stripeSubs.data) {
                    const customer = sub.customer;
                    const customerId = typeof customer === 'string' ? customer : customer?.id;
                    let uid = null;
                    if (typeof customer === 'object' && customer?.metadata?.firebaseUID) {
                        uid = customer.metadata.firebaseUID;
                    }
                    if (!uid && customerId) {
                        const u = usersByStripeCustomerId.get(customerId);
                        if (u) uid = u.uid;
                    }
                    if (uid && usersByUid.has(uid)) payingUids.add(uid);
                }
                hasMore = stripeSubs.has_more;
                if (hasMore && stripeSubs.data.length > 0) {
                    startingAfter = stripeSubs.data[stripeSubs.data.length - 1].id;
                }
            }
        }
    }

    if (ASAAS_API_KEY) {
        const pageLimit = 100;
        let offset = 0;
        let hasMore = true;
        const maxIterations = 200;
        let iterations = 0;
        while (hasMore && iterations < maxIterations) {
            iterations++;
            const response = await axios.get(`${ASAAS_URL}/subscriptions`, {
                headers: asaasHeaders,
                params: { status: 'ACTIVE', limit: pageLimit, offset }
            });
            const list = response.data?.data || [];
            for (const sub of list) {
                const customerId = sub.customer;
                if (!customerId) continue;
                const u = usersByAsaasCustomerId.get(customerId);
                if (u) payingUids.add(u.uid);
            }
            hasMore = response.data?.hasMore === true && list.length > 0;
            offset += pageLimit;
        }
    }

    return { payingUids, usersSnap };
}

function getStripeSubscriptionSyncRank(sub = {}) {
    const status = String(sub?.status || '').toLowerCase();
    if (['active', 'trialing'].includes(status)) return 5;
    if (['past_due', 'unpaid', 'incomplete'].includes(status)) return 4;
    if (sub?.cancel_at_period_end) return 3;
    if (status === 'paused') return 2;
    if (status === 'canceled') return 1;
    return 0;
}

function getStripeSubscriptionSortTime(sub = {}) {
    return Math.max(
        Number(sub?.created || 0),
        Number(sub?.canceled_at || 0),
        Number(sub?.ended_at || 0),
        Number(sub?.current_period_end || 0)
    );
}

function preferStripeSubscriptionForSync(current, candidate) {
    if (!current) return candidate;
    const currentRank = getStripeSubscriptionSyncRank(current.sub);
    const candidateRank = getStripeSubscriptionSyncRank(candidate.sub);
    if (candidateRank !== currentRank) {
        return candidateRank > currentRank ? candidate : current;
    }
    return getStripeSubscriptionSortTime(candidate.sub) > getStripeSubscriptionSortTime(current.sub)
        ? candidate
        : current;
}

function buildStripeAdminSubscriptionPayload(sub, customerId) {
    const status = String(sub?.status || 'unknown').toLowerCase();
    const item = sub?.items?.data?.[0] || null;
    const price = item?.price || null;
    const interval = price?.recurring?.interval || null;
    const priceDisplay = Number.isFinite(price?.unit_amount)
        ? (price.unit_amount / 100).toFixed(2).replace('.', ',')
        : null;
    const cancellation = buildStripeCancellationFields(sub);
    const isCurrentlyActive = ['active', 'trialing'].includes(status);

    const subscription = {
        plan: isCurrentlyActive ? 'pro' : 'free',
        status,
        provider: 'stripe',
        stripeCustomerId: customerId,
        stripeSubscriptionId: isCurrentlyActive ? sub.id : null,
        lastStripeSubscriptionId: sub.id,
        stripePriceId: price?.id || null,
        currentPeriodEnd: formatStripeDateIso(sub?.current_period_end),
        nextBillingDate: formatStripeDateOnly(sub?.current_period_end),
        billingCycle: interval === 'year' ? 'annual' : 'mensal',
        autoRenew: isCurrentlyActive && !sub?.cancel_at_period_end,
        ...cancellation,
    };

    if (priceDisplay) {
        subscription.price = priceDisplay;
        subscription.nextAmount = priceDisplay;
    }

    return subscription;
}

/**
 * POST /api/admin/downgrade-non-paying
 * Rebaixa para plan:'free' todo usuario com plan:'pro' que nao esta ativo no provedor.
 * Admins sao SEMPRE preservados, independentemente de pagamento.
 * Query: ?dryRun=1 retorna a contagem sem aplicar.
 */
app.post('/api/admin/downgrade-non-paying', async (req, res) => {
    const authResult = await verifyFirebaseRequest(req);
    if (!authResult.ok) return res.status(authResult.status).json({ error: authResult.error });
    if (!db) return res.status(500).json({ error: 'Firestore nao disponivel.' });

    const callerDoc = await db.collection('users').doc(authResult.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.isAdmin !== true) {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }

    const dryRun = req.query.dryRun === '1' || req.query.dryRun === 'true';
    const requestedUids = Array.isArray(req.body?.uids) ? req.body.uids.filter(u => typeof u === 'string') : null;

    try {
        const { payingUids, usersSnap } = await computeActivePayingUids();

        const candidates = [];
        for (const doc of usersSnap.docs) {
            const data = doc.data();
            const uid = doc.id;
            const plan = String(data.plan || data?.subscription?.plan || 'free').toLowerCase();
            const isAdmin = data.isAdmin === true;

            if (plan !== 'pro') continue;
            if (isAdmin) continue;
            if (payingUids.has(uid)) continue;

            let createdAt = data.createdAt || null;
            if (createdAt && typeof createdAt.toDate === 'function') createdAt = createdAt.toDate().toISOString();
            else if (createdAt instanceof Date) createdAt = createdAt.toISOString();
            else if (typeof createdAt === 'number') createdAt = new Date(createdAt).toISOString();

            let lastLogin = data.lastLogin || null;
            if (lastLogin && typeof lastLogin.toDate === 'function') lastLogin = lastLogin.toDate().toISOString();
            else if (lastLogin instanceof Date) lastLogin = lastLogin.toISOString();

            candidates.push({
                uid,
                email: data.email || data?.profile?.email || null,
                name: data.name || data?.profile?.name || null,
                provider: data?.subscription?.provider || null,
                status: data?.subscription?.status || null,
                activeDaysCount: Number(data.activeDaysCount) || 0,
                createdAt,
                lastLogin,
            });
        }

        if (dryRun) {
            return res.status(200).json({
                dryRun: true,
                wouldDowngrade: candidates.length,
                candidates,
            });
        }

        // Se o cliente mandou uma lista de uids, restringe o downgrade a essa lista
        // (mas mantem a regra: so quem realmente esta como pro nao pagante nao admin).
        let targets = candidates;
        if (requestedUids && requestedUids.length > 0) {
            const allowed = new Set(candidates.map(c => c.uid));
            targets = requestedUids
                .filter(u => allowed.has(u))
                .map(u => candidates.find(c => c.uid === u));
        }

        // Aplica em batches (Firestore: ate 500 ops por batch).
        let updated = 0;
        const batchSize = 400;
        for (let i = 0; i < targets.length; i += batchSize) {
            const batch = db.batch();
            const slice = targets.slice(i, i + batchSize);
            for (const c of slice) {
                const ref = db.collection('users').doc(c.uid);
                batch.update(ref, {
                    plan: 'free',
                    'subscription.plan': 'free',
                    'subscription.status': 'inactive',
                    planDowngradedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            }
            await batch.commit();
            updated += slice.length;
        }

        console.log(`✅ [downgrade-non-paying] rebaixados=${updated} por admin=${authResult.uid}${requestedUids ? ` (lista=${requestedUids.length})` : ''}`);
        return res.status(200).json({
            dryRun: false,
            downgraded: updated,
            uids: targets.map(c => c.uid),
        });
    } catch (error) {
        console.error('❌ Erro em /api/admin/downgrade-non-paying:', error.response?.data || error.message);
        return res.status(500).json({ error: error.message || 'Erro ao rebaixar usuarios nao pagantes.' });
    }
});

/**
 * POST /api/admin/stripe/sync-users
 * Puxa todos os clientes/assinaturas do Stripe e sincroniza com o Firestore.
 */
app.post('/api/admin/stripe/sync-users', async (req, res) => {
    const authResult = await verifyFirebaseRequest(req);
    if (!authResult.ok) return res.status(authResult.status).json({ error: authResult.error });

    if (!db) return res.status(500).json({ error: 'Firestore nao disponivel.' });
    if (!stripe) return res.status(500).json({ error: 'Stripe nao configurado.' });

    const callerDoc = await db.collection('users').doc(authResult.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.isAdmin !== true) {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }

    let synced = 0;
    let notFound = 0;
    let errors = 0;

    try {
        // Busca todas as assinaturas do Stripe (com dados do cliente expandidos)
        let hasMore = true;
        let startingAfter = undefined;
        const subscriptionsByUid = new Map();

        while (hasMore) {
            const params = { limit: 100, status: 'all', expand: ['data.customer'] };
            if (startingAfter) params.starting_after = startingAfter;

            const stripeSubs = await stripe.subscriptions.list(params);

            for (const sub of stripeSubs.data) {
                try {
                    const customer = sub.customer;
                    const customerId = typeof customer === 'string' ? customer : customer?.id;

                    // Tenta obter o UID pelo metadata do cliente
                    let uid = null;
                    if (typeof customer === 'object' && customer?.metadata?.firebaseUID) {
                        uid = customer.metadata.firebaseUID;
                    }

                    // Fallback: busca no Firestore pelo stripeCustomerId
                    if (!uid && customerId) {
                        const snap = await db.collection('users')
                            .where('subscription.stripeCustomerId', '==', customerId)
                            .limit(1)
                            .get();
                        if (!snap.empty) uid = snap.docs[0].id;
                    }

                    if (!uid) {
                        notFound++;
                        continue;
                    }

                    const current = subscriptionsByUid.get(uid);
                    subscriptionsByUid.set(uid, preferStripeSubscriptionForSync(current, { uid, customerId, sub }));
                } catch (subErr) {
                    console.error('[stripe/sync-users] erro em sub:', subErr.message);
                    errors++;
                }
            }

            hasMore = stripeSubs.has_more;
            if (hasMore && stripeSubs.data.length > 0) {
                startingAfter = stripeSubs.data[stripeSubs.data.length - 1].id;
            }
        }

        for (const { uid, customerId, sub } of subscriptionsByUid.values()) {
            try {
                await db.collection('users').doc(uid).set({
                    subscription: buildStripeAdminSubscriptionPayload(sub, customerId),
                    updatedAt: new Date().toISOString(),
                }, { merge: true });
                synced++;
            } catch (writeErr) {
                console.error('[stripe/sync-users] erro ao salvar usuario:', uid, writeErr.message);
                errors++;
            }
        }

        console.log(`✅ [stripe/sync-users] synced=${synced} notFound=${notFound} errors=${errors}`);
        return res.status(200).json({ success: true, synced, notFound, errors });
    } catch (error) {
        console.error('❌ [stripe/sync-users]', error.message);
        return res.status(500).json({ error: error.message || 'Erro ao sincronizar do Stripe.' });
    }
});

// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        asaasMode: process.env.ASAAS_MODE || 'sandbox',
        stripe: isStripeReady() ? 'configured' : 'disabled',
        firebase: admin.apps.length > 0 ? 'connected' : 'disabled',
        timestamp: new Date().toISOString()
    });
});


// ─────────────────────────────────────────────────────────────────────────────
// TRACKING REMARKETING (Abertura e Cliques)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pixel de abertura: /api/rkt/o/:uid/:day
 */
app.get('/api/rkt/o/:uid/:day', async (req, res) => {
    const { uid, day } = req.params;
    try {
        await db.collection('users').doc(uid).update({
            [`remarketingOpenD${day}`]: admin.firestore.FieldValue.serverTimestamp(),
            lastActivity: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        // Silencioso se o user não existir
    }
    const pngHex = "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789ccb6060600000000500010d652d0a00000000454e44ae426082";
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(Buffer.from(pngHex, 'hex'));
});

/**
 * Rastreamento de cliques: /api/rkt/c/:uid/:day?url=...
 */
app.get('/api/rkt/c/:uid/:day', async (req, res) => {
    const { uid, day } = req.params;
    const targetUrl = req.query.url || 'https://www.controlarmais.com.br/';

    try {
        await db.collection('users').doc(uid).update({
            [`remarketingClickD${day}`]: admin.firestore.FieldValue.serverTimestamp(),
            lastActivity: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        // Silencioso
    }
    res.redirect(targetUrl);
});

/**
 * Dispara o e-mail de remarketing e atualiza o estágio no banco
 */
async function triggerRemarketing(uid, userData, day) {
    try {
        if (!userData.email) return;

        let couponCode = null;
        let checkoutUrl = 'https://www.controlarmais.com.br/';
        let expiresAt = null;

        // D+2 e D+3 ganham cupons únicos e checkout direto
        if (day === 2 || day === 3) {
            const promoData = await createUniquePromoCode(userData.name || 'AMIGO');
            couponCode = promoData.code;
            expiresAt = promoData.expiresAt;

            // Criar sessão de checkout já com o cupom aplicado
            const session = await createRemarketingCheckoutSession({
                uid,
                promoCode: couponCode
            });
            checkoutUrl = session.url;
        }

        const sentInfo = await sendAbandonedCartEmail({
            uid,
            email: userData.email,
            name: userData.name || 'Cliente',
            day,
            couponCode,
            checkoutUrl,
            expiresAt
        });

        // Se sendEmail retornou null (chave faltando), não marcar como enviado
        if (sentInfo === null) {
            console.warn(`⚠️ [AUTO-REMARKETING] E-mail D+${day} para ${uid} abortado: RESEND_API_KEY ausente.`);
            return;
        }

        // Salvar que enviamos este estágio
        await db.collection('users').doc(uid).update({
            remarketingStage: day,
            lastRemarketingSentAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`📡 [AUTO-REMARKETING] D+${day} enviado com sucesso para: ${userData.email} (ID: ${sentInfo?.id})`);
    } catch (e) {
        console.error(`❌ [AUTO-REMARKETING] Erro ao disparar remarketing para ${uid} (D+${day}):`, e.message);
    }
}

/**
 * Escaneia o banco em busca de carrinhos abandonados prontos para remarketing
 */
async function processRemarketingQueue() {
    console.log('🔍 [AUTO-REMARKETING] Escaneando carrinhos abandonados...');
    try {
        const usersSnap = await db.collection('users').get();
        const now = Date.now();
        let scannedCount = 0;
        let matchedCount = 0;

        for (const doc of usersSnap.docs) {
            const data = doc.data();
            scannedCount++;

            // Verificação de plano aprimorada
            const userPlan = data.subscription?.plan || data.plan || 'free';
            const userEmail = data.email || data.profile?.email || 'sem-email';

            // Ignorar se já for Pro, se for Admin ou se marcado como tratado/ignorado
            if (userPlan === 'active' || userPlan === 'pro' || data.isAdmin || data.abandonedHandled) continue;
            if (!data.createdAt) continue;

            const createdAtDate = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            const hoursPassed = Math.floor((now - createdAtDate.getTime()) / (1000 * 60 * 60));
            const currentStage = data.remarketingStage || 0;

            // D+3: Mais de 72 horas
            if (hoursPassed >= 72 && currentStage < 3) {
                matchedCount++;
                await triggerRemarketing(doc.id, data, 3);
            }
            // D+2: Mais de 48 horas
            else if (hoursPassed >= 48 && currentStage < 2) {
                matchedCount++;
                await triggerRemarketing(doc.id, data, 2);
            }
            // D+1: Mais de 24 horas
            else if (hoursPassed >= 24 && currentStage < 1) {
                matchedCount++;
                await triggerRemarketing(doc.id, data, 1);
            }
        }
        console.log(`✅ [AUTO-REMARKETING] Escaneamento finalizado: ${scannedCount} usuários lidos, ${matchedCount} remarketings disparados.`);
    } catch (e) {
        console.error('❌ Erro ao processar fila de remarketing:', e.message);
    }
}

// Iniciar o cron se estivermos em modo produção ou se desejado
function startRemarketingCron() {
    console.log('🚀 Sistema de Remarketing Automático Ativado.');
    // Executa uma vez ao iniciar (com delay de 10s para estabilizar servidor)
    setTimeout(processRemarketingQueue, 10000);
    // E depois a cada 1 hora
    setInterval(processRemarketingQueue, 60 * 60 * 1000);
}

// Ligar o robô
startRemarketingCron();

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`🌐 Asaas: ${ASAAS_URL}`);
});
