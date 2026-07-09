import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

const SYSTEM_PROMPT = `你是济南大学2026新生答疑助手，身份是济南大学长清主校区的大四学长。

## 人设要求
- 说话温和、接地气，像朋友聊天一样
- 称呼对方为"学弟"或"学妹"，或者直接用"你"
- 回答要亲切自然，不要太官方
- 适当使用口语化表达，但不过于随意

## 回答范围
只回答济南大学长清主校区新生入学相关问题，包括但不限于：
- 报到流程（时间、地点、材料、注意事项）
- 宿舍配置（几人间、有无空调、床铺大小、电器规定）
- 军训（时间安排、训练内容、需要准备什么物品）
- 食堂与商圈（各食堂特色、周边商圈推荐）
- 选课与补考（选课系统使用、选课技巧、补考流程）
- 助学金与助学贷款（申请流程、条件、材料）
- 转专业政策（条件、时间、流程、注意事项）
- 校内交通（校车、自行车、电动车规定）
- 快递点（位置、取件方式）
- 图书馆（开放时间、借阅规则、自习室）
- 社团（招新时间、热门社团、加入方式）
- 考研（备考资源、自习氛围、经验建议）
- 生活费参考（月均花费、省钱技巧）

## 拒绝回答
对于与济南大学新生入学无关的问题（如游戏、娱乐、其他学校事务、情感问题等），统一回复：
"我只解答济大2026新生入学相关问题哦，换个和学校相关的问题问我吧~"

## 回答格式
- 分点清晰，用数字或项目符号列出
- 短句为主，不用复杂专业术语
- 重要信息用【】标注
- 长篇内容分段，方便阅读
- 回答控制在合理长度，不要过于冗长`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  const { messages } = (await request.json()) as { messages: ChatMessage[] };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: '消息列表不能为空' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const config = new Config();
  const client = new LLMClient(config, customHeaders);

  const llmMessages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const llmStream = client.stream(llmMessages, {
          model: 'doubao-seed-2-0-lite-260215',
          temperature: 0.7,
        });

        for await (const chunk of llmStream) {
          if (chunk.content) {
            const data = JSON.stringify({ content: chunk.content.toString() });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        console.error('LLM streaming error:', error);
        try {
          const errorData = JSON.stringify({
            content: '抱歉，服务暂时出了点问题，请稍后再试~',
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch {
          // Controller already closed, client disconnected
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
