import type { Credential } from "../types";
import { api } from "./client";

export type CredentialScope =
  | { kind: "project"; slug: string }
  | { kind: "account"; id: number };

function credentialBase(scope: CredentialScope): string {
  return scope.kind === "project"
    ? `/projects/${scope.slug}/credentials`
    : `/accounts/${scope.id}/credentials`;
}

export const credentialsApi = {
  list: (scope: CredentialScope) => api.get<Credential[]>(credentialBase(scope)),
  create: (scope: CredentialScope, body: Record<string, unknown>) => api.post<Credential>(credentialBase(scope), body),
  update: (scope: CredentialScope, id: number, body: Record<string, unknown>) => api.put<Credential>(`${credentialBase(scope)}/${id}`, body),
  reveal: (scope: CredentialScope, id: number) => api.get<Credential>(`${credentialBase(scope)}/${id}/reveal`),
  delete: (scope: CredentialScope, id: number) => api.delete<void>(`${credentialBase(scope)}/${id}`),
};
