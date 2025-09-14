import {
  ChannelTypeEnum,
  IChatOptions,
  IChatProvider,
  ISendMessageSuccessResponse,
} from "@novu/stateless";
import Axios, { AxiosInstance } from 'axios';
import { BaseProvider, CasingEnum } from "../../../base.provider";
import { WithPassthrough } from "../../../utils/types";
import { ISendMessageFailureRes, ISendMessageRes } from "./types/maqsam-whatsapp.types";

export class MaqsamWhatsAppProvider extends BaseProvider implements IChatProvider {
  id = "maqsam-whatsapp";
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;

  private readonly axiosClient: AxiosInstance;
  private readonly baseUrl = 'https://api.maqsam.com/v2/whatsapp/messages/send_message';

  constructor(private config: {
    accessKey: string;
    accessSecret: string;
  }) {
    super();

    const token = Buffer.from(`${this.config.accessKey}:${this.config.accessSecret}`).toString('base64');

    this.axiosClient = Axios.create({
          headers: {
            Authorization: `Basic ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
  }

  private defineMessagePayload(options: IChatOptions) {
    return {
      RecipientPhone: options.phoneNumber,
      TemplateId: options.customData?.templateId,
      TemplateVariables: options.customData?.templateVariables,
    }
  }

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const payload = this.transform(bridgeProviderData, this.defineMessagePayload(options));

    const { data } = await this.axiosClient.post<ISendMessageRes | ISendMessageFailureRes>(this.baseUrl, {
      params: payload.body,
    });

    if ('conversationId' in data && data.conversationId) {
      return {
        id: data.conversationId,
        date: new Date().toISOString(),
      };
    }

    throw new Error(`Maqsam Chat failed: ${JSON.stringify(data || {})}`);
  }
}
