/*
 * Task: delete every Badhan Agent chat and all its messages, permanently.
 *
 * For a fresh start. Chats saved before model calls were recorded (services/agent/callRecord.ts)
 * have no call records, so their downloads cannot show what was sent to OpenAI.
 *
 * The chats deleted are the ones that exist when the run starts. A step that was mid-way through
 * one of them can still insert its messages after they are gone, so the run ends by deleting every
 * message whose chat no longer exists. A chat a member starts while the run is going is kept.
 *
 * There is no receipt of the content, only counts: the point is that the chats are gone, and a
 * file of every member's conversations would be a copy of them. A backup taken before the run
 * still holds them, as it does everything else.
 *
 * Environment:
 *   NODE_ENV picks the database. DRY_RUN=1 reports what it would do and writes nothing.
 *
 * Usage:
 *   docker compose run --rm --no-deps -e NODE_ENV=production -e DRY_RUN=1 backend \
 *     npx ts-node --transpile-only scripts/tasks/clear-agent-chats.ts
 */
import '../migrations/_bootstrap';
import { Types } from 'mongoose';
import { mongoose } from '../../src/db/mongoose';
import { AgentChatModel } from '../../src/db/models/AgentChat';
import { AgentMessageModel } from '../../src/db/models/AgentMessage';
import myConsole from '../../src/utils/myConsole';

const DRY_RUN: boolean = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

async function main(): Promise<void> {
  await (await import('../migrations/_bootstrap')).ready;

  myConsole.log('--- Task: delete every Badhan Agent chat ---');
  myConsole.log(`NODE_ENV=${process.env.NODE_ENV} DRY_RUN=${DRY_RUN}`);

  const chatIds: Types.ObjectId[] = await AgentChatModel.distinct('_id');
  const [owners, deletedByUser, messages, orphans]: [any[], number, number, number] = await Promise.all([
    AgentChatModel.distinct('owner', { _id: { $in: chatIds } }),
    AgentChatModel.countDocuments({ _id: { $in: chatIds }, userDeletedChat: true }),
    AgentMessageModel.countDocuments({ chatId: { $in: chatIds } }),
    AgentMessageModel.countDocuments({ chatId: { $nin: chatIds } })
  ]);
  myConsole.log(`Chats: ${chatIds.length}, of ${owners.length} member(s); ${deletedByUser} of them deleted by their member`);
  myConsole.log(`Messages in them: ${messages}; messages with no chat: ${orphans}`);

  if (DRY_RUN) {
    myConsole.log('[DRY_RUN] Nothing deleted.');
    return;
  }

  // Messages first, then chats, as the permanent delete on the review page does: a run that stops
  // half way leaves chats with fewer messages, never messages with no chat.
  const deletedMessages: { deletedCount: number } = await AgentMessageModel.deleteMany({ chatId: { $in: chatIds } });
  const deletedChats: { deletedCount: number } = await AgentChatModel.deleteMany({ _id: { $in: chatIds } });
  const liveChatIds: Types.ObjectId[] = await AgentChatModel.distinct('_id');
  const sweptMessages: { deletedCount: number } = await AgentMessageModel.deleteMany({ chatId: { $nin: liveChatIds } });

  myConsole.log(`Deleted ${deletedChats.deletedCount} chat(s) and ${deletedMessages.deletedCount} message(s), ` +
    `then ${sweptMessages.deletedCount} message(s) left with no chat.`);
  myConsole.log(`Chats left (started during the run): ${liveChatIds.length}`);
}

main()
  .then(async (): Promise<void> => { await mongoose.connection.close(); process.exit(0); })
  .catch(async (error: any): Promise<void> => {
    myConsole.log(`Task failed: ${error && error.message ? error.message : error}`);
    await mongoose.connection.close();
    process.exit(1);
  });
