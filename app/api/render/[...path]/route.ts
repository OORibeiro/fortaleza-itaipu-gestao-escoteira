// Proxy restrito à API do projeto. O token continua sendo validado pelo backend.
const ORIGIN = "https://grupo-escoteiro.onrender.com";
const routes: Record<string, RegExp[]> = {
  GET: [/^finances$/, /^dues$/, /^branches$/],
  POST: [/^auth\/login$/, /^auth\/change-password$/, /^finances$/],
  PUT: [/^finances\/\d+$/, /^dues\/\d+\/pay$/],
  DELETE: [/^finances\/\d+$/],
};
async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const target = path.join("/");
  if (!routes[request.method]?.some((pattern) => pattern.test(target))) return Response.json({ error: "Rota não permitida." }, { status: 404 });
  const headers = new Headers({ Accept: "application/json" });
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("Authorization", authorization);
  if (request.method !== "GET") headers.set("Content-Type", "application/json");
  const url = new URL(target, ORIGIN + "/");
  const month = new URL(request.url).searchParams.get("month");
  if (month && target === "dues") url.searchParams.set("month", month);
  try {
    const upstream = await fetch(url, { method: request.method, headers, body: request.method === "GET" ? undefined : await request.text(), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60000) });
    const data = await upstream.json().catch(() => ({ error: upstream.status === 404 ? "Rota não publicada no Render. Publique as correções enviadas no ZIP separado do backend." : "Resposta inesperada do servidor." }));
    return Response.json(data, { status: upstream.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "O servidor não respondeu a tempo. Atualize os dados antes de repetir um lançamento ou pagamento." }, { status: 502 });
  }
}
export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE };
