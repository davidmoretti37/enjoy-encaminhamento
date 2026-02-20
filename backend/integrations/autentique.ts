// @ts-nocheck
// Autentique Digital Signature API Integration
// Docs: https://docs.autentique.com.br/api
// GraphQL API with multipart file uploads

import { ENV } from "../_core/env";

// ============================================
// TYPES
// ============================================

export interface AutentiqueSigner {
  email: string;
  name: string;
  action: "SIGN" | "SIGN_AS_A_WITNESS" | "APPROVE" | "RECOGNIZE";
}

export interface CreateDocumentOptions {
  message?: string;
  reminder?: "DAILY" | "WEEKLY";
  sortable?: boolean;
  refusable?: boolean;
  deadlineAt?: string;
}

export interface AutentiqueSignerResult {
  public_id: string;
  name: string;
  email: string;
  signUrl: string;
  action: string;
}

export interface CreateDocumentResult {
  documentId: string;
  name: string;
  signers: AutentiqueSignerResult[];
}

export interface AutentiqueDocumentStatus {
  id: string;
  name: string;
  created_at: string;
  files: {
    original: string | null;
    signed: string | null;
  };
  signers: Array<{
    public_id: string;
    name: string;
    email: string;
    signUrl: string;
    signed: { created_at: string } | null;
    viewed: { created_at: string } | null;
    rejected: { created_at: string; reason: string } | null;
  }>;
}

// ============================================
// API CLIENT
// ============================================

const AUTENTIQUE_API_URL = "https://api.autentique.com.br/v2/graphql";

function getApiKey(): string {
  const key = ENV.autentique.apiKey;
  if (!key) {
    throw new Error("Autentique API key not configured. Set AUTENTIQUE_API_KEY environment variable.");
  }
  return key;
}

/**
 * Execute a GraphQL query/mutation against the Autentique API
 */
async function graphqlRequest(query: string, variables?: Record<string, any>): Promise<any> {
  const response = await fetch(AUTENTIQUE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[Autentique] API error:", response.status, text);
    throw new Error(`Autentique API error: ${response.status} - ${text}`);
  }

  const result = await response.json();

  if (result.errors && result.errors.length > 0) {
    console.error("[Autentique] GraphQL errors:", JSON.stringify(result.errors));
    throw new Error(`Autentique GraphQL error: ${result.errors[0].message}`);
  }

  return result.data;
}

/**
 * Create a document on Autentique with file upload
 * Uses GraphQL multipart request spec for file uploads
 */
export async function createDocument(
  name: string,
  pdfBuffer: Buffer,
  signers: AutentiqueSigner[],
  options: CreateDocumentOptions = {}
): Promise<CreateDocumentResult> {
  const apiKey = getApiKey();
  const sandbox = ENV.autentique.sandbox;

  const query = `
    mutation CreateDocumentMutation(
      $document: DocumentInput!
      $signers: [SignerInput!]!
      $file: Upload!
    ) {
      createDocument(
        sandbox: ${sandbox}
        document: $document
        signers: $signers
        file: $file
      ) {
        id
        name
        signatures {
          public_id
          name
          email
          action { name }
          link { short_link }
        }
      }
    }
  `;

  const variables = {
    document: {
      name,
      ...(options.message && { message: options.message }),
      ...(options.reminder && { reminder: options.reminder }),
      ...(options.sortable !== undefined && { sortable: options.sortable }),
      ...(options.refusable !== undefined && { refusable: options.refusable }),
      ...(options.deadlineAt && { deadline_at: options.deadlineAt }),
    },
    signers: signers.map((s) => ({
      email: s.email,
      action: s.action,
      name: s.name,
    })),
    file: null,
  };

  const operations = JSON.stringify({ query, variables });
  const map = JSON.stringify({ "0": ["variables.file"] });

  // Build multipart form data
  const formData = new FormData();
  formData.append("operations", operations);
  formData.append("map", map);
  formData.append("0", new Blob([pdfBuffer], { type: "application/pdf" }), `${name}.pdf`);

  console.log(`[Autentique] Creating document "${name}" with ${signers.length} signer(s)${sandbox ? " (SANDBOX)" : ""}`);

  const response = await fetch(AUTENTIQUE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[Autentique] Create document error:", response.status, text);
    throw new Error(`Autentique create document failed: ${response.status} - ${text}`);
  }

  const result = await response.json();

  if (result.errors && result.errors.length > 0) {
    console.error("[Autentique] Create document GraphQL errors:", JSON.stringify(result.errors));
    throw new Error(`Autentique create document error: ${result.errors[0].message}`);
  }

  const doc = result.data.createDocument;

  console.log(`[Autentique] Document created: ${doc.id}`);

  return {
    documentId: doc.id,
    name: doc.name,
    signers: (doc.signatures || []).map((sig: any) => ({
      public_id: sig.public_id,
      name: sig.name,
      email: sig.email,
      signUrl: sig.link?.short_link || "",
      action: sig.action?.name || "SIGN",
    })),
  };
}

/**
 * Get document status from Autentique
 */
export async function getDocumentStatus(documentId: string): Promise<AutentiqueDocumentStatus> {
  const query = `
    query {
      document(id: "${documentId}") {
        id
        name
        created_at
        files {
          original
          signed
        }
        signatures {
          public_id
          name
          email
          link { short_link }
          viewed { created_at }
          signed { created_at }
          rejected { created_at reason }
        }
      }
    }
  `;

  const data = await graphqlRequest(query);
  const doc = data.document;

  return {
    id: doc.id,
    name: doc.name,
    created_at: doc.created_at,
    files: {
      original: doc.files?.original || null,
      signed: doc.files?.signed || null,
    },
    signers: (doc.signatures || []).map((sig: any) => ({
      public_id: sig.public_id,
      name: sig.name,
      email: sig.email,
      signUrl: sig.link?.short_link || "",
      signed: sig.signed ? { created_at: sig.signed.created_at } : null,
      viewed: sig.viewed ? { created_at: sig.viewed.created_at } : null,
      rejected: sig.rejected
        ? { created_at: sig.rejected.created_at, reason: sig.rejected.reason || "" }
        : null,
    })),
  };
}

/**
 * Get the signed PDF URL for a completed document
 */
export async function getSignedPdfUrl(documentId: string): Promise<string | null> {
  const status = await getDocumentStatus(documentId);
  return status.files.signed || null;
}

/**
 * Delete a document from Autentique
 */
export async function deleteDocument(documentId: string): Promise<boolean> {
  const query = `
    mutation {
      deleteDocument(id: "${documentId}")
    }
  `;

  try {
    await graphqlRequest(query);
    console.log(`[Autentique] Document deleted: ${documentId}`);
    return true;
  } catch (error) {
    console.error(`[Autentique] Failed to delete document ${documentId}:`, error);
    return false;
  }
}

/**
 * Check if Autentique is configured
 */
export function isAutentiqueConfigured(): boolean {
  return ENV.autentique.isConfigured();
}
