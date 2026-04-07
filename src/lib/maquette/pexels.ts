/**
 * Pexels API integration for maquette generation.
 * Handles image and video search with filtering.
 */

interface PexelsPhoto {
  src: {
    large: string;
    original: string;
  };
}

interface PexelsPhotosResponse {
  photos: PexelsPhoto[];
}

interface PexelsVideoFile {
  link: string;
  quality: string; // "hd", "sd", "uhd"
  file_type: string; // "video/mp4", etc.
}

interface PexelsVideo {
  duration: number;
  video_files: PexelsVideoFile[];
}

interface PexelsVideosResponse {
  videos: PexelsVideo[];
}

/**
 * Search for high-resolution images on Pexels.
 * Returns URLs of the largest available images (src.large).
 * @param activite The activity/keyword to search for
 * @returns Array of image URLs (max 10), or empty array if API key missing or error occurs
 */
export async function searchPexelsImages(activite: string): Promise<string[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return [];
  }

  try {
    const url = new URL('https://api.pexels.com/v1/search');
    url.searchParams.set('query', activite);
    url.searchParams.set('per_page', '10');
    url.searchParams.set('orientation', 'landscape');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as PexelsPhotosResponse;

    if (!data.photos || data.photos.length === 0) {
      return [];
    }

    return data.photos.map((photo) => photo.src.large);
  } catch {
    return [];
  }
}

/**
 * Search for videos on Pexels.
 * Returns the first video between 5-30 seconds with an available MP4 file.
 * Prefers HD quality over SD quality.
 * @param activite The activity/keyword to search for
 * @returns Object with videoUrl and duration, or null if no valid video or API key missing
 */
export async function searchPexelsVideo(
  activite: string
): Promise<{ videoUrl: string; duration: number } | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const url = new URL('https://api.pexels.com/videos/search');
    url.searchParams.set('query', activite);
    url.searchParams.set('per_page', '5');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as PexelsVideosResponse;

    if (!data.videos || data.videos.length === 0) {
      return null;
    }

    // Find first valid video: duration 5-30s, with MP4 available
    for (const video of data.videos) {
      // Check duration is within range
      if (video.duration < 5 || video.duration > 30) {
        continue;
      }

      // Find MP4 file, prefer HD over SD
      let mp4File: PexelsVideoFile | undefined;

      // First, look for HD quality
      mp4File = video.video_files.find(
        (file) => file.file_type === 'video/mp4' && file.quality === 'hd'
      );

      // If no HD, look for any MP4 (could be SD, UHD, etc.)
      if (!mp4File) {
        mp4File = video.video_files.find((file) => file.file_type === 'video/mp4');
      }

      if (mp4File) {
        return {
          videoUrl: mp4File.link,
          duration: video.duration,
        };
      }
    }

    // No valid video found
    return null;
  } catch {
    return null;
  }
}
