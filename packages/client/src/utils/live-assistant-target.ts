type ChatMessageLike = {
  role: string
}

export function findCurrentTurnAssistant<T extends ChatMessageLike>(messages: T[]): T | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message.role === 'assistant') return message
    if (message.role === 'user' || message.role === 'command') return undefined
  }
  return undefined
}
