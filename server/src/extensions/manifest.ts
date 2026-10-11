import { z } from 'zod';
import { EXTENSION_API_VERSION } from '../../../sdk/server.js';
import { servableAssetPath } from './assets.js';

const asset = z.string().refine((v) => servableAssetPath(v) !== null, {
  message: 'must be client.js, client.css or a file under assets/',
});

/** `<EXTENSIONS_DIR>/<id>/manifest.json`. */
const manifestSchema = z.strictObject({
  id: z.string().min(1),
  apiVersion: z.literal(EXTENSION_API_VERSION),
  client: z
    .strictObject({
      script: asset,
      style: asset.optional(),
      /** The client bundle contributes Activity sections (turns the activity feature on). */
      activity: z.boolean().default(false),
    })
    .optional(),
});

export type ExtensionManifest = z.infer<typeof manifestSchema>;

/** Parses the manifest JSON text; throws an Error with a short readable reason. */
export function parseManifest(text: string, dirId: string): ExtensionManifest {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('manifest.json is not valid JSON');
  }
  const parsed = manifestSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? `${issue.path.join('.')}: ` : '';
    throw new Error(`manifest.json: ${where}${issue?.message ?? 'invalid'}`);
  }
  if (parsed.data.id !== dirId) {
    throw new Error(`manifest.json: id "${parsed.data.id}" does not match directory "${dirId}"`);
  }
  return parsed.data;
}
