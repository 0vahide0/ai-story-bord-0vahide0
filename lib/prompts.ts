export type PromptCategory = 'storyStructure' | 'script' | 'imagePrompt' | 'video' | 'tts' | 'music' | 'rewrite' | 'expand' | 'shrink' | 'changeTone';
export type Prompts = Record<PromptCategory, string>;

export const defaultPrompts: { en: Prompts, fa: Prompts } = {
  en: {
    storyStructure: 'Based on this idea: "{{idea}}", create a compelling story structure. Provide a title, a one-sentence logline, and break the story into 3 to 5 key scenes. For each scene, provide a short, descriptive paragraph outlining the key events.',
    script: 'Write a short script for the following scene. Focus on visual actions and key dialogue. Scene: "{{sceneDescription}}"',
    imagePrompt: 'Create a concise, highly descriptive image generation prompt in ENGLISH based on this script. Capture the mood, setting, main character, and key action in a single sentence. IMPORTANTLY, adhere to the following artistic style: "{{globalStylePrompt}}". Script: "{{script}}"',
    video: 'Animate this scene based on the following prompt: {{prompt}}',
    tts: 'Please read the following text aloud: {{text}}',
    music: 'Create a musical piece based on this prompt: {{prompt}}',
    rewrite: 'Rewrite the following scene description to be more engaging and vivid, but keep the core meaning the same. Scene: "{{text}}"',
    expand: 'Expand on the following scene description. Add more sensory details, character actions, and setting descriptions to make it about twice as long. Scene: "{{text}}"',
    shrink: 'Summarize the following scene description into one or two concise, impactful sentences. Scene: "{{text}}"',
    changeTone: 'Rewrite the following scene description with a {{tone}} tone. Scene: "{{text}}"',
  },
  fa: {
    storyStructure: 'بر اساس این ایده: «{{idea}}»، یک ساختار داستانی جذاب به زبان فارسی ایجاد کنید. کل خروجی، شامل عنوان، لاگ‌لاین و تمام توضیحات صحنه، باید به فارسی باشد. یک عنوان، یک لاگ‌لاین یک جمله‌ای ارائه دهید و داستان را به ۳ تا ۵ صحنه کلیدی تقسیم کنید. برای هر صحنه، یک پاراگراف توصیفی کوتاه بنویسید که رویدادهای اصلی را مشخص کند.',
    script: 'یک فیلمنامه کوتاه به زبان فارسی برای صحنه زیر بنویسید. بر روی اقدامات بصری و دیالوگ های کلیدی تمرکز کنید. صحنه: «{{sceneDescription}}»',
    imagePrompt: 'بر اساس این فیلمنامه فارسی، یک پرامپت (دستور) تولید تصویر بسیار توصیفی و کوتاه به زبان انگلیسی ایجاد کن. حال و هوا، محیط، شخصیت اصلی و اکشن کلیدی را در یک جمله خلاصه کن. بسیار مهم: به سبک هنری زیر پایبند باش: «{{globalStylePrompt}}». فیلمنامه: «{{script}}»',
    video: 'این صحنه را بر اساس دستور زیر متحرک کن: {{prompt}}',
    tts: 'لطفاً متن فارسی زیر را با صدای بلند بخوانید: {{text}}',
    music: 'یک قطعه موسیقی بر اساس این دستور بساز: {{prompt}}',
    rewrite: 'توضیحات صحنه زیر را به زبان فارسی بازنویسی کنید تا جذاب تر و واضح تر شود، اما معنای اصلی را حفظ کنید. صحنه: «{{text}}»',
    expand: 'توضیحات صحنه زیر را به زبان فارسی گسترش دهید. جزئیات حسی، اقدامات شخصیت و توصیفات محیطی بیشتری اضافه کنید تا طول آن تقریباً دو برابر شود. صحنه: «{{text}}»',
    shrink: 'توضیحات صحنه زیر را در یک یا دو جمله کوتاه و تأثیرگذار به زبان فارسی خلاصه کنید. صحنه: «{{text}}»',
    changeTone: 'توضیحات صحنه زیر را با لحن {{tone}} به زبان فارسی بازنویسی کنید. صحنه: «{{text}}»',
  }
};