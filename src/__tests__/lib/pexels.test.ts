import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { searchPexelsImages, searchPexelsVideo } from '@/lib/maquette/pexels';

describe('Pexels API', () => {
  beforeEach(() => {
    // Clear API key
    delete process.env.PEXELS_API_KEY;
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('searchPexelsImages', () => {
    it('should return empty array if PEXELS_API_KEY is not set', async () => {
      const result = await searchPexelsImages('plomberie');
      expect(result).toEqual([]);
    });

    it('should return array of image URLs (src.large) on success', async () => {
      process.env.PEXELS_API_KEY = 'test-api-key';

      const mockResponse = {
        photos: [
          { src: { large: 'https://example.com/photo1-large.jpg' } },
          { src: { large: 'https://example.com/photo2-large.jpg' } },
          { src: { large: 'https://example.com/photo3-large.jpg' } },
        ],
      };

      vi.stubGlobal(
        'fetch',
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockResponse),
          } as Response)
        )
      );

      const result = await searchPexelsImages('plomberie');

      expect(result).toEqual([
        'https://example.com/photo1-large.jpg',
        'https://example.com/photo2-large.jpg',
        'https://example.com/photo3-large.jpg',
      ]);

      // Verify fetch was called with correct headers
      const mockFetch = vi.mocked(global.fetch);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.pexels.com/v1/search'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'test-api-key',
          }),
        })
      );
    });

    it('should include activite in query parameter', async () => {
      process.env.PEXELS_API_KEY = 'test-api-key';

      vi.stubGlobal(
        'fetch',
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ photos: [] }),
          } as Response)
        )
      );

      await searchPexelsImages('électricien');

      const mockFetch = vi.mocked(global.fetch);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('query=');
      expect(url).toContain('per_page=10');
      expect(url).toContain('orientation=landscape');
      expect(url).toContain('locale=fr-FR');
    });

    it('should return empty array if fetch fails', async () => {
      process.env.PEXELS_API_KEY = 'test-api-key';

      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.reject(new Error('Network error')))
      );

      const result = await searchPexelsImages('plomberie');
      expect(result).toEqual([]);
    });

    it('should return empty array if API returns no photos', async () => {
      process.env.PEXELS_API_KEY = 'test-api-key';

      vi.stubGlobal(
        'fetch',
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ photos: [] }),
          } as Response)
        )
      );

      const result = await searchPexelsImages('zzzzunknownactivityzzzz');
      expect(result).toEqual([]);
    });

    it('should return empty array if response is not ok', async () => {
      process.env.PEXELS_API_KEY = 'test-api-key';

      vi.stubGlobal(
        'fetch',
        vi.fn(() =>
          Promise.resolve({
            ok: false,
            status: 401,
          } as Response)
        )
      );

      const result = await searchPexelsImages('plomberie');
      expect(result).toEqual([]);
    });
  });

  describe('searchPexelsVideo', () => {
    it('should return null if PEXELS_API_KEY is not set', async () => {
      const result = await searchPexelsVideo('plomberie');
      expect(result).toBeNull();
    });

    it('should return {videoUrl, duration} for video with MP4 between 5-30s', async () => {
      process.env.PEXELS_API_KEY = 'test-api-key';

      const mockResponse = {
        videos: [
          {
            duration: 15,
            video_files: [
              {
                link: 'https://example.com/video1-hd.mp4',
                quality: 'hd',
                file_type: 'video/mp4',
              },
            ],
          },
        ],
      };

      vi.stubGlobal(
        'fetch',
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockResponse),
          } as Response)
        )
      );

      const result = await searchPexelsVideo('plomberie');

      expect(result).toEqual({
        videoUrl: 'https://example.com/video1-hd.mp4',
        duration: 15,
      });

      // Verify fetch was called with correct headers
      const mockFetch = vi.mocked(global.fetch);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.pexels.com/videos/search'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'test-api-key',
          }),
        })
      );
    });

    it('should prefer HD quality MP4 over SD quality', async () => {
      process.env.PEXELS_API_KEY = 'test-api-key';

      const mockResponse = {
        videos: [
          {
            duration: 10,
            video_files: [
              {
                link: 'https://example.com/video1-sd.mp4',
                quality: 'sd',
                file_type: 'video/mp4',
              },
              {
                link: 'https://example.com/video1-hd.mp4',
                quality: 'hd',
                file_type: 'video/mp4',
              },
            ],
          },
        ],
      };

      vi.stubGlobal(
        'fetch',
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockResponse),
          } as Response)
        )
      );

      const result = await searchPexelsVideo('plomberie');

      expect(result?.videoUrl).toBe('https://example.com/video1-hd.mp4');
    });

    it('should return null if no video between 5-30s', async () => {
      process.env.PEXELS_API_KEY = 'test-api-key';

      const mockResponse = {
        videos: [
          {
            duration: 45, // too long
            video_files: [
              {
                link: 'https://example.com/video1.mp4',
                quality: 'hd',
                file_type: 'video/mp4',
              },
            ],
          },
          {
            duration: 2, // too short
            video_files: [
              {
                link: 'https://example.com/video2.mp4',
                quality: 'hd',
                file_type: 'video/mp4',
              },
            ],
          },
        ],
      };

      vi.stubGlobal(
        'fetch',
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockResponse),
          } as Response)
        )
      );

      const result = await searchPexelsVideo('plomberie');
      expect(result).toBeNull();
    });

    it('should return null if no MP4 available', async () => {
      process.env.PEXELS_API_KEY = 'test-api-key';

      const mockResponse = {
        videos: [
          {
            duration: 10,
            video_files: [
              {
                link: 'https://example.com/video1.webm',
                quality: 'hd',
                file_type: 'video/webm',
              },
            ],
          },
        ],
      };

      vi.stubGlobal(
        'fetch',
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockResponse),
          } as Response)
        )
      );

      const result = await searchPexelsVideo('plomberie');
      expect(result).toBeNull();
    });

    it('should return null if fetch fails', async () => {
      process.env.PEXELS_API_KEY = 'test-api-key';

      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.reject(new Error('Network error')))
      );

      const result = await searchPexelsVideo('plomberie');
      expect(result).toBeNull();
    });

    it('should return null if API returns no videos', async () => {
      process.env.PEXELS_API_KEY = 'test-api-key';

      vi.stubGlobal(
        'fetch',
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ videos: [] }),
          } as Response)
        )
      );

      const result = await searchPexelsVideo('zzzzunknownactivityzzzz');
      expect(result).toBeNull();
    });

    it('should return null if response is not ok', async () => {
      process.env.PEXELS_API_KEY = 'test-api-key';

      vi.stubGlobal(
        'fetch',
        vi.fn(() =>
          Promise.resolve({
            ok: false,
            status: 401,
          } as Response)
        )
      );

      const result = await searchPexelsVideo('plomberie');
      expect(result).toBeNull();
    });

    it('should skip first video and find valid one in array', async () => {
      process.env.PEXELS_API_KEY = 'test-api-key';

      const mockResponse = {
        videos: [
          {
            duration: 50, // too long
            video_files: [
              {
                link: 'https://example.com/video1.mp4',
                quality: 'hd',
                file_type: 'video/mp4',
              },
            ],
          },
          {
            duration: 12, // valid
            video_files: [
              {
                link: 'https://example.com/video2.mp4',
                quality: 'hd',
                file_type: 'video/mp4',
              },
            ],
          },
        ],
      };

      vi.stubGlobal(
        'fetch',
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockResponse),
          } as Response)
        )
      );

      const result = await searchPexelsVideo('plomberie');

      expect(result).toEqual({
        videoUrl: 'https://example.com/video2.mp4',
        duration: 12,
      });
    });
  });
});
