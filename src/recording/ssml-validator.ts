/**
 * SSML Validation and Tag Generator for Actions on Google
 * Complies with Google Assistant SSML audio specifications.
 */

export interface SSMLValidationResult {
  isValid: boolean;
  warnings: string[];
  maxDurationSeconds: number;
}

export class SSMLHelper {
  public static readonly MAX_DURATION_SECONDS = 240;

  public static validate(durationSeconds: number, mimeType: string): SSMLValidationResult {
    const warnings: string[] = [];

    if (durationSeconds > this.MAX_DURATION_SECONDS) {
      warnings.push(`Duration (${durationSeconds.toFixed(1)}s) exceeds Actions on Google limit of ${this.MAX_DURATION_SECONDS}s.`);
    }

    const isOpus = mimeType.includes('opus');
    const isOggOrWebm = mimeType.includes('ogg') || mimeType.includes('webm') || mimeType.includes('mp4');
    if (!isOggOrWebm) {
      warnings.push(`MIME type ${mimeType} may not be supported by Assistant SSML (prefer OGG/WebM Opus).`);
    }

    return {
      isValid: warnings.length === 0,
      warnings,
      maxDurationSeconds: this.MAX_DURATION_SECONDS
    };
  }

  public static generateSSMLSnippet(clipId: string, mimeType: string): string {
    const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
    const sampleUrl = `https://storage.googleapis.com/actions-recordings-bucket/${clipId}.${ext}`;
    return `<speak>\n  <audio src="${sampleUrl}">[Voice message playing]</audio>\n</speak>`;
  }
}
