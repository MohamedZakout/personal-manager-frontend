"use client";

import { FileManager } from "@/components/managers/file-manager";
import { PageHead } from "@/components/ui/page-head";

export default function FilesPage() {
  return (
    <>
      <PageHead title="Files" />
      <FileManager scope={{ kind: "library" }} />
    </>
  );
}
