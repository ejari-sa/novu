export interface ISendMessageRes {
  message_id: string;
  message_status: string;
  conversation_id: string;
}

export interface ISendMessageFailureRes {
  error: string
  message: string
}
