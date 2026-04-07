import * as FileSystem from 'expo-file-system/legacy';
import { AvatarProfile, ClosetItem, VirtualTryOnRender } from '@/types';

const AVATAR_CREATE_PROMPT = `Create a realistic digital twin reference image. Preserve the person’s identity (face) from the face photo. Preserve the person’s body proportions from the full-body photo. Generate a clean, neutral studio-style full-body image of the same person standing straight, arms relaxed, facing camera. Outfit should be plain neutral clothing (simple fitted t-shirt + straight pants) so try-ons work later. Background must be a solid light neutral color. Do not beautify, do not change skin tone, do not change facial structure. Do not make the person look thinner or more muscular. No nudity. No sexualization. No text. Output a high-resolution image.`;
const TRYON_PROMPT_TEMPLATE = `You are generating a realistic virtual try-on. Use the provided avatar reference image as the same person. Dress the person in the outfit described by the provided outfit images. Preserve identity: face, hairstyle, skin tone, and overall body shape must remain consistent with the avatar. Keep pose natural and similar to the avatar reference (standing, front-facing). Clothing should match colors, silhouette, and layering of the outfit images. Maintain realistic fabric folds and shadows. Use a simple neutral background. No text, no logos unless present in the clothing image. Do not change the person’s body. No nudity. Output a high-quality full-body image.`;

async function ensureDir(path: string) {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

async function copyToTwinDir(sourceUri: string, prefix: string): Promise<string> {
  const baseDir = `${FileSystem.cacheDirectory}digital-twin`;
  await ensureDir(baseDir);
  const dest = `${baseDir}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

export async function createAvatar(faceUri: string, bodyUri: string): Promise<AvatarProfile> {
  const [faceImageUri, bodyImageUri] = await Promise.all([
    copyToTwinDir(faceUri, 'face'),
    copyToTwinDir(bodyUri, 'body'),
  ]);
  // Placeholder local pipeline for now; ready to plug into the image edit endpoint with AVATAR_CREATE_PROMPT.
  void AVATAR_CREATE_PROMPT;
  const twinImageUri = await copyToTwinDir(bodyImageUri, 'twin-reference');

  return {
    id: `avatar-${Date.now()}`,
    createdAt: new Date().toISOString(),
    faceImageUri,
    bodyImageUri,
    twinImageUri,
    status: 'ready',
  };
}

export async function renderTryOn(
  avatar: AvatarProfile,
  options: { outfitId?: string; closetItems?: ClosetItem[]; source: 'outfit_builder' | 'fit_check' }
): Promise<VirtualTryOnRender> {
  // Placeholder local pipeline for now; ready to plug into the image edit endpoint with TRYON_PROMPT_TEMPLATE.
  void TRYON_PROMPT_TEMPLATE;
  const renderImageUri = await copyToTwinDir(avatar.twinImageUri || avatar.bodyImageUri, 'render');
  return {
    id: `render-${Date.now()}`,
    avatarId: avatar.id,
    outfitId: options.outfitId,
    closetItemIds: options.closetItems?.map((item) => item.id),
    source: options.source,
    status: 'ready',
    renderImageUri,
    createdAt: new Date().toISOString(),
  };
}

export async function deleteAvatarFiles(avatar?: AvatarProfile | null, renders: VirtualTryOnRender[] = []) {
  const uris = [
    avatar?.faceImageUri,
    avatar?.bodyImageUri,
    avatar?.twinImageUri,
    ...renders.map((render) => render.renderImageUri),
  ].filter(Boolean) as string[];

  await Promise.all(
    uris.map(async (uri) => {
      try {
        const info = await FileSystem.getInfoAsync(uri);
        if (info.exists) {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        }
      } catch {
        // best effort cleanup
      }
    })
  );
}
