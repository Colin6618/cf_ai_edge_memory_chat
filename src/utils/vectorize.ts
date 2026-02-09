export async function addToVectorize(env: any, id: string, text: string) {
  const emb = await env.AI.run("@cf/baai/bge-small-en-v1.5", { text });
  await env.MEMORY_INDEX.upsert([{ id, values: emb.data[0], metadata: { text } }]);
}
