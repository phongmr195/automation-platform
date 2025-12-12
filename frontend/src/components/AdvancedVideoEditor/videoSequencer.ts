/**
 * Video Sequencer Utility
 * Handles sequential playback of multiple video clips on timeline
 */

import type { VideoClip, VideoAsset } from './types';

export class VideoSequencer {
  private videoElement: HTMLVideoElement;
  private clips: VideoClip[] = [];
  private assets: Map<string, VideoAsset> = new Map();
  private currentClip: VideoClip | null = null;
  private onTimeUpdate: (time: number) => void;
  private onPlayStateChange: (playing: boolean) => void;
  private onClipChange: (clip: VideoClip | null) => void;
  private updateInterval: number | null = null;

  constructor(
    videoElement: HTMLVideoElement,
    callbacks: {
      onTimeUpdate: (time: number) => void;
      onPlayStateChange: (playing: boolean) => void;
      onClipChange: (clip: VideoClip | null) => void;
    }
  ) {
    this.videoElement = videoElement;
    this.onTimeUpdate = callbacks.onTimeUpdate;
    this.onPlayStateChange = callbacks.onPlayStateChange;
    this.onClipChange = callbacks.onClipChange;
  }

  /**
   * Update the list of video clips and assets
   */
  updateClips(clips: VideoClip[], assets: VideoAsset[]) {
    this.clips = [...clips].sort((a, b) => a.startTime - b.startTime);
    this.assets = new Map(assets.map((a) => [a.id, a]));
  }

  /**
   * Find which clip should be playing at a given timeline time
   */
  findClipAtTime(time: number): VideoClip | null {
    return this.clips.find(
      (clip) => time >= clip.startTime && time < clip.startTime + clip.duration
    ) || null;
  }

  /**
   * Seek to a specific timeline time
   */
  async seek(time: number): Promise<void> {
    const clip = this.findClipAtTime(time);

    if (clip) {
      // Check if we need to switch clips
      if (clip !== this.currentClip || this.videoElement.src !== this.assets.get(clip.assetId)?.src) {
        // Switch to new clip
        await this.loadClip(clip);
        this.currentClip = clip;
        this.onClipChange(clip);
      }

      // Calculate position within the clip's trimmed source
      const relativeTime = time - clip.startTime;
      const sourceTime = clip.trimStart + relativeTime;

      // Set video element time
      if (Math.abs(this.videoElement.currentTime - sourceTime) > 0.1) {
        this.videoElement.currentTime = sourceTime;
      }
      this.onTimeUpdate(time);
    } else {
      // No clip at this time - clear video and pause
      if (this.currentClip) {
        this.videoElement.pause();
        this.videoElement.src = '';
        this.currentClip = null;
        this.onClipChange(null);
      }
      this.onTimeUpdate(time);
    }
  }

  /**
   * Load a video clip into the video element
   */
  private async loadClip(clip: VideoClip): Promise<void> {
    return new Promise((resolve, reject) => {
      const asset = this.assets.get(clip.assetId);
      if (!asset) {
        reject(new Error(`Asset not found: ${clip.assetId}`));
        return;
      }

      const handleLoadedData = () => {
        this.videoElement.removeEventListener('loadeddata', handleLoadedData);
        this.videoElement.removeEventListener('error', handleError);
        
        // Set volume and playback rate
        this.videoElement.volume = clip.volume;
        this.videoElement.playbackRate = clip.playbackRate;
        
        resolve();
      };

      const handleError = () => {
        this.videoElement.removeEventListener('loadeddata', handleLoadedData);
        this.videoElement.removeEventListener('error', handleError);
        reject(new Error(`Failed to load video: ${asset.name}`));
      };

      this.videoElement.addEventListener('loadeddata', handleLoadedData);
      this.videoElement.addEventListener('error', handleError);

      // Load new source
      this.videoElement.src = asset.src;
    });
  }

  /**
   * Start playback from current position
   */
  async play(timelineTime?: number): Promise<void> {
    // Always seek to the provided timeline time (or 0 if at/past end)
    const totalDuration = this.clips.length > 0 ? this.clips[this.clips.length - 1].startTime + this.clips[this.clips.length - 1].duration : 0;
    let seekTime = typeof timelineTime === 'number' ? timelineTime : this.videoElement.currentTime;
    if (seekTime >= totalDuration - 0.05) {
      seekTime = 0;
    }
    await this.seek(seekTime);

    if (!this.currentClip) {
      // Find first clip if none is active
      if (this.clips.length > 0) {
        await this.seek(this.clips[0].startTime);
      }
    }

    console.log('[VideoSequencer] play() called. paused:', this.videoElement.paused, 'src:', this.videoElement.src);
    if (this.videoElement.paused) {
      try {
        const playPromise = this.videoElement.play();
        if (playPromise && playPromise.then) {
          playPromise.then(() => {
            console.log('[VideoSequencer] videoElement.play() resolved');
          }).catch((err) => {
            console.error('[VideoSequencer] videoElement.play() error:', err);
          });
        }
        this.onPlayStateChange(true);
        this.startUpdateLoop();
      } catch (error) {
        console.error('Play error:', error);
      }
    } else {
      console.log('[VideoSequencer] videoElement already playing');
    }
  }

  /**
   * Pause playback
   */
  pause(): void {
    this.videoElement.pause();
    this.onPlayStateChange(false);
    this.stopUpdateLoop();
  }

  /**
   * Start the playback update loop
   */
  private startUpdateLoop(): void {
    if (this.updateInterval !== null) return;

    const update = () => {
      if (!this.currentClip) {
        this.stopUpdateLoop();
        return;
      }

      const sourceTime = this.videoElement.currentTime;
      const relativeTime = sourceTime - this.currentClip.trimStart;
      const timelineTime = this.currentClip.startTime + relativeTime;

      // Check if we've reached the end of this clip
      if (sourceTime >= this.currentClip.trimEnd - 0.05 || relativeTime >= this.currentClip.duration - 0.05) {
        // Calculate next timeline position
        const nextTime = this.currentClip.startTime + this.currentClip.duration;
        const nextClip = this.findClipAtTime(nextTime);

        if (nextClip) {
          // Seamlessly transition to next clip
          this.seek(nextClip.startTime).then(() => {
            // Wait for loadeddata before playing
            const onLoadedData = () => {
              this.videoElement.removeEventListener('loadeddata', onLoadedData);
              this.videoElement.play().catch(err => {
                console.error('Failed to play next clip:', err);
              });
            };
            this.videoElement.addEventListener('loadeddata', onLoadedData);
          }).catch(err => {
            console.error('Failed to seek to next clip:', err);
            this.pause();
          });
        } else {
          // No more clips - stop playback
          this.pause();
          this.onTimeUpdate(nextTime);
          return;
        }
      } else {
        // Update timeline time
        this.onTimeUpdate(timelineTime);
      }

      this.updateInterval = requestAnimationFrame(update) as unknown as number;
    };

    this.updateInterval = requestAnimationFrame(update) as unknown as number;
  }

  /**
   * Stop the playback update loop
   */
  private stopUpdateLoop(): void {
    if (this.updateInterval !== null) {
      cancelAnimationFrame(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopUpdateLoop();
    this.videoElement.pause();
    this.videoElement.src = '';
    this.clips = [];
    this.assets.clear();
    this.currentClip = null;
  }
}
