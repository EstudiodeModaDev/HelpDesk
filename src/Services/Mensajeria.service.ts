type EmailAddress = string;

export type MailInput = {
  to: EmailAddress | EmailAddress[];
  subject: string;
  html?: string;
  text?: string;
  saveToSentItems?: boolean;    // default: true
};

export type SendFromSharedInput = MailInput & {
  from: EmailAddress;           // bandeja compartida / otra cuenta
};

export type FlowToUser = {
  recipient: string;            
  message: string;
  title?: string;
};


export class MailAndTeamsFlowRestService {

    private flowUrl: string = "https://defaultcd48ecd97e154f4b97d9ec813ee42b.2c.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/a21d66d127ff43d7a940369623f0b27d/triggers/manual/paths/invoke?api-version=1";
    constructor(flowUrl: string,) {this.flowUrl = flowUrl; }

  /* =================== TEAMS VÍA FLOW (HTTP) =================== */

  /** NNotificaciones por flujo */
  async sendTeamsToUserViaFlow(input: FlowToUser): Promise<any> {
    return this.postToFlow({
      recipient: input.recipient,
      message: input.message,
      title: input.title ?? "",
    });
  }

  /* =================== Helpers =================== */

  private async postToFlow(payload: any): Promise<any> {

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const res = await fetch(this.flowUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Flow call failed: ${res.status} ${txt}`);
    }

    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json().catch(() => ({})) : {};
  }
}
