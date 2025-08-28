import { MaqsamChatProvider } from '@novu/providers';
import { ChannelTypeEnum, ChatProviderIdEnum, ICredentials } from '@novu/shared';
import { BaseChatHandler } from './base.handler';
 
export class MaqsamChatHandler extends BaseChatHandler {
  constructor() {
    super(ChatProviderIdEnum.Maqsam, ChannelTypeEnum.CHAT);
  }
 
  buildProvider(credentials: ICredentials) {
    const config: { accessKey: string, accessSecret: string } = { accessKey: credentials.accessKey, accessSecret: credentials.accessSecret };
 
    this.provider = new MaqsamChatProvider(config);
  }
}
