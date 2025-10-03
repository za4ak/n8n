import { Service } from '@n8n/di';
import { type IUser } from 'n8n-workflow';

import { type ChatPayload } from './chat.types';

@Service()
export class ChatService {
	constructor() {
		// this.agent = new OpenAiChatAgent({
		// 	logger: this.logger,
		// });
	}

	async getModels() {
		return await Promise.resolve(['gpt-3.5-turbo', 'gpt-4']);
	}

	async *chat(payload: ChatPayload, user: IUser, abortSignal?: AbortSignal) {
		// const agent = await this.getAgent(payload.model);
		// yield* agent.chat(payload, user, abortSignal);
		yield* ['hello', 'world'];
	}
}
