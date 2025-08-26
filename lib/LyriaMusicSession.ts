import { GoogleGenAI, LiveMusicSession, WeightedPrompt, LiveMusicGenerationConfig } from "@google/genai";

// This client is specifically for the experimental Lyria RealTime API,
// which requires the 'v1alpha' API version.
const apiKey = typeof process !== 'undefined' && process.env && process.env.API_KEY
  ? process.env.API_KEY
  : (window as any).GEMINI_API_KEY;

const lyriaClient = new GoogleGenAI(apiKey || 'MISSING_API_KEY');

// A helper function to convert raw PCM audio data to a WAV Data URL.
// This is adapted from the existing function in geminiService.ts.
const pcmToWavDataUrl = (pcmData: ArrayBuffer): string => {
    const sampleRate = 48000; // Lyria RealTime uses 48kHz sample rate
    const numChannels = 2; // Stereo
    const bitsPerSample = 16;
    const pcmBytes = new Uint8Array(pcmData);

    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const headerSize = 44;
    const buffer = new ArrayBuffer(headerSize + pcmBytes.length);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmBytes.length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // 1 = PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, pcmBytes.length, true);

    const wavBytes = new Uint8Array(buffer);
    wavBytes.set(pcmBytes, headerSize);

    let binaryWav = '';
    for (let i = 0; i < wavBytes.length; i++) {
        binaryWav += String.fromCharCode(wavBytes[i]);
    }
    const base64Wav = btoa(binaryWav);

    return `data:audio/wav;base64,${base64Wav}`;
};


export class LyriaMusicSessionManager {
    private session: LiveMusicSession | null = null;
    private audioBuffer: Uint8Array[] = [];
    public isPlaying: boolean = false;
    public onAudioChunk: ((chunk: Uint8Array) => void) | null = null;

    constructor() {
        console.log("LyriaMusicSessionManager initialized");
    }

    public async connect(): Promise<void> {
        if (this.session) return;
        // Connect using the v1alpha model endpoint
        const musicSession = await lyriaClient.getGenerativeModel({ model: 'models/lyria-realtime-exp' });
        this.session = await musicSession.connect();
        this.startReceiving();
    }

    private async startReceiving() {
        if (!this.session) return;
        console.log("Starting to receive audio data...");
        try {
            for await (const message of this.session.receive()) {
                const audioData = message.server_content.audio_chunks[0].data;
                if (audioData) {
                    this.audioBuffer.push(audioData);
                    if (this.onAudioChunk) {
                        this.onAudioChunk(audioData);
                    }
                }
            }
        } catch (error) {
            console.error("Error receiving audio from Lyria session:", error);
            // Handle error, maybe try to reconnect or notify the user.
        }
    }

    public async setPrompts(prompts: WeightedPrompt[]): Promise<void> {
        if (!this.session) throw new Error("Session not connected.");
        await this.session.set_weighted_prompts({ prompts });
    }

    public async setConfig(config: LiveMusicGenerationConfig): Promise<void> {
        if (!this.session) throw new Error("Session not connected.");
        await this.session.set_music_generation_config({ config });
    }

    public async play(): Promise<void> {
        if (!this.session) throw new Error("Session not connected.");
        await this.session.play();
        this.isPlaying = true;
    }

    public async pause(): Promise<void> {
        if (!this.session) throw new Error("Session not connected.");
        await this.session.pause();
        this.isPlaying = false;
    }

    public async stop(): Promise<string> {
        if (!this.session) throw new Error("Session not connected.");
        await this.session.stop();
        this.isPlaying = false;

        const totalLength = this.audioBuffer.reduce((acc, chunk) => acc + chunk.length, 0);
        const fullAudio = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of this.audioBuffer) {
            fullAudio.set(chunk, offset);
            offset += chunk.length;
        }

        const wavUrl = pcmToWavDataUrl(fullAudio.buffer);
        this.audioBuffer = []; // Clear buffer for next use
        return wavUrl;
    }

    public async close(): Promise<void> {
        if (this.session) {
            await this.session.close();
            this.session = null;
            this.isPlaying = false;
        }
    }
}
