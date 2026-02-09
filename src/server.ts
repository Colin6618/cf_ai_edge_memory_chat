import { routeAgentRequest } from "agents";

export { MyAgent } from "./agents/MyAgent";
export { ReminderWorkflow } from "./workflows/reminderWorkflow";

export default {
  async fetch(request, env, ctx): Promise<Response> {
    return (
      (await routeAgentRequest(request, env, ctx)) ??
      new Response("Not found", { status: 404 })
    );
  }
};
