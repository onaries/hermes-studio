self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil((async () => {
    const data = event.notification && event.notification.data ? event.notification.data : {}
    const rawTargetUrl = typeof data.targetUrl === 'string' ? data.targetUrl : ''
    const targetUrl = rawTargetUrl.startsWith('/#/hermes/') ? rawTargetUrl : '/#/hermes/chat'
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) {
      if ('navigate' in client) await client.navigate(targetUrl)
      if ('focus' in client) return client.focus()
    }
    if (clients.openWindow) return clients.openWindow(targetUrl)
  })())
})
