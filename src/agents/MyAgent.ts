import { Agent } from "agents";
import type { Connection } from "agents";
import type { Env } from "../env";

type ConversationMessage = { role: "user" | "assistant"; text: string };
type MyAgentState = { conversation: ConversationMessage[] };

export class MyAgent extends Agent<Env, MyAgentState> {
  initialState: MyAgentState = { conversation: [] };

  private extractReplyText(response: any): string | null {
    if (typeof response?.response === "string" && response.response.trim()) {
      return response.response;
    }
    if (typeof response?.text === "string" && response.text.trim()) {
      return response.text;
    }
    if (typeof response?.output_text === "string" && response.output_text.trim()) {
      return response.output_text;
    }
    if (Array.isArray(response?.result?.response) && response.result.response.length > 0) {
      const first = response.result.response[0];
      if (typeof first === "string" && first.trim()) return first;
    }
    return null;
  }

  async onMessage(connection: Connection, messageEvent: unknown) {
    console.log("[MyAgent] onMessage triggered");
    const raw = messageEvent;
    let payload:
      | {
          message?: string;
          text?: string;
          content?: string;
          userId?: string;
        }
      | null = null;
    if (typeof raw === "string") {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = null;
      }
    } else {
      payload = raw;
    }

    const userId = payload?.userId ?? "guest";
    const message = payload?.message ?? payload?.text ?? payload?.content ?? "";
    console.log("[MyAgent] parsed payload", {
      payloadKeys: payload ? Object.keys(payload) : [],
      hasMessage: !!message,
      userId
    });
    if (!message) {
      return new Response(JSON.stringify({ error: "Missing message" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get chat history from Agent state
    const history = [...(this.state?.conversation ?? [])];
    history.push({ role: "user", text: message });
    this.setState({ ...this.state, conversation: history });

    let context = "";
    try {
      // Best-effort memory path: continue even if local Vectorize is unavailable.
      const embedding = await this.env.AI.run("@cf/baai/bge-small-en-v1.5", { text: message });
      const vector = embedding?.data?.[0];
      if (Array.isArray(vector) && vector.length > 0) {
        await this.env.MEMORY_INDEX.upsert([
          {
            id: `${this.id}-${Date.now()}`,
            values: vector,
            metadata: { text: message, user: userId }
          }
        ]);

        const query = await this.env.MEMORY_INDEX.query({
          vector,
          topK: 3
        });
        context = (query?.matches ?? [])
          .map((m: any) => m?.metadata?.text)
          .filter(Boolean)
          .join("\n");
      }
    } catch (error) {
      console.warn("Memory pipeline unavailable, continuing without Vectorize context:", error);
    }

    const prompt = `You are a helpful assistant.\n${
      context ? `Relevant memories:\n${context}\n` : ""
    }User: ${message}\nAssistant:`;

    let reply = "I can receive your message, but the model response is unavailable right now.";
    try {
      console.log("[MyAgent] generating AI response");
      const response = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        prompt,
        stream: false,
        max_tokens: 256
      });
      reply = this.extractReplyText(response) ?? reply;
    } catch (error) {
      console.error("AI generation failed:", error);
    }

    // Save assistant response
    history.push({ role: "assistant", text: reply });
    this.setState({ ...this.state, conversation: history });

    // Send streamed response to client
    console.log("[MyAgent] sending response to client");
    connection.send({ type: "message", text: reply });

    // Schedule background reminder task (best effort in local dev)
    try {
      await this.schedule(60, "sendReminder", { userId });
    } catch (error) {
      console.warn("Workflow scheduling failed in local mode:", error);
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  async sendReminder(_payload: { userId: string }) {
    console.log("[MyAgent] reminder task triggered");
  }

  onError(error: unknown) {
    console.error("[MyAgent] error:", error);
  }
}
