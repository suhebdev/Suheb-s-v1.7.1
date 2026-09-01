/**
 * ============================================================================
 * Identity Resolution Service (SAD Section 11 & Section 15)
 * ============================================================================
 * Responsibility: Pure, language-independent logic to determine the local user's
 * identity ("me") and the remote participant's identity ("other") using structural
 * conversation data and archive filename matching.
 */

import { RawParsedMessage } from "../types";

export interface IdentityParticipant {
  name: string;
  messageCount: number;
}

export interface IdentityResolutionResult {
  resolvedMessages: RawParsedMessage[];
  myIdentity: string | null;
  otherIdentity: string | null;
  participants: IdentityParticipant[];
  requiresIdentitySelection: boolean;
}

export interface IIdentityService {
  /**
   * Resolves the "me" and "other" identities from raw parsed messages
   * and optionally the source export filename.
   */
  resolveIdentities(
    messages: RawParsedMessage[],
    fileName?: string,
    altFileName?: string
  ): Promise<IdentityResolutionResult>;

  /**
   * Applies the user's manual identity selection to the parsed messages.
   */
  applyResolvedIdentity(
    messages: RawParsedMessage[],
    myIdentity: string,
    otherIdentity: string
  ): RawParsedMessage[];
}

export class IdentityService implements IIdentityService {
  public async resolveIdentities(
    messages: RawParsedMessage[],
    fileName?: string,
    altFileName?: string
  ): Promise<IdentityResolutionResult> {
    console.log(`[IdentityService] Commencing identity resolution on ${messages.length} messages`);

    // 1. Extract unique senders (excluding "system")
    const senderCounts: Record<string, number> = {};
    for (const msg of messages) {
      if (msg.senderName && msg.senderName !== "system") {
        senderCounts[msg.senderName] = (senderCounts[msg.senderName] || 0) + 1;
      }
    }

    const uniqueSenders = Object.keys(senderCounts);
    console.log(`[IdentityService] Discovered unique participants:`, uniqueSenders);

    const participantsList: IdentityParticipant[] = uniqueSenders.map((name) => ({
      name,
      messageCount: senderCounts[name] || 0,
    }));

    // If there are no active speakers, fallback to system messages only
    if (uniqueSenders.length === 0) {
      return {
        resolvedMessages: messages.map((m) => ({ ...m, sender: "system" })),
        myIdentity: null,
        otherIdentity: null,
        participants: [],
        requiresIdentitySelection: false,
      };
    }

    // Single active speaker (e.g. self-notes)
    if (uniqueSenders.length === 1) {
      const myIdentity = uniqueSenders[0];
      const otherIdentity = uniqueSenders[0];
      const resolvedMessages = this.applyResolvedIdentity(messages, myIdentity, otherIdentity);
      return {
        resolvedMessages,
        myIdentity,
        otherIdentity,
        participants: participantsList,
        requiresIdentitySelection: false,
      };
    }

    // AUTO RESOLUTION (WhatsApp-generated filename matching)
    // If we have exactly 2 active speakers and a filename is provided
    if (uniqueSenders.length === 2 && (fileName || altFileName)) {
      const fileNamesToCheck = [fileName, altFileName].filter(Boolean) as string[];
      const senderA = uniqueSenders[0];
      const senderB = uniqueSenders[1];

      for (const fName of fileNamesToCheck) {
        const normalizedFilename = this.normalizeForComparison(fName);
        const hasA = normalizedFilename.includes(this.normalizeForComparison(senderA));
        const hasB = normalizedFilename.includes(this.normalizeForComparison(senderB));

        if (hasA && !hasB) {
          // Participant A is mentioned in the filename, they are otherIdentity
          console.log(`[IdentityService] Auto-resolved otherIdentity as "${senderA}" from filename "${fName}"`);
          const myIdentity = senderB;
          const otherIdentity = senderA;
          const resolvedMessages = this.applyResolvedIdentity(messages, myIdentity, otherIdentity);
          return {
            resolvedMessages,
            myIdentity,
            otherIdentity,
            participants: participantsList,
            requiresIdentitySelection: false,
          };
        }

        if (hasB && !hasA) {
          // Participant B is mentioned in the filename, they are otherIdentity
          console.log(`[IdentityService] Auto-resolved otherIdentity as "${senderB}" from filename "${fName}"`);
          const myIdentity = senderA;
          const otherIdentity = senderB;
          const resolvedMessages = this.applyResolvedIdentity(messages, myIdentity, otherIdentity);
          return {
            resolvedMessages,
            myIdentity,
            otherIdentity,
            participants: participantsList,
            requiresIdentitySelection: false,
          };
        }
      }
    }

    // FALLBACK: If filename doesn't match or is generic, or we have 3+ participants (Group Chat), prompt selection
    console.log(`[IdentityService] Identity cannot be auto-resolved. Manual selection required.`);
    
    // Ensure all messages have sender marked appropriately (system stays system, others keep default)
    const resolvedMessages = messages.map((msg) => {
      if (msg.senderName === "system" || msg.sender === "system") {
        return { ...msg, sender: "system" as const };
      }
      return msg;
    });

    return {
      resolvedMessages,
      myIdentity: null,
      otherIdentity: null,
      participants: participantsList,
      requiresIdentitySelection: true,
    };
  }

  public applyResolvedIdentity(
    messages: RawParsedMessage[],
    myIdentity: string,
    otherIdentity: string
  ): RawParsedMessage[] {
    return messages.map((msg) => {
      let sender: "me" | "other" | "system" = "system";

      if (msg.senderName === "system" || msg.sender === "system") {
        sender = "system";
      } else if (msg.senderName === myIdentity) {
        sender = "me";
      } else if (msg.senderName === otherIdentity) {
        sender = "other";
      } else {
        // Any other speakers default to "other"
        sender = "other";
      }

      return {
        ...msg,
        sender,
      };
    });
  }

  private normalizeForComparison(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ""); // strip everything except alphanumeric for cross-language robustness
  }
}

export const identityServiceInstance = new IdentityService();
export default identityServiceInstance;
