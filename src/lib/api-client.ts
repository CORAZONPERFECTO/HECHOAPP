import { auth } from "@/lib/firebase";

/**
 * fetch que adjunta el ID token de Firebase del usuario actual.
 * Si no hay sesión (ej. propietario en el portal público) envía la petición sin token.
 */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    const user = auth.currentUser;
    if (user && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
    }
    return fetch(input, { ...init, headers });
}
