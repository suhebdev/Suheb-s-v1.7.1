import * as pako from "pako";
import { V3BatchPayload, V3ParsedMessage } from "../types/v3Types";

/**
 * ============================================================================
 * V3 Batch Generator & Compression Service (Section 4.4, 4.5 & 4.6)
 * ============================================================================
 */

export class BatchGeneratorService {
  /**
   * Formats batch file name with 10-digit zero-padded index.
   * e.g., batchIndex = 1 -> batch_0000000001.json.gz
   */
  public static formatBatchFileName(batchIndex: number): string {
    const padded = String(batchIndex).padStart(10, "0");
    return `batch_${padded}.json.gz`;
  }

  /**
   * Formats oversized text external file name with 10-digit zero-padded index.
   * e.g., oversizedIndex = 1 -> oversized_0000000001.txt.gz
   */
  public static formatOversizedFileName(oversizedIndex: number): string {
    const padded = String(oversizedIndex).padStart(10, "0");
    return `oversized_${padded}.txt.gz`;
  }

  /**
   * Compresses a V3BatchPayload object into a .json.gz Uint8Array binary.
   */
  public static compressBatchPayload(payload: V3BatchPayload): Uint8Array {
    const jsonString = JSON.stringify(payload);
    const textEncoder = new TextEncoder();
    const encoded = textEncoder.encode(jsonString);
    return pako.gzip(encoded);
  }

  /**
   * Compresses raw string content (e.g. for oversized text messages) into a .txt.gz binary.
   */
  public static compressRawText(text: string): Uint8Array {
    const textEncoder = new TextEncoder();
    const encoded = textEncoder.encode(text);
    return pako.gzip(encoded);
  }

  /**
   * Decompresses a .json.gz binary into a parsed V3BatchPayload object.
   */
  public static decompressBatchPayload(compressedData: Uint8Array): V3BatchPayload {
    const decompressed = pako.ungzip(compressedData);
    const textDecoder = new TextDecoder("utf-8");
    const jsonString = textDecoder.decode(decompressed);
    return JSON.parse(jsonString) as V3BatchPayload;
  }

  /**
   * Decompresses a .txt.gz binary into a raw string.
   */
  public static decompressRawText(compressedData: Uint8Array): string {
    const decompressed = pako.ungzip(compressedData);
    const textDecoder = new TextDecoder("utf-8");
    return textDecoder.decode(decompressed);
  }

  /**
   * Converts a Uint8Array into a Base64 string for transport using chunked processing.
   */
  public static uint8ArrayToBase64(uint8Array: Uint8Array): string {
    const CHUNK_SIZE = 0x8000; // 32KB chunks
    let binary = "";
    const len = uint8Array.length;
    for (let i = 0; i < len; i += CHUNK_SIZE) {
      const chunk = uint8Array.subarray(i, Math.min(i + CHUNK_SIZE, len));
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return btoa(binary);
  }

  /**
   * Helper to estimate serialized size of messages in bytes.
   */
  public static estimateMessagesSerializedSize(messages: V3ParsedMessage[]): number {
    return JSON.stringify(messages).length;
  }
}
