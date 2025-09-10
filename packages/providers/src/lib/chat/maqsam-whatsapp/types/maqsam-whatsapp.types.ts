export interface ISendMessageRes {
  conversationId: string;
  messageStatus: string;
  result: string;
}

export interface ISendMessageFailureRes {
  error: string
  message: string
}
