// Capa de proveedores LLM. Groq y Gemini exponen una API compatible con OpenAI
// (chat/completions con tools), así que un solo cliente sirve para ambos.
// Para agregar otro proveedor compatible (OpenRouter, Together, Ollama...) basta
// con sumar una entrada a PROVEEDORES.

export type MensajeLLM =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: LlamadaHerramienta[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type LlamadaHerramienta = { id: string; type: "function"; function: { name: string; arguments: string } };

export type Proveedor = { id: string; url: string; clave: string | undefined; modelo: string };

export const PROVEEDORES: Record<string, () => Proveedor> = {
  groq: () => ({
    id: "groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    clave: process.env.GROQ_API_KEY,
    modelo: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  }),
  gemini: () => ({
    id: "gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    clave: process.env.GEMINI_API_KEY,
    modelo: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  }),
};

/** Proveedores configurados, en el orden de LLM_PROVEEDORES (los que no tienen clave se saltan). */
export function proveedoresActivos(): Proveedor[] {
  const orden = (process.env.LLM_PROVEEDORES || "groq,gemini,local").split(",").map((s) => s.trim());
  return orden.filter((id) => PROVEEDORES[id]).map((id) => PROVEEDORES[id]()).filter((p) => p.clave);
}

export async function completar(
  p: Proveedor,
  mensajes: MensajeLLM[],
  herramientas: unknown[],
  opciones: { timeoutMs?: number } = {},
): Promise<{ content: string | null; tool_calls?: LlamadaHerramienta[] }> {
  const res = await fetch(p.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.clave}` },
    body: JSON.stringify({
      model: p.modelo,
      messages: mensajes,
      tools: herramientas,
      tool_choice: "auto",
      temperature: 0.3,
      max_tokens: 400,
    }),
    signal: AbortSignal.timeout(opciones.timeoutMs ?? 9000),
  });
  if (!res.ok) throw new Error(`${p.id} respondió ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const m = data.choices?.[0]?.message;
  if (!m) throw new Error(`${p.id}: respuesta sin mensaje`);
  return { content: m.content ?? null, tool_calls: m.tool_calls?.length ? m.tool_calls : undefined };
}
