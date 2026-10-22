import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fixture, transaction } from './fixtures';
import {
  emptyData,
  mergeData,
  stamp,
  type Data,
  type Account,
  type Settings,
} from '../src/domain';
const memory = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  state: { data: null as Data | null, revision: 1 },
}));
vi.mock('../src/storage', () => ({
  getValue: vi.fn(async (key: string) =>
    structuredClone(memory.values.get(key)),
  ),
  putValue: vi.fn(async (key: string, value: unknown) => {
    memory.values.set(key, structuredClone(value));
  }),
  loadState: vi.fn(async () => structuredClone(memory.state)),
  mutateData: vi.fn(async (fn: (data: Data) => Data, expected?: number) => {
    if (expected !== undefined && memory.state.revision !== expected)
      throw new Error('I dati sono cambiati');
    memory.state = {
      data: fn(structuredClone(memory.state.data!)),
      revision: memory.state.revision + 1,
    };
    return memory.state;
  }),
}));
import {
  prepareSync,
  finishSync,
  encryptToken,
  decryptToken,
  verifyRepo,
  encode64,
  getBase,
  type RepoConfig,
} from '../src/github';
const config: RepoConfig = {
  owner: 'test-user',
  repo: 'private-data',
  branch: 'main',
  path: 'dashboard.json',
};
let serverData: Data | null,
  serverSha: string | null,
  version: number,
  requests: { url: string; method: string; body?: Record<string, unknown> }[];
beforeEach(() => {
  memory.values.clear();
  memory.state = { data: fixture(), revision: 1 };
  serverData = null;
  serverSha = null;
  version = 0;
  requests = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options: RequestInit) => {
      const method = options.method ?? 'GET',
        body = options.body ? JSON.parse(String(options.body)) : undefined;
      requests.push({ url, method, body });
      if (url.endsWith('/repos/test-user/private-data'))
        return Response.json({ private: true, default_branch: 'main' });
      if (method === 'PUT') {
        if ((body.sha ?? null) !== serverSha)
          return Response.json({ message: 'Conflict' }, { status: 409 });
        serverData = JSON.parse(
          new TextDecoder().decode(
            Uint8Array.from(atob(body.content), (c) => c.charCodeAt(0)),
          ),
        );
        serverSha = 'sha-' + ++version;
        return Response.json({ content: { sha: serverSha } });
      }
      if (!serverData) return Response.json({}, { status: 404 });
      return Response.json({
        type: 'file',
        size: 100,
        sha: serverSha,
        encoding: 'base64',
        content: encode64(new TextEncoder().encode(JSON.stringify(serverData))),
      });
    }),
  );
});
describe('collegamento e vault', () => {
  it('cifra un token con salt e IV casuali e lo sblocca con la password', async () => {
    const vault = await encryptToken(
      'test-token-never-in-a-file',
      'password-locale-sicura',
      config,
    );
    expect(JSON.stringify(vault)).not.toContain('test-token');
    expect(await decryptToken(vault, 'password-locale-sicura')).toBe(
      'test-token-never-in-a-file',
    );
    const second = await encryptToken(
      'test-token-never-in-a-file',
      'password-locale-sicura',
      config,
    );
    expect(second.salt).not.toBe(vault.salt);
    expect(second.iv).not.toBe(vault.iv);
  });
  it('rifiuta password errata e manomissioni della configurazione', async () => {
    const vault = await encryptToken('token', 'password-locale-sicura', config);
    await expect(decryptToken(vault, 'password-errata')).rejects.toThrow(
      /Password/,
    );
    await expect(
      decryptToken(
        { ...vault, config: { ...config, repo: 'altro' } },
        'password-locale-sicura',
      ),
    ).rejects.toThrow();
  });
  it('non accetta repository pubbliche', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ private: false }));
    await expect(verifyRepo(config, 'token')).rejects.toThrow(/privata/);
  });
  it('riconosce token scaduti', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({}, { status: 401 }));
    await expect(verifyRepo(config, 'token')).rejects.toThrow(/scaduto/);
  });
});
describe('sincronizzazione', () => {
  it('crea il file e ritrova dati e impostazioni su un secondo dispositivo', async () => {
    (memory.state.data!.entities.settings as Settings).name =
      'Profilo condiviso';
    memory.state.data!.entities.t = transaction();
    const first = await prepareSync(config, 'token');
    expect(first.conflicts).toHaveLength(0);
    await finishSync(first, {}, 'token', true);
    expect(serverData!.entities.t).toBeDefined();
    const shared = structuredClone(serverData!);
    memory.values.clear();
    memory.state = { data: emptyData(), revision: 1 };
    const second = await prepareSync(config, 'token');
    expect(second.conflicts).toHaveLength(0);
    await finishSync(second, {}, 'token', false);
    expect(memory.state.data).toEqual(shared);
    expect(requests.filter((r) => r.method === 'PUT')).toHaveLength(1);
  });
  it('unisce elementi diversi da due dispositivi', async () => {
    await finishSync(await prepareSync(config, 'token'), {}, 'token', true);
    (memory.state.data!.entities.a as Account).name = 'Locale';
    memory.state.revision++;
    serverData!.entities.t = transaction();
    serverSha = 'sha-remote';
    const plan = await prepareSync(config, 'token');
    expect(plan.conflicts).toHaveLength(0);
    await finishSync(plan, {}, 'token', true);
    expect(serverData!.entities.t).toBeDefined();
    expect((serverData!.entities.a as Account).name).toBe('Locale');
    expect(await getBase(config)).toMatchObject({ data: serverData });
  });
  it('non scrive finché non si sceglie una versione per i conflitti', async () => {
    await finishSync(await prepareSync(config, 'token'), {}, 'token', true);
    (memory.state.data!.entities.a as Account).name = 'Locale';
    (serverData!.entities.a as Account).name = 'Remoto';
    serverSha = 'sha-remote';
    const plan = await prepareSync(config, 'token');
    expect(plan.conflicts).toHaveLength(1);
    await expect(finishSync(plan, {}, 'token', true)).rejects.toThrow(/Scegli/);
    await finishSync(plan, { a: 'remote' }, 'token', true);
    expect((memory.state.data!.entities.a as Account).name).toBe('Remoto');
  });
  it('usa lo SHA e conserva i dati locali se la versione remota cambia', async () => {
    await finishSync(await prepareSync(config, 'token'), {}, 'token', true);
    (memory.state.data!.entities.a as Account).name = 'Locale';
    const local = structuredClone(memory.state.data!);
    const plan = await prepareSync(config, 'token');
    serverSha = 'sha-raced';
    await expect(finishSync(plan, {}, 'token', true)).rejects.toThrow(/remota/);
    expect(memory.state.data).toEqual(local);
    expect(requests.at(-1)?.body?.sha).toBe(plan.sha);
  });
  it('interrompe il salvataggio se un’altra scheda modifica i dati durante il confronto', async () => {
    const plan = await prepareSync(config, 'token');
    memory.state.revision++;
    await expect(finishSync(plan, {}, 'token', true)).rejects.toThrow(
      /cambiati/,
    );
    expect(requests.filter((r) => r.method === 'PUT')).toHaveLength(0);
  });
  it('conserva modifiche locali e ultima base dopo errore di rete', async () => {
    await finishSync(await prepareSync(config, 'token'), {}, 'token', true);
    const before = structuredClone(memory.state);
    const base = await getBase(config);
    vi.mocked(fetch).mockRejectedValue(new TypeError('offline'));
    await expect(prepareSync(config, 'token')).rejects.toThrow(
      /non raggiungibile/,
    );
    expect(memory.state).toEqual(before);
    expect(await getBase(config)).toEqual(base);
  });
  it('il recupero non pubblica automaticamente le modifiche locali', async () => {
    await finishSync(await prepareSync(config, 'token'), {}, 'token', true);
    (memory.state.data!.entities.a as Account).name = 'Solo locale';
    serverData!.entities.t = transaction();
    serverSha = 'sha-remote';
    const result = await finishSync(
      await prepareSync(config, 'token'),
      {},
      'token',
      false,
    );
    expect(result.dirty).toBe(true);
    expect((serverData!.entities.a as Account).name).toBe('Lavoro');
    expect(memory.state.data!.entities.t).toBeDefined();
  });
  it('rifiuta un file remoto non valido o scomparso senza sostituire dati', async () => {
    await finishSync(await prepareSync(config, 'token'), {}, 'token', true);
    const before = structuredClone(memory.state);
    serverData = null;
    await expect(prepareSync(config, 'token')).rejects.toThrow(/rimosso/);
    expect(memory.state).toEqual(before);
  });
});
