export type FlowInvokeOptions = {
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
};

export class FlowClient {
    private readonly flowUrl: string = "";   

    constructor(flowUrl: string ) {
        if (!flowUrl || !/^https?:\/\//i.test(flowUrl)) {
        throw new Error("FlowClient: URL inválida");
        }
    }

    async invoke<TIn extends object, TOut = unknown>(
        payload: TIn,
        opts: FlowInvokeOptions = {}
    ): Promise<TOut> {
        const {headers = {}, timeoutMs = 30_000, retries = 0,} = opts;

        const mergedHeaders: Record<string, string> = {"Content-Type": "application/json", ...headers};

        const tryOnce = async (): Promise<TOut> => {
        const ac = new AbortController();
        const id = setTimeout(() => ac.abort(), timeoutMs);

        try {
            const res = await fetch(this.flowUrl, {
                method: "POST",
                headers: mergedHeaders,
                body: JSON.stringify(payload),
                signal: ac.signal,
            });
            
            const contentType = res.headers.get("content-type") || "";
            const isJson = contentType.includes("application/json");
            const raw = await res.text().catch(() => "");

            if (!res.ok) {
            // Intenta extraer mensaje del cuerpo
            let msg = raw;
            if (isJson) {
                try {
                const obj = JSON.parse(raw);
                msg = obj?.error || obj?.message || JSON.stringify(obj);
                } catch {}
            }
            throw new Error(`Flow ${res.status}: ${msg || "Error invocando el flujo"}`);
            }

            // Parseo de respuesta (si es JSON)
            return (isJson ? JSON.parse(raw) : ({} as any)) as TOut;
        } finally {
            clearTimeout(id);
        }
        };

        // Reintentos simples para fallos transitorios
        let attempt = 0;
        // backoff lineal simple (puedes cambiar a exponencial si quieres)
        while (true) {
        try {
            return await tryOnce();
        } catch (err: any) {
            const transient = isTransient(err);
            if (attempt >= retries || !transient) throw err;
            attempt++;
            await delay(250 * attempt);
        }
        }
    }
    }

    /** Heurística simple para decidir si reintentamos */
    function isTransient(err: any): boolean {
    const msg = String(err?.message || err);
    // Abort/timeout/red o 5xx
    return /abort/ig.test(msg) || /timed out/ig.test(msg) || /network/ig.test(msg) || /Flow 5\d{2}/.test(msg);
    }
    function delay(ms: number) { return new Promise(res => setTimeout(res, ms)); }
