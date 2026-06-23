// WebAuthn 平台生物识别封装（Face ID / 指纹 / Windows Hello）
// 用于本地 PWA 的应用锁快捷解锁。无后端，仅作为门禁机制：
// challenge / userId 用随机值即可，不涉及服务端校验。

// ---- base64 工具 ----
export function b64encode(buf: ArrayBuffer | Uint8Array): string {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function b64decode(str: string): Uint8Array<ArrayBuffer> {
    const binary = atob(str);
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function randomBytes(len: number): Uint8Array<ArrayBuffer> {
    const arr = new Uint8Array(new ArrayBuffer(len));
    crypto.getRandomValues(arr);
    return arr;
}

// 设备是否支持平台生物识别认证器 + 当前是否 secure context（HTTPS/localhost）
export async function isBiometricSupported(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.isSecureContext) return false;
    const PublicKeyCtor = (window as unknown as { PublicKeyCredential?: typeof PublicKeyCredential }).PublicKeyCredential;
    if (!PublicKeyCtor || typeof PublicKeyCtor.isUserVerifyingPlatformAuthenticatorAvailable !== 'function') {
        return false;
    }
    try {
        return await PublicKeyCtor.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
        return false;
    }
}

// 注册平台生物识别凭据，返回 base64 credentialId；取消/失败抛错
export async function registerBiometric(): Promise<string> {
    const publicKey: PublicKeyCredentialCreationOptions = {
        rp: { name: '简记账' },
        user: {
            id: randomBytes(16),
            name: 'owner',
            displayName: '简记账 用户',
        },
        challenge: randomBytes(32),
        pubKeyCredParams: [
            { type: 'public-key', alg: -7 },   // ES256
            { type: 'public-key', alg: -256 }, // RS256
        ],
        timeout: 60000,
        authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
            requireResidentKey: false,
        },
        attestation: 'none',
    };

    const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential | null;
    if (!credential) throw new Error('注册失败');
    return b64encode(credential.rawId);
}

// 用已注册凭据进行生物识别认证，成功返回 true
export async function authenticateBiometric(credentialIdB64: string): Promise<boolean> {
    const publicKey: PublicKeyCredentialRequestOptions = {
        challenge: randomBytes(32),
        allowCredentials: [{
            type: 'public-key',
            id: b64decode(credentialIdB64),
            transports: ['internal'],
        }],
        userVerification: 'required',
        timeout: 60000,
    };

    const credential = await navigator.credentials.get({ publicKey }) as PublicKeyCredential | null;
    return !!credential;
}
