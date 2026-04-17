// Helpers for turning drag-and-drop DataTransferItem trees and <input webkitdirectory>
// FileLists into a flat [{ path, file }] list suitable for parseFolderEntries.

export interface FolderFile {
  path: string;
  file: File;
}

interface FileSystemEntryLike {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
}

interface FileSystemFileEntryLike extends FileSystemEntryLike {
  isFile: true;
  file: (onSuccess: (file: File) => void, onError: (err: unknown) => void) => void;
}

interface FileSystemDirectoryEntryLike extends FileSystemEntryLike {
  isDirectory: true;
  createReader: () => FileSystemDirectoryReaderLike;
}

interface FileSystemDirectoryReaderLike {
  readEntries: (
    onSuccess: (entries: FileSystemEntryLike[]) => void,
    onError: (err: unknown) => void,
  ) => void;
}

async function readAllEntries(
  reader: FileSystemDirectoryReaderLike,
): Promise<FileSystemEntryLike[]> {
  const out: FileSystemEntryLike[] = [];
  // readEntries can return batches — keep calling until it returns empty.
  for (;;) {
    const batch = await new Promise<FileSystemEntryLike[]>((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    if (batch.length === 0) break;
    out.push(...batch);
  }
  return out;
}

async function walkEntry(
  entry: FileSystemEntryLike,
  basePath: string,
): Promise<FolderFile[]> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntryLike;
    const file = await new Promise<File>((resolve, reject) => {
      fileEntry.file(resolve, reject);
    });
    return [{ path: basePath + entry.name, file }];
  }
  if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntryLike;
    const children = await readAllEntries(dirEntry.createReader());
    const nested = await Promise.all(
      children.map((c) => walkEntry(c, basePath + entry.name + "/")),
    );
    return nested.flat();
  }
  return [];
}

/**
 * Walk the dropped items and return every file with its relative path.
 * Falls back to a flat files list if the browser doesn't support entries.
 */
export async function collectDroppedFiles(
  dataTransfer: DataTransfer,
): Promise<FolderFile[]> {
  const items = dataTransfer.items;
  if (items && items.length) {
    const topLevel: FileSystemEntryLike[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      // webkitGetAsEntry is widely supported in Chromium/WebKit/Firefox.
      const getEntry = (item as unknown as { webkitGetAsEntry?: () => FileSystemEntryLike | null })
        .webkitGetAsEntry;
      if (typeof getEntry === "function") {
        const entry = getEntry.call(item);
        if (entry) topLevel.push(entry);
      }
    }
    if (topLevel.length) {
      const nested = await Promise.all(topLevel.map((e) => walkEntry(e, "")));
      return nested.flat();
    }
  }
  // Fallback: just use the flat file list.
  const out: FolderFile[] = [];
  const files = dataTransfer.files;
  for (let i = 0; i < files.length; i++) {
    out.push({ path: files[i].name, file: files[i] });
  }
  return out;
}

/**
 * Convert a FileList produced by <input webkitdirectory> into FolderFile[].
 * The File objects carry webkitRelativePath which is the path we want.
 */
export function collectDirectoryInputFiles(files: FileList): FolderFile[] {
  const out: FolderFile[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const rel =
      (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
      file.name;
    out.push({ path: rel, file });
  }
  return out;
}

export function looksLikeZip(file: File): boolean {
  if (file.type === "application/zip" || file.type === "application/x-zip-compressed") {
    return true;
  }
  return file.name.toLowerCase().endsWith(".zip");
}
