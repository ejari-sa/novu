import { IChatOptions } from '@novu/stateless';
import { nanoid } from 'nanoid';
import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { MaqsamWhatsAppProvider } from './maqsam-whatsapp.provider';

const mockProviderConfig = {
  accessKey: 'my-access-key',
  accessSecret: 'my-access-secret',
};

const buildResponse = (messageId: string) => {
  return {
    data: {
      message_id: messageId,
      message_status: 'submitted',
    },
  };
};

test('should trigger maqsam library correctly with template message', async () => {
  const messageId = nanoid();

  const { mockPost, axiosMockSpy } = axiosSpy(buildResponse(messageId));

  const provider = new MaqsamWhatsAppProvider(mockProviderConfig);

  const options: IChatOptions = {
    phoneNumber: '+111111111',
    content: 'Template message',
    customData: {
      templateId: '123',
      templateVariables: {
        name: 'John',
        company: 'Acme',
      },
    },
  };

  const res = await provider.sendMessage(options);

  expect(mockPost).toHaveBeenCalled();
  expect(mockPost).toHaveBeenCalledWith('https://api.maqsam.com/v2/whatsapp/messages/send_message', {
    RecipientPhone: options.phoneNumber,
    TemplateId: options.customData?.templateId,
    TemplateVariables: options.customData?.templateVariables,
  });

  const token = Buffer.from(`${mockProviderConfig.accessKey}:${mockProviderConfig.accessSecret}`).toString('base64');

  expect(axiosMockSpy).toHaveBeenCalledWith({
    headers: {
      Authorization: `Basic ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  expect(res.id).toBe(messageId);
});

test('should trigger maqsam library correctly with template message with _passthrough', async () => {
  const messageId = nanoid();

  const { mockPost, axiosMockSpy } = axiosSpy(buildResponse(messageId));

  const provider = new MaqsamWhatsAppProvider(mockProviderConfig);

  const options: IChatOptions = {
    phoneNumber: '+111111111',
    content: 'Template message',
    customData: {
      templateId: '123',
      templateVariables: {
        name: 'John',
        company: 'Acme',
      },
    },
  };

  const res = await provider.sendMessage(options, {
    _passthrough: {
      query: {
        RecipientPhone: '+111111111',
        TemplateId: '123',
        TemplateVariables: JSON.stringify({
          name: 'John',
          company: 'Acme',
        }),
      },
    },
  });

  expect(mockPost).toHaveBeenCalled();
  expect(mockPost).toHaveBeenCalledWith('https://api.maqsam.com/v2/whatsapp/messages/send_message', {
      RecipientPhone: '+111111111',
      TemplateId: '123',
      TemplateVariables: {
        name: 'John',
        company: 'Acme',
      },
  });

  const token = Buffer.from(`${mockProviderConfig.accessKey}:${mockProviderConfig.accessSecret}`).toString('base64');

  expect(axiosMockSpy).toHaveBeenCalledWith({
    headers: {
      Authorization: `Basic ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  expect(res.id).toBe(messageId);
});

test('should throw error when message status is not submitted', async () => {
  const messageId = nanoid();

  axiosSpy({
    data: {
      message_id: messageId,
      message_status: 'failed',
    },
  });

  const provider = new MaqsamWhatsAppProvider(mockProviderConfig);

  const options: IChatOptions = {
    phoneNumber: '+111111111',
    content: 'Template message',
    customData: {
      templateId: '123',
      templateVariables: {
        name: 'John',
        company: 'Acme',
      },
    },
  };

  await expect(provider.sendMessage(options)).rejects.toThrow('Maqsam Chat failed:');
});
