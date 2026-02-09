import { AgentWorkflow } from "agents/workflows";

export class ReminderWorkflow extends AgentWorkflow {
  async run() {
    console.log("ReminderWorkflow triggered!");
  }
}
