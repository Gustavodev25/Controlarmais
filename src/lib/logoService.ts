/**
 * logoService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Resolução de logos de merchants para assinaturas via logo.dev API.
 *
 * Pipeline de matching em 6 camadas (ordem decrescente de confiança):
 *
 *  1. serviceKey  → tabela direta SERVICE_KEY_TO_DOMAIN  (confiança máxima)
 *  2. Exato       → nome normalizado bate exatamente um alias do catálogo
 *  3. Prefixo     → "hbo" bate "hbomax" / "disney" bate "disneyplus"
 *  4. Substring   → "prime" bate "amazon prime", "fit" bate "smart fit"
 *  5. Token       → qualquer palavra ≥ 3 chars do nome bate alias inteiro
 *  6. Fallback    → {primeiro-token-alfa}.com como último recurso
 *
 * Cache duplo:
 *  • resolveCache  – normalizedName → domain (evita recomputar)
 *  • failedDomains – Set de domínios com erro de carregamento (sem retentativas)
 *
 * window.__onLogoError é exposto globalmente para handlers onerror inline.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Constantes ───────────────────────────────────────────────────────────────

const LOGO_TOKEN = 'pk_HCGev9MxSRqAd8eoK5hN5A';
const LOGO_API_URL = 'https://img.logo.dev';
const LOGO_SIZE = 64;

// ─── Catálogo de serviços ─────────────────────────────────────────────────────
//
// Cada entrada define:
//  domain   – domínio usado na logo.dev
//  aliases  – TODOS os termos que devem resolver para este serviço.
//             Inclui: nome oficial, abreviações, erros comuns, siglas,
//             variações com/sem espaço, versões antigas e apelidos populares.

interface ServiceEntry {
    domain: string;
    aliases: string[];
}

const CATALOG: ServiceEntry[] = [
    // ── Streaming vídeo ──────────────────────────────────────────────────────
    {
        domain: 'netflix.com',
        aliases: ['netflix', 'nflx', 'net flix'],
    },
    {
        domain: 'spotify.com',
        aliases: ['spotify', 'spotify premium', 'ebw spotify', 'spotify pr'],
    },
    {
        domain: 'max.com',
        aliases: [
            'max', 'hbo', 'hbomax', 'hbo max', 'hbo+', 'max streaming',
            'warner', 'warner bros', 'wbd', 'discovery plus', 'discoveryplus',
        ],
    },
    {
        domain: 'disneyplus.com',
        aliases: [
            'disney', 'disney plus', 'disneyplus', 'disney+', 'disney +',
            'star plus', 'starplus', 'star+',
        ],
    },
    {
        domain: 'primevideo.com',
        aliases: [
            'prime video', 'primevideo', 'amazon prime', 'amazonprime',
            'prime', 'amazon video', 'amazon prime video',
        ],
    },
    {
        domain: 'paramountplus.com',
        aliases: [
            'paramount', 'paramount plus', 'paramount+', 'paramount +',
            'cbs', 'pluto tv', 'plutotv',
        ],
    },
    {
        domain: 'globoplay.globo.com',
        aliases: ['globoplay', 'globo play', 'globo', 'globo+', 'gshow'],
    },
    {
        domain: 'crunchyroll.com',
        aliases: ['crunchyroll', 'crunchyroll premium', 'crunchy roll', 'crunchyroll mega fan'],
    },
    {
        domain: 'apple.com',
        aliases: [
            'apple tv', 'appletv', 'apple tv plus', 'apple tv+', 'atv+',
            'apple', 'apple music', 'icloud', 'icloud drive', 'apple one',
            'apple arcade', 'apple fitness', 'apple news', 'itunes',
            'app store', 'applecare',
        ],
    },
    {
        domain: 'mubi.com',
        aliases: ['mubi'],
    },

    // ── Streaming música ─────────────────────────────────────────────────────
    {
        domain: 'deezer.com',
        aliases: ['deezer', 'deezer premium', 'deezer family', 'deezer student'],
    },
    {
        domain: 'tidal.com',
        aliases: ['tidal', 'tidal hifi', 'tidal premium'],
    },
    {
        domain: 'soundcloud.com',
        aliases: ['soundcloud', 'sound cloud', 'soundcloud go'],
    },

    // ── Google / Alphabet ─────────────────────────────────────────────────────
    {
        domain: 'google.com',
        aliases: [
            'google', 'google one', 'google drive', 'google workspace',
            'gsuite', 'g suite', 'youtube', 'youtube premium', 'youtube music',
            'youtube music premium', 'youtube tv', 'google play',
        ],
    },

    // ── Microsoft ─────────────────────────────────────────────────────────────
    {
        domain: 'microsoft.com',
        aliases: [
            'microsoft', 'microsoft 365', 'office 365', 'office365',
            'm365', 'ms365', 'teams', 'onedrive', 'xbox', 'xbox game pass',
            'xbox live', 'game pass', 'gamepass', 'windows', 'azure',
        ],
    },

    // ── Adobe ─────────────────────────────────────────────────────────────────
    {
        domain: 'adobe.com',
        aliases: [
            'adobe', 'adobe cc', 'creative cloud', 'adobe creative cloud',
            'photoshop', 'illustrator', 'premiere', 'after effects',
            'lightroom', 'acrobat',
        ],
    },

    // ── Produtividade & dev ───────────────────────────────────────────────────
    {
        domain: 'notion.so',
        aliases: ['notion', 'notion plus', 'notion ai'],
    },
    {
        domain: 'figma.com',
        aliases: ['figma', 'figma professional', 'figma org'],
    },
    {
        domain: 'canva.com',
        aliases: ['canva', 'canva pro'],
    },
    {
        domain: 'dropbox.com',
        aliases: ['dropbox', 'dropbox plus', 'dropbox professional', 'dropbox business'],
    },
    {
        domain: 'slack.com',
        aliases: ['slack', 'slack pro', 'slack business'],
    },
    {
        domain: 'zoom.us',
        aliases: ['zoom', 'zoom pro', 'zoom meetings', 'zoom one'],
    },
    {
        domain: 'github.com',
        aliases: ['github', 'github pro', 'github copilot', 'copilot'],
    },
    {
        domain: 'atlassian.com',
        aliases: ['atlassian', 'jira', 'confluence', 'trello', 'bitbucket'],
    },
    {
        domain: 'openai.com',
        aliases: ['openai', 'chatgpt', 'chatgpt plus', 'chatgpt pro', 'gpt', 'gpt4'],
    },
    {
        domain: 'anthropic.com',
        aliases: ['claude', 'anthropic', 'claude pro', 'claude ai'],
    },
    {
        domain: 'linear.app',
        aliases: ['linear', 'linear plus'],
    },
    {
        domain: 'vercel.com',
        aliases: ['vercel', 'vercel pro'],
    },
    {
        domain: 'heroku.com',
        aliases: ['heroku'],
    },
    {
        domain: 'digitalocean.com',
        aliases: ['digitalocean', 'digital ocean', 'do cloud'],
    },
    {
        domain: 'aws.amazon.com',
        aliases: ['aws', 'amazon web services', 'amazon aws'],
    },
    {
        domain: 'grammarly.com',
        aliases: ['grammarly', 'grammarly premium', 'grammarly business'],
    },
    {
        domain: 'evernote.com',
        aliases: ['evernote', 'evernote premium', 'evernote personal'],
    },
    {
        domain: '1password.com',
        aliases: ['1password', '1 password', 'onepassword'],
    },
    {
        domain: 'nordvpn.com',
        aliases: ['nordvpn', 'nord vpn', 'nord'],
    },
    {
        domain: 'expressvpn.com',
        aliases: ['expressvpn', 'express vpn'],
    },

    // ── Saúde & fitness ───────────────────────────────────────────────────────
    {
        domain: 'wellhub.com',
        aliases: ['wellhub', 'gympass', 'gym pass'],
    },
    {
        domain: 'smartfit.com.br',
        aliases: ['smart fit', 'smartfit', 'smart fit academia', 'smart fit gym'],
    },
    {
        domain: 'unimed.coop.br',
        aliases: ['unimed', 'unimed seguros', 'unimed saude'],
    },
    {
        domain: 'amil.com.br',
        aliases: ['amil', 'amil saude', 'amil dental'],
    },
    {
        domain: 'bradescosaude.com.br',
        aliases: ['bradesco saude', 'bradesco dental', 'bradesco odonto'],
    },
    {
        domain: 'sulamerica.com.br',
        aliases: ['sulamerica', 'sul america', 'sul america saude'],
    },
    {
        domain: 'hapvida.com.br',
        aliases: ['hapvida', 'hap vida', 'hapvida notredame'],
    },

    // ── Pedágio & mobilidade ──────────────────────────────────────────────────
    {
        domain: 'semparar.com.br',
        aliases: ['sem parar', 'semparar', 'sem parar tag'],
    },
    {
        domain: 'veloe.com.br',
        aliases: ['veloe', 'veloe tag'],
    },
    {
        domain: 'taggy.com.br',
        aliases: ['taggy', 'taggy tag'],
    },
    {
        domain: 'conectcar.com',
        aliases: ['conectcar', 'conect car'],
    },

    // ── Marketplace & serviços BR ─────────────────────────────────────────────
    {
        domain: 'mercadolivre.com.br',
        aliases: [
            'mercado livre', 'mercadolivre', 'meli', 'meli plus', 'meli+',
            'mercado pago', 'mercadopago',
        ],
    },
    {
        domain: 'amazon.com',
        aliases: ['amazon', 'amazon br'],
    },
    {
        domain: 'ifood.com.br',
        aliases: ['ifood', 'i food', 'clube ifood', 'ifood clube', 'ifood beneficios'],
    },
    {
        domain: 'rappi.com',
        aliases: ['rappi', 'rappi prime', 'rappibank'],
    },

    // ── Seguros ───────────────────────────────────────────────────────────────
    {
        domain: 'portoseguro.com.br',
        aliases: ['porto seguro', 'portoseguro', 'porto seg'],
    },
    {
        domain: 'bradescoseguros.com.br',
        aliases: ['bradesco seguros', 'bradesco seg', 'bseg', 'bradesco auto'],
    },
    {
        domain: 'itau.com.br',
        aliases: ['itau', 'itau seguros', 'itau seg', 'itau vida'],
    },

    // ── Telecom / Internet ────────────────────────────────────────────────────
    {
        domain: 'claro.com.br',
        aliases: ['claro', 'claro internet', 'claro tv', 'claro movel', 'embratel'],
    },
    {
        domain: 'vivo.com.br',
        aliases: ['vivo', 'vivo internet', 'vivo tv', 'vivo fibra', 'telefonica'],
    },
    {
        domain: 'tim.com.br',
        aliases: ['tim', 'tim internet', 'tim black', 'tim live'],
    },
    {
        domain: 'oi.com.br',
        aliases: ['oi', 'oi internet', 'oi fibra', 'oi tv'],
    },

    // ── Educação ──────────────────────────────────────────────────────────────
    {
        domain: 'duolingo.com',
        aliases: ['duolingo', 'duolingo plus', 'duolingo super'],
    },
    {
        domain: 'udemy.com',
        aliases: ['udemy', 'udemy pro'],
    },
    {
        domain: 'coursera.org',
        aliases: ['coursera', 'coursera plus'],
    },
    {
        domain: 'alura.com.br',
        aliases: ['alura', 'alura plus', 'alura start', 'alura pro'],
    },
    {
        domain: 'rocketseat.com.br',
        aliases: ['rocketseat', 'rocket seat'],
    },
    {
        domain: 'skillshare.com',
        aliases: ['skillshare', 'skill share'],
    },

    // ── Games ─────────────────────────────────────────────────────────────────
    {
        domain: 'ea.com',
        aliases: ['ea play', 'ea sports', 'electronic arts', 'origin'],
    },
    {
        domain: 'epicgames.com',
        aliases: ['epic games', 'epicgames', 'fortnite'],
    },
    {
        domain: 'steampowered.com',
        aliases: ['steam', 'steam games', 'valve'],
    },
    {
        domain: 'playstation.com',
        aliases: ['playstation', 'ps plus', 'psn', 'playstation plus', 'ps now', 'ps5'],
    },
    {
        domain: 'nintendo.com',
        aliases: ['nintendo', 'nintendo switch', 'nintendo online', 'nso'],
    },
];

// ─── Índice invertido (construído uma única vez no load) ──────────────────────
// normalizedAlias → domain

const ALIAS_INDEX = new Map<string, string>();

for (const entry of CATALOG) {
    for (const alias of entry.aliases) {
        const key = normalizeText(alias);
        if (key && !ALIAS_INDEX.has(key)) {
            ALIAS_INDEX.set(key, entry.domain);
        }
    }
}

// ─── Mapeamento serviceKey → domínio ─────────────────────────────────────────

const SERVICE_KEY_TO_DOMAIN: Record<string, string> = {
    'spotify': 'spotify.com',
    'youtube-premium': 'google.com',
    'netflix': 'netflix.com',
    'amazon-prime': 'primevideo.com',
    'disney-plus': 'disneyplus.com',
    'max': 'max.com',
    'globoplay': 'globoplay.globo.com',
    'deezer': 'deezer.com',
    'apple-music': 'apple.com',
    'icloud': 'apple.com',
    'google-one': 'google.com',
    'microsoft-365': 'microsoft.com',
    'adobe': 'adobe.com',
    'canva': 'canva.com',
    'dropbox': 'dropbox.com',
    'notion': 'notion.so',
    'figma': 'figma.com',
    'openai-chatgpt': 'openai.com',
    'paramount-plus': 'paramountplus.com',
    'crunchyroll': 'crunchyroll.com',
    'wellhub': 'wellhub.com',
    'smart-fit': 'smartfit.com.br',
    'meli-plus': 'mercadolivre.com.br',
    'sem-parar': 'semparar.com.br',
    'veloe': 'veloe.com.br',
    'taggy': 'taggy.com.br',
    'unimed': 'unimed.coop.br',
    'bradesco-seguros': 'bradescoseguros.com.br',
    'itau-seguros': 'itau.com.br',
    'sulamerica': 'sulamerica.com.br',
    'porto-seguro': 'portoseguro.com.br',
    'clube-ifood': 'ifood.com.br',
};

// ─── Cache de resolução ───────────────────────────────────────────────────────

const resolveCache = new Map<string, string | null>();
const failedDomains = new Set<string>();
const urlCache = new Map<string, string>();

// ─── Utilitários de texto ─────────────────────────────────────────────────────

function normalizeText(value: string): string {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const NOISE_WORDS = new Set([
    'assinatura', 'assinaturas', 'subscription', 'plano', 'plan',
    'premium', 'basic', 'standard', 'familia', 'family', 'anual',
    'mensal', 'monthly', 'annual', 'plus', 'pro', 'br', 'brasil',
    'brazil', 'de', 'do', 'da', 'dos', 'das', 'e', 'com', 'para',
]);

function stripNoise(normalized: string): string {
    return normalized
        .split(' ')
        .filter(t => t.length > 1 && !NOISE_WORDS.has(t) && !/^\d+$/.test(t))
        .join(' ')
        .trim();
}

/** Levenshtein limitada — retorna maxDist+1 se distância > maxDist. */
function levenshtein(a: string, b: string, maxDist = 2): number {
    if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        let prev = i;
        for (let j = 1; j <= b.length; j++) {
            const val = a[i - 1] === b[j - 1]
                ? row[j - 1]
                : 1 + Math.min(row[j - 1], row[j], prev);
            row[j - 1] = prev;
            prev = val;
        }
        row[b.length] = prev;
    }
    return row[b.length];
}

// ─── Pipeline de resolução ────────────────────────────────────────────────────

export function resolveLogoDomain(sub: Record<string, any>): string | null {
    // Camada 0: serviceKey do backend
    const serviceKey = sub.autoDetection?.serviceKey
        ? String(sub.autoDetection.serviceKey).toLowerCase().trim()
        : null;
    if (serviceKey && SERVICE_KEY_TO_DOMAIN[serviceKey]) {
        return SERVICE_KEY_TO_DOMAIN[serviceKey];
    }

    const rawName = String(sub.name ?? '').trim();
    if (!rawName) return null;

    const normalized = normalizeText(rawName);
    if (!normalized) return null;

    if (resolveCache.has(normalized)) return resolveCache.get(normalized)!;

    const domain = runResolvePipeline(normalized);
    resolveCache.set(normalized, domain);
    return domain;
}

function runResolvePipeline(normalized: string): string | null {
    const stripped = stripNoise(normalized);

    // ── Camada 1: match exato ──────────────────────────────────────────────────
    if (ALIAS_INDEX.has(normalized)) return ALIAS_INDEX.get(normalized)!;
    if (stripped && ALIAS_INDEX.has(stripped)) return ALIAS_INDEX.get(stripped)!;

    // ── Camada 2: prefixo bidirecional ────────────────────────────────────────
    //   "hbo"     → startsWith → "hbomax"    ✓
    //   "disneyp" → startsWith → "disneyplus" ✓
    //   "spotif"  ← startsWith ← "spotify"   ✓
    const MIN_PREFIX = 3;
    let prefixBest: string | null = null;
    let prefixBestLen = 0;

    for (const [alias, domain] of ALIAS_INDEX) {
        if (alias.length < MIN_PREFIX) continue;
        const a = normalized, s = stripped;
        const hit =
            (a.length >= MIN_PREFIX && alias.startsWith(a)) ||
            (s.length >= MIN_PREFIX && alias.startsWith(s)) ||
            a.startsWith(alias) ||
            s.startsWith(alias);
        if (hit && alias.length > prefixBestLen) {
            prefixBest = domain;
            prefixBestLen = alias.length;
        }
    }
    if (prefixBest) return prefixBest;

    // ── Camada 3: substring bidirecional ──────────────────────────────────────
    const MIN_SUB = 4;
    let subBest: string | null = null;
    let subBestLen = 0;

    for (const [alias, domain] of ALIAS_INDEX) {
        if (alias.length < MIN_SUB) continue;
        const hit =
            (normalized.length >= MIN_SUB && (normalized.includes(alias) || alias.includes(normalized))) ||
            (stripped.length >= MIN_SUB && (stripped.includes(alias) || alias.includes(stripped)));
        if (hit && alias.length > subBestLen) {
            subBest = domain;
            subBestLen = alias.length;
        }
    }
    if (subBest) return subBest;

    // ── Camada 4: match por token ─────────────────────────────────────────────
    const tokens = (stripped || normalized).split(' ').filter(t => t.length >= 3);
    let tokenBest: string | null = null;
    let tokenBestLen = 0;

    for (const token of tokens) {
        if (ALIAS_INDEX.has(token)) {
            if (token.length > tokenBestLen) {
                tokenBest = ALIAS_INDEX.get(token)!;
                tokenBestLen = token.length;
            }
            continue;
        }
        for (const [alias, domain] of ALIAS_INDEX) {
            if (alias.length < 3) continue;
            if (alias.startsWith(token) || token.startsWith(alias)) {
                if (alias.length > tokenBestLen) {
                    tokenBest = domain;
                    tokenBestLen = alias.length;
                }
            }
        }
    }
    if (tokenBest) return tokenBest;

    // ── Camada 5: Levenshtein (distância ≤ 1, nome ≥ 5 chars) ────────────────
    const candidate = stripped || normalized;
    if (candidate.length >= 5) {
        let lBest: string | null = null;
        let lBestDist = 2;

        for (const [alias, domain] of ALIAS_INDEX) {
            if (Math.abs(alias.length - candidate.length) > 2) continue;
            const dist = levenshtein(candidate, alias, lBestDist);
            if (dist < lBestDist) { lBest = domain; lBestDist = dist; }
            if (lBestDist === 0) break;
        }
        if (lBest) return lBest;
    }

    // ── Camada 6: fallback genérico ───────────────────────────────────────────
    const firstAlpha = tokens.find(t => /^[a-z]{4,}$/.test(t));
    if (firstAlpha) return `${firstAlpha}.com`;

    return null;
}

// ─── URL builder ──────────────────────────────────────────────────────────────

function buildLogoUrl(domain: string): string {
    const cached = urlCache.get(domain);
    if (cached) return cached;
    const url = `${LOGO_API_URL}/${domain}?token=${LOGO_TOKEN}&size=${LOGO_SIZE}&format=png&retina=true`;
    urlCache.set(domain, url);
    return url;
}

// ─── API pública ──────────────────────────────────────────────────────────────

export function getLogoUrl(sub: Record<string, any>): string | null {
    const domain = resolveLogoDomain(sub);
    if (!domain) return null;
    if (failedDomains.has(domain)) return null;
    return buildLogoUrl(domain);
}

export function getLogoDomain(sub: Record<string, any>): string | null {
    return resolveLogoDomain(sub);
}

export function markLogoDomainFailed(domain: string): void {
    failedDomains.add(domain);
    urlCache.delete(domain);
}

export function clearFailedDomains(): void {
    failedDomains.clear();
}

// ─── Handler global de erro de imagem ────────────────────────────────────────

declare global {
    interface Window {
        __onLogoError: (domain: string, imgEl: HTMLImageElement) => void;
    }
}

window.__onLogoError = (domain: string, imgEl: HTMLImageElement): void => {
    markLogoDomainFailed(domain);
    imgEl.style.display = 'none';
    const fallback = imgEl.nextElementSibling as HTMLElement | null;
    if (fallback) {
        fallback.style.display = 'flex';
        fallback.style.alignItems = 'center';
        fallback.style.justifyContent = 'center';
    }
};