import type { GenerateVideosOperation } from "@google/genai";

export enum AppStep {
  IDEA_INPUT = 'IDEA_INPUT',
  STRUCTURE_EDITOR = 'STRUCTURE_EDITOR',
  STORYBOARD_VIEW = 'STORYBOARD_VIEW',
  PRODUCTION_STUDIO = 'PRODUCTION_STUDIO',
}

export interface Scene {
  title: string;
  description: string;
}

export interface StoryStructure {
  title: string;
  logline: string;
  scenes: Scene[];
}

export type PanelStatus = 'pending' | 'scripting' | 'prompting' | 'imaging' | 'video-generating' | 'tts-generating' | 'music-generating' | 'complete' | 'error';

export interface StoryboardPanelData {
  id: string;
  sceneNumber: number;
  sceneDescription: string;
  script?: string;
  imagePrompt?: string;
  imageUrl?: string;
  videoUrl?: string;
  status: PanelStatus;
  errorMessage?: string;
  videoOperation?: GenerateVideosOperation;
  ttsScript?: string;
  audioUrl?: string;
  ttsVoice?: string;
  musicPrompt?: string;
  musicUrl?: string;
}

export type ImageAspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";