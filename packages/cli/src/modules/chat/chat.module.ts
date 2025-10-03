import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'chat' })
export class ChatModule implements ModuleInterface {
	async init() {
		await import('./chat.controller');
		await import('./chat.settings.controller');
	}

	async settings() {
		const { ChatSettingsService } = await import('./chat.settings.service');
		const chatAccessEnabled = await Container.get(ChatSettingsService).getEnabled();
		return { chatAccessEnabled };
	}

	@OnShutdown()
	async shutdown() {}
}
