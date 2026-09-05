/**
 * 极简 ACME HTTP-01 客户端：仅用于本项目单一 DEMO 子域名的证书签发与续期。
 * 不依赖第三方包；账户密钥和站点私钥均留在服务器受限目录，日志绝不输出密钥或令牌。
 */
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const domain = process.env.ACME_DOMAIN;
const challengeRoot = process.env.ACME_CHALLENGE_ROOT;
const certificatePath = process.env.ACME_CERTIFICATE_PATH;
const privateKeyPath = process.env.ACME_PRIVATE_KEY_PATH;
const accountKeyPath = process.env.ACME_ACCOUNT_KEY_PATH;
const csrPathOverride = process.env.ACME_CSR_PATH;
const sshTarget = process.env.ACME_CHALLENGE_SSH_TARGET;
const sshKeyPath = process.env.ACME_CHALLENGE_SSH_KEY_PATH;
const directoryUrl = process.env.ACME_DIRECTORY_URL ?? 'https://acme-v02.api.letsencrypt.org/directory';

if (![domain, certificatePath, accountKeyPath].every(Boolean) || (!csrPathOverride && !privateKeyPath) || (!sshTarget && !challengeRoot) || (sshTarget && !sshKeyPath)) {
  throw new Error('缺少 ACME 必需配置：域名、证书、账户密钥、CSR/站点私钥或挑战发布位置');
}

const b64url = (value) => Buffer.from(value).toString('base64url');
let nonce;
let accountUrl;

async function ensurePemKey(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pem = privateKey.export({ format: 'pem', type: 'pkcs1' });
    await writeFile(path, pem, { mode: 0o600 });
    return pem;
  }
}

function thumbprint(jwk) {
  // RFC 7638 要求按 e、kty、n 的稳定 JSON 顺序计算账户密钥指纹。
  return createHash('sha256').update(JSON.stringify({ e: jwk.e, kty: jwk.kty, n: jwk.n })).digest('base64url');
}

async function updateNonce(response) {
  const received = response.headers.get('replay-nonce');
  if (received) nonce = received;
}

async function signedPost(url, payload, accountPrivateKey, jwk) {
  if (!nonce) {
    const nonceResponse = await fetch(directory.newNonce, { method: 'HEAD' });
    if (!nonceResponse.ok) throw new Error(`无法获取 ACME nonce：${nonceResponse.status}`);
    await updateNonce(nonceResponse);
  }
  const protectedHeader = { alg: 'RS256', nonce, url };
  if (accountUrl) protectedHeader.kid = accountUrl;
  else protectedHeader.jwk = jwk;
  const protectedPart = b64url(JSON.stringify(protectedHeader));
  const payloadPart = b64url(payload === undefined ? '' : JSON.stringify(payload));
  const signature = sign('RSA-SHA256', Buffer.from(`${protectedPart}.${payloadPart}`), accountPrivateKey).toString('base64url');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/jose+json' },
    body: JSON.stringify({ protected: protectedPart, payload: payloadPart, signature })
  });
  await updateNonce(response);
  if (!response.ok && response.status !== 201) throw new Error(`ACME 请求失败：${response.status} ${await response.text()}`);
  return response;
}

async function poll(url, accountPrivateKey, jwk, accepted) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await signedPost(url, undefined, accountPrivateKey, jwk);
    const body = await response.json();
    if (accepted.includes(body.status)) return body;
    if (body.status === 'invalid') throw new Error(`ACME 校验失败：${JSON.stringify(body)}`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error('ACME 校验超时');
}

async function publishChallenge(token, value) {
  if (!/^[A-Za-z0-9_-]+$/.test(token)) throw new Error('ACME 挑战令牌格式异常');
  if (!sshTarget) {
    const tokenPath = join(challengeRoot, '.well-known', 'acme-challenge', token);
    await mkdir(dirname(tokenPath), { recursive: true, mode: 0o755 });
    await writeFile(tokenPath, value, { mode: 0o644 });
    return;
  }
  // 本机执行 ACME 协议时，挑战值经 SSH 标准输入写入服务器；值是公开校验材料，不传输任何私钥。
  execFileSync('ssh', ['-i', sshKeyPath, '-o', 'BatchMode=yes', sshTarget,
    `sudo install -d -m 0755 -o root -g root /var/lib/acme/student-affairs-api/.well-known/acme-challenge && sudo tee /var/lib/acme/student-affairs-api/.well-known/acme-challenge/${token} >/dev/null && sudo chmod 644 /var/lib/acme/student-affairs-api/.well-known/acme-challenge/${token}`],
  { input: value, stdio: ['pipe', 'ignore', 'inherit'] });
}

function removeRemoteChallenge(token) {
  if (sshTarget && /^[A-Za-z0-9_-]+$/.test(token)) {
    execFileSync('ssh', ['-i', sshKeyPath, '-o', 'BatchMode=yes', sshTarget,
      `sudo rm -f -- /var/lib/acme/student-affairs-api/.well-known/acme-challenge/${token}`],
    { stdio: 'ignore' });
  }
}

const directoryResponse = await fetch(directoryUrl);
if (!directoryResponse.ok) throw new Error(`无法读取 ACME 目录：${directoryResponse.status}`);
const directory = await directoryResponse.json();
const accountPem = await ensurePemKey(accountKeyPath);
const accountPrivateKey = await import('node:crypto').then(({ createPrivateKey, createPublicKey }) => createPrivateKey(accountPem));
const jwk = (await import('node:crypto').then(({ createPublicKey }) => createPublicKey(accountPrivateKey))).export({ format: 'jwk' });

const accountResponse = await signedPost(directory.newAccount, { termsOfServiceAgreed: true }, accountPrivateKey, jwk);
accountUrl = accountResponse.headers.get('location');
if (!accountUrl) throw new Error('ACME 未返回账户地址');

const orderResponse = await signedPost(directory.newOrder, { identifiers: [{ type: 'dns', value: domain }] }, accountPrivateKey, jwk);
const orderUrl = orderResponse.headers.get('location');
const order = await orderResponse.json();
if (!orderUrl || !order.authorizations?.[0] || !order.finalize) throw new Error('ACME 订单信息不完整');
const authorizationResponse = await signedPost(order.authorizations[0], undefined, accountPrivateKey, jwk);
const authorization = await authorizationResponse.json();
const challenge = authorization.challenges?.find((item) => item.type === 'http-01');
if (!challenge) throw new Error('未取得 HTTP-01 挑战');

if (authorization.status !== 'valid') {
  await publishChallenge(challenge.token, `${challenge.token}.${thumbprint(jwk)}`);
  await signedPost(challenge.url, {}, accountPrivateKey, jwk);
  await poll(order.authorizations[0], accountPrivateKey, jwk, ['valid']);
  removeRemoteChallenge(challenge.token);
}

let csrPath = csrPathOverride;
if (!csrPath) {
  await mkdir(dirname(privateKeyPath), { recursive: true, mode: 0o700 });
  try {
    await readFile(privateKeyPath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    execFileSync('openssl', ['genrsa', '-out', privateKeyPath, '2048'], { stdio: 'ignore' });
  }
  csrPath = `${privateKeyPath}.csr.der`;
  execFileSync('openssl', ['req', '-new', '-sha256', '-key', privateKeyPath, '-subj', `/CN=${domain}`, '-addext', `subjectAltName=DNS:${domain}`, '-outform', 'DER', '-out', csrPath], { stdio: 'ignore' });
}
const csr = (await readFile(csrPath)).toString('base64url');
const finalizeResponse = await signedPost(order.finalize, { csr }, accountPrivateKey, jwk);
await finalizeResponse.text();
const finalizedOrder = await poll(orderUrl, accountPrivateKey, jwk, ['valid']);
if (!finalizedOrder.certificate) throw new Error('ACME 订单未返回证书地址');
const certificateResponse = await signedPost(finalizedOrder.certificate, undefined, accountPrivateKey, jwk);
const certificate = await certificateResponse.text();
if (!certificate.includes('BEGIN CERTIFICATE')) throw new Error('证书内容无效');
await writeFile(certificatePath, certificate, { mode: 0o644 });
console.log(`ACME_CERTIFICATE_READY ${domain}`);
