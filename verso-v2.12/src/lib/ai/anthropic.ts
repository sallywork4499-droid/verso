import Anthropic from '@anthropic-ai/sdk';
import { parseJson, type AskOptions, type Provider } from './types';

export function anthropic(apiKey: string, model: string): Provider {
  const client = new Anthropic({ apiKey });
  return {
    name: 'anthropic',
    model,
    async askJson<T>({ system, parts, maxTokens }: AskOptions): Promise<T> {
      const res = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system,
        messages: [
          {
            role: 'user',
            content: parts.map((p) =>
              p.kind === 'text'
                ? { type: 'text' as const, text: p.text }
                : ({
                    type: 'image',
                    source: { type: 'base64', media_type: p.mediaType, data: p.data },
                  } as never)
            ),
          },
        ],
      });

      const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
      if (!text) throw new Error('Claude không trả về nội dung');
      return parseJson<T>(text);
    },
  };
}
