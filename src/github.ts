import { msg, LocalizedError, toMessage, tr } from './i18n';
import {
  emptyData,
  equal,
  mergeData,
  resolveMerge,
  validateData,
  parseDataJSON,
  type Conflict,
  type Data,
} from './domain';
import { getValue, putValue, loadState, mutateData } from './storage';
export interface RepoConfig {
  owner: string;
  repo: string;
  branch: string;
  path: string;
}
export interface Vault {
  config: RepoConfig;
  salt: string;
  iv: string;
  ciphertext: string;
}
export interface SyncBase {
  data: Data;
  sha: string | null;
  date: string;
}
export interface SyncPlan {
  data: Data;
  remote: Data;
  sha: string | null;
  conflicts: Conflict[];
  revision: number;
  config: RepoConfig;
}
const baseKey = (c: RepoConfig) =>
  `base:${c.owner}/${c.repo}/${c.branch}/${c.path}`;
export const encode64 = (bytes: Uint8Array) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 8192)
    s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(s);
};
export const decode64 = (s: string) =>
  Uint8Array.from(atob(s.replace(/\s/g, '')), (c) => c.charCodeAt(0));
async function keyFrom(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: salt as BufferSource,
      iterations: 310000,
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}
export async function encryptToken(
  token: string,
  password: string,
  config: RepoConfig,
): Promise<Vault> {
  if (!crypto.subtle)
    throw new LocalizedError(
      msg(
        'La cifratura richiede HTTPS oppure localhost. Apri Punto dal suo indirizzo sicuro.',
      ),
    );
  if (password.length < 10)
    throw new LocalizedError(
      msg('Usa una password locale di almeno 10 caratteri.'),
    );
  const salt = crypto.getRandomValues(new Uint8Array(16)),
    iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFrom(password, salt);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: new TextEncoder().encode(JSON.stringify(config)),
    },
    key,
    new TextEncoder().encode(token),
  );
  return {
    config,
    salt: encode64(salt),
    iv: encode64(iv),
    ciphertext: encode64(new Uint8Array(ciphertext)),
  };
}
export async function decryptToken(vault: Vault, password: string) {
  try {
    const key = await keyFrom(password, decode64(vault.salt));
    const raw = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: decode64(vault.iv) as BufferSource,
        additionalData: new TextEncoder().encode(JSON.stringify(vault.config)),
      },
      key,
      decode64(vault.ciphertext) as BufferSource,
    );
    return new TextDecoder().decode(raw);
  } catch {
    throw new LocalizedError(
      msg(
        'Password non corretta o collegamento danneggiato. Puoi riconfigurarlo senza perdere i dati locali.',
      ),
    );
  }
}
async function api(token: string, path: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(`https://api.github.com${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...init?.headers,
      },
      signal: AbortSignal.timeout(25000),
      cache: 'no-store',
    });
  } catch {
    throw new LocalizedError(
      msg(
        'GitHub non raggiungibile. Le modifiche restano salvate sul dispositivo.',
      ),
    );
  }
  if (response.status === 401)
    throw new LocalizedError(
      msg('Token scaduto o non valido. Riconfigura il collegamento GitHub.'),
    );
  if (response.status === 403)
    throw new LocalizedError(
      msg(
        'Accesso negato o limite GitHub raggiunto. Controlla scadenza e permessi Contents del token.',
      ),
    );
  if (response.status === 409 || response.status === 422)
    throw new LocalizedError(
      msg(
        'La versione remota è cambiata o il branch non è scrivibile. Recupera gli aggiornamenti e riprova.',
      ),
    );
  if (!response.ok && response.status !== 404)
    throw new LocalizedError(
      msg(
        'GitHub ha risposto con errore {status}. I dati locali sono conservati.',
        { status: String(response.status) },
      ),
    );
  return response;
}
const repoPath = (c: RepoConfig) =>
  `/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}`;
const contentPath = (c: RepoConfig) =>
  `${repoPath(c)}/contents/${c.path.split('/').map(encodeURIComponent).join('/')}`;
export async function verifyRepo(
  config: RepoConfig,
  token: string,
): Promise<RepoConfig> {
  if (
    !/^[a-z\d-]+$/i.test(config.owner) ||
    !/^[\w.-]+$/.test(config.repo) ||
    !config.path.endsWith('.json') ||
    config.path.split('/').some((s) => !s || s === '..' || s === '.')
  )
    throw new LocalizedError(
      msg('Indica proprietario, repository e percorso JSON validi.'),
    );
  const response = await api(token, repoPath(config));
  if (response.status === 404)
    throw new LocalizedError(
      msg('Repository non trovata: creala su GitHub e abilitala nel token.'),
    );
  const repo = await response.json();
  if (!repo.private)
    throw new LocalizedError(
      msg(
        'La repository dei dati deve essere privata. Modifica la visibilità su GitHub.',
      ),
    );
  if (repo.archived)
    throw new LocalizedError(
      msg('La repository è archiviata e non può ricevere salvataggi.'),
    );
  return { ...config, branch: config.branch || repo.default_branch || 'main' };
}
async function readRemote(
  config: RepoConfig,
  token: string,
): Promise<{ data: Data | null; sha: string | null }> {
  const response = await api(
    token,
    `${contentPath(config)}?ref=${encodeURIComponent(config.branch)}`,
  );
  if (response.status === 404) return { data: null, sha: null };
  const file = await response.json();
  if (
    file.type !== 'file' ||
    file.size > 10000000 ||
    typeof file.sha !== 'string'
  )
    throw new LocalizedError(
      msg('Il percorso remoto non è un file JSON supportato (massimo 10 MB).'),
    );
  let text: string;
  if (file.encoding === 'base64')
    text = new TextDecoder().decode(decode64(file.content));
  else {
    const blob = await api(token, `${repoPath(config)}/git/blobs/${file.sha}`);
    if (!blob.ok)
      throw new LocalizedError(msg('Impossibile leggere il file remoto.'));
    const encoded = await blob.json();
    text = new TextDecoder().decode(decode64(encoded.content));
  }
  try {
    return { data: parseDataJSON(text), sha: file.sha };
  } catch (e) {
    throw new LocalizedError(
      msg('File remoto non valido: {message}', { message: toMessage(e) }),
    );
  }
}
export async function getBase(config: RepoConfig) {
  return getValue<SyncBase>(baseKey(config));
}
export async function prepareSync(
  config: RepoConfig,
  token: string,
): Promise<SyncPlan> {
  await verifyRepo(config, token);
  const remote = await readRemote(config, token),
    local = await loadState(),
    base = await getBase(config);
  if (!remote.data && base)
    throw new LocalizedError(
      msg(
        'Il file remoto è stato rimosso o il branch non è disponibile. Verifica GitHub prima di salvare.',
      ),
    );
  if (!remote.data)
    return {
      data: local.data,
      remote: local.data,
      sha: null,
      conflicts: [],
      revision: local.revision,
      config,
    };
  const merged = mergeData(base?.data ?? emptyData(), local.data, remote.data);
  return {
    ...merged,
    remote: remote.data,
    sha: remote.sha,
    revision: local.revision,
    config,
  };
}
export async function finishSync(
  plan: SyncPlan,
  choices: Record<string, 'local' | 'remote'>,
  token: string,
  push: boolean,
) {
  const merged = resolveMerge(plan.data, plan.conflicts, choices);
  const current = await loadState();
  if (current.revision !== plan.revision)
    throw new LocalizedError(
      msg(
        'I dati locali sono cambiati durante il confronto. Ripeti la sincronizzazione.',
      ),
    );
  let sha = plan.sha;
  if (push && (!sha || !equal(merged, plan.remote))) {
    const response = await api(token, contentPath(plan.config), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: tr('Punto: salvataggio {date}', {
          date: new Date().toISOString(),
        }),
        content: encode64(
          new TextEncoder().encode(JSON.stringify(merged, null, 2)),
        ),
        branch: plan.config.branch,
        ...(sha ? { sha } : {}),
      }),
    });
    if (!response.ok)
      throw new LocalizedError(
        msg(
          'Salvataggio GitHub non riuscito. Verifica repository, branch e token.',
        ),
      );
    sha = (await response.json()).content.sha;
  }
  // Persist the actual shared ancestor even if a different tab edited local data during the request.
  if (sha)
    await putValue(baseKey(plan.config), {
      data: push ? merged : plan.remote,
      sha,
      date: new Date().toISOString(),
    } satisfies SyncBase);
  if (!equal(current.data, merged))
    await mutateData(() => merged, plan.revision);
  return { sha, dirty: !push && (!sha || !equal(merged, plan.remote)) };
}
