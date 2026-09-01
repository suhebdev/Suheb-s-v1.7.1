# ToolsArchitectureV3

**Project:** WhatsApp Chat Viewer & Parser Tool  
**Architecture Version:** V3  
**Status:** Draft / Discussion Phase  
**Author:** Suheb Khan  
**Purpose:** Scalable, free-tier-friendly, local-first WhatsApp archive architecture

---

# Introduction

The WhatsApp Chat Viewer tool has evolved from a simple browser-based parser into a large-scale personal archive system capable of handling extremely large WhatsApp exports containing thousands of messages, media files, videos, voice notes, and documents.

The previous architecture successfully implemented features such as batch-based parsing, media mapping, rolling-window rendering, and Google Drive media synchronization. However, as real-world usage increased, several operational limitations became apparent. These limitations affected scalability, reliability, playback performance, and the long-term sustainability of offering the tool completely free for multiple users.

The goal of **ToolsArchitectureV3** is to redesign the storage and loading model so that:

- chat messages are **not stored in Firestore**,
- users keep ownership of their chat data through **Google Drive**,
- the application operates using a **local-first IndexedDB runtime cache**,
- infrastructure costs remain extremely low,
- and large chats can be opened repeatedly without exhausting Firebase or Firestore limits.

This document serves as the authoritative technical specification for the next-generation WhatsApp Chat Viewer architecture and will be expanded incrementally during detailed design discussions.

---

# 1. Problem Statement & Existing Limitations

The previous architecture was functional for small and medium-sized chats, but several unresolved limitations made it unsuitable for long-term free-tier scaling and heavy repeated usage.

## 1.1 Firestore Read Quota Exhaustion

In the previous system, parsed WhatsApp messages were divided into multiple Firestore batch documents because large message arrays exceeded Firestore document size limits.

Example:

```text
10,000 messages
   ↓
Split into multiple Firestore batch documents
   ↓
User opens the chat
   ↓
All required batches are read from Firestore
```

If the same user opened the chat repeatedly throughout the day, the same message batches were fetched again, causing Firestore reads to increase continuously.

This created a situation where a single large chat could consume a significant portion of the free Firestore read quota, eventually causing chats and media references to stop loading correctly.

---

## 1.2 Infrastructure Cost Scaling With Message Volume

The previous architecture scaled according to the **number of stored messages**, not according to the number of active users.

As more users imported large WhatsApp archives:

- more Firestore documents were created,
- more batch reads were required,
- more metadata synchronization occurred,
- and operational costs increased even when users were simply reopening previously imported chats.

This model was not sustainable for a tool intended to support many free users with potentially very large personal chat histories.

---

## 1.3 Video Playback & Buffering Instability

A major real-world problem appeared when users opened WhatsApp video attachments stored through the existing Google Drive integration.

Observed behavior:

- the video started playing successfully,
- approximately **3-5 seconds** of playback worked normally,
- the player then entered a **buffering/loading state**,
- mobile devices could remain stuck for **1-2 minutes**,
- desktop browsers often required **5-10 additional seconds** before continuing playback.

This indicated that the existing media loading strategy did not provide reliable progressive playback behavior for Drive-hosted video assets, especially on mobile networks and lower-performance devices.

---

## 1.4 Repeated Downloading of Previously Opened Chats

The previous architecture lacked a persistent local-first batch cache capable of reusing previously downloaded chat data across repeated chat openings.

As a result:

- the same chat batches could be downloaded repeatedly,
- message hydration work was performed again,
- media references had to be revalidated,
- and unnecessary network traffic was generated for data that had already been viewed earlier in the same browser environment.

This reduced the efficiency of repeated chat access and increased both bandwidth usage and loading time for returning users.

---

## 1.5 Summary of Identified Problems

| Problem | Impact |
|--------|--------|
| Firestore batch message storage | Rapid read quota exhaustion |
| Message-volume-based scaling | Unsustainable free-tier operation |
| Unstable video buffering | Poor mobile playback experience |
| Repeated batch downloads | Increased bandwidth and slower reopen performance |

These limitations establish the foundation for the **V3 architecture redesign**, whose primary objective is to move chat content storage away from Firestore and toward a **Google Drive + IndexedDB local-first storage model** while preserving a smooth WhatsApp-like user experience for extremely large chat archives.

---

## 2. Existing V2 Import & Validation Contract (Preserved As-Is)

The V3 architecture **must preserve the existing V2 ZIP import and validation behavior exactly as implemented**. This section defines the immutable import-validation rules that remain unchanged during the V3 migration.

---

### 2.1 Supported Upload Format

The import system accepts **only `.zip` files**.

#### Allowed

* `.zip`

#### Explicitly Disallowed

* `.txt`
* `.json`
* `.rar`
* `.7z`
* `.tar`
* `.gz`
* any other file extension

Direct `.txt` uploads are **not permitted** in the current V2 workflow and must remain disabled unless a future architecture revision explicitly changes this behavior.

---

### 2.2 WhatsApp ZIP Validation

After a ZIP file is selected, the system validates that it represents a valid exported WhatsApp chat archive.

A ZIP file is considered **valid only if all required conditions are satisfied**.

#### Required Conditions

1. The uploaded file must be a readable ZIP archive.
2. The archive must contain **at least one `.txt` file** representing the exported chat.
3. The detected `.txt` file must contain a **recognized WhatsApp chat structure**.

---

### 2.3 Missing TXT File

If the uploaded ZIP archive does **not contain any `.txt` file**, the archive is treated as **invalid**.

#### Example

```
Photos.zip
├── IMG-001.jpg
├── IMG-002.jpg
└── video.mp4
```

Result:

* ❌ Import rejected
* ❌ Chat is not created
* ❌ No parsing process starts

This prevents ordinary media ZIP archives from being incorrectly treated as WhatsApp exports.

---

### 2.4 Invalid Chat Structure

A ZIP archive may contain a `.txt` file but still be invalid if the text does not match the expected WhatsApp export format.

#### Example

```
chat.txt
----------------
Hello everyone
Meeting at 5 PM
This is a normal note file
----------------
```

Result:

* ❌ Import rejected
* ❌ Parsing aborted
* ❌ User receives an invalid WhatsApp export error

The validator must confirm that the text contains recognizable WhatsApp message patterns such as timestamps, sender names, and message entries before the import is allowed to continue.

---

### 2.5 Nested ZIP Handling

If a ZIP archive contains another `.zip` file inside it, the inner ZIP **must not be extracted**.

#### Example

```
WhatsApp Chat.zip
├── _chat.txt
├── IMG-001.jpg
└── ProjectFiles.zip
```

The file `ProjectFiles.zip` is treated as a **regular media attachment**, not as a secondary archive to process.

#### Required Behavior

* ✅ Preserve the inner ZIP file as an attachment
* ✅ Create a message bubble representing the ZIP document
* ❌ Do not recursively unzip it
* ❌ Do not scan its contents
* ❌ Do not attempt nested WhatsApp import detection

This behavior is mandatory for both **security** and **message fidelity**.

---

### 2.6 Security Benefits

Treating nested ZIP files as ordinary attachments provides important protection against archive-based attacks, including:

* recursive ZIP extraction attacks,
* ZIP bomb attacks,
* excessive decompression memory usage,
* unexpected nested archive traversal,
* malicious archive payload expansion.

The import system therefore performs **single-level archive extraction only**.

---

### 2.7 Preservation Requirement

The following V2 behaviors are considered **stable and preserved for V3**:

| Validation Rule                               | Preserve in V3 |
| --------------------------------------------- | -------------- |
| Only `.zip` uploads allowed                   | ✅              |
| Direct `.txt` upload blocked                  | ✅              |
| ZIP must contain a `.txt` file                | ✅              |
| `.txt` must match WhatsApp structure          | ✅              |
| Invalid ZIPs are rejected before parsing      | ✅              |
| Nested ZIP files treated as media attachments | ✅              |
| Recursive ZIP extraction disabled             | ✅              |

---

### 2.8 Architectural Decision

The V3 migration focuses on **storage, batching, caching, and playback improvements**. The existing V2 upload-entry and ZIP-validation behavior remains **unchanged** in order to preserve compatibility, reduce regression risk, and maintain the already-tested import security model.

### 2.9 Important Implementation Precedence Note

This section documents the **expected V2 import and validation behavior** for architectural reference purposes. However, it is **not the authoritative source of truth for implementation details**.

#### Precedence Rules

When working on V3 development, debugging, refactoring, or future architectural decisions, the following precedence order must be used:

```text
1. Actual source code and implemented validation logic
2. Current project files and runtime behavior
3. This architecture document
```

If any difference exists between this document and the actual implementation inside the codebase, **the codebase must always be preferred**.

Examples:

- allowed file extensions,
- ZIP scanning behavior,
- WhatsApp structure detection rules,
- nested ZIP handling,
- validation error conditions,
- import button enable/disable logic,
- parser edge-case handling.

This note is intentionally added because the V2 validation layer has already been implemented and tested in the existing codebase. The purpose of this section is to provide **architectural context**, not to override the real implementation.

**In short:**

> **For Point 2, always trust the actual project code and existing files over this document whenever a conflict or mismatch occurs.**

---

## 3. Drive Authorization & Storage Ownership Model

This section defines the **final V3 storage ownership model**, including which parts of the existing V2 system remain unchanged and which parts are redesigned for the new Google Drive + IndexedDB architecture.

The purpose of this section is **not to redesign the current OAuth or Drive connection flow**. The existing V2 authorization workflow is already considered stable and must be preserved.

---

### 3.1 V2 Authorization Flow (Preserved Without Changes)

The following V2 behaviors are **explicitly preserved in V3**:

* User uploads a valid WhatsApp ZIP archive.
* The system detects whether the user is already connected to Google Drive.
* If Drive is not connected, the existing **Google Drive backup/authorization module** is shown.
* The existing **OAuth consent flow, token exchange flow, and Drive API integration remain unchanged**.
* After successful Drive authorization, encrypted tokens are stored in Firestore.
* The **Import** button becomes enabled only when:

  * a valid ZIP has been uploaded,
  * the required chat name/input is available,
  * and Google Drive is successfully connected.

#### Important

V3 **does not modify**:

* Google OAuth UI,
* Drive permission gathering,
* token exchange logic,
* Drive connection detection,
* Import button activation logic,
* or any existing working V2 authorization behavior.

These components are considered **stable, tested, and production-safe**.

---

### 3.2 Firestore V3 Structure

The Firestore structure remains the **central security and metadata layer**, while message content storage is removed.

#### Root Structure

```text
/users/{userId}
├── user profile fields
├── /profile
├── /inquiries
├── /proposals
└── /tools_chats/{chatId}
```

The non-tools collections (`profile`, `inquiries`, `proposals`) remain untouched because they are unrelated to the WhatsApp Tool architecture.

---

### 3.3 User Document Fields

The `/users/{userId}` document continues to store sensitive and account-level information required for secure Drive access.

#### Preserved Fields

```text
userId
displayName
email
driveRootFolderId
driveTokens
```

These fields remain necessary for:

* user authentication,
* Drive ownership association,
* automatic Drive reconnection,
* encrypted token storage,
* and secure API access.

#### Security Responsibility

Firestore is retained primarily because it provides:

* authenticated user isolation,
* security-rule enforcement,
* encrypted credential storage,
* and protection against sensitive token leakage.

---

### 3.4 tools_chats Metadata Collection

The `/tools_chats/{chatId}` collection remains the **lightweight chat index** used by the frontend chat list and ownership system.

#### V3 Preserved Metadata

```text
id
name
fileName
myIdentity
otherIdentity
driveFolderId
createdAt
updatedAt
lastOpenedAt
isImported
storageVersion
totalMessageCount
```

These fields are required for:

* rendering the loaded chat list,
* identifying the user's own identity inside the chat,
* associating a chat with its Drive folder,
* sorting chats,
* displaying chat metadata without downloading batch files,
* and validating ownership relationships.

---

### 3.5 Removed Firestore Components

The following V2 structures are **completely removed in V3**:

#### Removed Collection

```text
/tools_chats/{chatId}/messages
```

#### Removed Message-Level Fields

```text
text
sender
sequenceIndex
driveFileId
isReply
reply metadata
message media references
full parsed message content
```

#### Architectural Reason

Messages are no longer stored in Firestore because this caused:

* excessive read operations,
* quota exhaustion,
* duplicated storage,
* unnecessary synchronization overhead,
* and poor free-tier scalability.

---

### 3.6 Message Count Canonical Field

V2 contained both:

```text
messageCount
totalMessageCount
```

In V3 this duplication is removed.

#### Final Decision

```text
KEEP:    totalMessageCount
REMOVE:  messageCount
```

`totalMessageCount` becomes the **single canonical message-count field** used for:

* chat viewer headers,
* chat metadata display,
* batch-count estimation,
* and lightweight UI rendering without loading actual message batches.

---

### 3.7 Google Drive Root Structure (V3)

The existing V2 root folder is preserved.

#### Preserved Root Folder

```text
📁 My Drive
└── 📁 WhatsAppToolMedia
```

The `WhatsAppToolMedia` folder continues to be referenced by:

```text
driveRootFolderId
```

stored inside the user document.

---

### 3.8 Chat Folder Naming (Preserved)

The existing V2 chat-folder naming strategy is preserved.

#### Final Naming Format

```text
{chatName}_{chatId}
```

#### Example

```text
Family_Group_1723530000000
College_Friends_1723531100000
Office_Project_1723532200000
```

This format already provides:

* human-readable folder names,
* unique separation through `chatId`,
* compatibility with existing V2 data,
* and no known collision issues.

No additional sanitization prefix or naming redesign is introduced in V3.

---

### 3.9 Final V3 Google Drive Structure

Each chat becomes a **self-contained archive container**.

```text
📁 My Drive
└── 📁 WhatsAppToolMedia
    │
    ├── 📁 Family_Group_1723530000000
    │   │
    │   ├── 🖼️ IMG-20240812-WA0001.jpg
    │   ├── 🎬 VID-20240812-WA0002.mp4
    │   ├── 🎵 PTT-20240812-WA0003.opus
    │   ├── 📄 Invoice_Aug.pdf
    │   │
    │   └── 📁 ChatText
    │       ├── 📄 WhatsApp Chat with Family.txt
    │       ├── 📦 batch_0000000001.json.gz
    │       ├── 📦 batch_0000000002.json.gz
    │       ├── 📦 batch_0000000003.json.gz
    │       └── 📦 ...
    │
    ├── 📁 College_Friends_1723531100000
    │   ├── 🖼️ IMG-20240813-WA0010.png
    │   ├── 🎬 VID-20240813-WA0011.mp4
    │   └── 📁 ChatText
    │       ├── 📄 WhatsApp Chat with College Friends.txt
    │       ├── 📦 batch_0000000001.json.gz
    │       └── 📦 ...
    │
    └── 📁 Office_Project_1723532200000
        ├── 📄 Project_Brief.pdf
        └── 📁 ChatText
            ├── 📄 WhatsApp Chat with Office Project.txt
            └── 📦 batch_0000000001.json.gz
```

---

### 3.10 ChatText Folder Rules

The `ChatText` folder becomes the **complete textual archive container** for a chat.

#### Rules

* The **original exported `.txt` filename is preserved exactly as uploaded by the user**.
* The application **must not rename the original export file**.
* All parsed batch files are stored inside the same `ChatText` folder.

#### Example

```text
ChatText/
├── WhatsApp Chat with Suheb.txt
├── batch_0000000001.json.gz
├── batch_0000000002.json.gz
└── ...
```

---

### 3.11 Batch File Naming Convention

The final batch naming convention is:

```text
batch_0000000001.json.gz
batch_0000000002.json.gz
batch_0000000003.json.gz
...
```

#### Why Zero-Padded Sequential Names?

This guarantees correct lexical ordering inside Google Drive:

```text
batch_0000000001
batch_0000000002
...
batch_0000000010
```

and avoids incorrect ordering such as:

```text
batch_1
batch_10
batch_2
```

The filename contains **only the sequential batch index**. Message ranges and additional metadata are intentionally excluded from the filename and will be handled inside the batch payload specification in later sections.

---

### 3.12 Storage Ownership Matrix

The final V3 ownership model is:

| Data                      | Storage Location | Owner          |
| ------------------------- | ---------------- | -------------- |
| User authentication       | Firebase Auth    | User           |
| Encrypted Drive tokens    | Firestore        | User           |
| Drive root folder ID      | Firestore        | User           |
| Chat list metadata        | Firestore        | User           |
| Original WhatsApp TXT     | Google Drive     | User           |
| Parsed `.json.gz` batches | Google Drive     | User           |
| Media files               | Google Drive     | User           |
| Runtime loaded batches    | IndexedDB        | User's browser |
| Runtime cached media      | IndexedDB        | User's browser |

---

### 3.13 Architectural Outcome

After the V3 redesign:

#### Firestore Responsibilities

* authentication,
* secure credential storage,
* Drive ownership association,
* lightweight chat indexing,
* and UI metadata delivery.

#### Google Drive Responsibilities

* original chat archive storage,
* parsed batch storage,
* media file storage,
* and long-term portable chat ownership.

#### IndexedDB Responsibilities

* runtime batch caching,
* media blob caching,
* windowed chat loading,
* and offline-friendly local performance.

This separation eliminates the previous Firestore message-storage bottleneck while preserving the existing V2 authorization flow and frontend chat-list behavior.

---

## 4. V3 Import, Parsing & Batch Generation Pipeline

This section defines the **final V3 streaming import architecture**, including ZIP extraction, WhatsApp TXT parsing, message normalization, batch generation, `.json.gz` creation, and incremental Google Drive uploads.

---

### 4.1 ZIP Extraction Pipeline

#### 4.1.1 Input Assumptions

ZIP validation rules are already finalized in **Section 2**. This pipeline starts **after the user clicks the Import button and the ZIP has already been validated successfully**.

Accepted ZIP contents:

* Exactly **one valid WhatsApp exported `.txt` file**
* Any number of media files (images, videos, audio, documents, stickers, etc.)
* Nested `.zip` files are treated as **normal media/document attachments**

---

#### 4.1.2 Extraction Rules

The ZIP is extracted **locally in the browser** using a client-side ZIP library.

**Important security rule:**

```text
Nested ZIP files MUST NOT be extracted recursively.
```

Example:

```text
WhatsApp Chat.zip
├── _chat.txt
├── IMG-001.jpg
├── VID-002.mp4
└── Backup.zip   ← treated as a normal attachment
```

This prevents:

* ZIP bomb attacks
* Recursive archive expansion
* Unbounded memory usage
* Malicious nested archive processing

---

#### 4.1.3 Metadata Scan Phase

Before full parsing begins, the TXT file is scanned using a **lightweight streaming reader**.

The scan extracts only the minimum metadata required for import initialization:

```text
totalMessageCount
firstMessageTimestamp
lastMessageTimestamp
probableParticipants
chatType (group/direct)
```

This scan **does not create message objects** and does not accumulate the entire chat in memory.

The result is used for:

* Progress estimation
* Batch estimation
* Final Firestore metadata creation after successful import
* UI progress indicators

---

### 4.2 WhatsApp Parsing Pipeline

#### 4.2.1 Streaming Parsing Model

The parser processes the TXT file **line by line**.

The entire chat must **never** be stored as a single in-memory message array.

Internal flow:

```text
Read line
   ↓
Detect new WhatsApp message boundary
   ↓
If boundary found → finalize previous message
   ↓
Normalize previous message
   ↓
Push into current batch buffer
   ↓
Start next message
```

---

#### 4.2.2 Message Boundary Detection

A new message starts only when the line matches a valid WhatsApp export pattern:

```text
27/04/26, 3:26 pm - Suheb Khan: Hello
```

Any line that does **not** match the boundary pattern is treated as a continuation of the previous message.

Example:

```text
27/04/26, 3:30 pm - Suheb Khan: Yeh ek
multi-line
message hai
```

Final parsed text:

```text
Yeh ek
multi-line
message hai
```

---

#### 4.2.3 Edited Message Detection

WhatsApp exported TXT files preserve edited messages using the marker:

```text
<This message was edited>
```

Parser rule:

```text
If message text ends with <This message was edited>
→ remove the marker from the visible text
→ set edited = true
```

Example input:

```text
Kya pata kya hoga <This message was edited>
```

Parsed result:

```json
{
  "text": "Kya pata kya hoga",
  "edited": true
}
```

This allows the UI to render WhatsApp-style metadata:

```text
Kya pata kya hoga
Edited · 3:28 PM
```

---

#### 4.2.4 View-Once Placeholder Handling

The existing **V2 implementation from the V16 tools codebase** already contains a stable heuristic for detecting blank placeholder messages that originate from opened view-once media.

**Important:**

```text
The existing V2 blank-message detection behavior MUST be preserved exactly as implemented.
```

V3 must **not** replace this logic with a new heuristic unless a future migration is explicitly approved.

Typical exported pattern:

```text
26/04/26, 11:49 pm - Unknown User:
```

These messages are represented internally as:

```json
{
  "type": "view_once_opened",
  "text": ""
}
```

---

#### 4.2.5 Unsupported WhatsApp Features

The TXT export does **not** provide reliable metadata for:

* Quoted reply relationships
* Reply target message IDs
* Original replied message content
* View-once media type after expiry
* Opened/unopened status for view-once media

Therefore V3 **must not attempt artificial reconstruction** of these features.

---

### 4.3 Parsed Message Object

#### 4.3.1 Unified Base Schema

All parsed messages use a **single common schema**. Optional extension objects are added only when required.

```json
{
  "id": "msg_1033_yjpcsnq_1777283760000",
  "sender": "me",
  "senderName": "Suheb Khan",
  "sequenceIndex": 1033,
  "text": "Kya hua tha mlm",
  "time": "3:26 PM",
  "timestamp": "2026-04-27T09:56:00.000Z",
  "type": "text",
  "edited": false
}
```

---

#### 4.3.2 Media Extension

```json
{
  "type": "image",
  "media": {
    "fileName": "IMG-20240812-WA0001.jpg",
    "driveFileId": "1A2b3C...9Z",
    "mimeType": "image/jpeg",
    "size": 245812
  }
}
```

---

#### 4.3.3 Large Inline Text Extension

```json
{
  "type": "text",
  "largeText": true
}
```

The full text remains inside the batch and is rendered using a collapsed **Read More** UI.

---

#### 4.3.4 Oversized External Text Extension

```json
{
  "type": "oversized_text",
  "oversizedText": {
    "preview": "const app = express(); ...",
    "lineCount": 28471,
    "byteSize": 734221,
    "externalFile": "OversizedMessages/oversized_0000000003.txt.gz"
  }
}
```

The actual large content is stored separately as a compressed `.txt.gz` file.

---

#### 4.3.5 View-Once Placeholder Object

```json
{
  "type": "view_once_opened",
  "text": ""
}
```

---

### 4.4 Batch Creation Rules

#### 4.4.1 Target Batch Size

V3 uses a **dual-threshold batching strategy**.

```text
Target messages per batch = 1500
Maximum uncompressed JSON size = 5 MB
```

A batch is finalized when **either** condition is reached.

---

#### 4.4.2 Large Text Thresholds

##### Normal Message

```text
size ≤ 100 KB
```

* Stored inline
* Rendered as a normal WhatsApp bubble

---

##### Expandable Message

```text
100 KB < size ≤ 300 KB
```

* Full text stored inline
* Rendered with collapsed preview + **Read More** expansion

---

##### Oversized Message

```text
size > 300 KB
```

* Full text removed from the batch
* Stored as `OversizedMessages/*.txt.gz`
* Batch contains only preview metadata and the external file reference

---

#### 4.4.3 Batch Finalization Algorithm

Internal processing loop:

```text
Parse next message
      ↓
Normalize message object
      ↓
Append to current batch buffer
      ↓
Recalculate serialized batch size
      ↓
If messageCount ≥ 1500
   OR serializedSize ≥ 5 MB
      ↓
Finalize current batch
      ↓
Start next batch
```

---

#### 4.4.4 Memory Release Requirement

After a batch has been successfully uploaded, the implementation **must immediately release all temporary memory associated with that batch**.

Required cleanup:

```text
- Clear batch message array
- Clear batch media reference map
- Revoke temporary Blob URLs
- Release oversized text buffers
- Reset batch size counters
```

This ensures that extremely large chats can be processed with approximately constant memory usage regardless of total message count.

---

#### 4.4.5 Sequence Index Continuity

`sequenceIndex` is globally incremental across the entire chat.

Example:

```text
Batch 1 → 1 to 1500
Batch 2 → 1501 to 3000
Batch 3 → 3001 to 4500
```

This guarantees:

* Stable scroll restoration
* Window-based loading
* Future jump-to-message support
* Deterministic batch boundaries

---

### 4.5 .json.gz File Generation

#### 4.5.1 Generation Timing

A batch file is generated **only after the current batch has been finalized and all media files referenced by that batch have been uploaded successfully**.

This guarantees that every media message already contains its final `driveFileId` before the batch is compressed and uploaded.

---

#### 4.5.2 Final Batch Structure

```json
{
  "version": 3,
  "chatId": "1723530000000",
  "batchIndex": 1,
  "messageCount": 1500,
  "startSequenceIndex": 1,
  "endSequenceIndex": 1500,
  "messages": [
    {
      "id": "msg_1_abc_1777283760000",
      "sender": "me",
      "senderName": "Suheb Khan",
      "sequenceIndex": 1,
      "text": "Hello bhai",
      "time": "3:26 PM",
      "timestamp": "2026-04-27T09:56:00.000Z",
      "type": "text",
      "edited": false
    }
  ]
}
```

---

#### 4.5.3 File Naming Convention

Batch files use deterministic zero-padded numbering.

```text
batch_0000000001.json.gz
batch_0000000002.json.gz
batch_0000000003.json.gz
```

Rules:

- 10-digit zero-padded index
- Sequential numbering starting from `1`
- No gaps are allowed between batch indices
- The numbering order represents the original chat order

---

#### 4.5.4 Compression Rules

Generation flow:

```text
JavaScript Object
      ↓
JSON.stringify()
      ↓
UTF-8 encoding
      ↓
GZIP compression
      ↓
.json.gz file blob
```

The **5 MB limit applies to the uncompressed JSON string**, not the compressed `.gz` output.

---

#### 4.5.5 Oversized Text File Generation

When a message exceeds the oversized threshold:

```text
text size > 300 KB
```

The full content is written to a separate compressed file.

Example:

```text
ChatText/
└── OversizedMessages/
    ├── oversized_0000000123.txt.gz
    └── oversized_0000000456.txt.gz
```

The batch contains only the metadata reference.

---

### 4.6 Google Drive Upload Sequence

#### 4.6.1 Streaming Upload Model

V3 uses an **incremental upload pipeline**. The entire chat is **never uploaded at once**.

Processing order:

```text
Finalize batch
      ↓
Upload media for this batch
      ↓
Inject driveFileIds
      ↓
Generate .json.gz
      ↓
Upload batch file
      ↓
Release memory
      ↓
Continue next batch
```

---

#### 4.6.2 Drive Folder Structure

```text
My Drive/
└── WhatsAppToolMedia/
    └── {chatName}_{chatId}/
        ├── ChatText/
        │   ├── WhatsApp Chat.txt
        │   ├── batch_0000000001.json.gz
        │   ├── batch_0000000002.json.gz
        │   └── OversizedMessages/
        │       └── oversized_0000000123.txt.gz
        ├── IMG-20240812-WA0001.jpg
        ├── VID-20240812-WA0002.mp4
        ├── PTT-20240812-WA0003.opus
        └── ProjectFiles.zip
```

---

#### 4.6.3 Upload Order

- **Step 1:** Create Chat Root Folder `WhatsAppToolMedia/{chatName}_{chatId}/` and store returned folder ID as `driveFolderId`.
- **Step 2:** Create Subfolders `ChatText/` and `ChatText/OversizedMessages/`.
- **Step 3:** Upload Original TXT `ChatText/WhatsApp Chat.txt`.
- **Step 4:** Upload Batch Media for current finalized batch.
- **Step 5:** Inject Drive File IDs into batch messages.
- **Step 6:** Upload Batch File `ChatText/batch_0000000001.json.gz`.

---

#### 4.6.4 Firestore Interaction Rule

During the upload sequence, **no permanent chat metadata document is created yet**. The import operates using an in-memory session until all batches and media files have uploaded successfully.

---

### 4.7 Import Progress State Machine

#### States:
- `INITIALIZING`
- `EXTRACTING`
- `SCANNING_METADATA`
- `CREATING_DRIVE_STRUCTURE`
- `UPLOADING_SOURCE_TXT`
- `PARSING_BATCHES`
- `UPLOADING_BATCH_MEDIA`
- `UPLOADING_BATCH_FILE`
- `FINALIZING`
- `COMPLETED`
- `FAILED`

---

### 4.8 Failure Recovery & Consistency Rules

- **Atomic Import Principle:** All-or-nothing import model.
- **Permanent Commit Point:** Completion of `FINALIZING` state when Firestore metadata is created.
- **Rollback Sequence:** Delete uploaded batch files → delete oversized text files → delete media files → delete subfolders → delete chat root folder.

---

## 5. V3 Chat Opening & Initial Viewer Rendering Architecture

### 5.1 Purpose

When a user selects a chat, message data is loaded from Google Drive `.json.gz` batches → IndexedDB → viewer. Firestore is only used for lightweight chat metadata.

### 5.2 Opening Flow
1. Retrieve minimal chat metadata from Firestore (`driveFolderId`, `totalMessageCount`).
2. Download `batch_0000000001.json.gz` from Google Drive.
3. Decompress, parse JSON, store in IndexedDB.
4. Prepare message bubbles (~1500 messages available).
5. Evaluate media inside first 60 messages:
   - **Normal (<50% media):** Download prioritized media.
   - **Heavy (>50% media):** Prioritize ~30% media/metadata, immediately enter chat, fetch remaining in background.
6. Remove loading screen.

---

## 6. V3 Dynamic Batch Window, Preloading & Scroll Management

### 6.1 Working Window: `Previous - [Current] - Next`
The viewer maintains:
1. **Current Batch** (Highest priority)
2. **Directional Next Batch** (Second priority, follows user movement)
3. **Previous Batch** (Third priority, protects reverse navigation)

### 6.2 Direction Hysteresis
Direction does not flip on small reverse scrolls. A threshold of ~200–300 messages of sustained movement is required before reversing directional preload priorities.

### 6.3 Storage Budget
Targets a maximum of **80% of available IndexedDB storage quota**, reserving ~20% safety headroom for runtime operations.

### 6.4 Eviction Order Under Pressure:
1. Low-priority / optional media
2. Optional distant batches
3. Preserved: `Current`, `Directional Next`, `Previous`

---

## 7. Media & File Handling, Caching & Viewing

### 7.1 Separation of Message Metadata and Media Binary
Message bubbles are constructed directly from `.json.gz` metadata (dimensions, aspect ratio, duration, thumbnail, file name, size) without requiring media binary to be present immediately.

### 7.2 Hybrid Media Handling
- **Lightweight/Manageable Media:** Preloaded, stored in IndexedDB cache as storage permits, rendered as Blob/Object URLs.
- **Very Large Media (>500MB, GBs):** Thumbnail and metadata displayed in chat bubble; binary fetched on demand without blowing up IndexedDB cache.
- **Documents/Files:** Lightweight file bubbles; opened via Drive/browser handlers.

---

## 8. V3 Chat Session Lifecycle, Cache Retention & Reopening

### 8.1 Retention
- **Closing Chat:** Working cache in IndexedDB is **retained**.
- **Reopening Same Chat:** Instantly restores cached batches, media, and approximate scroll position.

### 8.2 Eviction Events
- Opening a different chat (`Chat A` evicted when `Chat B` opened).
- Full page refresh / hard refresh.
- Browser tab or session close.

---

## 9. V3 Final Preservation, Deletion & Import Consistency Rules

1. Deleting a chat deletes Firestore document, Google Drive folder & files, and IndexedDB cache.
2. An unrecoverable import failure triggers full rollback; no orphaned Firestore card or broken folder remains visible.
3. Single malformed message or missing media file does not fail the entire chat import.
4. Existing working V2 behaviors (bubble styles, sender styling, timestamps, reactions, search, view-once indicators) remain preserved.

---
**End of Architecture Specification**
