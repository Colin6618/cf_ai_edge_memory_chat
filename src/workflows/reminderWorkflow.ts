import { AgentWorkflow } from "agents/workflows";

export class ReminderWorkflow extends AgentWorkflow {
  async run() {
    console.log("ReminderWorkflow triggered!");
    // You could send a push notification or summary email here
  }
}
