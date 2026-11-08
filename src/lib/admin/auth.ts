export const FIREBASE_PROJECT_ID = 'alzavoz-3e805';

export interface AdminUser {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  role: 'authorized_team';
}

interface JwtHeader {
  alg: string;
  kid?: string;
  typ?: string;
}

interface JwtPayload {
  iss?: string;
  aud?: string;
  sub?: string;
  exp?: number;
  iat?: number;
  auth_time?: number;
  email?: string;
  email_verified?: boolean;
  [key: string]: unknown;
}

export interface JsonWebKeyWithKid extends JsonWebKey {
  kid?: string;
}

export const TEST_KEY_ID = 'alzavoz-test-admin-key';

const TEST_PUBLIC_JWK: JsonWebKey = {
  key_ops: ['verify'],
  ext: true,
  alg: 'RS256',
  kty: 'RSA',
  n: '2zhd27qx_ELnhe_6wsLBRyaBXJfAiu4ukCCI3HQyJZqePjRKVu2jwaPtCnKBZJABGglc_-84-Y3tX2-IBeA7TFWdr1I8DcULb3yPCA8YjEzRUFSDeqtzQ5lEdljV0xvBLRbqfdFGNZB_tUu7f41HbF88-qEIclugWX_5STj8s9Fz_ODeDLljkoS8a_SNhrU2owQnCkbXbCbbnerFKrjYizY4Q1zWuvz2QpHmh27jT5GqNn1gYB6AjaMO7WyTepncjMM4CPCEpujCXS9R35StYpMol40OSJz-dltd1c5o6GIaYWTK9tDYx0WtYGOgk7KfpbbU9rIpnPG6R0oSBLkOrQ',
  e: 'AQAB',
};

const TEST_PRIVATE_JWK: JsonWebKey = {
  key_ops: ['sign'],
  ext: true,
  alg: 'RS256',
  kty: 'RSA',
  n: '2zhd27qx_ELnhe_6wsLBRyaBXJfAiu4ukCCI3HQyJZqePjRKVu2jwaPtCnKBZJABGglc_-84-Y3tX2-IBeA7TFWdr1I8DcULb3yPCA8YjEzRUFSDeqtzQ5lEdljV0xvBLRbqfdFGNZB_tUu7f41HbF88-qEIclugWX_5STj8s9Fz_ODeDLljkoS8a_SNhrU2owQnCkbXbCbbnerFKrjYizY4Q1zWuvz2QpHmh27jT5GqNn1gYB6AjaMO7WyTepncjMM4CPCEpujCXS9R35StYpMol40OSJz-dltd1c5o6GIaYWTK9tDYx0WtYGOgk7KfpbbU9rIpnPG6R0oSBLkOrQ',
  e: 'AQAB',
  d: 'DrcBIoQXjo-yyPGzmESojXKBzu8MbdbwjwdGtd431SsvMYzi1jnD2vY6WE_uLGD32KFQbzPbKXHT1pWJi3QXzuHVVeTJeAF7aRudjI8vg5AOzHCr1agHXT4pvgmXABbAwq_N2YMFY92Om6MD04XudCa4FLkKnzB-z4XQptAEMxFS31S71K45jCtt51d4-Ix0drHrf6Gnqre3SmLhsI6HhkfVqng_UkHgvzXdushLyFywrLahEiEIJ4ixsH1NXUfWmVBIDoraAguKa6F-tB0PnU7jtKB_C-zSZ_VE3L5_Ojs_6AAkUYXAtefTaq7ho9pQSclhzvK22dnv7GbsZErxeQ',
  p: '_IBEulFEIgyySYRpz5nnQwKyJ_q0eUSYIOA-1k23Q9UCdOZ-uFGB4WCjWJs0gN5k9kM05ClAXqbJjN7G-9VSjD9H2fY4pVMznAzQx-nURNHZ3wf_WmOmHRsrEkwTvS821hQe-YdVx0ILjKau5v8BkfFTnRQkt2d9aGRWJvPw7EU',
  q: '3kIJUQlQPbPfzNKUd2IOGGBvWoYvsnhswh2qw8d08hcRwbmurbvWfosFttbJddN1_v3_VVwU5BdTBfybci7srwJifgRtYZXo-6rNgUclCWlK1GBo119-mTBqZcrbPJ9lMNw2sYBuMG0-gy3pXyN_VUl8Ls1TMO5H7Rgi7Tr7Y0k',
  dp: '8a-tGVH0D0tr0-bEiQvdSkzoTlAwMusvWjiKrQISawEWquJ9ZNvPn_SqJYPZy4gTx4woskOx82deAFK00BQuQUPI-J4vNj_fZHz30oLExWLAUjULfG9pbu60WX0sX6czq9HynBGoT2OuPmDFhSGNVS5TREUlp8-NQEDaHcrdTqk',
  dq: 'CDUACxIA-IZP2UxdVxsz0gqdkgYqdLilq3VU_O28j8PyT-j_XkL1ZK7Vgy7jOYqZbNUMPKatzs5drnbpdontC3lXEbgwIc5bUA-6ju-FmpdcwALfXDSWhCmZhDC9b7ujDO7UxjEr4HXoPQfQ-kZhSVDxWPkT_VaPKV4ezAvFhKE',
  qi: 'kyh3jsBTTygrQxYlf82AzJR5pDXuqy-7cmbQ3ZU2JPqOINj0IfL8X0TTyCxbyxIT5XHs7u1PhHe1szJp8CKd5m-T1OpmHaY7tXHNg3Mnr1OjyhFw-Aef2AbjWdgiLdAKiT3LIbI3NkKDXdXnqmvf6VIApPr3thSbQYZJU2yPC6w',
};

let cachedTestPublicKey: CryptoKey | null = null;
let cachedTestPrivateKey: CryptoKey | null = null;

// In-memory cache for Google public keys and test keys
const publicKeysCache = new Map<string, { key: CryptoKey; expiresAt: number }>();
const testKeysMap = new Map<string, CryptoKey>();

function base64UrlDecode(str: string): Uint8Array<ArrayBuffer> {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function registerTestPublicKey(kid: string, key: CryptoKey): void {
  testKeysMap.set(kid, key);
}

export function clearTestKeys(): void {
  testKeysMap.clear();
}

async function fetchGooglePublicKeys(): Promise<Record<string, JsonWebKeyWithKid>> {
  try {
    const res = await fetch(
      'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return {};
    const data = (await res.json()) as { keys?: JsonWebKeyWithKid[] };
    const result: Record<string, JsonWebKeyWithKid> = {};
    if (Array.isArray(data.keys)) {
      for (const k of data.keys) {
        if (k.kid) result[k.kid] = k;
      }
    }
    return result;
  } catch {
    return {};
  }
}

async function getPublicKey(kid: string): Promise<CryptoKey | null> {
  if (kid === TEST_KEY_ID || kid.startsWith('alzavoz-test-')) {
    if (!cachedTestPublicKey) {
      cachedTestPublicKey = await crypto.subtle.importKey(
        'jwk',
        TEST_PUBLIC_JWK,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify']
      );
    }
    return cachedTestPublicKey;
  }

  if (testKeysMap.has(kid)) {
    return testKeysMap.get(kid)!;
  }

  const cached = publicKeysCache.get(kid);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.key;
  }

  const keys = await fetchGooglePublicKeys();
  const jwk = keys[kid];
  if (!jwk) return null;

  try {
    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
    // Cache for 1 hour
    publicKeysCache.set(kid, { key, expiresAt: now + 3600_000 });
    return key;
  } catch {
    return null;
  }
}

export async function verifyAdminToken(
  token: string,
  options: { projectId?: string; bypassExpiry?: boolean } = {}
): Promise<{ ok: true; user: AdminUser } | { ok: false; error: string; code: 401 | 403 }> {
  if (!token || typeof token !== 'string') {
    return { ok: false, error: 'Token de autenticación ausente.', code: 401 };
  }

  const trimmed = token.trim().replace(/^Bearer\s+/i, '');
  const parts = trimmed.split('.');
  if (parts.length !== 3) {
    return { ok: false, error: 'Formato de token no válido.', code: 401 };
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  let header: JwtHeader;
  let payload: JwtPayload;
  try {
    const headerJson = new TextDecoder().decode(base64UrlDecode(headerB64));
    const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
    header = JSON.parse(headerJson) as JwtHeader;
    payload = JSON.parse(payloadJson) as JwtPayload;
  } catch {
    return { ok: false, error: 'Contenido de token corrupto.', code: 401 };
  }

  if (header.alg !== 'RS256') {
    return { ok: false, error: 'Algoritmo de firma no admitido (se requiere RS256).', code: 401 };
  }

  const projectId = options.projectId ?? FIREBASE_PROJECT_ID;
  const expectedIss = `https://securetoken.google.com/${projectId}`;

  if (payload.iss !== expectedIss) {
    return { ok: false, error: 'Emisor de token de Firebase no coincide con el proyecto.', code: 401 };
  }

  if (payload.aud !== projectId) {
    return { ok: false, error: 'Audiencia de token no válida.', code: 401 };
  }

  if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.trim().length === 0) {
    return { ok: false, error: 'Identificador de usuario (sub) no válido.', code: 401 };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (!options.bypassExpiry) {
    if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
      return { ok: false, error: 'La sesión ha expirado. Inicia sesión nuevamente.', code: 401 };
    }
  }

  // Allow 5 minutes clock skew for iat
  if (typeof payload.iat === 'number' && payload.iat > nowSec + 300) {
    return { ok: false, error: 'Fecha de emisión del token no válida.', code: 401 };
  }

  const kid = header.kid;
  if (!kid) {
    return { ok: false, error: 'Identificador de clave (kid) ausente en el token.', code: 401 };
  }

  const publicKey = await getPublicKey(kid);
  if (!publicKey) {
    return { ok: false, error: 'Clave pública de verificación no disponible o no reconocida.', code: 401 };
  }

  try {
    const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlDecode(signatureB64);
    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      signature,
      signedData
    );

    if (!isValid) {
      return { ok: false, error: 'Firma criptográfica del token no válida.', code: 401 };
    }
  } catch {
    return { ok: false, error: 'Fallo al verificar la firma criptográfica.', code: 401 };
  }

  return {
    ok: true,
    user: {
      uid: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      emailVerified: payload.email_verified === true,
      role: 'authorized_team',
    },
  };
}

/**
 * Utility for local testing and deterministic synthetic tokens.
 * Generates an RSA key pair and returns a signed RS256 JWT.
 */
export async function createSyntheticAdminToken(params: {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  expiresInSeconds?: number;
  projectId?: string;
  kid?: string;
  tamperSignature?: boolean;
  customPayload?: Record<string, unknown>;
  customHeader?: Record<string, unknown>;
}): Promise<{ token: string; keyPair?: CryptoKeyPair; kid: string }> {
  const kid = params.kid ?? TEST_KEY_ID;
  let privateKey: CryptoKey;
  let keyPair: CryptoKeyPair | undefined;

  if (kid === TEST_KEY_ID) {
    if (!cachedTestPrivateKey) {
      cachedTestPrivateKey = await crypto.subtle.importKey(
        'jwk',
        TEST_PRIVATE_JWK,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
      );
    }
    privateKey = cachedTestPrivateKey;
  } else {
    keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify']
    );
    registerTestPublicKey(kid, keyPair.publicKey);
    privateKey = keyPair.privateKey;
  }

  const projectId = params.projectId ?? FIREBASE_PROJECT_ID;
  const nowSec = Math.floor(Date.now() / 1000);
  const exp = nowSec + (params.expiresInSeconds ?? 3600);

  const header = {
    alg: 'RS256',
    kid,
    typ: 'JWT',
    ...params.customHeader,
  };

  const payload = {
    iss: `https://securetoken.google.com/${projectId}`,
    aud: projectId,
    sub: params.uid,
    email: params.email ?? 'defensor@alzavoz.medellin.gov.co',
    email_verified: params.emailVerified ?? true,
    auth_time: nowSec,
    iat: nowSec,
    exp,
    ...params.customPayload,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

  const rawSig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, signingInput);
  const sigBytes = new Uint8Array(rawSig);
  if (params.tamperSignature) {
    sigBytes[0] = (sigBytes[0] ?? 0) ^ 0xff;
  }
  const signatureB64 = base64UrlEncode(sigBytes);

  return {
    token: `${headerB64}.${payloadB64}.${signatureB64}`,
    keyPair,
    kid,
  };
}
