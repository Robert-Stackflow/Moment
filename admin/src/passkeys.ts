import { api, json } from "./api";

export interface PasskeyConfig {
  enabled: boolean;
  origin: string;
  rp_id: string;
  revision: number;
}
export interface Passkey {
  id: number;
  name: string;
  rp_id: string;
  revision: number;
  created_at: string;
  last_used_at: string | null;
}
type Descriptor = Omit<PublicKeyCredentialDescriptor, "id"> & { id: string };
type CreateOptions = Omit<
  PublicKeyCredentialCreationOptions,
  "challenge" | "user" | "excludeCredentials"
> & {
  challenge: string;
  user: Omit<PublicKeyCredentialUserEntity, "id"> & { id: string };
  excludeCredentials?: Descriptor[];
};
type GetOptions = Omit<
  PublicKeyCredentialRequestOptions,
  "challenge" | "allowCredentials"
> & {
  challenge: string;
  allowCredentials?: Descriptor[];
};
export function canUsePasskeys() {
  return (
    window.isSecureContext &&
    typeof PublicKeyCredential !== "undefined" &&
    !!navigator.credentials
  );
}
function decode(value: string): ArrayBuffer {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)).buffer;
}
function encode(value: ArrayBuffer) {
  return btoa(
    Array.from(new Uint8Array(value), (n) => String.fromCharCode(n)).join(""),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function serialize(credential: PublicKeyCredential) {
  const response = credential.response;
  const common = {
    id: credential.id,
    rawId: encode(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    clientExtensionResults: credential.getClientExtensionResults(),
  };
  if (response instanceof AuthenticatorAttestationResponse)
    return {
      ...common,
      response: {
        clientDataJSON: encode(response.clientDataJSON),
        attestationObject: encode(response.attestationObject),
        transports: response.getTransports?.() || [],
      },
    };
  const assertion = response as AuthenticatorAssertionResponse;
  return {
    ...common,
    response: {
      clientDataJSON: encode(assertion.clientDataJSON),
      authenticatorData: encode(assertion.authenticatorData),
      signature: encode(assertion.signature),
      userHandle: assertion.userHandle ? encode(assertion.userHandle) : null,
    },
  };
}
export function passkeyError(cause: unknown) {
  if (cause instanceof TypeError) return "连接中断，请检查网络后重试。";
  if (cause instanceof DOMException) {
    if (cause.name === "NotAllowedError" || cause.name === "AbortError")
      return "验证已取消或未完成，可以重试，或使用密码登录。";
    if (cause.name === "InvalidStateError")
      return "此设备已保存这个账户的通行密钥，请直接使用它登录。";
    if (cause.name === "SecurityError")
      return "当前网址无法使用通行密钥，请检查登录域名与 HTTPS 配置。";
    if (cause.name === "NotSupportedError")
      return "此设备暂不支持所需的通行密钥验证，请使用另一台设备或密码登录。";
  }
  return cause instanceof Error ? cause.message : "通行密钥验证未完成，请重试";
}
export async function registerPasskey(
  name: string,
  signal: AbortSignal,
  onVerified: () => void,
) {
  const result = await api<{ publicKey: CreateOptions }>("/me/passkeys/begin", {
    ...json("POST", { name }),
    signal,
  });
  const options = result.data.publicKey;
  const credential = (await navigator.credentials.create({
    publicKey: {
      ...options,
      challenge: decode(options.challenge),
      user: { ...options.user, id: decode(options.user.id) },
      excludeCredentials: options.excludeCredentials?.map((item) => ({
        ...item,
        id: decode(item.id),
      })),
    },
    signal,
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("设备未返回通行密钥，请重试");
  signal.throwIfAborted();
  onVerified();
  await api("/me/passkeys/finish", {
    ...json("POST", serialize(credential)),
  });
}
export async function authenticatePasskey(
  signal: AbortSignal,
  onVerified: () => void,
) {
  const result = await api<{ publicKey: GetOptions }>("/passkeys/login/begin", {
    ...json("POST", {}),
    signal,
  });
  const options = result.data.publicKey;
  const credential = (await navigator.credentials.get({
    publicKey: {
      ...options,
      challenge: decode(options.challenge),
      allowCredentials: options.allowCredentials?.map((item) => ({
        ...item,
        id: decode(item.id),
      })),
    },
    signal,
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("未选择通行密钥，可以使用密码登录");
  signal.throwIfAborted();
  onVerified();
  await api("/passkeys/login/finish", {
    ...json("POST", serialize(credential)),
    preserveEditorOnUnauthorized: true,
  });
}
