// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import RouteLinkItem from '@/components/common/RouteLinkItem.vue'

describe('RouteLinkItem', () => {
  it('renders a real anchor with href from RouterLink custom slot', () => {
    const wrapper = mount(RouteLinkItem, {
      props: {
        to: { name: 'hermes.session', params: { id: 's1' } },
        active: true,
      },
      slots: {
        default: 'Session S1',
      },
      global: {
        components: {
          RouterLink: defineComponent({
            props: ['to', 'custom'],
            template: '<slot href="/session/s1" :navigate="() => {}" :is-active="true" :is-exact-active="true" />',
          }),
        },
      },
    })

    const link = wrapper.get('a')
    expect(link.attributes('href')).toBe('/session/s1')
    expect(link.classes()).toContain('route-link-item')
    expect(link.classes()).toContain('active')
    expect(link.attributes('aria-current')).toBe('page')
    expect(link.text()).toContain('Session S1')
  })

  it('passes the click event to RouterLink navigate', async () => {
    let receivedEvent: unknown
    const wrapper = mount(RouteLinkItem, {
      props: {
        to: { name: 'hermes.jobs' },
      },
      slots: {
        default: 'Jobs',
      },
      global: {
        components: {
          RouterLink: defineComponent({
            props: ['to', 'custom'],
            setup(_, { slots }) {
              return () => slots.default?.({
                href: '/jobs',
                navigate: (event: MouseEvent) => {
                  receivedEvent = event
                },
                isActive: false,
                isExactActive: false,
              })
            },
          }),
        },
      },
    })

    await wrapper.get('a').trigger('click')
    expect(receivedEvent).toBeInstanceOf(MouseEvent)
  })

})
