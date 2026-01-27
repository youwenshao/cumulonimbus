import { NextRequest } from 'next/server';
import { runDyadAgent } from '@/lib/dyad-engine/engine';
import { convertToCoreMessages, StreamData } from 'ai';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { messages, appId, chatId } = await req.json();

    const data = new StreamData();

    const result = await runDyadAgent({
      appId: appId || 'default-app',
      chatId: chatId || 'default-chat',
      messages: convertToCoreMessages(messages),
    }, data);

    return result.toDataStreamResponse({ data });
  } catch (error) {
    console.error('Scaffolder V3 Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
